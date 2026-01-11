
import { Task } from './types';

// Helper to get local date string YYYY-MM-DD
export const toLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

export const generateCalendarGrid = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = [];

  // Padding for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  return days;
};

// Return both the task object and the extracted employee name for user creation
export const parseCSV = (content: string): { task: Partial<Task>, employeeName: string }[] => {
  const lines = content.split('\n');
  const results: { task: Partial<Task>, employeeName: string }[] = [];
  
  // New Format: EmployeeID, Name, Title, Category, Description, Start, End
  // Index: 0, 1, 2, 3, 4, 5, 6
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Use regex to properly split CSV lines, respecting quoted strings (e.g. descriptions with commas)
    // Matches a comma only if it's followed by an even number of quotes (or 0) until the end of the line
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.trim().replace(/^"|"$/g, ''));

    // We need at least EmployeeID (0) and StartDate (5)
    if (parts.length >= 6) {
      if (!parts[0] || !parts[5]) continue;

      results.push({
        task: {
          employeeId: parts[0],
          // Index 1 is Name (handled separately below)
          title: parts[2] || 'Untitled Task',
          category: parts[3] || 'General',
          description: parts[4] || '', // Description is now at index 4
          startDate: parts[5],
          endDate: parts[6] || parts[5], // EndDate is index 6
          status: 'pending'
        },
        employeeName: parts[1] // Extract name from 2nd column
      });
    }
  }
  return results;
};

export const generateColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

export const getPeriodRange = (period: 'day' | 'week' | 'month') => {
  const now = new Date();
  
  const todayStr = toLocalDateString(now);
  
  let startStr = todayStr;
  let endStr = todayStr;

  if (period === 'week') {
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = now.getDate() - day; 
    const start = new Date(now);
    start.setDate(diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    startStr = toLocalDateString(start);
    endStr = toLocalDateString(end);
  } else if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startStr = toLocalDateString(start);
    endStr = toLocalDateString(end);
  }

  return { start: startStr, end: endStr };
};

export const isTaskInPeriod = (task: Task, start: string, end: string) => {
  // Check overlap: TaskStart <= PeriodEnd AND TaskEnd >= PeriodStart
  return task.startDate <= end && task.endDate >= start;
};
