import { NextApiRequest, NextApiResponse } from 'next';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';

let mcpClient: Client | null = null;

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
    const client = await getMcpClient();
    const action = req.query.action as string[];

    if (req.method === 'GET') {
      if (action[0] === 'resources') {
        if (action.length === 1) {
          const result = await client.listResources();
          return res.json(result);
        } else {
          const resourceUri = action[1];
          const result = await client.readResource({ uri: resourceUri });
          return res.json(result);
        }
      }

      if (action[0] === 'tools') {
        const result = await client.listTools();
        return res.json(result);
      }
    }

    if (req.method === 'POST') {
      if (action[0] === 'tools' && action[1]) {
        const toolName = action[1];
        const result = await client.callTool({
          name: toolName,
          arguments: req.body,
        });
        return res.json(result);
      }
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('MCP API Error:', error);
    return res.status(500).json({ 
      error: 'MCP connection failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}