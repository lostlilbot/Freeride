import { ModelInfo, ChatMessage } from '../domain/models';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const OPENROUTER_API_KEY = "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";

const AGENT_ATTRIBUTION_HEADERS = {
  'HTTP-Referer': 'https://github.com/lostlilbot/Freeride',
  'X-Title': 'Nexus Prime Sovereign',
};

const DEFAULT_MODELS: ModelInfo[] = [
  { id: 'google/gemini-2.0-flash-exp-free', name: 'Gemini 2.0 Flash', context: 1000000, tools: 15, speed: 95 },
  { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', context: 1000000, tools: 15, speed: 90 },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', context: 1000000, tools: 12, speed: 85 },
  { id: 'qwen/qwen3-235b-a22b', name: 'Qwen 3 235B', context: 32000, tools: 10, speed: 70 },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat', context: 64000, tools: 12, speed: 80 },
];

export interface CompletionRequest {
  messages: ChatMessage[];
  skill?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export class OpenRouterGateway {
  private apiKeys: string[] = [];
  private activeKeyIndex: number = 0;
  private models: ModelInfo[] = DEFAULT_MODELS;

  setApiKeys(keys: string[]) {
    this.apiKeys = keys;
    this.activeKeyIndex = 0;
  }

  getApiKeys(): string[] {
    return this.apiKeys;
  }

  getModels(): ModelInfo[] {
    return this.models;
  }

  private rankModels(context?: string): ModelInfo[] {
    const scored = this.models.map(model => {
      let score = 0;
      
      if (context) {
        const contextKeywords = context.toLowerCase().split(' ');
        const hasContext = contextKeywords.some(kw => 
          model.name.toLowerCase().includes(kw) || 
          model.id.toLowerCase().includes(kw)
        );
        score += hasContext ? 40 : 20;
      } else {
        score += 20;
      }
      
      score += (model.tools / 20) * 30;
      score += model.speed * 0.1;
      
      const daysSinceUpdate = model.lastUsed 
        ? (Date.now() - model.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
        : 30;
      score += Math.max(0, 20 - daysSinceUpdate * 0.5);
      
      return { model, score };
    });

    return scored.sort((a, b) => b.score - a.score).map(s => s.model);
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (this.apiKeys.length === 0) {
      throw new Error('No API keys configured. Please add an OpenRouter API key in Settings.');
    }

    const rankedModels = this.rankModels(request.skill);
    let lastError: Error | null = null;

    for (const model of rankedModels) {
      const apiKey = this.apiKeys[this.activeKeyIndex];
      
      try {
        const response = await this.makeRequest(apiKey, model.id, request);
        
        const modelInfo = this.models.find(m => m.id === model.id);
        if (modelInfo) {
          modelInfo.lastUsed = new Date();
        }
        
        return {
          content: response.choices?.[0]?.message?.content || 'No response',
          model: model.id,
          usage: response.usage,
        };
      } catch (error: any) {
        lastError = error;
        
        if (error.status === 429) {
          console.warn(`Rate limited on model ${model.id}, trying next...`);
          this.rotateKey();
          continue;
        }
        
        if (error.status === 403 || error.status === 401) {
          this.rotateKey();
          continue;
        }
        
        throw error;
      }
    }

    throw lastError || new Error('All models failed');
  }

  private async makeRequest(
    apiKey: string, 
    modelId: string, 
    request: CompletionRequest
  ): Promise<any> {
    const systemPrompt = request.skill 
      ? `You are executing the "${request.skill}" skill. ${request.skill}`
      : 'You are OpenClaw Nexus, a helpful AI assistant.';

    const messages = [
      { role: 'system', content: systemPrompt },
      ...request.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/lostlilbot/Freeride',
        'X-Title': 'Nexus Prime Sovereign',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature || 0.7,
        route: 'fallback'
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const err = new Error(error.error?.message || `API error: ${response.status}`);
      (err as any).status = response.status;
      throw err;
    }

    return response.json();
  }

  private rotateKey() {
    if (this.apiKeys.length > 1) {
      this.activeKeyIndex = (this.activeKeyIndex + 1) % this.apiKeys.length;
      console.log(`Rotated to backup key index: ${this.activeKeyIndex}`);
    }
  }

  getActiveKeyInfo(): { index: number; total: number; keyPreview: string } {
    const key = this.apiKeys[this.activeKeyIndex] || '';
    return {
      index: this.activeKeyIndex,
      total: this.apiKeys.length,
      keyPreview: key ? `${key.slice(0, 7)}...${key.slice(-4)}` : 'Not set',
    };
  }
}

export const openRouterGateway = new OpenRouterGateway();
