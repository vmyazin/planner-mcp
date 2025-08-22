import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr';
import { MCPLogEntry } from './api/mcp/[...action]';
import { TourProvider, useTour } from '../contexts/TourContext';
import { TourOverlay } from '../components/TourOverlay';
import { TimedWelcomeModal } from '../components/TimedWelcomeModal';
import { DashboardHeader } from '../components/DashboardHeader';
import { DaySelector } from '../components/DaySelector';
import { DayBoard } from '../components/DayBoard';
import { WeeklyOverview } from '../components/WeeklyOverview';
import { parseTaskCommand, getTabForDate } from '../utils/commandProcessor';
import { MCPProtocolInspector } from '../components/MCPProtocolInspector';
import { MCPConceptsPanel } from '../components/MCPConceptsPanel';
import { MCPPromptsPanel } from '../components/MCPPromptsPanel';
import { MCPServerStatusPanel } from '../components/MCPServerStatusPanel';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
  date?: string; // Date in YYYY-MM-DD format
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
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState('');
  const [simulatedError, setSimulatedError] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('day-0'); // Start with today
  const { completeAction, waitingForAction, startTour, isActive, nextStep } = useTour();

  const { data: scheduleData, error } = useSWR<{ contents: [{ text: string }] }>(
    '/api/mcp/resources/schedule',
    fetcher,
    { refreshInterval: 2000 }
  );

  const allSchedule: Schedule = scheduleData?.contents?.[0]?.text 
    ? JSON.parse(scheduleData.contents[0].text)
    : { morning: [], afternoon: [], evening: [], unscheduled: [] };

  // Filter tasks for the selected date - true day separation
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];
  
  const schedule: Schedule = {
    morning: allSchedule.morning.filter(task => {
      // Tasks without date show only on today (for backward compatibility during migration)
      // Tasks with date show only on their specific day
      return task.date === selectedDateStr || (!task.date && selectedDateStr === todayStr);
    }),
    afternoon: allSchedule.afternoon.filter(task => {
      return task.date === selectedDateStr || (!task.date && selectedDateStr === todayStr);
    }),
    evening: allSchedule.evening.filter(task => {
      return task.date === selectedDateStr || (!task.date && selectedDateStr === todayStr);
    }),
    unscheduled: allSchedule.unscheduled.filter(task => {
      return task.date === selectedDateStr || (!task.date && selectedDateStr === todayStr);
    })
  };

  const handleAddTaskForDate = async (text: string, timeSlot?: string, targetDate?: Date) => {
    setLoading(true);
    
    try {
      const taskDate = (targetDate || selectedDate).toISOString().split('T')[0];
      
      if (!timeSlot) { // Smart categorization
        setCurrentAction('Calling tool: smart_add_task');
        await callTool('smart_add_task', {
          text: text,
          date: taskDate,
        });
      } else {
        setCurrentAction('Calling tool: add_task');
        await callTool('add_task', {
          text: text,
          date: taskDate,
          timeSlot: timeSlot,
        });
      }
      
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

  const handleNavigateToDay = (date: Date, tabId: string) => {
    setSelectedDate(date);
    setActiveTab(tabId);
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
      const taskDate = selectedDate.toISOString().split('T')[0];
      await callTool('plan_day', { date: taskDate });
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
        {/* Left Side - Tabbed Day Planner */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '2px solid #ccc', maxHeight: 'calc(100vh - 120px)' }}>
          <div style={{ padding: '20px 20px 0 20px' }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Day Planner
              <span style={{ 
                fontSize: '18px', 
                fontWeight: '400', 
                color: '#666',
                marginLeft: '8px'
              }}>
                • {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </h2>
            
            <DaySelector 
              selectedDate={selectedDate} 
              onDateChange={setSelectedDate}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {activeTab === 'overview' ? (
              <WeeklyOverview 
                allSchedule={allSchedule}
                onDateSelect={(date) => {
                  setSelectedDate(date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dayIndex = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  setActiveTab(`day-${dayIndex}`);
                }}
              />
            ) : (
              <DayBoard
                date={selectedDate}
                schedule={schedule}
                onAddTask={handleAddTaskForDate}
                onCompleteTask={handleCompleteTask}
                onArchiveTask={handleArchiveTask}
                onPlanDay={handlePlanDay}
                loading={loading}
              />
            )}
          </div>
        </div>

        {/* Right Side - Educational Panels */}
        <div style={{ flex: 1, padding: '20px', backgroundColor: '#fafafa', overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
          <h2 style={{ marginTop: 0 }}>MCP Learning Center</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <MCPServerStatusPanel simulatedError={simulatedError} />
            <MCPConceptsPanel currentAction={currentAction} />
            <MCPPromptsPanel 
              currentAction={currentAction} 
              setCurrentAction={setCurrentAction} 
              schedule={schedule}
              onScheduleUpdate={() => mutate('/api/mcp/resources/schedule')}
              onNavigateToDay={handleNavigateToDay}
            />
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