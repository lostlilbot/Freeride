import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkspaceState, AgentState, ChatMessage } from '../domain/models';

const KEYS = {
  WORKSPACE: 'nexus_workspace',
  AGENT_STATE: 'nexus_agent_state',
  API_KEYS: 'nexus_api_keys',
  CHAT_HISTORY: 'nexus_chat_history',
  SETTINGS: 'nexus_settings',
};

export interface AppSettings {
  fileLockEnabled: boolean;
  autoStartService: boolean;
  notificationsEnabled: boolean;
  maxMemoryMB: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  fileLockEnabled: false,
  autoStartService: false,
  notificationsEnabled: true,
  maxMemoryMB: 50,
};

export class StorageRepository {
  async saveWorkspace(workspace: WorkspaceState): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.WORKSPACE, JSON.stringify(workspace));
    } catch (error) {
      console.error('Error saving workspace:', error);
    }
  }

  async loadWorkspace(): Promise<WorkspaceState | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.WORKSPACE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading workspace:', error);
      return null;
    }
  }

  async saveAgentState(state: AgentState): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.AGENT_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving agent state:', error);
    }
  }

  async loadAgentState(): Promise<AgentState | null> {
    try {
      const data = await AsyncStorage.getItem(KEYS.AGENT_STATE);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading agent state:', error);
      return null;
    }
  }

  async saveApiKeys(keys: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.API_KEYS, JSON.stringify(keys));
    } catch (error) {
      console.error('Error saving API keys:', error);
    }
  }

  async loadApiKeys(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.API_KEYS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading API keys:', error);
      return [];
    }
  }

  async saveChatHistory(messages: ChatMessage[]): Promise<void> {
    try {
      const trimmed = messages.slice(-100);
      await AsyncStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(trimmed));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  async loadChatHistory(): Promise<ChatMessage[]> {
    try {
      const data = await AsyncStorage.getItem(KEYS.CHAT_HISTORY);
      const messages = data ? JSON.parse(data) : [];
      return messages.map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }));
    } catch (error) {
      console.error('Error loading chat history:', error);
      return [];
    }
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async loadSettings(): Promise<AppSettings> {
    try {
      const data = await AsyncStorage.getItem(KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(KEYS));
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }
}

export const storageRepository = new StorageRepository();
