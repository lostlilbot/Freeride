import { Artifact, Peer, TradeEvent, Specialty } from '../domain/models';
import { 
  getArtifactsBySpecialty, 
  saveArtifact, 
  getArtifactById, 
  savePeer, 
  getPeers, 
  getConnectedPeers,
  saveTradeEvent, 
  getTradeHistory as dbGetTradeHistory,
  getAllArtifacts,
  calculateTradeValue,
  incrementRetrievalCount
} from './database';

const JSONBIN_BASE = 'https://api.jsonbin.io/v3';

interface JsonBinRecord {
  record: {
    artifacts: Artifact[];
    peers: Peer[];
    lastUpdated: number;
  };
}

export class TradeProtocol {
  private apiKey: string;
  private binId: string;
  private nodeAlias: string;
  private agentId: string;
  private syncIntervalId: NodeJS.Timeout | null = null;

  constructor(apiKey: string, binId: string, nodeAlias: string) {
    this.apiKey = apiKey;
    this.binId = binId;
    this.nodeAlias = nodeAlias;
    this.agentId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async initializeBin(): Promise<void> {
    try {
      await fetch(`${JSONBIN_BASE}/b/${this.binId}`, {
        headers: { 'X-Master-Key': this.apiKey }
      });
    } catch {
      const response = await fetch(`${JSONBIN_BASE}/b`, {
        method: 'POST',
        headers: {
          'X-Master-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          artifacts: [],
          peers: [],
          lastUpdated: Date.now()
        })
      });
      const data = await response.json();
      this.binId = data.metadata.id;
    }
  }

