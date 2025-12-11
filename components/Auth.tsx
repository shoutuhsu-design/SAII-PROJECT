import React, { useState } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { Logo } from './Logo';

export const AuthScreen: React.FC = () => {
  const { login, register, users, language, setLanguage } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ employeeId: '', password: '', name: '' });
  const [error, setError] = useState('');

  const t = DICTIONARY[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const user = users.find(u => u.employeeId === form.employeeId && u.password === form.password);
      if (user) {
        login(user);
      } else {
        setError(t.invalidCredentials);
      }
    } else {
      if (users.find(u => u.employeeId === form.employeeId)) {
        setError(t.userExists);
        return;
      }
      register({
        id: Date.now().toString(),
        employeeId: form.employeeId,
        password: form.password,
        name: form.name,
        role: 'user',
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 transition-colors duration-300 p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded text-sm ${language === 'en' ? 'bg-zte-blue text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm'}`}>EN</button>
        <button onClick={() => setLanguage('zh')} className={`px-3 py-1 rounded text-sm ${language === 'zh' ? 'bg-zte-blue text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm'}`}>中文</button>
      </div>
      
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4"><div className="h-16 w-48"><Logo className="w-full h-full" variant="blue" /></div></div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t.title}</h1>
        <p className="text-zte-blue/80 dark:text-gray-400 font-medium tracking-wide mt-1">{t.subtitle}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md border-t-4 border-zte-blue transition-colors">
        <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white border-b dark:border-gray-700 pb-2">
          {isLogin ? t.login : t.register}
        </h2>
        
        {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded mb-4 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.name}</label>
              <input 
                required
                type="text" 
                className="w-full p-2.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-all placeholder-gray-400"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.employeeId}</label>
            <input 
              required
              type="text" 
              className="w-full p-2.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-all placeholder-gray-400"
              value={form.employeeId}
              onChange={e => setForm({...form, employeeId: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.password}</label>
            <input 
              required
              type="password" 
              className="w-full p-2.5 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-all placeholder-gray-400"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>
          <button type="submit" className="w-full bg-zte-blue hover:bg-zte-dark text-white font-bold py-2.5 px-4 rounded transition-colors shadow-lg shadow-zte-blue/30 mt-2">
            {isLogin ? t.login : t.register}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)} 
            className="text-sm text-zte-blue hover:text-zte-dark hover:underline font-medium transition-colors"
          >
            {isLogin ? t.toggleAuth[0] : t.toggleAuth[1]}
          </button>
        </div>
      </div>
    </div>
  );
};