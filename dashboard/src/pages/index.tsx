import { useState } from 'react';
import useSWR, { mutate } from 'swr';

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

export default function Dashboard() {
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [loading, setLoading] = useState(false);

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
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setLoading(true);
    try {
      await callTool('complete_task', { taskId });
      await mutate('/api/mcp/resources/schedule');
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlanDay = async () => {
    setLoading(true);
    try {
      await callTool('plan_day');
      await mutate('/api/mcp/resources/schedule');
    } catch (error) {
      console.error('Failed to plan day:', error);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Day Planner - MCP Error</h1>
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
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>📅 Day Planner</h1>
      
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

      <div style={{ display: 'grid', gap: '20px' }}>
        <TaskList tasks={schedule.morning} title="🌅 Morning" />
        <TaskList tasks={schedule.afternoon} title="☀️ Afternoon" />
        <TaskList tasks={schedule.evening} title="🌙 Evening" />
        {schedule.unscheduled.length > 0 && (
          <TaskList tasks={schedule.unscheduled} title="📋 Unscheduled" />
        )}
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
    </div>
  );
}