import { open, QuickSQLiteConnection } from 'react-native-quick-sqlite';
import { Artifact, Peer, TradeEvent, ModelInfo, Settings, Specialty } from '../domain/models';

let db: QuickSQLiteConnection | null = null;

export const initDatabase = async (): Promise<void> => {
  db = open({ name: 'freeride.db' });
  
  db.execute(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      specialty TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT NOT NULL,
      selfRating REAL DEFAULT 0,
      peerRating REAL DEFAULT 0,
      agentId TEXT NOT NULL,
      agentAlias TEXT NOT NULL,
      correctionHistory TEXT DEFAULT '[]',
      retrievalCount INTEGER DEFAULT 0,
      tradeValue REAL DEFAULT 0
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS peers (
      id TEXT PRIMARY KEY,
      binId TEXT NOT NULL,
      alias TEXT NOT NULL,
      specialty TEXT NOT NULL,
      avgTradeValue REAL DEFAULT 0,
      artifactCount INTEGER DEFAULT 0,
      lastActive INTEGER DEFAULT 0,
      connected INTEGER DEFAULT 0
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS trade_events (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      type TEXT NOT NULL,
      artifactId TEXT,
      peerId TEXT,
      tradeValueDelta REAL DEFAULT 0
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS model_priority (
      id TEXT PRIMARY KEY,
      priority INTEGER NOT NULL,
      enabled INTEGER DEFAULT 1
    )
  `);

  db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.execute(`
    CREATE INDEX IF NOT EXISTS idx_artifacts_specialty ON artifacts(specialty)
  `);
  
  db.execute(`
    CREATE INDEX IF NOT EXISTS idx_artifacts_tradeValue ON artifacts(tradeValue)
  `);
};

export const saveArtifact = (artifact: Artifact): void => {
  if (!db) throw new Error('Database not initialized');
  
  db.execute(
    `INSERT OR REPLACE INTO artifacts (id, timestamp, specialty, input, output, selfRating, peerRating, agentId, agentAlias, correctionHistory, retrievalCount, tradeValue)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      artifact.id,
      artifact.timestamp,
      artifact.specialty,
      artifact.input,
      artifact.output,
      artifact.selfRating,
      artifact.peerRating,
      artifact.agentId,
      artifact.agentAlias,
      JSON.stringify(artifact.correctionHistory),
      artifact.retrievalCount,
      artifact.tradeValue
    ]
  );
};

export const calculateTradeValue = (artifact: Artifact): number => {
  return (artifact.selfRating * 0.4) + (artifact.peerRating * 0.4) + 
         (artifact.correctionHistory.length * 0.1) + 
         (artifact.retrievalCount * 0.1);
};

export const getArtifactsBySpecialty = (specialty: Specialty, minTradeValue: number = 3.0): Artifact[] => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.execute(
    `SELECT * FROM artifacts WHERE specialty = ? AND tradeValue >= ? ORDER BY tradeValue DESC LIMIT 10`,
    [specialty, minTradeValue]
  );
  
  return (result.rows?._array || []).map(row => ({
    ...row,
    correctionHistory: JSON.parse(row.correctionHistory || '[]'),
    specialty: row.specialty as Specialty
  }));
};

export const getAllArtifacts = (): Artifact[] => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.execute(`SELECT * FROM artifacts ORDER BY timestamp DESC`);
  return (result.rows?._array || []).map(row => ({
    ...row,
    correctionHistory: JSON.parse(row.correctionHistory || '[]'),
    specialty: row.specialty as Specialty
  }));
};

export const getArtifactById = (id: string): Artifact | null => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.execute(`SELECT * FROM artifacts WHERE id = ?`, [id]);
  const row = result.rows?._array?.[0];
  if (!row) return null;
  
  return {
    ...row,
    correctionHistory: JSON.parse(row.correctionHistory || '[]'),
    specialty: row.specialty as Specialty
  };
};

export const incrementRetrievalCount = (id: string): void => {
  if (!db) throw new Error('Database not initialized');
  db.execute(`UPDATE artifacts SET retrievalCount = retrievalCount + 1 WHERE id = ?`, [id]);
};

export const addCorrection = (artifactId: string, correction: { diff: string; impactScore: number }): void => {
  if (!db) throw new Error('Database not initialized');
  
  const artifact = getArtifactById(artifactId);
  if (!artifact) return;
  
  const newHistory = [...artifact.correctionHistory, { ...correction, timestamp: Date.now() }];
  const newSelfRating = (artifact.selfRating + correction.impactScore) / 2;
  const newTradeValue = calculateTradeValue({ ...artifact, selfRating: newSelfRating, correctionHistory: newHistory });
  
  db.execute(
    `UPDATE artifacts SET correctionHistory = ?, selfRating = ?, tradeValue = ? WHERE id = ?`,
    [JSON.stringify(newHistory), newSelfRating, newTradeValue, artifactId]
  );
};

