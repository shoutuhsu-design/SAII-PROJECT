
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Language, Task, Theme, User, AppNotification, Comment } from './types';
import { DICTIONARY } from './constants';
import { supabase } from './supabaseClient';
import { Notify } from './plugin';
import { CalendarService } from './utils/CalendarService';

interface AppContextType extends AppState {
  login: (user: User) => Promise<boolean | string>; 
  logout: () => void;
  register: (user: User) => Promise<boolean>;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  deleteTasks: (taskIds: string[]) => void;
  importTasks: (tasks: Task[]) => Promise<void>;
  addUser: (user: User) => Promise<boolean>;
  addUsers: (users: User[]) => Promise<void>;
  updateUser: (user: User) => Promise<boolean>;
  deleteUser: (userId: string) => void;
  addComment: (comment: Comment) => Promise<void>;
  updateComment: (comment: Comment) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
  triggerNativeNotify: (task: Task, titlePrefix?: string) => void;
  sendRemoteReminder: (task: Task) => Promise<void>;
  requestNotifyPermission: () => Promise<void>;
  setFilterUserId: (id: string) => void;
  setFilterCategory: (cat: string) => void;
  setFilterStatus: (status: string) => void;
  refreshData: () => Promise<void>;
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
    role: (u.role || 'user').toLowerCase() as any,
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
    startDate: t.start_date || t.startDate || t.startdate,
    endDate: t.end_date || t.endDate || t.enddate,
    status: t.status,
    modificationCount: t.modification_count || 0,
    last_reminded_at: t.last_reminded_at,
    createdBy: t.created_by || t.createdBy,
    completedAt: t.completed_at
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem(STORAGE_KEYS.LANG) as Language || 'zh');
  
  // Initialize Theme: Check LocalStorage -> Check System Preference -> Default Light
  const [theme, setTheme] = useState<Theme>(() => {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME) as Theme;
      if (saved) return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
      }
      return 'light';
  });

  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [filterUserId, setFilterUserId] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const isFetching = useRef(false);
  const lastSyncedTokenRef = useRef<string | null>(null);

  // Apply Theme Class
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // Also update meta theme-color for mobile status bars
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
        metaThemeColor.setAttribute('content', theme === 'dark' ? '#111827' : '#F8FAFC');
    }
    
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // Listen to System Theme Changes (Only if user hasn't explicitly set a theme in this session, logic can be adjusted)
  // Currently we stick to the user's choice once set, or the initial detection.

  useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.LANG, language);
  }, [language]);

  const addInternalNotification = useCallback((title: string, message: string, type: 'info' | 'success' | 'alert' | 'warning' = 'info', silent = false) => {
      const newNotif: AppNotification = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          type,
          title,
          message,
          timestamp: new Date(),
          read: false
      };
      setNotifications(prev => [newNotif, ...prev]);
      if (!silent) {
        Notify.triggerNotify(title, message);
      }
  }, []);

  const syncFCMToken = useCallback(async (targetUser: User) => {
    try {
        const token = await Notify.initPush();
        if (token && token !== lastSyncedTokenRef.current) {
            const { data, error } = await supabase
                .from('users')
                .update({ fcm_token: token })
                .eq('employee_id', targetUser.employeeId)
                .select();

            if (!error && data && data.length > 0) {
                lastSyncedTokenRef.current = token;
                const updatedUser = normalizeUser(data[0]);
                setUser(updatedUser);
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
            }
        }
    } catch (e) {
        console.error("[FCM] Sync Error:", e);
    }
  }, []);

  // --- Auto-Sync Logic for Mobile ---
  const autoSyncUpcomingTasks = useCallback(async (currentTasks: Task[], currentUser: User) => {
      if (!CalendarService.isAvailable()) return;
      
      const hasPerm = await CalendarService.hasReadWritePermission();
      if (!hasPerm) return;

      const today = new Date().toISOString().split('T')[0];
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // Sync next 30 days
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // Filter tasks: Belong to user, Status pending, Within next 30 days
      const tasksToSync = currentTasks.filter(t => 
          t.employeeId === currentUser.employeeId && 
          t.status !== 'completed' &&
          t.startDate >= today && 
          t.startDate <= futureDateStr
      );

      if (tasksToSync.length > 0) {
          console.log(`[AutoSync] Found ${tasksToSync.length} upcoming tasks. Checking calendar...`);
          
          for (const t of tasksToSync) {
              const title = `[ZTE] ${t.title}`;
              const notes = `${t.description || ''}\nCategory: ${t.category}\nAssignee: ${currentUser.name}`;
              // createEvent now has deduplication logic built-in (findEvent)
              // If it exists in calendar, it skips. If missing (added on PC), it writes.
              await CalendarService.createEvent(title, "", notes, t.startDate, t.endDate, false);
          }
      }
  }, []);

  const refreshData = useCallback(async () => {
      if (isFetching.current) return;
      isFetching.current = true;
      try {
        const { data: usersData, error: userError } = await supabase.from('users').select('*');
        if (usersData) setUsers(usersData.map(normalizeUser));
        
        const { data: tasksData, error: taskError } = await supabase.from('tasks').select('*');
        if (tasksData) {
            const normalizedTasks = tasksData.map(normalizeTask);
            setTasks(normalizedTasks);
            
            // Trigger auto-sync if user is logged in
            const currentUser = user || (localStorage.getItem(STORAGE_KEYS.USER) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)!) : null);
            if (currentUser) {
                autoSyncUpcomingTasks(normalizedTasks, currentUser);
            }
        }
        
        const { data: commentsData } = await supabase.from('comments').select('*');
        if (commentsData) {
            setComments(commentsData.map(c => ({ 
                id: String(c.id), 
                taskId: c.task_id, 
                employeeId: c.employee_id, 
                content: c.content, 
                createdAt: c.created_at 
            })));
        }
      } finally { isFetching.current = false; }
  }, [user, autoSyncUpcomingTasks]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (user) {
        const timer = setTimeout(() => syncFCMToken(user), 5000);
        const cleanupListener = Notify.addListener((notif) => {
           addInternalNotification(notif.title || "推送提醒", notif.body || "", 'info', true);
        });

        // Aggressively request permission on mobile load
        if (CalendarService.isAvailable()) {
            CalendarService.requestReadWritePermission()
                .then(granted => {
                    if (granted) refreshData(); // Re-trigger sync if permission just granted
                })
                .catch(console.error);
        }

        return () => {
          clearTimeout(timer);
          cleanupListener();
        };
    }
  }, [user?.id, syncFCMToken, addInternalNotification, refreshData]);

  const login = async (u: User): Promise<boolean | string> => {
    await supabase.from('users').update({ active_sessions: 1 }).eq('employee_id', u.employeeId);
    const normalized = normalizeUser(u);
    setUser(normalized);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalized));
    syncFCMToken(normalized);
    return true;
  };

  const logout = async () => {
    if (user) await supabase.from('users').update({ active_sessions: 0, fcm_token: null }).eq('employee_id', user.employeeId);
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };
  
  const addTask = async (task: Task) => {
    const creator = task.createdBy || user?.employeeId;
    const { error } = await supabase.from('tasks').insert({
        id: task.id || Date.now().toString(),
        employee_id: task.employeeId, 
        category: task.category,
        title: task.title, 
        description: task.description,
        start_date: task.startDate, 
        end_date: task.endDate, 
        status: task.status,
        last_reminded_at: new Date().toISOString(),
        created_by: creator
    });
    if (error) {
        console.error("Add task failed:", error.message);
    } else {
        if (CalendarService.isAvailable()) {
            const hasPerm = await CalendarService.hasReadWritePermission();
            if (hasPerm) {
                 const u = users.find(u => u.employeeId === task.employeeId);
                 const title = `[ZTE] ${task.title}`;
                 const notes = `${task.description || ''}\nCategory: ${task.category}\nAssignee: ${u?.name || task.employeeId}`;
                 CalendarService.createEvent(title, "", notes, task.startDate, task.endDate, false).catch(console.error);
            }
        }
    }
    refreshData();
  };

  const updateTask = async (task: Task) => {
      const oldTask = tasks.find(t => t.id === task.id);
      
      // Anomaly Logic: Only increment modification count if DATES change
      let nextModificationCount = (oldTask?.modificationCount || 0);
      if (oldTask && (oldTask.startDate !== task.startDate || oldTask.endDate !== task.endDate)) {
          nextModificationCount += 1;
      }

      // Logic: Update completed_at if status changes
      let completedAt = oldTask?.completedAt;
      if (task.status === 'completed' && oldTask?.status !== 'completed') {
          completedAt = new Date().toISOString();
      } else if (task.status === 'pending') {
          completedAt = null as any; // Clear it using null for DB update
      }

      const { error } = await supabase.from('tasks').update({
          category: task.category, 
          title: task.title, 
          description: task.description,
          start_date: task.startDate, 
          end_date: task.endDate, 
          status: task.status,
          modification_count: nextModificationCount,
          last_reminded_at: new Date().toISOString(),
          completed_at: completedAt
      }).eq('id', task.id);
      
      if (error) {
          console.error("Update task failed:", error.message);
      } else {
          // Auto Sync Calendar (Delete old -> Create new)
          if (CalendarService.isAvailable()) {
              const hasPerm = await CalendarService.hasReadWritePermission();
              if (hasPerm && oldTask) {
                  const oldU = users.find(u => u.employeeId === oldTask.employeeId);
                  const oldTitle = `[ZTE] ${oldTask.title}`;
                  const oldNotes = `${oldTask.description || ''}\nCategory: ${oldTask.category}\nAssignee: ${oldU?.name || oldTask.employeeId}`;
                  await CalendarService.deleteEvent(oldTitle, "", oldNotes, oldTask.startDate, oldTask.endDate);
                  
                  const u = users.find(u => u.employeeId === task.employeeId);
                  const title = `[ZTE] ${task.title}`;
                  const notes = `${task.description || ''}\nCategory: ${task.category}\nAssignee: ${u?.name || task.employeeId}`;
                  CalendarService.createEvent(title, "", notes, task.startDate, task.endDate, false).catch(console.error);
              }
          }
      }
      refreshData();
  };

  const deleteTask = async (taskId: string) => { 
      const task = tasks.find(t => t.id === taskId);
      await supabase.from('tasks').delete().eq('id', taskId); 
      
      if (task && CalendarService.isAvailable()) {
           const hasPerm = await CalendarService.hasReadWritePermission();
           if (hasPerm) {
               const u = users.find(u => u.employeeId === task.employeeId);
               const title = `[ZTE] ${task.title}`;
               const notes = `${task.description || ''}\nCategory: ${task.category}\nAssignee: ${u?.name || task.employeeId}`;
               CalendarService.deleteEvent(title, "", notes, task.startDate, task.endDate).catch(console.error);
           }
      }
      refreshData(); 
  };

  const deleteTasks = async (taskIds: string[]) => { 
      const tasksToDelete = tasks.filter(t => taskIds.includes(t.id));
      await supabase.from('tasks').delete().in('id', taskIds); 
      
      if (CalendarService.isAvailable()) {
         const hasPerm = await CalendarService.hasReadWritePermission();
         if (hasPerm) {
             for(const task of tasksToDelete) {
                  const u = users.find(u => u.employeeId === task.employeeId);
                  const title = `[ZTE] ${task.title}`;
                  const notes = `${task.description || ''}\nCategory: ${task.category}\nAssignee: ${u?.name || task.employeeId}`;
                  CalendarService.deleteEvent(title, "", notes, task.startDate, task.endDate).catch(console.error);
             }
         }
      }
      refreshData(); 
  };

  const sendRemoteReminder = async (task: Task) => {
      const { error } = await supabase.from('tasks').update({ 
          last_reminded_at: new Date().toISOString() 
      }).eq('id', task.id);
      
      if (error) throw error;
      addInternalNotification("已发送提醒", `任务 "${task.title}" 的提醒已通过数据库触发。`, 'info');
      refreshData();
  };

  const triggerNativeNotify = (task: Task, prefix = "") => {
      Notify.triggerNotify(`${prefix}${task.title}`, task.description || "请关注该任务进度。");
  };

  const addUser = async (u: User): Promise<boolean> => { 
      const { error } = await supabase.from('users').insert({ 
          id: u.id,
          employee_id: u.employeeId, 
          name: u.name, 
          password: u.password, 
          role: u.role, 
          color: u.color, 
          status: u.status 
      }); 
      if (error) {
          console.error("Add User Error:", error);
          alert(`DB Error: ${error.message}\n(Hint: Check RLS policies in Supabase)`);
          return false;
      }
      refreshData(); 
      return true;
  };

  const addUsers = async (users: User[]) => { 
      await supabase.from('users').insert(users.map(u => ({ 
          id: u.id,
          employee_id: u.employeeId, 
          name: u.name, 
          password: u.password, 
          role: u.role, 
          color: u.color, 
          status: u.status 
      }))); 
      refreshData(); 
  };
  
  const updateUser = async (u: User): Promise<boolean> => { 
      const { error } = await supabase.from('users').update({ 
          name: u.name, 
          employee_id: u.employeeId, 
          password: u.password, 
          role: u.role, 
          status: u.status, 
          active_sessions: u.activeSessions 
      }).eq('id', u.id); 
      
      if (error) {
          console.error("Update User Error:", error);
          alert(`DB Error: ${error.message}`);
          return false;
      }
      refreshData(); 
      return true;
  };

  const deleteUser = async (userId: string) => { await supabase.from('users').delete().eq('id', userId); refreshData(); };
  
  const addComment = async (c: Comment) => { 
      await supabase.from('comments').insert({ 
          id: c.id,
          task_id: c.taskId, 
          employee_id: c.employeeId, 
          content: c.content 
      }); 
      refreshData(); 
  };

  const updateComment = async (c: Comment) => { await supabase.from('comments').update({ content: c.content }).eq('id', c.id); refreshData(); };
  const deleteComment = async (id: string) => { await supabase.from('comments').delete().eq('id', id); refreshData(); };
  const requestNotifyPermission = async () => { await Notify.requestPermission(); };
  const markNotificationsRead = () => { setNotifications(prev => prev.map(n => ({ ...n, read: true }))); };
  const clearNotifications = () => { setNotifications([]); };

  return (
    <AppContext.Provider value={{
      user, users, tasks, comments, language, theme, notifications,
      filterUserId, filterCategory, filterStatus,
      login, logout, 
      register: async (u) => { return await addUser(u); }, 
      setLanguage, setTheme,
      addTask, updateTask, deleteTask, deleteTasks, 
      importTasks: async (t) => { 
          await supabase.from('tasks').insert(t.map(x => ({
              ...x, 
              employee_id: x.employeeId,
              created_by: x.createdBy
          }))); 
          refreshData(); 
      },
      addUser, addUsers, updateUser, deleteUser,
      addComment, updateComment, deleteComment, 
      markNotificationsRead, clearNotifications,
      triggerNativeNotify, sendRemoteReminder, requestNotifyPermission,
      setFilterUserId, setFilterCategory, setFilterStatus,
      refreshData
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
