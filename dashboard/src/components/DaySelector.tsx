interface DaySelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DaySelector = ({ selectedDate, onDateChange, activeTab, onTabChange }: DaySelectorProps) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push(date);
  }

  const formatDay = (date: Date, index: number) => {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const handleTabClick = (tab: string, date?: Date) => {
    onTabChange(tab);
    if (date) {
      onDateChange(date);
    }
  };

  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      marginBottom: '20px',
      padding: '8px',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #e9ecef',
      justifyContent: 'flex-start',
      flexWrap: 'wrap'
    }}>
      {/* Week Overview Tab */}
      <button
        onClick={() => handleTabClick('overview')}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '8px',
          backgroundColor: activeTab === 'overview' ? '#1a1a1a' : 'transparent',
          color: activeTab === 'overview' ? 'white' : '#6c757d',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: activeTab === 'overview' ? '600' : '500',
          minWidth: '80px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (activeTab !== 'overview') {
            e.currentTarget.style.backgroundColor = '#e9ecef';
            e.currentTarget.style.color = '#495057';
          }
        }}
        onMouseLeave={(e) => {
          if (activeTab !== 'overview') {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6c757d';
          }
        }}
      >
        📅 Week
      </button>
      
      {/* Day Tabs */}
      {days.map((date, index) => {
        const tabId = `day-${index}`;
        const isActive = activeTab === tabId;
        
        return (
          <button
            key={index}
            onClick={() => handleTabClick(tabId, date)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: isActive ? '#1a1a1a' : 'transparent',
              color: isActive ? 'white' : '#6c757d',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: isActive ? '600' : '500',
              minWidth: '80px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.color = '#495057';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6c757d';
              }
            }}
          >
            {formatDay(date, index)}
          </button>
        );
      })}
    </div>
  );
};