import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

export interface MCPLogEntry {
  id: string;
  timestamp: string;
  direction: 'request' | 'response';
  method: string;
  data: any;
  success: boolean;
  error?: string;
}

let mcpClient: Client | null = null;
let mcpLogs: MCPLogEntry[] = [];

function logMCPInteraction(entry: Omit<MCPLogEntry, 'id' | 'timestamp'>) {
  const logEntry: MCPLogEntry = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  mcpLogs.push(logEntry);
  // Keep only last 100 entries
  if (mcpLogs.length > 100) {
    mcpLogs = mcpLogs.slice(-100);
  }
}

async function getMcpClient(): Promise<Client> {
  if (mcpClient) {
    return mcpClient;
  }

  const serverPath = path.join(process.cwd(), '..', 'mcp-server', 'dist', 'index.js');
  
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
  });

  mcpClient = new Client(
    {
      name: 'planner-dashboard-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await mcpClient.connect(transport);
  return mcpClient;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const action = req.query.action as string[];

    // Special endpoint for fetching logs
    if (req.method === 'GET' && action[0] === 'logs') {
      return res.json({ logs: mcpLogs });
    }

    // Special endpoint for server status
    if (req.method === 'GET' && action[0] === 'status') {
      const isConnected = mcpClient !== null;
      let capabilities = null;
      
      if (isConnected) {
        try {
          const tools = await mcpClient!.listTools();
          const resources = await mcpClient!.listResources();
          capabilities = {
            tools: tools.tools || [],
            resources: resources.resources || [],
            prompts: []
          };
        } catch (error) {
          // Connection might be broken
        }
      }
      
      return res.json({
        connected: isConnected,
        capabilities,
        messageCount: mcpLogs.length
      });
    }

    const client = await getMcpClient();

    if (req.method === 'GET') {
      if (action[0] === 'resources') {
        if (action.length === 1) {
          logMCPInteraction({
            direction: 'request',
            method: 'listResources',
            data: {},
            success: false
          });

          const result = await client.listResources();
          
          logMCPInteraction({
            direction: 'response',
            method: 'listResources',
            data: result,
            success: true
          });

          return res.json(result);
        } else {
          const resourceUri = action[1];
          const requestData = { uri: resourceUri };
          
          logMCPInteraction({
            direction: 'request',
            method: 'readResource',
            data: requestData,
            success: false
          });

          const result = await client.readResource(requestData);
          
          logMCPInteraction({
            direction: 'response',
            method: 'readResource',
            data: result,
            success: true
          });

          return res.json(result);
        }
      }

      if (action[0] === 'tools') {
        logMCPInteraction({
          direction: 'request',
          method: 'listTools',
          data: {},
          success: false
        });

        const result = await client.listTools();
        
        logMCPInteraction({
          direction: 'response',
          method: 'listTools',
          data: result,
          success: true
        });

        return res.json(result);
      }
    }

    if (req.method === 'POST') {
      if (action[0] === 'tools' && action[1]) {
        const toolName = action[1];
        const requestData = {
          name: toolName,
          arguments: req.body,
        };
        
        logMCPInteraction({
          direction: 'request',
          method: 'callTool',
          data: requestData,
          success: false
        });

        const result = await client.callTool(requestData);
        
        logMCPInteraction({
          direction: 'response',
          method: 'callTool',
          data: result,
          success: true
        });

        return res.json(result);
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('MCP API Error:', error);
    
    logMCPInteraction({
      direction: 'response',
      method: 'error',
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return res.status(500).json({ 
      error: 'MCP connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}