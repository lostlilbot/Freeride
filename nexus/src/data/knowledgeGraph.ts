import { Artifact, Specialty, Correction, ChatMessage } from '../domain/models';
import { 
  saveArtifact, 
  getArtifactsBySpecialty, 
  getArtifactById, 
  incrementRetrievalCount,
  addCorrection,
  calculateTradeValue,
  getArtifactCount,
  getAverageTradeValue
} from './database';
import { createChatCompletion } from './openRouterGateway';

const RAG_TOP_ARTIFACTS = 3;
const RAG_MIN_TRADE_VALUE = 3.0;

export class KnowledgeGraph {
  private agentId: string;
  private agentAlias: string;

  constructor(agentId: string, agentAlias: string) {
    this.agentId = agentId;
    this.agentAlias = agentAlias;
  }

  async classifySpecialty(input: string, apiKey: string): Promise<Specialty> {
    try {
      const response = await createChatCompletion(apiKey, [
        {
          id: 'classify',
          role: 'user' as const,
          content: `Classify this task as one of: code, research, general. Reply with ONLY one word.\n\nTask: ${input.substring(0, 500)}`,
          timestamp: Date.now()
        }
      ], 'openrouter/auto');

      const classification = response.content.toLowerCase().trim();
      if (['code', 'research', 'general'].includes(classification)) {
        return classification as Specialty;
      }
    } catch (error) {
      console.error('Classification error:', error);
    }
    return 'general';
  }

  retrieveRAG(specialty: Specialty, query: string): Artifact[] {
    const artifacts = getArtifactsBySpecialty(specialty, RAG_MIN_TRADE_VALUE);
    const queryLower = query.toLowerCase();
    
    const scored = artifacts.map(artifact => {
      let relevance = 0;
      const queryWords = queryLower.split(/\s+/);
      
      for (const word of queryWords) {
        if (artifact.input.toLowerCase().includes(word)) relevance += 2;
        if (artifact.output.toLowerCase().includes(word)) relevance += 1;
      }
      
      incrementRetrievalCount(artifact.id);
      
      return { artifact, relevance };
    });

    return scored
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, RAG_TOP_ARTIFACTS)
      .map(s => s.artifact);
  }

  buildRAGPrompt(query: string, artifacts: Artifact[]): string {
    if (artifacts.length === 0) return '';
    
    const referenceMaterial = artifacts.map(a => 
      `[Source: ${a.agentAlias}, Rating: ${a.selfRating.toFixed(1)}, TradeValue: ${a.tradeValue.toFixed(1)}]\n${a.output}`
    ).join('\n\n---\n\n');

    return `=== KNOWLEDGE INJECTION ===\n${referenceMaterial}\n=== END KNOWLEDGE INJECTION ===\n\n`;
  }

  async processWithRAG(
    input: string,
    apiKey: string,
    messages: { role: string; content: string }[]
  ): Promise<{ output: string; specialty: Specialty; artifacts: Artifact[] }> {
    const specialty = await this.classifySpecialty(input, apiKey);
    const ragArtifacts = this.retrieveRAG(specialty, input);
    const ragPrompt = this.buildRAGPrompt(input, ragArtifacts);

    const enhancedMessages = [
      ...messages,
      { role: 'user', content: ragPrompt + input }
    ];

    const response = await createChatCompletion(apiKey, enhancedMessages as any, 'openrouter/auto');

    return {
      output: response.content,
      specialty,
      artifacts: ragArtifacts
    };
  }

  saveArtifactFromTask(
    input: string,
    output: string,
    specialty: Specialty,
    selfRating: number
  ): Artifact {
    const artifact: Artifact = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      specialty,
      input,
      output,
      selfRating,
      peerRating: 0,
      agentId: this.agentId,
      agentAlias: this.agentAlias,
      correctionHistory: [],
      retrievalCount: 0,
      tradeValue: calculateTradeValue({
        id: '',
        timestamp: 0,
        specialty,
        input,
        output,
        selfRating,
        peerRating: 0,
        agentId: this.agentId,
        agentAlias: this.agentAlias,
        correctionHistory: [],
        retrievalCount: 0,
        tradeValue: 0
      })
    };

    saveArtifact(artifact);
    return artifact;
  }

  applyCorrection(artifactId: string, correctionDiff: string, impactScore: number): void {
    const correction: Correction = {
      timestamp: Date.now(),
      diff: correctionDiff,
      impactScore
    };
    addCorrection(artifactId, correction);
  }

  async selfAudit(output: string, apiKey: string): Promise<number> {
    try {
      const response = await createChatCompletion(apiKey, [
        {
          id: 'audit',
          role: 'user' as const,
          content: `Rate the quality and correctness of this output from 1 to 5. Reply with a single integer only.\n\nOutput: ${output.substring(0, 1000)}`,
          timestamp: Date.now()
        }
      ], 'openrouter/auto');

      const rating = parseInt(response.content.trim(), 10);
      if (rating >= 1 && rating <= 5) {
        return rating;
      }
    } catch (error) {
      console.error('Self-audit error:', error);
    }
    return 3;
  }

  getStats(): { artifactCount: number; avgTradeValue: number } {
    return {
      artifactCount: getArtifactCount(),
      avgTradeValue: getAverageTradeValue()
    };
  }
}
