import useSWR from 'swr';
import { Search } from 'lucide-react';
import { MCPLogEntry } from '../pages/api/mcp/[...action]';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const MCPProtocolInspector = () => {
  const { data: logsData } = useSWR('/api/mcp/logs', fetcher, { refreshInterval: 1000 });
  const logs: MCPLogEntry[] = logsData?.logs || [];

  return (
    <div className="tour-protocol-inspector" style={{ border: '1px solid #ccc', borderRadius: '5px', height: '300px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Search size={16} />
        MCP Protocol Inspector
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px', fontSize: '12px', fontFamily: 'monospace' }}>
        {logs.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>No MCP messages yet. Try adding a task!</div>
        ) : (
          logs.map(log => (
            <div 
              key={log.id} 
              style={{ 
                marginBottom: '10px', 
                padding: '8px', 
                backgroundColor: log.direction === 'request' ? '#e3f2fd' : '#e8f5e8',
                border: `1px solid ${log.direction === 'request' ? '#2196f3' : '#4caf50'}`,
                borderRadius: '3px'
              }}
            >
              <div style={{ fontWeight: 'bold', color: log.direction === 'request' ? '#1976d2' : '#388e3c' }}>
                {log.direction.toUpperCase()} • {log.method} • {new Date(log.timestamp).toLocaleTimeString()}
                {!log.success && <span style={{ color: 'red' }}> • ERROR</span>}
              </div>
              <pre style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {JSON.stringify(log.data, null, 2)}
              </pre>
              {log.error && (
                <div style={{ color: 'red', marginTop: '5px', fontWeight: 'bold' }}>
                  Error: {log.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};