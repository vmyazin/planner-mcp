interface TaskCommand {
  action: 'add-task';
  taskText: string;
  day?: string;
  timeSlot?: 'morning' | 'afternoon' | 'evening';
  date?: Date;
}

interface CommandResult {
  success: boolean;
  command?: TaskCommand;
  error?: string;
}

export const parseTaskCommand = (input: string): CommandResult => {
  const normalizedInput = input.toLowerCase().trim();

  // Check if it's an "add task" command
  const addTaskPatterns = [
    /^add task for (.+?):\s*(.+)$/,
    /^add (.+?) task:\s*(.+)$/,
    /^add (.+?):\s*(.+)$/,
    /^(.+?) task:\s*(.+)$/,
    /^task for (.+?):\s*(.+)$/
  ];

  for (const pattern of addTaskPatterns) {
    const match = normalizedInput.match(pattern);
    if (match) {
      const dayTimeSpec = match[1];
      const taskText = match[2];
      
      const { day, timeSlot, date } = parseDayTimeSpec(dayTimeSpec);
      
      return {
        success: true,
        command: {
          action: 'add-task',
          taskText: taskText.trim(),
          day,
          timeSlot,
          date
        }
      };
    }
  }

  return {
    success: false,
    error: 'Could not parse command. Try: "add task for monday morning: wash dishes"'
  };
};

const parseDayTimeSpec = (spec: string) => {
  const normalizedSpec = spec.toLowerCase().trim();
  
  // Time slot patterns
  const timeSlotMap: { [key: string]: 'morning' | 'afternoon' | 'evening' } = {
    'morning': 'morning',
    'afternoon': 'afternoon',
    'evening': 'evening',
    'am': 'morning',
    'pm': 'afternoon',
    'night': 'evening'
  };

  // Day patterns
  const dayPatterns = {
    'today': 0,
    'tomorrow': 1,
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 0,
    'mon': 1,
    'tue': 2,
    'tues': 2,
    'wed': 3,
    'thu': 4,
    'thurs': 4,
    'fri': 5,
    'sat': 6,
    'sun': 0
  };

  let timeSlot: 'morning' | 'afternoon' | 'evening' | undefined;
  let day: string | undefined;
  let targetDate: Date | undefined;

  // Extract time slot
  for (const [key, slot] of Object.entries(timeSlotMap)) {
    if (normalizedSpec.includes(key)) {
      timeSlot = slot;
      break;
    }
  }

  // Extract day and calculate date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

  if (normalizedSpec.includes('today')) {
    day = 'today';
    targetDate = new Date(today);
  } else if (normalizedSpec.includes('tomorrow')) {
    day = 'tomorrow';
    targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 1);
  } else {
    // Check for specific weekdays
    for (const [dayName, dayOfWeek] of Object.entries(dayPatterns)) {
      if (normalizedSpec.includes(dayName)) {
        day = dayName;
        
        // Calculate the next occurrence of this day
        let daysUntilTarget = dayOfWeek - todayDayOfWeek;
        if (daysUntilTarget <= 0) {
          daysUntilTarget += 7; // Next week
        }
        
        targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntilTarget);
        break;
      }
    }
  }

  return { day, timeSlot, date: targetDate };
};

export const getTabForDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayDiff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (dayDiff >= 0 && dayDiff < 7) {
    return `day-${dayDiff}`;
  }
  
  return 'day-0'; // Default to today if outside range
};