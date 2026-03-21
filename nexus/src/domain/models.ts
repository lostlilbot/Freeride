export type Specialty = 'code' | 'research' | 'general';

export interface Artifact {
  id: string;
  timestamp: number;
  specialty: Specialty;
  input: string;
  output: string;
  selfRating: number;
  peerRating: number;
  agentId: string;
  agentAlias: string;
  correctionHistory: Correction[];
  retrievalCount: number;
  tradeValue: number;
}

export interface Correction {
  timestamp: number;
  diff: string;
  impactScore: number;
}

export interface Peer {
  id: string;
  binId: string;
  alias: string;
  specialty: Specialty;
  avgTradeValue: number;
  artifactCount: number;
  lastActive: number;
  connected: boolean;
}

export interface TradeEvent {
  id: string;
  timestamp: number;
  type: 'sent' | 'received' | 'accepted' | 'rejected';
  artifactId?: string;
  peerId?: string;
  tradeValueDelta: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  modality: string;
  latency?: number;
  lastUsed?: number;
  enabled: boolean;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
  architecture: {
    modality: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentState {
  status: 'idle' | 'active' | 'error';
  currentModel?: string;
  contextTokens: number;
  tasksCompleted: number;
  avgTradeValue: number;
  connectedPeers: number;
  lastTradeCycle?: number;
  nextSyncCountdown?: number;
}

export interface Settings {
  apiKey: string;
  jsonBinKey: string;
  jsonBinId: string;
  autoSyncEnabled: boolean;
  syncIntervalHours: number;
  minTradeValueThreshold: number;
  maxArtifactsPerCycle: number;
  nodeAlias: string;
  acceptConnectionsThreshold: number;
}
