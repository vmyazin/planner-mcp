import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { Target } from 'lucide-react';
import { MCPLogEntry } from './api/mcp/[...action]';
import { TourProvider, useTour } from '../contexts/TourContext';
import { TourOverlay } from '../components/TourOverlay';
import { TimedWelcomeModal } from '../components/TimedWelcomeModal';
import { DashboardHeader } from '../components/DashboardHeader';
import { TaskList } from '../components/TaskList';
import { MCPProtocolInspector } from '../components/MCPProtocolInspector';
import { MCPConceptsPanel } from '../components/MCPConceptsPanel';
import { MCPPromptsPanel } from '../components/MCPPromptsPanel';
import { MCPServerStatusPanel } from '../components/MCPServerStatusPanel';

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

const callPrompt = async (promptName: string, args: any = {}) => {
  const queryParams = new URLSearchParams(args).toString();
  const response = await fetch(`/api/mcp/prompts/${promptName}?${queryParams}`);
  
  if (!response.ok) {
    throw new Error(`Prompt call failed: ${response.statusText}`);
  }
  
  return response.json();
};




function DashboardContent() {
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [naturalLanguageTask, setNaturalLanguageTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState('');
  const [simulatedError, setSimulatedError] = useState(false);
  const { completeAction, waitingForAction, startTour, isActive, nextStep } = useTour();

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
      
      // Complete tour action if waiting
      if (waitingForAction) {
        completeAction();
      }
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

  const handleArchiveTask = async (taskId: string) => {
    setLoading(true);
    setCurrentAction('Calling tool: archive_task');
    try {
      await callTool('archive_task', { taskId });
      await mutate('/api/mcp/resources/schedule');
    } catch (error) {
      console.error('Failed to archive task:', error);
    } finally {
      setLoading(false);
      setCurrentAction('');
    }
  };

  const handleSmartAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalLanguageTask.trim()) return;

    setLoading(true);
    setCurrentAction('Calling tool: smart_add_task');
    try {
      await callTool('smart_add_task', {
        text: naturalLanguageTask,
      });
      setNaturalLanguageTask('');
      await mutate('/api/mcp/resources/schedule');
      
      // Complete tour action if waiting
      if (waitingForAction) {
        completeAction();
      }
    } catch (error) {
      console.error('Failed to add smart task:', error);
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

  // Listen for tour refresh events
  useEffect(() => {
    const handleTourRefresh = () => {
      mutate('/api/mcp/resources/schedule');
      setCurrentAction('Tour triggered resource refresh');
      setTimeout(() => setCurrentAction(''), 2000);
    };

    const handleErrorSimulation = () => {
      setSimulatedError(true);
      setCurrentAction('🚨 Simulating connection failure...');
      
      // Show error state for 3 seconds, then recovery
      setTimeout(() => {
        setCurrentAction('Connection recovered! MCP gracefully handled the error.');
        setTimeout(() => setCurrentAction(''), 2000);
      }, 3000);
    };

    const handleErrorComplete = () => {
      setSimulatedError(false);
      nextStep(); // Auto advance to next step
    };

    window.addEventListener('tour-refresh-schedule', handleTourRefresh);
    window.addEventListener('tour-simulate-error', handleErrorSimulation);
    window.addEventListener('tour-error-complete', handleErrorComplete);
    
    return () => {
      window.removeEventListener('tour-refresh-schedule', handleTourRefresh);
      window.removeEventListener('tour-simulate-error', handleErrorSimulation);
      window.removeEventListener('tour-error-complete', handleErrorComplete);
    };
  }, [nextStep]);

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Day Planner - MCP Learning Tool</h1>
        <p style={{ color: 'red' }}>Failed to connect to MCP server: {error.message}</p>
        <p>Make sure the MCP server is running.</p>
      </div>
    );
  }


  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
      <DashboardHeader />

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 120px)' }}>
        {/* Left Side - Functional Day Planner */}
        <div style={{ flex: 1, padding: '20px', borderRight: '2px solid #ccc', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          <h2 style={{ marginTop: 0 }}>Day Planner</h2>
          
          <form className="tour-add-task-form" onSubmit={handleAddTask} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
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
                className="tour-add-task-button"
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

          <form className="tour-smart-task-form" onSubmit={handleSmartAddTask} style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e8f5e8', borderRadius: '5px', border: '2px solid #4CAF50' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#2E7D32', fontSize: '16px' }}>
              🤖 Smart Task Creation
            </h3>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
              Just describe what you want to do naturally, and I'll automatically categorize it!
            </p>
            <div style={{ marginBottom: '10px' }}>
              <input
                type="text"
                value={naturalLanguageTask}
                onChange={(e) => setNaturalLanguageTask(e.target.value)}
                placeholder="e.g., make breakfast, call mom, evening workout..."
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '8px', 
                  fontSize: '16px',
                  border: '1px solid #4CAF50',
                  borderRadius: '3px'
                }}
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !naturalLanguageTask.trim()}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#4CAF50', 
                color: 'white', 
                border: 'none', 
                borderRadius: '3px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              {loading ? 'Adding...' : '✨ Add Smart Task'}
            </button>
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
                {loading ? 'Planning...' : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={16} />
                    Plan My Day
                  </div>
                )}
              </button>
            </div>
          )}

          <div className="tour-task-container" style={{ display: 'grid', gap: '15px' }}>
            <TaskList tasks={schedule.morning} title="Morning" onCompleteTask={handleCompleteTask} onArchiveTask={handleArchiveTask} loading={loading} />
            <TaskList tasks={schedule.afternoon} title="Afternoon" onCompleteTask={handleCompleteTask} onArchiveTask={handleArchiveTask} loading={loading} />
            <TaskList tasks={schedule.evening} title="Evening" onCompleteTask={handleCompleteTask} onArchiveTask={handleArchiveTask} loading={loading} />
            {schedule.unscheduled.length > 0 && (
              <TaskList tasks={schedule.unscheduled} title="Unscheduled" onCompleteTask={handleCompleteTask} onArchiveTask={handleArchiveTask} loading={loading} />
            )}
          </div>
        </div>

        {/* Right Side - Educational Panels */}
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#fafafa', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          <h2 style={{ marginTop: 0 }}>MCP Learning Center</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <MCPServerStatusPanel simulatedError={simulatedError} />
            <MCPConceptsPanel currentAction={currentAction} />
            <MCPPromptsPanel currentAction={currentAction} setCurrentAction={setCurrentAction} schedule={schedule} />
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

      <TourOverlay />
      <TimedWelcomeModal 
        intervalDays={3}
        debug={process.env.NODE_ENV === 'development'}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <TourProvider>
      <DashboardContent />
    </TourProvider>
  );
}