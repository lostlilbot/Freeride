export interface Skill {
  name: string;
  trigger: string;
  logic_prompt: string;
  tools: string[];
  enabled: boolean;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: string;
}

export interface WorkspaceState {
  uri: string | null;
  path: string;
  files: FileInfo[];
  lastSync: Date | null;
}

export type AgentStatus = 'idle' | 'active' | 'error' | 'listening';

export interface AgentState {
  status: AgentStatus;
  activeSkill: string | null;
  memoryUsage: number;
  currentTask: string | null;
  isForegroundServiceActive: boolean;
}

export interface OpenRouterConfig {
  apiKeys: string[];
  activeKeyIndex: number;
  models: ModelInfo[];
}

export interface ModelInfo {
  id: string;
  name: string;
  context: number;
  tools: number;
  speed: number;
  lastUsed?: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
