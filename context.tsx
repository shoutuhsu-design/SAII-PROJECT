import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppState, Language, Task, Theme, User } from './types';
import { INITIAL_TASKS, INITIAL_USERS } from './constants';

interface AppContextType extends AppState {
  login: (user: User) => void;
  logout: () => void;
  register: (user: User) => void;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  importTasks: (tasks: Task[]) => void;
  addUser: (user: User) => void;
  deleteUser: (userId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [language, setLanguage] = useState<Language>('zh');
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const login = (u: User) => setUser(u);
  const logout = () => setUser(null);
  const register = (u: User) => {
    setUsers([...users, { ...u, color: u.color || '#666' }]);
    setUser(u); // Auto login
  };

  const addTask = (task: Task) => setTasks([...tasks, task]);
  const updateTask = (updated: Task) => {
    setTasks(tasks.map(t => t.id === updated.id ? updated : t));
  };
  const deleteTask = (id: string) => setTasks(tasks.filter(t => t.id !== id));
  
  const importTasks = (newTasks: Task[]) => {
    setTasks([...tasks, ...newTasks]);
  };

  const addUser = (newUser: User) => {
    setUsers([...users, { ...newUser, color: newUser.color || '#' + Math.floor(Math.random()*16777215).toString(16) }]);
  };

  const deleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
    // Also cleanup tasks for this user if desired, but keeping them for record might be safer
  };

  return (
    <AppContext.Provider value={{
      user, users, tasks, language, theme,
      login, logout, register, setLanguage, setTheme,
      addTask, updateTask, deleteTask, importTasks,
      addUser, deleteUser
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