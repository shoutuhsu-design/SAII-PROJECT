
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Language, Task, Theme, User, AppNotification, Comment } from './types';
import { INITIAL_USERS, DICTIONARY } from './constants';
import { supabase } from './supabaseClient';
import { toLocalDateString } from './utils';

interface AppContextType extends AppState {
  login: (user: User) => Promise<boolean | string>; // Return true if success, string if error
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
  addComment: (comment: Comment) => Promise<void>; // New Action
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  // Filter Setters
  setFilterUserId: (id: string) => void;
  setFilterCategory: (cat: string) => void;
  setFilterStatus: (status: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'zte_app_user_session',
  THEME: 'zte_app_theme',
  LANG: 'zte_app_lang'
};

// --- DATA MAPPING HELPERS ---

// 1. DB -> APP (Read)
const normalizeUser = (u: any): User => ({
    ...u,
    id: String(u.id), 
    employeeId: u.employee_id || u.employeeId || u.employeeid, 
    name: u.name,
    role: u.role,
    password: u.password,
    color: u.color,
    status: u.status || 'active', // Default to active for legacy
    activeSessions: u.active_sessions || 0
});

const normalizeTask = (t: any): Task => ({
    ...t,
    id: String(t.id),
    employeeId: t.employee_id || t.employeeId || t.employeeid,
    category: t.category,
    title: t.title,
    description: t.description,
    startDate: t.start_date || t.startDate || t.startdate,
    endDate: t.end_date || t.endDate || t.enddate,
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

// 2. APP -> DB (Write)
const toDbTask = (t: Task) => ({
    id: t.id, // FIX: Always send the frontend generated ID (e.g. 'imported-...') to DB
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
    id: u.id, // Always send ID to allow client-generated IDs (like 'auto-...') during import
    employee_id: u.employeeId, 
    name: u.name,
    role: u.role,
    password: u.password,
    color: u.color,
    status: u.status,
    active_sessions: u.activeSessions
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- UI State (Local) ---
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem(STORAGE_KEYS.LANG) as Language) || 'zh';
  });

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as Theme) || 'light';
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // --- Shared Filter State ---
  const [filterUserId, setFilterUserId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // --- Data State (Supabase) ---
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const isFetching = useRef(false);
  const pendingDeletes = useRef(new Set<string>());

  // --- Notification Helper ---
  const sendBrowserNotification = (title: string, body: string) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    }
  };

  const addInAppNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
      const newNotif: AppNotification = {
          id: Date.now().toString() + Math.random(),
          timestamp: new Date(),
          read: false,
          ...notif
      };
      setNotifications(prev => [newNotif, ...prev].slice(0, 50)); 
  };

  const notify = (title: string, message: string, type: 'info' | 'warning' | 'alert' | 'success') => {
      sendBrowserNotification(title, message);
      addInAppNotification({ title, message, type });
  };

  // --- Core Fetch Logic ---
  const refreshData = useCallback(async (isAuto = false) => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        // 1. Fetch Users
        const { data: usersData, error: usersError } = await supabase.from('users').select('*');
        let fetchedUsers: User[] = [];

        if (usersError) {
            console.warn("Supabase (Users) fetch failed:", usersError); 
            fetchedUsers = [...INITIAL_USERS];
        } else if (usersData) {
            fetchedUsers = usersData.map(normalizeUser);
        } else {
            fetchedUsers = [...INITIAL_USERS];
        }

        setUsers(fetchedUsers);

        // 2. Fetch Tasks
        const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*');
        
        if (tasksError) {
            console.warn("Supabase (Tasks) fetch failed:", tasksError);
        } else if (tasksData) {
             const currentDeletedIds = pendingDeletes.current;
             const validTasks = tasksData
                .map(normalizeTask)
                .filter(t => !currentDeletedIds.has(t.id));
             setTasks(validTasks);
        }

        // 3. Fetch Comments
        const { data: commentsData, error: commentsError } = await supabase.from('comments').select('*');
        if (commentsData) {
            setComments(commentsData.map(normalizeComment).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
        }

      } catch (e) {
        console.warn("Refresh failed", e);
      } finally {
        isFetching.current = false;
      }
  }, []);

  // --- Realtime Subscription ---
  useEffect(() => {
    refreshData();
    const pollInterval = setInterval(() => refreshData(true), 15000); 

    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    const channel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => refreshData(true))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
             if (user) {
                 const t = DICTIONARY[language];
                 if (payload.eventType === 'INSERT' && payload.new.employee_id === user.employeeId) {
                     notify(t.taskAssigned, `${t.taskTitle}: ${payload.new.title}`, 'info');
                 }
                 if (payload.eventType === 'UPDATE' && payload.new.employee_id === user.employeeId) {
                     notify(t.taskUpdated, `${t.taskTitle}: ${payload.new.title}`, 'info');
                 }
             }
             refreshData(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => refreshData(true))
        .subscribe();

    return () => {
        clearInterval(pollInterval);
        supabase.removeChannel(channel);
    };
  }, [refreshData, user, language]); 

  // --- Deadlines ---
  useEffect(() => {
    if (!user || tasks.length === 0) return;
    
    const checkDeadlines = () => {
        const t = DICTIONARY[language];
        const now = new Date();
        const todayStr = toLocalDateString(now);
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = toLocalDateString(tomorrow);

        tasks.forEach(task => {
            if (task.employeeId !== user.employeeId) return;

            if (task.status === 'pending' && task.endDate < todayStr) {
                const notifId = `overdue-${task.id}`;
                if (!notifications.some(n => n.id.startsWith(notifId))) {
                    addInAppNotification({
                        title: t.taskOverdue,
                        message: `"${task.title}" ${t.isOverdue}`,
                        type: 'alert'
                    });
                }
            }

            if (task.status === 'pending' && task.endDate === tomorrowStr) {
                const notifId = `upcoming-${task.id}`;
                if (!notifications.some(n => n.id.startsWith(notifId))) {
                    addInAppNotification({
                        title: t.taskUpcoming,
                        message: `"${task.title}" ${t.dueTomorrow}`,
                        type: 'warning'
                    });
                }
            }
        });
    };

    checkDeadlines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, user]); 

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LANG, language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }, [user]);

  useEffect(() => {
     if (theme === 'dark') document.documentElement.classList.add('dark');
  }, []);

  // --- Actions ---

  const login = async (u: User): Promise<boolean | string> => {
    const t = DICTIONARY[language];
    
    // 1. Status Check
    if (u.status === 'pending') return t.accountPending;
    if (u.status === 'rejected') return t.accountRejected;

    // 2. Session Logic Fix: 
    // Force reset sessions to 1. 
    // This is the "Gold Master" fix for session limits.
    // Even if the DB says 100, we overwrite it to 1.
    const { error } = await supabase.from('users').update({ active_sessions: 1 }).eq('id', u.id);
    
    if (error) {
        console.warn("Session reset warning (non-fatal):", error);
    }
    
    // Optimistic Update
    const updatedUser = { ...u, activeSessions: 1 };
    setUser(updatedUser);
    refreshData();
    return true;
  };

  const logout = async () => {
    if (user) {
        // Decrement Session
        const currentSessions = user.activeSessions || 1; // Assume at least 1 if logged in
        const newCount = Math.max(0, currentSessions - 1);
        
        await supabase.from('users').update({ active_sessions: newCount }).eq('id', user.id);
    }
    
    // Reset Shared Filters on Logout
    setFilterUserId('all');
    setFilterCategory('all');
    setFilterStatus('all');

    // Requirement 1: Clear Cache / State on Logout
    setUser(null);
    setTasks([]);
    setComments([]);
    setNotifications([]);
    
    localStorage.removeItem(STORAGE_KEYS.USER);
    // Optional: Clear other keys if you want a FULL hard reset
    // localStorage.removeItem(STORAGE_KEYS.THEME);
    // localStorage.removeItem(STORAGE_KEYS.LANG);
  };
  
  const register = async (u: User) => {
    const isFirstUser = users.length === 0;
    
    // New logic: Default to 'pending' unless it's the very first user (Auto-Admin)
    const newUser = { 
        ...u, 
        role: isFirstUser ? 'admin' as const : 'user' as const,
        status: isFirstUser ? 'active' as const : 'pending' as const,
        activeSessions: 0,
        color: u.color || '#666' 
    };

    const { error } = await supabase.from('users').insert(toDbUser(newUser));
    if (error) console.error("Registration error:", error);
    
    await refreshData();
    
    // Do NOT auto-login new pending users
    if (isFirstUser) {
        setUser(newUser);
    }
  };

  const addTask = async (task: Task) => {
    const newTask = { ...task, id: String(Date.now()), modificationCount: 0 };
    setTasks(prev => [...prev, newTask]); 
    
    const { error } = await supabase.from('tasks').insert(toDbTask(newTask));
    if (error) {
        console.error("Add task failed:", error);
        refreshData();
    }
  };
  
  const updateTask = async (updated: Task) => {
    // Increment modification count on update
    const taskWithEditCount = { 
        ...updated, 
        modificationCount: (updated.modificationCount || 0) + 1 
    };

    setTasks(prev => prev.map(t => String(t.id) === String(updated.id) ? taskWithEditCount : t));
    const { id, ...updates } = toDbTask(taskWithEditCount);
    await supabase.from('tasks').update(updates).eq('id', id);
    refreshData();
  };
  
  const deleteTask = async (id: string) => {
    const idStr = String(id);
    pendingDeletes.current.add(idStr);
    setTasks(prev => prev.filter(t => String(t.id) !== idStr));

    const { error } = await supabase.from('tasks').delete().eq('id', idStr);
    if (error) {
         console.warn("Task delete sync failed:", error);
         pendingDeletes.current.delete(idStr);
         refreshData();
    }
    setTimeout(() => pendingDeletes.current.delete(idStr), 10000);
  };

  const deleteTasks = async (ids: string[]) => {
    const idStrs = ids.map(String);
    idStrs.forEach(id => pendingDeletes.current.add(id));
    setTasks(prev => prev.filter(t => !idStrs.includes(String(t.id))));

    const { error } = await supabase.from('tasks').delete().in('id', idStrs);
    if (error) {
        console.warn("Batch delete sync failed:", error);
        idStrs.forEach(id => pendingDeletes.current.delete(id));
        refreshData();
    }
    setTimeout(() => {
        idStrs.forEach(id => pendingDeletes.current.delete(id));
    }, 10000);
  };
  
  const importTasks = async (newTasks: Task[]) => {
    if (newTasks.length === 0) return;
    
    setTasks(prev => [...prev, ...newTasks]); 
    
    const dbTasks = newTasks.map(toDbTask);
    const { error } = await supabase.from('tasks').insert(dbTasks);
    
    if (error) {
        console.error("Import sync failed:", error);
        throw error;
    }
    
    await refreshData();
  };

  const addUser = async (newUser: User) => {
    const u = { ...newUser, color: newUser.color || '#' + Math.floor(Math.random()*16777215).toString(16) };
    setUsers(prev => [...prev, u]);
    const { error } = await supabase.from('users').insert(toDbUser(u));
    if (error) console.warn("User add sync failed:", error);
    refreshData();
  };

  const addUsers = async (newUsers: User[]) => {
    if (newUsers.length === 0) return;
    const usersWithColor = newUsers.map(u => ({
        ...u, 
        color: u.color || '#' + Math.floor(Math.random()*16777215).toString(16)
    }));
    
    setUsers(prev => [...prev, ...usersWithColor]);
    const { error } = await supabase.from('users').upsert(
        usersWithColor.map(toDbUser), 
        { onConflict: 'employee_id', ignoreDuplicates: true }
    );
    
    if (error) {
        console.error("Batch user add sync failed:", error);
        throw error;
    }
    
    await refreshData();
  };

  const updateUser = async (updatedUser: User) => {
      setUsers(prev => prev.map(u => String(u.id) === String(updatedUser.id) ? updatedUser : u));
      // Update session if editing self
      if (user && String(user.id) === String(updatedUser.id)) setUser(updatedUser);
      
      const { id, ...updates } = toDbUser(updatedUser);
      await supabase.from('users').update(updates).eq('id', id);
      refreshData();
  };

  const deleteUser = async (userId: string) => {
    const userToDelete = users.find(u => String(u.id) === String(userId));
    if (!userToDelete) return;

    setUsers(prev => prev.filter(u => String(u.id) !== String(userId)));
    if (userToDelete.employeeId) {
        setTasks(prev => prev.filter(t => t.employeeId !== userToDelete.employeeId));
    }

    try {
        if (userToDelete.employeeId) {
             const { error: taskError } = await supabase.from('tasks').delete().eq('employee_id', userToDelete.employeeId);
             if (taskError) console.warn("Task cascade delete warning:", taskError);
        }

        const { error: userError } = await supabase.from('users').delete().eq('id', userId);
        if (userError) throw userError;

        refreshData(); 
    } catch (error) {
        console.error("Delete user failed:", error);
        alert("Unable to delete user. Please try again or check database permissions.");
        refreshData(); 
    }
  };

  const addComment = async (comment: Comment) => {
      setComments(prev => [...prev, comment]);
      const { error } = await supabase.from('comments').insert({
          id: comment.id,
          task_id: comment.taskId,
          employee_id: comment.employeeId,
          content: comment.content,
          created_at: comment.createdAt
      });
      if (error) {
          console.error("Failed to add comment:", error);
          refreshData();
      }
  };

  const markNotificationsRead = () => {
      setNotifications(prev => prev.map(n => ({...n, read: true})));
  };

  const clearNotifications = () => {
      setNotifications([]);
  };

  return (
    <AppContext.Provider value={{
      user, users, tasks, comments, language, theme, notifications,
      filterUserId, filterCategory, filterStatus,
      login, logout, register, setLanguage, setTheme,
      addTask, updateTask, deleteTask, deleteTasks, importTasks,
      addUser, addUsers, updateUser, deleteUser,
      addComment,
      markNotificationsRead, clearNotifications,
      setFilterUserId, setFilterCategory, setFilterStatus
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
