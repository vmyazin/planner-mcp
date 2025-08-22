import { useState } from 'react';
import { Target } from 'lucide-react';
import { TaskList } from './TaskList';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
  date?: string;
}

interface Schedule {
  morning: Task[];
  afternoon: Task[];
  evening: Task[];
  unscheduled: Task[];
}

interface DayBoardProps {
  date: Date;
  schedule: Schedule;
  onAddTask: (text: string, timeSlot?: string) => Promise<void>;
  onCompleteTask: (taskId: string) => void;
  onArchiveTask: (taskId: string) => void;
  onPlanDay: () => Promise<void>;
  loading: boolean;
}

export const DayBoard = ({ 
  date, 
  schedule, 
  onAddTask, 
  onCompleteTask, 
  onArchiveTask, 
  onPlanDay, 
  loading 
}: DayBoardProps) => {
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [useSmartCategorization, setUseSmartCategorization] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    await onAddTask(newTaskText, useSmartCategorization ? undefined : selectedTimeSlot);
    setNewTaskText('');
    setSelectedTimeSlot('');
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* Task Input Form */}
      <div style={{ padding: '20px', borderBottom: '1px solid #e9ecef' }}>
        <form onSubmit={handleSubmit} style={{ 
          padding: '15px', 
          backgroundColor: '#f5f5f5', 
          borderRadius: '8px' 
        }}>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder={useSmartCategorization 
                ? "Describe your task naturally (e.g., morning jog, evening meeting)..." 
                : "Enter a new task for this day..."
              }
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '10px', 
                fontSize: '16px',
                border: useSmartCategorization ? '2px solid #4CAF50' : '1px solid #ddd',
                borderRadius: '6px',
                outline: 'none'
              }}
            />
          </div>
          
          <div style={{ 
            marginBottom: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px' 
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '14px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={useSmartCategorization}
                onChange={(e) => {
                  setUseSmartCategorization(e.target.checked);
                  if (e.target.checked) {
                    setSelectedTimeSlot('');
                  }
                }}
                disabled={loading}
              />
              🤖 Smart categorization
            </label>
            {useSmartCategorization && (
              <span style={{ 
                fontSize: '12px', 
                color: '#4CAF50', 
                fontStyle: 'italic' 
              }}>
                AI will automatically choose the best time slot
              </span>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!useSmartCategorization && (
              <select
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                disabled={loading}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="">Choose time slot (optional)</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
              </select>
            )}
            
            <button 
              type="submit" 
              disabled={loading || !newTaskText.trim()}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: useSmartCategorization ? '#4CAF50' : '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px',
                cursor: loading || !newTaskText.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Adding...' : (useSmartCategorization ? '✨ Add Smart Task' : 'Add Task')}
            </button>
          </div>
        </form>

        {/* Plan Day Button */}
        {schedule.unscheduled.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <button
              onClick={onPlanDay}
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {loading ? 'Planning...' : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={16} />
                  Plan This Day
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Task Lists */}
      <div style={{ 
        flex: 1, 
        padding: '20px', 
        overflowY: 'auto',
        display: 'grid', 
        gap: '16px' 
      }}>
        <TaskList 
          tasks={schedule.morning} 
          title="Morning" 
          onCompleteTask={onCompleteTask} 
          onArchiveTask={onArchiveTask} 
          loading={loading} 
        />
        <TaskList 
          tasks={schedule.afternoon} 
          title="Afternoon" 
          onCompleteTask={onCompleteTask} 
          onArchiveTask={onArchiveTask} 
          loading={loading} 
        />
        <TaskList 
          tasks={schedule.evening} 
          title="Evening" 
          onCompleteTask={onCompleteTask} 
          onArchiveTask={onArchiveTask} 
          loading={loading} 
        />
        {schedule.unscheduled.length > 0 && (
          <TaskList 
            tasks={schedule.unscheduled} 
            title="Unscheduled" 
            onCompleteTask={onCompleteTask} 
            onArchiveTask={onArchiveTask} 
            loading={loading} 
          />
        )}
      </div>
    </div>
  );
};