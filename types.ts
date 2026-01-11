
export type Role = 'admin' | 'user';

export type UserStatus = 'active' | 'pending' | 'rejected';

export interface User {
  id: string;
  employeeId: string;
  name: string;
  password?: string; // In a real app, never store plain text
  role: Role;
  color?: string; // For calendar visualization
  status?: UserStatus;
  activeSessions?: number;
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
  modificationCount?: number; // Track how many times a task has been edited
  last_reminded_at?: string; // Last time a remote reminder was sent
  createdBy?: string; // The employeeId of the user who created the task
  completedAt?: string; // ISO Date string, tracks when the task was marked completed
}

export interface Comment {
  id: string;
  taskId: string;
  employeeId: string; // The author of the comment
  content: string;
  createdAt: string; // ISO string
}

export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export type Language = 'en' | 'zh';

export type Theme = 'light' | 'dark';

export interface AppState {
  user: User | null;
  users: User[];
  tasks: Task[];
  comments: Comment[]; // Added comments state
  notifications: AppNotification[];
  language: Language;
  theme: Theme;
  // Shared Filter States
  filterUserId: string;
  filterCategory: string;
  filterStatus: string;
}
