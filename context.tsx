
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Language, Task, Theme, User, AppNotification, Comment } from './types.ts';
import { INITIAL_USERS, DICTIONARY } from './constants.ts';
import { supabase } from './supabaseClient.ts';
import { toLocalDateString } from './utils.ts';

interface AppContextType extends AppState {
  login: (user: User) => Promise<boolean | string>;
  logout: () => void;
  register: (user: User) => Promise<void>;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  deleteTasks: (taskIds: string[]) => void;
  importTasks: (tasks: Task[]) => Promise<void>;
  addUser: (user: User) => void;
  addUsers: (users: User[]) => Promise<void>;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  addComment: (comment: Comment) => Promise<void>;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'zte_app_user_session',
  THEME: 'zte_app_theme',
  LANG: 'zte_app_lang'
};

const normalizeUser = (u: any): User => ({
    ...u,
    id: String(u.id), 
    employeeId: u.employee_id || u.employeeId || u.employeeid, 
    name: u.name,
    role: u.role,
    password: u.password,
    color: u.color,
    status: u.status || 'active',
    activeSessions: u.active_sessions || 0
});

const normalizeTask = (t: any): Task => ({
    ...t,
    id: String(t.id),
    employeeId: t.employee_id || t.employeeId || t.employeeid,
    category: t.category,
    title: t.title,
    description: t.description,
    startDate: t.start_date || t.startDate,
    endDate: t.end_date || t.endDate,
    status: t.status,
    modificationCount: t.modification_count || 0
});

const normalizeComment = (c: any): Comment => ({
    id: String(c.id),
    taskId: c.task_id,
    employeeId: c.employee_id,
    content: c.content,
    createdAt: c.created_at
});

const toDbTask = (t: Task) => ({
    id: t.id,
    employee_id: t.employeeId, 
    category: t.category,
    title: t.title,
    description: t.description,
    start_date: t.startDate,
    end_date: t.endDate,
    status: t.status,
    modification_count: t.modificationCount || 0
});

const toDbUser = (u: User) => ({
    id: u.id,
    employee_id: u.employeeId, 
    name: u.name,
    role: u.role,
    password: u.password,
    color: u.color,
    status: u.status,
    active_sessions: u.activeSessions
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem(STORAGE_KEYS.LANG) as Language) || 'zh');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || 'light');
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const isFetching = useRef(false);
  const pendingDeletes = useRef(new Set<string>());

  const refreshData = useCallback(async () => {
      if (isFetching.current) return;
      isFetching.current = true;
      try {
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData) setUsers(usersData.map(normalizeUser));

        const { data: tasksData } = await supabase.from('tasks').select('*');
        if (tasksData) {
             const currentDeletedIds = pendingDeletes.current;
             setTasks(tasksData.map(normalizeTask).filter(t => !currentDeletedIds.has(t.id)));
        }

        const { data: commentsData } = await supabase.from('comments').select('*');
        if (commentsData) setComments(commentsData.map(normalizeComment).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      } catch (e) {
        console.warn("Refresh failed", e);
      } finally {
        isFetching.current = false;
      }
  }, []);

  useEffect(() => {
    refreshData();
    const channel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => refreshData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => refreshData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => refreshData())
        .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshData]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.LANG, language); }, [language]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);
  useEffect(() => { if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user)); }, [user]);

  const login = async (u: User): Promise<boolean | string> => {
    const t = DICTIONARY[language];
    if (u.status === 'pending') return t.accountPending;
    if (u.status === 'rejected') return t.accountRejected;
    await supabase.from('users').update({ active_sessions: 1 }).eq('id', u.id);
    setUser({ ...u, activeSessions: 1 });
    refreshData();
    return true;
  };

  const logout = async () => {
    if (user) await supabase.from('users').update({ active_sessions: 0 }).eq('id', user.id);
    setUser(null);
    setTasks([]);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };
  
  const register = async (u: User) => {
    const isFirstUser = users.length === 0;
    const newUser = { 
        ...u, 
        role: isFirstUser ? 'admin' as const : 'user' as const,
        status: isFirstUser ? 'active' as const : 'pending' as const,
        activeSessions: 0,
        color: u.color || '#666' 
    };
    await supabase.from('users').insert(toDbUser(newUser));
    await refreshData();
    if (isFirstUser) setUser(newUser);
  };

  const addTask = async (task: Task) => {
    const newTask = { ...task, id: String(Date.now()), modificationCount: 0 };
    setTasks(prev => [...prev, newTask]); 
    await supabase.from('tasks').insert(toDbTask(newTask));
    refreshData();
  };
  
  const updateTask = async (updated: Task) => {
    const taskWithEditCount = { ...updated, modificationCount: (updated.modificationCount || 0) + 1 };
    setTasks(prev => prev.map(t => t.id === updated.id ? taskWithEditCount : t));
    const { id, ...updates } = toDbTask(taskWithEditCount);
    await supabase.from('tasks').update(updates).eq('id', id);
    refreshData();
  };
  
  const deleteTask = async (id: string) => {
    pendingDeletes.current.add(id);
    setTasks(prev => prev.filter(t => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
    refreshData();
  };

  const deleteTasks = async (ids: string[]) => {
    ids.forEach(id => pendingDeletes.current.add(id));
    setTasks(prev => prev.filter(t => !ids.includes(t.id)));
    await supabase.from('tasks').delete().in('id', ids);
    refreshData();
  };
  
  const importTasks = async (newTasks: Task[]) => {
    if (newTasks.length === 0) return;
    await supabase.from('tasks').insert(newTasks.map(toDbTask));
    await refreshData();
  };

  const addUsers = async (newUsers: User[]) => {
    if (newUsers.length === 0) return;
    await supabase.from('users').upsert(newUsers.map(toDbUser), { onConflict: 'employee_id' });
    await refreshData();
  };

  const updateUser = async (updatedUser: User) => {
      const { id, ...updates } = toDbUser(updatedUser);
      await supabase.from('users').update(updates).eq('id', id);
      refreshData();
  };

  const deleteUser = async (userId: string) => {
    await supabase.from('users').delete().eq('id', userId);
    refreshData();
  };

  const addComment = async (comment: Comment) => {
      setComments(prev => [...prev, comment]);
      await supabase.from('comments').insert({
          id: comment.id,
          task_id: comment.taskId,
          employee_id: comment.employeeId,
          content: comment.content,
          created_at: comment.createdAt
      });
  };

  return (
    <AppContext.Provider value={{
      user, users, tasks, comments, language, theme, notifications,
      login, logout, register, setLanguage, setTheme,
      addTask, updateTask, deleteTask, deleteTasks, importTasks,
      addUser: (u) => addUsers([u]), addUsers, updateUser, deleteUser,
      addComment, markNotificationsRead: () => {}, clearNotifications: () => {}
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
