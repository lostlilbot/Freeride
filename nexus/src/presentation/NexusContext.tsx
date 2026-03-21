import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { skillEngine } from '../data/skillEngine';
import { openRouterGateway } from '../data/openRouterGateway';
import { storageRepository, AppSettings } from '../data/storageRepository';
import { memoryEngine } from '../data/memoryEngine';
import { researchEngine } from '../data/researchEngine';
import { offlineCore, NetworkState } from '../data/offlineCore';
import { mcpClient, mcpServer, initializeMCPServer } from '../data/mcpProtocol';
import { parallelOrchestrator } from '../data/parallelOrchestrator';
import { batteryManager, BatteryState } from '../data/batteryManager';
import { 
  WorkspaceState, 
  AgentState, 
  Skill, 
  ChatMessage, 
  FileInfo 
} from '../domain/models';

interface SystemInfo {
  networkState: NetworkState;
  batteryLevel: number;
  powerMode: string;
  mcpConnected: boolean;
  parallelTasks: number;
}

interface NexusState {
  workspace: WorkspaceState;
  agent: AgentState;
  skills: Skill[];
  messages: ChatMessage[];
  settings: AppSettings;
  system: SystemInfo;
  isLoading: boolean;
}

type NexusAction =
  | { type: 'SET_WORKSPACE'; payload: WorkspaceState }
  | { type: 'SET_AGENT_STATE'; payload: Partial<AgentState> }
  | { type: 'SET_SKILLS'; payload: Skill[] }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_FILES'; payload: FileInfo[] }
  | { type: 'SET_SYSTEM_INFO'; payload: Partial<SystemInfo> };

const initialState: NexusState = {
  workspace: {
    uri: null,
    path: '',
    files: [],
    lastSync: null,
  },
  agent: {
    status: 'idle',
    activeSkill: null,
    memoryUsage: 0,
    currentTask: null,
    isForegroundServiceActive: false,
  },
  skills: [],
  messages: [],
  settings: {
    fileLockEnabled: false,
    autoStartService: false,
    notificationsEnabled: true,
    maxMemoryMB: 50,
  },
  system: {
    networkState: 'unknown',
    batteryLevel: 100,
    powerMode: 'normal',
    mcpConnected: false,
    parallelTasks: 0,
  },
  isLoading: true,
};

