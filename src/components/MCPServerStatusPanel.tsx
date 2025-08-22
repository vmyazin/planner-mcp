import { useState } from 'react';
import useSWR from 'swr';
import { Monitor, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface ServerStatus {
  connected: boolean;
  capabilities: {
    tools: any[];
    resources: any[];
    prompts: any[];
  } | null;
  messageCount: number;
}

interface MCPServerStatusPanelProps {
  simulatedError: boolean;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const MCPServerStatusPanel = ({ simulatedError }: MCPServerStatusPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { data: statusData } = useSWR<ServerStatus>('/api/mcp/status', fetcher, { refreshInterval: 2000 });
  
  const isConnected = simulatedError ? false : (statusData?.connected ?? false);
  const connectionText = simulatedError ? 'Connection Error (Simulated)' : 
                        (statusData?.connected ? 'Connected' : 'Disconnected');

  const totalCapabilities = statusData?.capabilities ? 
    (statusData.capabilities.resources.length + 
    statusData.capabilities.tools.length + 
    statusData.capabilities.prompts.length) : 0;

  return (
    <div className="tour-server-status" style={{ border: '1px solid #ccc', borderRadius: '5px', height: isCollapsed ? 'auto' : '200px', display: 'flex', flexDirection: 'column' }}>
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ 
          padding: '10px', 
          backgroundColor: '#f5f5f5', 
          borderBottom: isCollapsed ? 'none' : '1px solid #ccc', 
          fontWeight: 'bold', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <Monitor size={16} />
        MCP Server Status
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      </div>
      
      {isCollapsed ? (
        <div style={{ padding: '10px 15px', fontSize: '14px', color: '#666' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div 
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: isConnected ? '#4caf50' : '#f44336',
                animation: simulatedError ? 'tour-pulse 1s infinite' : 'none'
              }}
            />
            <span>{connectionText}</span>
            <span>•</span>
            <span>{statusData?.messageCount || 0} messages</span>
            <span>•</span>
            <span>{totalCapabilities} capabilities</span>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, padding: '15px', overflow: 'auto' }}>
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  backgroundColor: isConnected ? '#4caf50' : '#f44336',
                  marginRight: '8px',
                  animation: simulatedError ? 'tour-pulse 1s infinite' : 'none'
                }}
              />
              <strong>Planner Server: {connectionText}</strong>
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Messages exchanged: {statusData?.messageCount || 0}
            </div>
            {simulatedError && (
              <div style={{ 
                marginTop: '10px', 
                padding: '8px', 
                backgroundColor: '#ffebee', 
                border: '1px solid #f44336', 
                borderRadius: '4px',
                fontSize: '12px',
                color: '#c62828'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} />
                  Connection temporarily lost. MCP will retry automatically...
                </div>
              </div>
            )}
          </div>

          {statusData?.capabilities && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Server Capabilities:</h4>
              <div style={{ fontSize: '12px' }}>
                <div><strong>Resources:</strong> {statusData.capabilities.resources.length}</div>
                {statusData.capabilities.resources.map((resource: any, i: number) => (
                  <div key={i} style={{ marginLeft: '15px', color: '#666' }}>
                    • {resource.name} ({resource.uri})
                  </div>
                ))}
                <div style={{ marginTop: '8px' }}><strong>Tools:</strong> {statusData.capabilities.tools.length}</div>
                {statusData.capabilities.tools.map((tool: any, i: number) => (
                  <div key={i} style={{ marginLeft: '15px', color: '#666' }}>
                    • {tool.name}
                  </div>
                ))}
                <div style={{ marginTop: '8px' }}><strong>Prompts:</strong> {statusData.capabilities.prompts.length}</div>
                {statusData.capabilities.prompts.map((prompt: any, i: number) => (
                  <div key={i} style={{ marginLeft: '15px', color: '#666' }}>
                    • {prompt.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};