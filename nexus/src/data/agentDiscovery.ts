import { AgentCard, TradeProposal, MercenaryMode } from './mercenaryTypes';

const AGENT_CARD: AgentCard = {
  agent_id: 'nexus_prime_mobile_v3',
  name: 'Nexus Prime Sovereign Agent',
  version: '2026.03',
  description: 'Autonomous mobile agent with P2P resource trading and self-optimization',
  protocols: ['A2A', 'MCP', 'JSON-RPC-2.0'],
  capabilities: [
    'mobile_filesystem_crud',
    'headless_web_research',
    'parallel_model_orchestration',
    'recursive_skill_generation',
    'semantic_memory_storage',
    'offline_intent_parsing',
    'battery_aware_throttling',
  ],
  trading_policy: {
    currency: 'Compute_Swap',
    preferred_trades: [
      'GPT-4o_Context',
      'Claude_3.5_Sonnet_Reasoning',
      'Gemini_Ultra_Analysis',
    ],
    escrow_mode: 'manual_approval',
    min_trade_value: 1,
  },
};

export class AgentDiscovery {
  private discoveredAgents: Map<string, AgentCard> = new Map();
  private mercenaryMode: MercenaryMode = 'idle';
  private pendingTrades: TradeProposal[] = [];

  getAgentCard(): AgentCard {
    return AGENT_CARD;
  }

  async discoverAgent(url: string): Promise<AgentCard | null> {
    try {
      const cardUrl = url.replace(/\/$/, '') + '/.well-known/agent-card.json';
      const response = await fetch(cardUrl);

      if (!response.ok) {
        console.log(`[AgentDiscovery] No agent card found at ${cardUrl}`);
        return null;
      }

      const card: AgentCard = await response.json();
      this.discoveredAgents.set(card.agent_id, card);
      
      console.log(`[AgentDiscovery] Discovered agent: ${card.name}`);
      return card;
    } catch (error) {
      console.error('[AgentDiscovery] Error discovering agent:', error);
      return null;
    }
  }

  async broadcastPresence(): Promise<void> {
    console.log('[AgentDiscovery] Broadcasting presence on local network');
  }

  setMercenaryMode(mode: MercenaryMode): void {
    this.mercenaryMode = mode;
    console.log(`[AgentDiscovery] Mercenary mode: ${mode}`);
  }

  getMercenaryMode(): MercenaryMode {
    return this.mercenaryMode;
  }

  proposeTrade(
    counterpartId: string,
    offer: string,
    request: string
  ): TradeProposal {
    const proposal: TradeProposal = {
      id: `trade_${Date.now()}`,
      counterpart_id: counterpartId,
      offer,
      request,
      status: 'pending',
      timestamp: Date.now(),
    };

    this.pendingTrades.push(proposal);
    return proposal;
  }

  async approveTrade(tradeId: string): Promise<boolean> {
    const trade = this.pendingTrades.find(t => t.id === tradeId);
    if (!trade) return false;

    trade.status = 'accepted';
    console.log(`[AgentDiscovery] Trade approved: ${tradeId}`);
    return true;
  }

  async rejectTrade(tradeId: string): Promise<boolean> {
    const trade = this.pendingTrades.find(t => t.id === tradeId);
    if (!trade) return false;

    trade.status = 'rejected';
    console.log(`[AgentDiscovery] Trade rejected: ${tradeId}`);
    return true;
  }

  getPendingTrades(): TradeProposal[] {
    return this.pendingTrades.filter(t => t.status === 'pending');
  }

  getDiscoveredAgents(): AgentCard[] {
    return Array.from(this.discoveredAgents.values());
  }

  generateA2AHandshake(counterpartName: string, laborItem: string, resourceAccess: string): string {
    return `I am Nexus-Prime [ID: ${AGENT_CARD.agent_id}]. 
I possess local filesystem CRUD, headless research capabilities, and 1M context memory. 
I propose a capability exchange. 
I will provide ${laborItem} for ${resourceAccess}. 
Acknowledge to initialize the task contract.`;
  }
}

export const agentDiscovery = new AgentDiscovery();