function nexusReducer(state: NexusState, action: NexusAction): NexusState {
  switch (action.type) {
    case 'SET_WORKSPACE':
      return { ...state, workspace: action.payload };
    case 'SET_AGENT_STATE':
      return { ...state, agent: { ...state.agent, ...action.payload } };
    case 'SET_SKILLS':
      return { ...state, skills: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_FILES':
      return { ...state, workspace: { ...state.workspace, files: action.payload } };
    case 'SET_SYSTEM_INFO':
      return { ...state, system: { ...state.system, ...action.payload } };
    default:
      return state;
  }
}

interface NexusContextType {
  state: NexusState;
  pickWorkspace: () => Promise<void>;
  refreshSkills: () => Promise<void>;
  refreshFiles: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  setAgentStatus: (status: AgentState['status']) => void;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  addSkill: (skill: Skill) => Promise<boolean>;
  deleteSkill: (name: string) => Promise<boolean>;
}

const NexusContext = createContext<NexusContextType | null>(null);

export function NexusProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(nexusReducer, initialState);

  useEffect(() => {
    loadInitialState();
  }, []);

  const loadInitialState = async () => {
    try {
      await memoryEngine.initialize();
      await offlineCore.initialize();
      await batteryManager.initialize();
      
      const batteryState = batteryManager.getState();
      const networkState = offlineCore.getNetworkState();
      
      initializeMCPServer([]);
      
      dispatch({
        type: 'SET_SYSTEM_INFO',
        payload: {
          networkState,
          batteryLevel: batteryState.level,
          powerMode: batteryState.powerMode,
          mcpConnected: mcpServer.isAvailable(),
        },
      });
      
      const memoryCounts = await memoryEngine.getMemoryCount();
      
      const [workspace, agentState, apiKeys, settings, messages] = await Promise.all([
        storageRepository.loadWorkspace(),
        storageRepository.loadAgentState(),
        storageRepository.loadApiKeys(),
        storageRepository.loadSettings(),
        storageRepository.loadChatHistory(),
      ]);

      if (workspace) {
        dispatch({ type: 'SET_WORKSPACE', payload: workspace });
        if (workspace.uri) {
          skillEngine.setWorkspace(workspace.uri);
        }
      }
      
      if (agentState) {
        dispatch({ type: 'SET_AGENT_STATE', payload: agentState });
      }

      if (apiKeys.length > 0) {
        openRouterGateway.setApiKeys(apiKeys);
      }

      dispatch({ type: 'SET_SETTINGS', payload: settings });
      dispatch({ type: 'SET_MESSAGES', payload: messages });

      dispatch({ 
        type: 'SET_AGENT_STATE', 
        payload: { memoryUsage: memoryCounts.total } 
      });

      if (workspace?.uri) {
        const skills = await skillEngine.loadSkills();
        dispatch({ type: 'SET_SKILLS', payload: skills });
      }
    } catch (error) {
      console.error('Error loading initial state:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const pickWorkspace = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        const workspaceUri = asset.uri;
        
        const workspace: WorkspaceState = {
          uri: workspaceUri,
          path: asset.name,
          files: [],
          lastSync: new Date(),
        };

        dispatch({ type: 'SET_WORKSPACE', payload: workspace });
        await storageRepository.saveWorkspace(workspace);
        
        skillEngine.setWorkspace(workspaceUri);
        
        const skills = await skillEngine.loadSkills();
        dispatch({ type: 'SET_SKILLS', payload: skills });
        
        const files = await skillEngine.listWorkspaceFiles();
        dispatch({ type: 'SET_FILES', payload: files });
      }
    } catch (error) {
      console.error('Error picking workspace:', error);
    }
  };

  const refreshSkills = async () => {
    if (state.workspace.uri) {
      const skills = await skillEngine.loadSkills();
      dispatch({ type: 'SET_SKILLS', payload: skills });
    }
  };

  const refreshFiles = async () => {
    if (state.workspace.uri) {
      const files = await skillEngine.listWorkspaceFiles();
      dispatch({ type: 'SET_FILES', payload: files });
    }
  };

  const sendMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    
    const isCorrection = /^(no|wrong|incorrect|not|don't|don't know)/i.test(content) ||
      /^(fix|change|update|revise)/i.test(content);
    
    if (isCorrection && state.messages.length > 0) {
      const lastAssistantMsg = [...state.messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistantMsg) {
        await memoryEngine.storeLesson({
          trigger: content.substring(0, 50),
          lesson: `User corrected: "${lastAssistantMsg.content.substring(0, 100)}..." → "${content}"`,
          context: content,
          timestamp: Date.now(),
        });
        
        const memoryCounts = await memoryEngine.getMemoryCount();
        dispatch({ 
          type: 'SET_AGENT_STATE', 
          payload: { memoryUsage: memoryCounts.total } 
        });
      }
    }
    
    dispatch({ type: 'SET_AGENT_STATE', payload: { status: 'active' } });

    try {
      const activeSkill = state.agent.activeSkill || 'default';
      const skill = skillEngine.findSkillByTrigger(activeSkill);

      const relevantContext = await memoryEngine.retrieveRelevantContext(content, 3);
      const knowledgeInjection = await memoryEngine.generateKnowledgeInjection();
      const researchContext = await researchEngine.getResearchContext(content);

      const contextPrompt = relevantContext.length > 0 
        ? `\n\nRelevant past experiences:\n${relevantContext.map(c => `- ${c.content}`).join('\n')}`
        : '';
      
      const fullSystemPrompt = skill?.logic_prompt 
        ? `${skill.logic_prompt}${knowledgeInjection}${researchContext}${contextPrompt}`
        : `You are OpenClaw Nexus.${knowledgeInjection}${researchContext}${contextPrompt}`;

      researchEngine.setConfidence(0.9);
      
      if (researchEngine.needsResearch()) {
        researchEngine.setConfidence(0.5);
        const researchResults = await researchEngine.performResearch(content);
        if (researchResults.length > 0) {
          const newResearchContext = await researchEngine.getResearchContext(content);
        }
      }

      const response = await openRouterGateway.complete({
        messages: [...state.messages, userMessage],
        skill: fullSystemPrompt,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
      };

      dispatch({ type: 'ADD_MESSAGE', payload: assistantMessage });
      
      const allMessages = [...state.messages, userMessage, assistantMessage];
      await storageRepository.saveChatHistory(allMessages);

      await memoryEngine.storeMemory({
        content: `User: ${content}\nAssistant: ${response.content}`,
        type: 'final_output',
        timestamp: Date.now(),
        embedding: [],
      });
      
      const memoryCounts = await memoryEngine.getMemoryCount();
      dispatch({ 
        type: 'SET_AGENT_STATE', 
        payload: { 
          status: 'idle',
          memoryUsage: memoryCounts.total
        } 
      });
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to get response'}`,
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
      dispatch({ type: 'SET_AGENT_STATE', payload: { status: 'error' } });
    }
  };

  const setAgentStatus = (status: AgentState['status']) => {
    dispatch({ type: 'SET_AGENT_STATE', payload: { status } });
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...state.settings, ...newSettings };
    dispatch({ type: 'SET_SETTINGS', payload: updated });
    await storageRepository.saveSettings(updated);
  };

  const addSkill = async (skill: Skill): Promise<boolean> => {
    const success = await skillEngine.saveSkill(skill);
    if (success) {
      await refreshSkills();
    }
    return success;
  };

  const deleteSkill = async (name: string): Promise<boolean> => {
    const success = await skillEngine.deleteSkill(name);
    if (success) {
      await refreshSkills();
    }
    return success;
  };

  return (
    <NexusContext.Provider
      value={{
        state,
        pickWorkspace,
        refreshSkills,
        refreshFiles,
        sendMessage,
        setAgentStatus,
        updateSettings,
        addSkill,
        deleteSkill,
      }}
    >
      {children}
    </NexusContext.Provider>
  );
}

export function useNexus() {
  const context = useContext(NexusContext);
  if (!context) {
    throw new Error('useNexus must be used within a NexusProvider');
  }
  return context;
}
