import { Sunrise, Sun, Moon, ClipboardList, CheckCircle, Archive } from 'lucide-react';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
}

interface TaskListProps {
  tasks: Task[];
  title: string;
  onCompleteTask: (taskId: string) => void;
  onArchiveTask?: (taskId: string) => void;
  loading: boolean;
}

export const TaskList = ({ tasks, title, onCompleteTask, onArchiveTask, loading }: TaskListProps) => {
  const getIcon = () => {
    switch (title.toLowerCase()) {
      case 'morning': return <Sunrise size={16} />;
      case 'afternoon': return <Sun size={16} />;
      case 'evening': return <Moon size={16} />;
      case 'unscheduled': return <ClipboardList size={16} />;
      default: return null;
    }
  };

  return (
    <div className="tour-task-list" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {getIcon()}
        {title} ({tasks.length})
      </h3>
      {tasks.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No tasks</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {tasks.map(task => (
            <li key={task.id} style={{ 
              marginBottom: '8px', 
              display: 'flex', 
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: task.completed ? 0.6 : 1
            }}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onCompleteTask(task.id)}
                  disabled={loading}
                  style={{ marginRight: '10px' }}
                />
                <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.text}</span>
                {task.completed && (
                  <CheckCircle size={16} style={{ marginLeft: '8px', color: '#4caf50' }} />
                )}
              </div>
              {task.completed && onArchiveTask && (
                <button
                  onClick={() => onArchiveTask(task.id)}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: '#666',
                    marginLeft: '8px',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title="Archive completed task"
                >
                  <Archive size={12} />
                  Archive
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};