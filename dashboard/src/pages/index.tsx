import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { MCPLogEntry } from './api/mcp/[...action]';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
}

interface Schedule {
  morning: Task[];
  afternoon: Task[];
  evening: Task[];
  unscheduled: Task[];
}

interface ServerStatus {
  connected: boolean;
  capabilities: {
    tools: any[];
    resources: any[];
    prompts: any[];
  } | null;
  messageCount: number;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

const callTool = async (toolName: string, args: any = {}) => {
  const response = await fetch(`/api/mcp/tools/${toolName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  
  if (!response.ok) {
    throw new Error(`Tool call failed: ${response.statusText}`);
  }
  
  return response.json();
};

const MCPProtocolInspector = () => {
  const { data: logsData } = useSWR('/api/mcp/logs', fetcher, { refreshInterval: 1000 });
  const logs: MCPLogEntry[] = logsData?.logs || [];

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '5px', height: '300px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
        🔍 MCP Protocol Inspector
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

const MCPConceptsPanel = ({ currentAction }: { currentAction: string }) => {
  const [activeTab, setActiveTab] = useState('resources');

  const concepts = {
    resources: {
      title: 'Resources',
      definition: 'Data sources that provide read-only information',
      purpose: 'Access structured data like today\'s tasks or schedule',
      example: 'Reading "today-tasks" to get current task list',
      liveExample: currentAction.includes('resource') ? '🔴 Resource being read now!' : ''
    },
    tools: {
      title: 'Tools',
      definition: 'Actions that can modify state or perform operations',
      purpose: 'Execute actions like adding tasks, completing tasks, or planning day',
      example: 'Calling "add_task" to create a new task',
      liveExample: currentAction.includes('tool') ? '🔴 Tool being called now!' : ''
    },
    prompts: {
      title: 'Prompts',
      definition: 'Templates for structured AI interactions',
      purpose: 'Guide AI responses with predefined context and format',
      example: 'Prompt for generating daily task suggestions',
      liveExample: 'Not used in this simple example'
    }
  };

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '5px', height: '250px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
        📚 Interactive MCP Concepts
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc' }}>
        {Object.entries(concepts).map(([key, concept]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            style={{
              flex: 1,
              padding: '8px',
              border: 'none',
              backgroundColor: activeTab === key ? '#2196f3' : '#f9f9f9',
              color: activeTab === key ? 'white' : 'black',
              cursor: 'pointer'
            }}
          >
            {concept.title}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, padding: '15px', overflow: 'auto' }}>
        {(() => {
          const concept = concepts[activeTab as keyof typeof concepts];
          return (
            <div>
              <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>{concept.title}</h4>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                <strong>What:</strong> {concept.definition}
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                <strong>Why:</strong> {concept.purpose}
              </p>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                <strong>Example:</strong> {concept.example}
              </p>
              {concept.liveExample && (
                <div style={{ 
                  padding: '8px', 
                  backgroundColor: '#fff3e0', 
                  border: '1px solid #ff9800', 
                  borderRadius: '3px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {concept.liveExample}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

const MCPServerStatusPanel = () => {
  const { data: statusData } = useSWR<ServerStatus>('/api/mcp/status', fetcher, { refreshInterval: 2000 });

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: '5px', height: '200px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderBottom: '1px solid #ccc', fontWeight: 'bold' }}>
        🖥️ MCP Server Status
      </div>
      <div style={{ flex: 1, padding: '15px', overflow: 'auto' }}>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                borderRadius: '50%', 
                backgroundColor: statusData?.connected ? '#4caf50' : '#f44336',
                marginRight: '8px'
              }}
            />
            <strong>Planner Server: {statusData?.connected ? 'Connected' : 'Disconnected'}</strong>
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Messages exchanged: {statusData?.messageCount || 0}
          </div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState('');

  const { data: scheduleData, error } = useSWR<{ contents: [{ text: string }] }>(
    '/api/mcp/resources/schedule',
    fetcher,
    { refreshInterval: 2000 }
  );

  const schedule: Schedule = scheduleData?.contents?.[0]?.text 
    ? JSON.parse(scheduleData.contents[0].text)
    : { morning: [], afternoon: [], evening: [], unscheduled: [] };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    setLoading(true);
    setCurrentAction('Calling tool: add_task');
    try {
      await callTool('add_task', {
        text: newTaskText,
        ...(selectedTimeSlot && { timeSlot: selectedTimeSlot }),
      });
      setNewTaskText('');
      setSelectedTimeSlot('');
      await mutate('/api/mcp/resources/schedule');
    } catch (error) {
      console.error('Failed to add task:', error);
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setLoading(true);
    setCurrentAction('Calling tool: complete_task');
    try {
      await callTool('complete_task', { taskId });
      await mutate('/api/mcp/resources/schedule');
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handlePlanDay = async () => {
    setLoading(true);
    setCurrentAction('Calling tool: plan_day');
    try {
      await callTool('plan_day');
      await mutate('/api/mcp/resources/schedule');
    } catch (error) {
      console.error('Failed to plan day:', error);
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  useEffect(() => {
    if (scheduleData) {
      setCurrentAction('Reading resource: schedule');
      const timer = setTimeout(() => setCurrentAction(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [scheduleData]);

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Day Planner - MCP Learning Tool</h1>
        <p style={{ color: 'red' }}>Failed to connect to MCP server: {error.message}</p>
        <p>Make sure the MCP server is running.</p>
      </div>
    );
  }

  const TaskList = ({ tasks, title }: { tasks: Task[]; title: string }) => (
    <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h3>{title} ({tasks.length})</h3>
      {tasks.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No tasks</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map(task => (
            <li key={task.id} style={{ 
              marginBottom: '8px', 
              display: 'flex', 
              alignItems: 'center',
              textDecoration: task.completed ? 'line-through' : 'none',
              opacity: task.completed ? 0.6 : 1
            }}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleCompleteTask(task.id)}
                disabled={loading}
                style={{ marginRight: '10px' }}
              />
              <span>{task.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
      <div style={{ padding: '20px', backgroundColor: '#1976d2', color: 'white' }}>
        <h1 style={{ margin: 0 }}>📅 MCP Day Planner - Learning Tool</h1>
        <p style={{ margin: '5px 0 0 0', opacity: 0.9 }}>
          Learn MCP protocol by seeing it in action • Watch the right panel as you interact!
        </p>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 120px)' }}>
        {/* Left Side - Functional Day Planner */}
        <div style={{ flex: 1, padding: '20px', borderRight: '2px solid #ccc' }}>
          <h2 style={{ marginTop: 0 }}>Day Planner</h2>
          
          <form onSubmit={handleAddTask} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Enter a new task..."
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  fontSize: '16px',
                  border: '1px solid #ccc',
                  borderRadius: '3px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                disabled={loading}
                style={{ padding: '8px', borderRadius: '3px', border: '1px solid #ccc' }}
              >
                <option value="">Choose time slot (optional)</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
              
              <button 
                type="submit" 
                disabled={loading || !newTaskText.trim()}
                style={{ 
                  padding: '8px 16px', 
                  backgroundColor: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '3px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </div>
          </form>

          {schedule.unscheduled.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={handlePlanDay}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Planning...' : '🎯 Plan My Day'}
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gap: '15px' }}>
            <TaskList tasks={schedule.morning} title="🌅 Morning" />
            <TaskList tasks={schedule.afternoon} title="☀️ Afternoon" />
            <TaskList tasks={schedule.evening} title="🌙 Evening" />
            {schedule.unscheduled.length > 0 && (
              <TaskList tasks={schedule.unscheduled} title="📋 Unscheduled" />
            )}
          </div>
        </div>

        {/* Right Side - Educational Panels */}
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#fafafa' }}>
          <h2 style={{ marginTop: 0 }}>MCP Learning Center</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <MCPServerStatusPanel />
            <MCPConceptsPanel currentAction={currentAction} />
            <MCPProtocolInspector />
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          right: '10px', 
          padding: '10px', 
          backgroundColor: '#007bff', 
          color: 'white', 
          borderRadius: '3px' 
        }}>
          Working...
        </div>
      )}

      {currentAction && (
        <div style={{ 
          position: 'fixed', 
          bottom: '10px', 
          right: '10px', 
          padding: '10px', 
          backgroundColor: '#ff9800', 
          color: 'white', 
          borderRadius: '3px',
          fontWeight: 'bold'
        }}>
          {currentAction}
        </div>
      )}
    </div>
  );
}