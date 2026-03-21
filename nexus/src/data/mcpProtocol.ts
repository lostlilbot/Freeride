export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType: string;
  content: string;
}

export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPCapability {
  tools: boolean;
  resources: boolean;
  prompts: boolean;
}

export class MCPClient {
  private serverUrl: string | null = null;
  private apiKey: string | null = null;
  private capabilities: MCPCapability = {
    tools: false,
    resources: false,
    prompts: false,
  };

  configure(url: string, apiKey?: string): void {
    this.serverUrl = url;
    this.apiKey = apiKey || null;
  }

  isConfigured(): boolean {
    return this.serverUrl !== null;
  }

  async listTools(): Promise<MCPTool[]> {
    if (!this.serverUrl) return [];

    try {
      const response = await fetch(`${this.serverUrl}/tools`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.tools || [];
    } catch (error) {
      console.error('[MCP] Error listing tools:', error);
      return [];
    }
  }

  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    if (!this.serverUrl) {
      throw new Error('MCP server not configured');
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    };

    const response = await fetch(`${this.serverUrl}/rpc`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP tool call failed: ${response.status}`);
    }

    const data: MCPResponse = await response.json();
    
    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }

    return data.result;
  }

  async listResources(): Promise<MCPResource[]> {
    if (!this.serverUrl) return [];

    try {
      const response = await fetch(`${this.serverUrl}/resources`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return data.resources || [];
    } catch (error) {
      console.error('[MCP] Error listing resources:', error);
      return [];
    }
  }

  async readResource(uri: string): Promise<string> {
    if (!this.serverUrl) {
      throw new Error('MCP server not configured');
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'resources/read',
      params: { uri },
    };

    const response = await fetch(`${this.serverUrl}/rpc`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`MCP resource read failed: ${response.status}`);
    }

    const data: MCPResponse = await response.json();
    return data.result?.contents?.[0]?.text || '';
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  getCapabilities(): MCPCapability {
    return this.capabilities;
  }

  setCapabilities(capabilities: MCPCapability): void {
    this.capabilities = capabilities;
  }
}

export class MCPServer {
  private tools: Map<string, (args: any) => Promise<any>> = new Map();
  private resources: Map<string, () => Promise<string>> = new Map();
  private port: number = 3456;
  private isRunning = false;

  registerTool(tool: MCPTool, handler: (args: any) => Promise<any>): void {
    this.tools.set(tool.name, handler);
    console.log(`[MCP] Registered tool: ${tool.name}`);
  }

  registerResource(uri: string, handler: () => Promise<string>): void {
    this.resources.set(uri, handler);
    console.log(`[MCP] Registered resource: ${uri}`);
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { method, params, id } = request;

    try {
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: this.tools.size > 0,
              resources: this.resources.size > 0,
            },
            serverInfo: {
              name: 'openclaw-nexus',
              version: '1.0.0',
            },
          },
        };
      }

      if (method === 'tools/list') {
        const toolList = Array.from(this.tools.keys()).map(name => ({
          name,
          description: `Tool: ${name}`,
          inputSchema: { type: 'object', properties: {} },
        }));

        return {
          jsonrpc: '2.0',
          id,
          result: { tools: toolList },
        };
      }

      if (method === 'tools/call') {
        const toolName = params?.name;
        const args = params?.arguments || {};

        const handler = this.tools.get(toolName);
        if (!handler) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Tool not found: ${toolName}`,
            },
          };
        }

        const result = await handler(args);
        return {
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(result) }] },
        };
      }

      if (method === 'resources/list') {
        const resourceList = Array.from(this.resources.keys()).map(uri => ({
          uri,
          name: uri.split('/').pop() || uri,
          mimeType: 'text/plain',
        }));

        return {
          jsonrpc: '2.0',
          id,
          result: { resources: resourceList },
        };
      }

      if (method === 'resources/read') {
        const uri = params?.uri;
        const handler = this.resources.get(uri);

        if (!handler) {
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Resource not found: ${uri}`,
            },
          };
        }

        const content = await handler();
        return {
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'text/plain', text: content }],
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      };
    } catch (error: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message || 'Internal error',
        },
      };
    }
  }

  getRegisteredTools(): string[] {
    return Array.from(this.tools.keys());
  }

  getRegisteredResources(): string[] {
    return Array.from(this.resources.keys());
  }

  isAvailable(): boolean {
    return this.isRunning;
  }
}

export const mcpClient = new MCPClient();
export const mcpServer = new MCPServer();

export function initializeMCPServer(workspaceFiles: any[]) {
  mcpServer.registerTool(
    { name: 'list_files', description: 'List files in workspace', inputSchema: {} },
    async () => ({ files: workspaceFiles.length, names: workspaceFiles.map(f => f.name) })
  );

  mcpServer.registerTool(
    { name: 'get_workspace_info', description: 'Get workspace information', inputSchema: {} },
    async () => ({ workspace: 'OpenClaw', tools: mcpServer.getRegisteredTools() })
  );

  mcpServer.registerResource(
    'nexus://status',
    async () => JSON.stringify({ status: 'online', timestamp: Date.now() })
  );
}
