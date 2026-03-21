import { memoryEngine, MemoryEntry } from './memoryEngine';

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface ResearchResultWithRelevance extends ResearchResult {
  relevance_score: number;
}

const SEARCH_CONFIDENCE_THRESHOLD = 0.7;

export class ResearchEngine {
  private confidenceScore: number = 1.0;

  setConfidence(score: number): void {
    this.confidenceScore = Math.max(0, Math.min(1, score));
  }

  getConfidence(): number {
    return this.confidenceScore;
  }

  needsResearch(): boolean {
    return this.confidenceScore < SEARCH_CONFIDENCE_THRESHOLD;
  }

  async performResearch(query: string): Promise<ResearchResultWithRelevance[]> {
    console.log(`[Research] Low confidence (${this.confidenceScore}). Performing research on: ${query}`);
    
    try {
      const results = await this.webSearch(query);
      const processedResults = await this.processResearchResults(query, results);
      
      await this.storeResearchResults(processedResults);
      
      return processedResults;
    } catch (error) {
      console.error('[Research] Error performing research:', error);
      return [];
    }
  }

  private async webSearch(query: string): Promise<ResearchResult[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://duckduckgo.com/html/?q=${encodedQuery}&format=json`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      const results: ResearchResult[] = (data.Results || data || [])
        .slice(0, 3)
        .map((item: any) => ({
          title: item.Title || item.title || 'No title',
          url: item.URL || item.url || '',
          snippet: item.Snippet || item.snippet || item.description || '',
        }));

      return results;
    } catch (error) {
      console.error('[Research] Web search error:', error);
      return this.getFallbackResearch(query);
    }
  }

  private getFallbackResearch(query: string): ResearchResult[] {
    return [
      {
        title: `Research needed: ${query.substring(0, 50)}`,
        url: 'https://developer.android.com',
        snippet: 'Unable to perform web search. Agent should use its training to answer.',
      },
    ];
  }

  private async processResearchResults(
    query: string, 
    results: ResearchResult[]
  ): Promise<ResearchResultWithRelevance[]> {
    const queryTerms = new Set(query.toLowerCase().split(/\s+/));
    
    return results.map(result => {
      const resultTerms = new Set(
        `${result.title} ${result.snippet}`.toLowerCase().split(/\s+/)
      );
      
      let matchCount = 0;
      queryTerms.forEach(term => {
        if (term.length > 3 && resultTerms.has(term)) {
          matchCount++;
        }
      });
      
      const relevance = matchCount / Math.max(queryTerms.size, 1);
      
      return {
        ...result,
        relevance_score: relevance,
      };
    });
  }

  private async storeResearchResults(results: ResearchResultWithRelevance[]): Promise<void> {
    for (const result of results) {
      const content = `[RESEARCH] ${result.title}\n${result.snippet}\nSource: ${result.url}`;
      const embedding = new Array(128).fill(0);
      
      const words = content.toLowerCase().split(/\s+/);
      words.forEach((word) => {
        let hash = 0;
        for (let i = 0; i < word.length; i++) {
          hash = ((hash << 5) - hash) + word.charCodeAt(i);
          hash = hash & hash;
        }
        const idx = Math.abs(hash % 128);
        embedding[idx] += 1;
      });

      const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      const normalized = magnitude > 0 ? embedding.map(v => v / magnitude) : embedding;

      await memoryEngine.storeMemory({
        content,
        embedding: normalized,
        type: 'research',
        timestamp: Date.now(),
        relevance_score: result.relevance_score,
        source: result.url,
      });
    }

    console.log(`[Research] Stored ${results.length} research results`);
  }

  async getResearchContext(query: string): Promise<string> {
    const relevantMemories = await memoryEngine.retrieveRelevantContext(query, 3);
    const researchMemories = relevantMemories.filter(m => m.type === 'research');
    
    if (researchMemories.length === 0) {
      return '';
    }

    const context = researchMemories
      .map(m => `- ${m.content}`)
      .join('\n');

    return `\n\n=== RESEARCH CONTEXT ===\n${context}\n=== END RESEARCH CONTEXT ===\n`;
  }
}

export const researchEngine = new ResearchEngine();
