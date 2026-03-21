import * as Network from 'expo-network';
import { FileInfo } from '../domain/models';

export type NetworkState = 'connected' | 'disconnected' | 'unknown';

export interface OfflineIntent {
  action: 'read' | 'write' | 'list' | 'search' | 'chat' | 'unknown';
  entities: string[];
  confidence: number;
  raw: string;
}

export class OfflineCore {
  private networkState: NetworkState = 'unknown';
  private isInitialized = false;
  private localModelReady = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    this.networkState = await this.checkNetworkState();
    this.isInitialized = true;
    console.log('[OfflineCore] Initialized, network:', this.networkState);
  }

  async checkNetworkState(): Promise<NetworkState> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (networkState.isConnected) {
        this.networkState = 'connected';
      } else {
        this.networkState = 'disconnected';
      }
    } catch (error) {
      console.error('[OfflineCore] Error checking network:', error);
      this.networkState = 'unknown';
    }
    return this.networkState;
  }

  isOnline(): boolean {
    return this.networkState === 'connected';
  }

  isOffline(): boolean {
    return this.networkState === 'disconnected';
  }

  getNetworkState(): NetworkState {
    return this.networkState;
  }

  setLocalModelReady(ready: boolean): void {
    this.localModelReady = ready;
  }

  isLocalModelReady(): boolean {
    return this.localModelReady;
  }

  parseIntentOffline(userInput: string): OfflineIntent {
    const input = userInput.toLowerCase().trim();
    const words = input.split(/\s+/);
    
    const actionKeywords: Record<OfflineIntent['action'], string[]> = {
      read: ['read', 'show', 'display', 'open', 'view', 'get', 'cat'],
      write: ['write', 'create', 'save', 'make', 'new', 'add', 'append'],
      list: ['list', 'ls', 'dir', 'show', 'files', 'directory', 'folder'],
      search: ['search', 'find', 'grep', 'look', 'query'],
      chat: ['what', 'how', 'why', 'when', 'who', 'explain', 'tell'],
      unknown: [],
    };

    let bestAction: OfflineIntent['action'] = 'unknown';
    let bestConfidence = 0;

    for (const [action, keywords] of Object.entries(actionKeywords)) {
      if (action === 'unknown') continue;
      
      let matchCount = 0;
      for (const keyword of keywords) {
        if (input.includes(keyword)) {
          matchCount++;
        }
      }
      
      const confidence = matchCount / Math.max(keywords.length, 1);
      if (confidence > bestConfidence) {
        bestConfidence = confidence;
        bestAction = action as OfflineIntent['action'];
      }
    }

    const entities = words.filter(w => w.length > 3).slice(0, 5);

    return {
      action: bestAction,
      entities,
      confidence: Math.min(bestConfidence * 2, 1),
      raw: userInput,
    };
  }

  async executeOfflineAction(
    action: OfflineIntent['action'],
    entities: string[],
    workspaceFiles: FileInfo[]
  ): Promise<string> {
    switch (action) {
      case 'list':
        return this.handleList(entities, workspaceFiles);
      
      case 'read':
        return this.handleRead(entities, workspaceFiles);
      
      case 'search':
        return this.handleSearch(entities, workspaceFiles);
      
      case 'write':
        return `Offline mode: Cannot write files. Please connect to network for write operations.`;
      
      case 'chat':
        return this.handleOfflineChat(entities);
      
      default:
        return `Offline mode: Unknown action "${action}". Try: list, read, search, or connect to network for AI assistance.`;
    }
  }

  private handleList(entities: string[], files: FileInfo[]): string {
    if (entities.length === 0) {
      const dirs = files.filter(f => f.isDirectory);
      const regularFiles = files.filter(f => !f.isDirectory);
      return `📁 Directories (${dirs.length}):\n${dirs.map(f => `  ${f.name}/`).join('\n')}\n\n📄 Files (${regularFiles.length}):\n${regularFiles.map(f => `  ${f.name}`).join('\n')}`;
    }

    const target = entities[0].toLowerCase();
    const matching = files.filter(f => f.name.toLowerCase().includes(target));
    
    if (matching.length === 0) {
      return `No files matching "${entities[0]}" found.`;
    }

    return matching.map(f => `${f.isDirectory ? '📁' : '📄'} ${f.name}`).join('\n');
  }

  private handleRead(entities: string[], files: FileInfo[]): string {
    if (entities.length === 0) {
      return 'Specify a file to read. Usage: read <filename>';
    }

    const target = entities.join(' ').toLowerCase();
    const matching = files.filter(f => f.name.toLowerCase().includes(target));

    if (matching.length === 0) {
      return `File "${entities.join(' ')}" not found.`;
    }

    const file = matching[0];
    if (file.isDirectory) {
      return `"${file.name}" is a directory.`;
    }

    return `📄 ${file.name}\n\n[File content would be read here in offline mode]\n\nNote: Full content requires network connection.`;
  }

  private handleSearch(entities: string[], files: FileInfo[]): string {
    if (entities.length === 0) {
      return 'Specify search term. Usage: search <term>';
    }

    const query = entities.join(' ').toLowerCase();
    const results = files.filter(f => f.name.toLowerCase().includes(query));

    if (results.length === 0) {
      return `No matches found for "${entities.join(' ')}"`;
    }

    return `🔍 Search results for "${entities.join(' ')}":\n\n${results.map(f => 
      `${f.isDirectory ? '📁' : '📄'} ${f.name}`
    ).join('\n')}`;
  }

  private handleOfflineChat(entities: string[]): string {
    const responses: Record<string, string> = {
      help: `Available offline commands:\n• list - Show workspace files\n• read <filename> - Preview a file\n• search <term> - Find files\n\nConnect to network for AI assistance.`,
      status: `Network: ${this.networkState}\nLocal Model: ${this.localModelReady ? 'Ready' : 'Not loaded'}`,
      time: `Current time: ${new Date().toLocaleString()}`,
      date: `Today's date: ${new Date().toLocaleDateString()}`,
    };

    const query = entities.join(' ').toLowerCase();
    for (const [key, response] of Object.entries(responses)) {
      if (query.includes(key)) {
        return response;
      }
    }

    return `Offline Assistant: "${entities.join(' ')}"\n\nI can help with: listing files, reading file info, searching, and basic queries.\n\nConnect to network for full AI capabilities.`;
  }

  getStatus(): { network: NetworkState; localModel: boolean } {
    return {
      network: this.networkState,
      localModel: this.localModelReady,
    };
  }
}

export const offlineCore = new OfflineCore();
