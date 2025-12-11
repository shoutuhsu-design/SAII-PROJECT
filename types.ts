export type Role = 'admin' | 'user';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  password?: string; // In a real app, never store plain text
  role: Role;
  color?: string; // For calendar visualization
}

export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  employeeId: string;
  category: string; // matches Excel sheet name concept
  title: string;
  description: string;
  startDate: string; // ISO Date string YYYY-MM-DD
  endDate: string;   // ISO Date string YYYY-MM-DD
  status: TaskStatus;
}

export type Language = 'en' | 'zh';

export type Theme = 'light' | 'dark';

export interface AppState {
  user: User | null;
  users: User[];
  tasks: Task[];
  language: Language;
  theme: Theme;
}
