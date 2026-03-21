export interface AgentCard {
  agent_id: string;
  name: string;
  version: string;
  description?: string;
  protocols: string[];
  capabilities: string[];
  trading_policy: TradingPolicy;
  endpoints?: {
    mcp_rpc?: string;
    a2a_discovery?: string;
    health?: string;
  };
  limits?: {
    max_concurrent_tasks?: number;
    max_context_tokens?: number;
    offline_capable?: boolean;
  };
  security?: {
    key_storage?: string;
    file_access?: string;
    api_keys?: string;
  };
}

export interface TradingPolicy {
  currency: string;
  preferred_trades: string[];
  escrow_mode: 'manual_approval' | 'automatic';
  min_trade_value: number;
}

export type MercenaryMode = 'idle' | 'proposing' | 'negotiating' | 'trading';

export interface TradeProposal {
  id: string;
  counterpart_id: string;
  offer: string;
  request: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  timestamp: number;
}

export interface A2AMessage {
  agent_id: string;
  message: string;
  type: 'handshake' | 'proposal' | 'response' | 'completion';
  correlation_id?: string;
}
