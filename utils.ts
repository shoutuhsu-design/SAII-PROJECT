import { Task } from './types';

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

export const parseCSV = (content: string): Partial<Task>[] => {
  const lines = content.split('\n');
  const tasks: Partial<Task>[] = [];
  
  // Simple CSV parser assuming specific order or header presence
  // Format assumption: EmployeeID, Name, Title, Description, Category, Start, End
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 6) {
      tasks.push({
        employeeId: parts[0]?.trim(),
        title: parts[2]?.trim(),
        description: parts[3]?.trim() || '',
        category: parts[4]?.trim() || 'General',
        startDate: parts[5]?.trim(),
        endDate: parts[6]?.trim() || parts[5]?.trim(),
        status: 'pending'
      });
    }
  }
  return tasks;
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
  // Reset time to avoid confusion, though we work with YYYY-MM-DD strings mostly
  now.setHours(0,0,0,0);

  const todayStr = now.toISOString().split('T')[0];
  
  let startStr = todayStr;
  let endStr = todayStr;

  if (period === 'week') {
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = now.getDate() - day; 
    const start = new Date(now);
    start.setDate(diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    startStr = start.toISOString().split('T')[0];
    endStr = end.toISOString().split('T')[0];
  } else if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    startStr = start.toISOString().split('T')[0];
    endStr = end.toISOString().split('T')[0];
  }

  return { start: startStr, end: endStr };
};

export const isTaskInPeriod = (task: Task, start: string, end: string) => {
  // Check overlap: TaskStart <= PeriodEnd AND TaskEnd >= PeriodStart
  return task.startDate <= end && task.endDate >= start;
};