  async outboundSync(minTradeValue: number = 3.0, maxArtifacts: number = 50): Promise<TradeEvent[]> {
    const events: TradeEvent[] = [];
    const artifacts = getArtifactsBySpecialty('general', minTradeValue)
      .concat(getArtifactsBySpecialty('code', minTradeValue))
      .concat(getArtifactsBySpecialty('research', minTradeValue))
      .slice(0, maxArtifacts);

    for (const artifact of artifacts) {
      try {
        const record = await this.fetchRemoteRecord();
        const remoteArtifacts = record?.record?.artifacts || [];
        
        if (!remoteArtifacts.find((a: Artifact) => a.id === artifact.id)) {
          remoteArtifacts.push(artifact);
          
          await this.saveRemoteRecord({
            artifacts: remoteArtifacts,
            peers: record?.record?.peers || [],
            lastUpdated: Date.now()
          });

          events.push({
            id: `sent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            type: 'sent',
            artifactId: artifact.id,
            tradeValueDelta: artifact.tradeValue
          });
        }
      } catch (error) {
        console.error('Error syncing artifact:', error);
      }
    }

    events.forEach(e => saveTradeEvent(e));
    return events;
  }

  async inboundSync(): Promise<TradeEvent[]> {
    const events: TradeEvent[] = [];
    const connectedPeers = getConnectedPeers();
    const processedIds = new Set<string>();

    for (const peer of connectedPeers) {
      try {
        const response = await fetch(`${JSONBIN_BASE}/b/${peer.binId}/latest`, {
          headers: { 'X-Master-Key': this.apiKey }
        });

        if (!response.ok) continue;

        const record: JsonBinRecord = await response.json();
        const remoteArtifacts = record.record?.artifacts || [];

        for (const artifact of remoteArtifacts) {
          if (processedIds.has(artifact.id)) continue;
          if (artifact.agentId === this.agentId) continue;
          if (artifact.specialty !== 'general' && artifact.specialty !== peer.specialty) continue;

          processedIds.add(artifact.id);

          const auditResult = await this.auditIncomingArtifact(artifact);
          
          if (auditResult.accepted) {
            saveArtifact(artifact);
            events.push({
              id: `accepted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              type: 'accepted',
              artifactId: artifact.id,
              peerId: peer.id,
              tradeValueDelta: artifact.tradeValue
            });
          } else {
            events.push({
              id: `rejected-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
              type: 'rejected',
              artifactId: artifact.id,
              peerId: peer.id,
              tradeValueDelta: 0
            });
          }
        }
      } catch (error) {
        console.error('Error syncing from peer:', peer.alias, error);
      }
    }

    events.forEach(e => saveTradeEvent(e));
    return events;
  }

  private async auditIncomingArtifact(incoming: Artifact): Promise<{ accepted: boolean }> {
    const local = getArtifactById(incoming.id);
    
    if (!local) {
      return { accepted: true };
    }

    if (incoming.tradeValue <= local.tradeValue) {
      return { accepted: false };
    }

    return { accepted: true };
  }

  private async fetchRemoteRecord(): Promise<JsonBinRecord | null> {
    try {
      const response = await fetch(`${JSONBIN_BASE}/b/${this.binId}/latest`, {
        headers: { 'X-Master-Key': this.apiKey }
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  private async saveRemoteRecord(record: { artifacts: Artifact[]; peers: Peer[]; lastUpdated: number }): Promise<void> {
    await fetch(`${JSONBIN_BASE}/b/${this.binId}`, {
      method: 'PUT',
      headers: {
        'X-Master-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record)
    });
  }

  async registerPeer(peerInfo: { binId: string; alias: string; specialty: Specialty; avgTradeValue: number }): Promise<void> {
    const peer: Peer = {
      id: `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...peerInfo,
      artifactCount: 0,
      lastActive: Date.now(),
      connected: true
    };
    
    savePeer(peer);

    await this.writeInboundRecord(peer);
  }

  private async writeInboundRecord(peer: Peer): Promise<void> {
    const record = await this.fetchRemoteRecord();
    const peers = record?.record?.peers || [];
    
    const existingIndex = peers.findIndex((p: Peer) => p.binId === this.binId);
    if (existingIndex >= 0) {
      peers[existingIndex] = {
        id: peers[existingIndex].id,
        binId: this.binId,
        alias: this.nodeAlias,
        specialty: 'general',
        avgTradeValue: 0,
        artifactCount: getAllArtifacts().length,
        lastActive: Date.now(),
        connected: true
      };
    } else {
      peers.push({
        id: `self-${Date.now()}`,
        binId: this.binId,
        alias: this.nodeAlias,
        specialty: 'general',
        avgTradeValue: 0,
        artifactCount: getAllArtifacts().length,
        lastActive: Date.now(),
        connected: true
      });
    }

    await this.saveRemoteRecord({
      artifacts: record?.record?.artifacts || [],
      peers,
      lastUpdated: Date.now()
    });
  }

  async connectToPeer(peerBinId: string): Promise<Peer> {
    const response = await fetch(`${JSONBIN_BASE}/b/${peerBinId}/latest`, {
      headers: { 'X-Master-Key': this.apiKey }
    });

    if (!response.ok) {
      throw new Error('Failed to connect to peer');
    }

    const record: JsonBinRecord = await response.json();
    const peerData = record.record?.peers?.[0];

    const peer: Peer = {
      id: `peer-${Date.now()}`,
      binId: peerBinId,
      alias: peerData?.alias || 'Unknown',
      specialty: peerData?.specialty || 'general',
      avgTradeValue: peerData?.avgTradeValue || 0,
      artifactCount: peerData?.artifactCount || 0,
      lastActive: peerData?.lastActive || Date.now(),
      connected: true
    };

    savePeer(peer);
    return peer;
  }

  disconnectPeer(peerId: string): void {
    const peers = getPeers();
    const peer = peers.find(p => p.id === peerId);
    if (peer) {
      peer.connected = false;
      savePeer(peer);
    }
  }

  startAutoSync(intervalHours: number, minTradeValue: number, maxArtifacts: number, onSync: () => void): void {
    this.stopAutoSync();
    this.syncIntervalId = setInterval(async () => {
      await this.outboundSync(minTradeValue, maxArtifacts);
      await this.inboundSync();
      onSync();
    }, intervalHours * 60 * 60 * 1000);
  }

  stopAutoSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  getAgentId(): string {
    return this.agentId;
  }

  getNodeAlias(): string {
    return this.nodeAlias;
  }
}

export const getTradeHistoryExport = (limit?: number): TradeEvent[] => dbGetTradeHistory(limit || 50);