export const savePeer = (peer: Peer): void => {
  if (!db) throw new Error('Database not initialized');
  
  db.execute(
    `INSERT OR REPLACE INTO peers (id, binId, alias, specialty, avgTradeValue, artifactCount, lastActive, connected)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [peer.id, peer.binId, peer.alias, peer.specialty, peer.avgTradeValue, peer.artifactCount, peer.lastActive, peer.connected ? 1 : 0]
  );
};

export const getPeers = (): Peer[] => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.execute(`SELECT * FROM peers ORDER BY avgTradeValue DESC`);
  return (result.rows?._array || []).map(row => ({
    ...row,
    specialty: row.specialty as Specialty,
    connected: row.connected === 1
  }));
};

export const getConnectedPeers = (): Peer[] => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.execute(`SELECT * FROM peers WHERE connected = 1 ORDER BY avgTradeValue DESC`);
  return (result.rows?._array || []).map(row => ({
    ...row,
    specialty: row.specialty as Specialty,
    connected: true
  }));
};

export const saveTradeEvent = (event: TradeEvent): void => {
  if (!db) throw new Error('Database not initialized');
  
  db.execute(
    `INSERT INTO trade_events (id, timestamp, type, artifactId, peerId, tradeValueDelta)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [event.id, event.timestamp, event.type, event.artifactId || null, event.peerId || null, event.tradeValueDelta]
  );
};

export const getTradeHistory = (limit: number = 50): TradeEvent[] => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.execute(
    `SELECT * FROM trade_events ORDER BY timestamp DESC LIMIT ?`,
    [limit]
  );
  return (result.rows?._array || []).map(row => ({
    ...row,
    type: row.type as 'sent' | 'received' | 'accepted' | 'rejected'
  }));
};

export const saveModelPriority = (models: ModelInfo[]): void => {
  if (!db) throw new Error('Database not initialized');
  
  models.forEach((model, index) => {
    db!.execute(
      `INSERT OR REPLACE INTO model_priority (id, priority, enabled) VALUES (?, ?, ?)`,
      [model.id, index, model.enabled ? 1 : 0]
    );
  });
};

export const getModelPriority = (): ModelInfo[] => {
  if (!db) throw new Error('Database not initialized');
  
  const result = db.execute(
    `SELECT m.id, m.name, m.provider, m.contextLength, m.modality, m.latency, m.lastUsed, p.priority, p.enabled
     FROM model_priority p
     JOIN (
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ) m(id, name, provider, contextLength, modality, latency, lastUsed) ON m.id = p.id
     ORDER BY p.priority`,
    []
  );
  
  return (result.rows?._array || []).map(row => ({
    id: row.id,
    name: row.name,
    provider: row.provider,
    contextLength: row.contextLength,
    modality: row.modality,
    latency: row.latency,
    lastUsed: row.lastUsed,
    enabled: row.enabled === 1
  }));
};

export const saveSetting = (key: string, value: string): void => {
  if (!db) throw new Error('Database not initialized');
  db.execute(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [key, value]);
};

export const getSetting = (key: string): string | null => {
  if (!db) throw new Error('Database not initialized');
  const result = db.execute(`SELECT value FROM settings WHERE key = ?`, [key]);
  return result.rows?._array?.[0]?.value || null;
};

export const getSettings = (): Settings => {
  return {
    apiKey: getSetting('apiKey') || '',
    jsonBinKey: getSetting('jsonBinKey') || '',
    jsonBinId: getSetting('jsonBinId') || '',
    autoSyncEnabled: getSetting('autoSyncEnabled') === 'true',
    syncIntervalHours: parseInt(getSetting('syncIntervalHours') || '6', 10),
    minTradeValueThreshold: parseFloat(getSetting('minTradeValueThreshold') || '3.0'),
    maxArtifactsPerCycle: parseInt(getSetting('maxArtifactsPerCycle') || '50', 10),
    nodeAlias: getSetting('nodeAlias') || 'Freeride-Node',
    acceptConnectionsThreshold: parseFloat(getSetting('acceptConnectionsThreshold') || '2.0')
  };
};

export const saveSettings = (settings: Settings): void => {
  Object.entries(settings).forEach(([key, value]) => {
    saveSetting(key, String(value));
  });
};

export const getAverageTradeValue = (): number => {
  if (!db) throw new Error('Database not initialized');
  const result = db.execute(`SELECT AVG(tradeValue) as avg FROM artifacts`);
  return result.rows?._array?.[0]?.avg || 0;
};

export const getArtifactCount = (): number => {
  if (!db) throw new Error('Database not initialized');
  const result = db.execute(`SELECT COUNT(*) as count FROM artifacts`);
  return result.rows?._array?.[0]?.count || 0;
};
