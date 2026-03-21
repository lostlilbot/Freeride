import { ModelInfo, OpenRouterModel, ChatMessage } from '../domain/models';
import { getModelPriority, saveModelPriority, saveSetting, getSetting } from './database';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const MODELS_CACHE_TTL = 24 * 60 * 60 * 1000;

let cachedModels: ModelInfo[] = [];
let lastModelsFetch = 0;

export const fetchFreeModels = async (apiKey: string): Promise<ModelInfo[]> => {
  try {
    const response = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/lostlilbot/Freeride',
        'X-Title': 'Freeride Nexus'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const freeModels: ModelInfo[] = (data.data || [])
      .filter((model: OpenRouterModel) => 
        parseFloat(model.pricing.prompt) === 0 && 
        parseFloat(model.pricing.completion) === 0 && 
        model.context_length >= 8192
      )
      .map((model: OpenRouterModel) => ({
        id: model.id,
        name: model.name,
        provider: model.id.split('/')[0],
        contextLength: model.context_length,
        modality: model.architecture?.modality || 'text',
        latency: undefined,
        lastUsed: undefined,
        enabled: true
      }));

    cachedModels = freeModels;
    lastModelsFetch = Date.now();
    
    return freeModels;
  } catch (error) {
    console.error('Error fetching models:', error);
    return cachedModels;
  }
};

export const getCachedModels = async (apiKey: string): Promise<ModelInfo[]> => {
  if (Date.now() - lastModelsFetch < MODELS_CACHE_TTL && cachedModels.length > 0) {
    return cachedModels;
  }
  return fetchFreeModels(apiKey);
};

export const refreshModels = async (apiKey: string): Promise<ModelInfo[]> => {
  lastModelsFetch = 0;
  return getCachedModels(apiKey);
};

export const setModelPriority = (models: ModelInfo[]): void => {
  saveModelPriority(models);
};

export const getModelQueue = async (): Promise<ModelInfo[]> => {
  const saved = getModelPriority();
  if (saved.length > 0) {
    return saved;
  }
  return cachedModels;
};

export const createChatCompletion = async (
  apiKey: string,
  messages: ChatMessage[],
  modelId: string = 'openrouter/auto'
): Promise<{ content: string; model: string; usage?: any }> => {
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/lostlilbot/Freeride',
      'X-Title': 'Freeride Nexus',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 4096,
      temperature: 0.7,
      route: 'fallback'
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw { status: response.status, message: error.error?.message || `API error: ${response.status}` };
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || 'No response',
    model: data.model || modelId,
    usage: data.usage
  };
};

export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export const shouldSummarizeContext = (messages: ChatMessage[], maxTokens: number): boolean => {
  const totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  return totalTokens > maxTokens * 0.8;
};

export const summarizeMessages = (messages: ChatMessage[], maxMessages: number = 10): ChatMessage[] => {
  if (messages.length <= maxMessages) return messages;
  
  const systemMessages = messages.filter(m => m.role === 'system');
  const recentMessages = messages.filter(m => m.role !== 'system').slice(-maxMessages);
  
  return [...systemMessages, {
    id: 'summary',
    role: 'system' as const,
    content: `[Previous ${messages.length - maxMessages} messages summarized]`,
    timestamp: Date.now()
  }, ...recentMessages];
};

export class ModelSelector {
  private apiKey: string;
  private models: ModelInfo[] = [];
  private currentIndex: number = 0;
  private rotationLog: { modelId: string; reason: string; timestamp: number }[] = [];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async initialize(): Promise<void> {
    this.models = await getModelQueue();
    if (this.models.length === 0) {
      this.models = await fetchFreeModels(this.apiKey);
    }
  }

  getCurrentModel(): ModelInfo | null {
    return this.models[this.currentIndex] || null;
  }

  rotate(reason: string = 'manual'): void {
    if (this.models.length === 0) return;
    
    const previousModel = this.models[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.models.length;
    
    this.rotationLog.push({
      modelId: previousModel?.id || 'unknown',
      reason,
      timestamp: Date.now()
    });

    if (previousModel) {
      previousModel.lastUsed = Date.now();
    }
  }

  async attemptWithFailover(
    messages: ChatMessage[],
    on429?: () => void
  ): Promise<{ content: string; model: string }> {
    const maxAttempts = this.models.length;
    let lastError: any = null;

    for (let i = 0; i < maxAttempts; i++) {
      const model = this.getCurrentModel();
      if (!model || !model.enabled) {
        this.rotate('disabled model');
        continue;
      }

      try {
        const result = await createChatCompletion(this.apiKey, messages, model.id);
        return result;
      } catch (error: any) {
        lastError = error;
        
        if (error.status === 429 || error.status === 503) {
          this.rotate(error.status === 429 ? 'rate limited' : 'service unavailable');
          on429?.();
          continue;
        }
        
        if (error.status === 401 || error.status === 403) {
          throw new Error('Invalid API key');
        }
        
        throw error;
      }
    }

    throw lastError || new Error('All models failed');
  }

  getRotationLog(): { modelId: string; reason: string; timestamp: number }[] {
    return this.rotationLog;
  }
}
