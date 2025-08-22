import { Sunrise, Sun, Moon, ClipboardList, Calendar, CheckCircle2, Circle } from 'lucide-react';

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

interface WeeklyOverviewProps {
  allSchedule: Schedule;
  onDateSelect: (date: Date) => void;
}

export const WeeklyOverview = ({ allSchedule, onDateSelect }: WeeklyOverviewProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Generate 7 days starting from today
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }

  const getTasksForDate = (date: Date): Schedule => {
    const dateStr = date.toISOString().split('T')[0];
    return {
      morning: allSchedule.morning.filter(task => !task.date || task.date === dateStr),
      afternoon: allSchedule.afternoon.filter(task => !task.date || task.date === dateStr),
      evening: allSchedule.evening.filter(task => !task.date || task.date === dateStr),
      unscheduled: allSchedule.unscheduled.filter(task => !task.date || task.date === dateStr)
    };
  };

  const getTaskStats = (schedule: Schedule) => {
    const total = schedule.morning.length + schedule.afternoon.length + 
                 schedule.evening.length + schedule.unscheduled.length;
    const completed = schedule.morning.filter(t => t.completed).length +
                     schedule.afternoon.filter(t => t.completed).length +
                     schedule.evening.filter(t => t.completed).length +
                     schedule.unscheduled.filter(t => t.completed).length;
    return { total, completed };
  };

  const formatDayLabel = (date: Date, index: number) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDateLabel = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTimeSlotIcon = (slot: string) => {
    switch (slot) {
      case 'morning': return <Sunrise size={14} />;
      case 'afternoon': return <Sun size={14} />;
      case 'evening': return <Moon size={14} />;
      case 'unscheduled': return <ClipboardList size={14} />;
      default: return null;
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px', 
        marginBottom: '24px' 
      }}>
        <Calendar size={24} />
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
          Weekly Overview
        </h2>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '16px' 
      }}>
        {days.map((date, index) => {
          const daySchedule = getTasksForDate(date);
          const stats = getTaskStats(daySchedule);
          const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
          
          return (
            <div
              key={index}
              onClick={() => onDateSelect(date)}
              style={{
                border: '2px solid #e9ecef',
                borderRadius: '12px',
                padding: '16px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#007bff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,123,255,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Day Header */}
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ 
                  margin: '0 0 4px 0', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: index === 0 ? '#007bff' : '#333'
                }}>
                  {formatDayLabel(date, index)}
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  color: '#666' 
                }}>
                  {formatDateLabel(date)}
                </p>
              </div>

              {/* Task Statistics */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    {stats.completed}/{stats.total} tasks completed
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '600',
                    color: stats.total === 0 ? '#666' : 
                          completionRate === 100 ? '#28a745' : '#007bff'
                  }}>
                    {stats.total === 0 ? 'No tasks' : `${Math.round(completionRate)}%`}
                  </span>
                </div>
                
                {/* Progress Bar */}
                {stats.total > 0 && (
                  <div style={{ 
                    width: '100%', 
                    height: '6px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${completionRate}%`,
                      height: '100%',
                      backgroundColor: completionRate === 100 ? '#28a745' : '#007bff',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                )}
              </div>

              {/* Time Slot Breakdown */}
              <div style={{ display: 'grid', gap: '6px' }}>
                {(['morning', 'afternoon', 'evening', 'unscheduled'] as const).map(slot => {
                  const tasks = daySchedule[slot];
                  const slotCompleted = tasks.filter(t => t.completed).length;
                  
                  if (tasks.length === 0) return null;
                  
                  return (
                    <div 
                      key={slot}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        fontSize: '13px',
                        color: '#666'
                      }}
                    >
                      {getTimeSlotIcon(slot)}
                      <span style={{ textTransform: 'capitalize' }}>{slot}:</span>
                      <span style={{ fontWeight: '500' }}>
                        {slotCompleted}/{tasks.length}
                      </span>
                      <div style={{ display: 'flex', gap: '2px', marginLeft: '4px' }}>
                        {tasks.slice(0, 3).map((task, i) => (
                          task.completed ? 
                            <CheckCircle2 key={i} size={12} style={{ color: '#28a745' }} /> :
                            <Circle key={i} size={12} style={{ color: '#ccc' }} />
                        ))}
                        {tasks.length > 3 && (
                          <span style={{ fontSize: '11px', color: '#999' }}>
                            +{tasks.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty State */}
              {stats.total === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '20px',
                  color: '#999',
                  fontSize: '14px',
                  fontStyle: 'italic'
                }}>
                  No tasks scheduled
                  <br />
                  <span style={{ fontSize: '12px' }}>
                    Click to add tasks for this day
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};