import { ModelInfo } from '../domain/models';

const OPENROUTER_API = 'https://openrouter.ai/api/v1';

export interface ModelRanking {
  id: string;
  name: string;
  context_length: number;
  supports_vision: boolean;
  supports_tools: boolean;
  pricing: {
    prompt: string;
    completion: string;
  };
  score: number;
  is_free: boolean;
}

export class DynamicModelRanking {
  private cachedModels: ModelRanking[] = [];
  private lastFetch: number = 0;
  private cacheTTL: number = 3600000;

  private readonly WEIGHTS = {
    CONTEXT_1M: 0.4,
    TOOLS_VISION: 0.3,
    NEW_2026: 0.2,
    LOW_LATENCY: 0.1,
  };

  async fetchAndRankModels(apiKey: string): Promise<ModelRanking[]> {
    const now = Date.now();
    
    if (this.cachedModels.length > 0 && (now - this.lastFetch) < this.cacheTTL) {
      return this.cachedModels;
    }

    try {
      const response = await fetch(`${OPENROUTER_API}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('[ModelRanking] Failed to fetch models:', response.status);
        return this.getFallbackModels();
      }

      const data = await response.json();
      const models = data.data || [];

      const rankedModels = models
        .filter((m: any) => this.isFreeModel(m))
        .map((m: any) => this.scoreModel(m))
        .sort((a: ModelRanking, b: ModelRanking) => b.score - a.score);

      this.cachedModels = rankedModels;
      this.lastFetch = now;

      return rankedModels;
    } catch (error) {
      console.error('[ModelRanking] Error fetching models:', error);
      return this.getFallbackModels();
    }
  }

  private isFreeModel(model: any): boolean {
    const freeKeywords = ['free', 'flash-lite', 'huggingface', 'meta-llama', 'gemma', 'phi', 'mistral'];
    const id = model.id?.toLowerCase() || '';
    const name = model.name?.toLowerCase() || '';
    
    return (
      model.pricing?.prompt === '0' ||
      model.pricing?.completion === '0' ||
      freeKeywords.some(kw => id.includes(kw) || name.includes(kw))
    );
  }

  private scoreModel(model: any): ModelRanking {
    const id = model.id?.toLowerCase() || '';
    const name = model.name?.toLowerCase() || '';
    const context = model.context_length || 0;
    
    let score = 0;

    const contextScore = Math.min(context / 1000000, 1);
    score += contextScore * this.WEIGHTS.CONTEXT_1M * 100;

    const hasVision = model.supports_vision || id.includes('vision') || name.includes('vision');
    const hasTools = model.supports_tools || id.includes('tools') || name.includes('function');
    const toolVisionScore = ((hasVision ? 0.5 : 0) + (hasTools ? 0.5 : 0));
    score += toolVisionScore * this.WEIGHTS.TOOLS_VISION * 100;

    const isNew2026 = id.includes('2026') || id.includes('gemma-3') || id.includes('phi-4') || id.includes('llama-4');
    score += (isNew2026 ? 1 : 0.3) * this.WEIGHTS.NEW_2026 * 100;

    const latencyScore = this.estimateLatency(id, name);
    score += latencyScore * this.WEIGHTS.LOW_LATENCY * 100;

    return {
      id: model.id,
      name: model.name,
      context_length: context,
      supports_vision: hasVision,
      supports_tools: hasTools,
      pricing: model.pricing || { prompt: '0', completion: '0' },
      score,
      is_free: true,
    };
  }

  private estimateLatency(id: string, name: string): number {
    const fastKeywords = ['flash', 'lite', 'mini', 'small', 'gemma-3b', 'phi-4-mini'];
    const slowKeywords = ['large', 'xl', 'pro', 'ultra'];
    
    if (fastKeywords.some(kw => id.includes(kw) || name.includes(kw))) {
      return 0.9;
    }
    if (slowKeywords.some(kw => id.includes(kw) || name.includes(kw))) {
      return 0.4;
    }
    return 0.6;
  }

  private getFallbackModels(): ModelRanking[] {
    return [
      { id: 'google/gemini-2.0-flash-exp-free', name: 'Gemini 2.0 Flash', context_length: 1000000, supports_vision: true, supports_tools: true, pricing: { prompt: '0', completion: '0' }, score: 95, is_free: true },
      { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', context_length: 1000000, supports_vision: true, supports_tools: true, pricing: { prompt: '0', completion: '0' }, score: 90, is_free: true },
      { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout', context_length: 1000000, supports_vision: false, supports_tools: true, pricing: { prompt: '0', completion: '0' }, score: 85, is_free: true },
      { id: 'qwen/qwen3-235b-a22b', name: 'Qwen 3 235B', context_length: 32000, supports_vision: false, supports_tools: true, pricing: { prompt: '0', completion: '0' }, score: 70, is_free: true },
      { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat', context_length: 64000, supports_vision: false, supports_tools: true, pricing: { prompt: '0', completion: '0' }, score: 75, is_free: true },
      { id: 'google/gemma-3-4b-it', name: 'Gemma 3 4B', context_length: 128000, supports_vision: true, supports_tools: false, pricing: { prompt: '0', completion: '0' }, score: 80, is_free: true },
      { id: 'microsoft/phi-4-mini', name: 'Phi-4 Mini', context_length: 16000, supports_vision: false, supports_tools: true, pricing: { prompt: '0', completion: '0' }, score: 88, is_free: true },
      { id: 'mistralai/mistral-small-3.1-24b', name: 'Mistral Small 3.1', context_length: 128000, supports_vision: false, supports_tools: true, pricing: { prompt: '0', completion: '0' }, score: 78, is_free: true },
    ];
  }

  getTopModels(count: number = 5): ModelRanking[] {
    return this.cachedModels.slice(0, count);
  }

  getScoreBreakdown(model: ModelRanking): string {
    return `
Model: ${model.name}
Score: ${model.score.toFixed(1)}
Context: ${model.context_length.toLocaleString()} tokens
Vision: ${model.supports_vision ? 'Yes' : 'No'}
Tools: ${model.supports_tools ? 'Yes' : 'No'}
Free: ${model.is_free ? 'Yes' : 'No'}
    `.trim();
  }
}

export const dynamicModelRanking = new DynamicModelRanking();
