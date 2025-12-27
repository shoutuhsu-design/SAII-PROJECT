
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context.tsx';
import { AuthScreen } from './components/Auth.tsx';
import { Calendar } from './components/Calendar.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { StatsSidebar } from './components/StatsSidebar.tsx';
import { Logo } from './components/Logo.tsx';
import { DICTIONARY } from './constants.ts';
import { LogOut, Sun, Moon, LayoutDashboard, Calendar as CalIcon, Users, FileSpreadsheet, Menu, PieChart, X, Globe } from 'lucide-react';
import { UserModal } from './components/UserModal.tsx';
import { ImportModal } from './components/ImportModal.tsx';
import { NotificationBell } from './components/NotificationBell.tsx';

const MainLayout: React.FC = () => {
  const { user, logout, language, setLanguage, theme, setTheme } = useApp();
  const t = DICTIONARY[language];
  const [activeTab, setActiveTab] = useState<'calendar' | 'admin'>('calendar');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);

  useEffect(() => {
    // 明确标记应用就绪
    const markReady = () => {
      document.body.classList.add('app-ready');
    };
    
    // 延迟一小会儿确保 React 树已开始渲染，避免瞬时闪烁
    const timer = setTimeout(markReady, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!user) return <AuthScreen />;

  return (
    <div className={`flex flex-col h-screen-safe w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden`}>
      <header className="bg-gradient-to-r from-zte-blue to-zte-dark text-white shadow-lg z-30 relative shrink-0 pt-[calc(env(safe-area-inset-top)+24px)] md:pt-0">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 lg:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 sm:flex-none">
            <div className="flex items-center gap-2 sm:gap-3">
               <div className="h-6 w-16 sm:h-8 sm:w-24 shrink-0">
                  <Logo variant="white" />
               </div>
               <div className="h-6 sm:h-8 w-px bg-white/20 hidden sm:block"></div>
               <div className="flex flex-col justify-center min-w-0">
                  <h1 className="text-xs sm:text-lg font-bold tracking-wide leading-tight mb-0.5 sm:mb-1 truncate">{t.title}</h1>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.1em] text-blue-100/80 leading-none truncate">{t.deptName}</p>
               </div>
            </div>
          </div>

          {user.role === 'admin' && (
            <nav className="hidden md:flex items-center bg-black/10 backdrop-blur-sm p-1.5 rounded-full border border-white/10 mx-4">
               <button onClick={() => setActiveTab('calendar')} className={`flex items-center gap-2 px-4 lg:px-6 py-2 rounded-full text-xs lg:text-sm font-medium transition-all ${activeTab === 'calendar' ? 'bg-white text-zte-blue shadow-lg' : 'text-white hover:bg-white/10'}`}>
                   <CalIcon size={16} /> {t.calendar}
               </button>
               <button onClick={() => setActiveTab('admin')} className={`flex items-center gap-2 px-4 lg:px-6 py-2 rounded-full text-xs lg:text-sm font-medium transition-all ${activeTab === 'admin' ? 'bg-white text-zte-blue shadow-lg' : 'text-white hover:bg-white/10'}`}>
                   <LayoutDashboard size={16} /> {t.dashboard}
               </button>
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-4 z-30 shrink-0">
             <div className="flex items-center gap-1 sm:border-r border-white/20 sm:pr-4">
                {user.role === 'admin' && (
                    <button onClick={() => setShowUserModal(true)} className="hidden md:block p-2.5 rounded-full hover:bg-white/20 text-white"><Users size={20} /></button>
                )}
                <button onClick={() => setShowImportModal(true)} className="hidden md:block p-2.5 rounded-full hover:bg-white/20 text-white"><FileSpreadsheet size={20} /></button>
                <NotificationBell />
             </div>
             <div className="hidden sm:flex items-center gap-2">
                <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full hover:bg-white/20 text-white">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
                <button onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} className="w-8 h-8 flex items-center justify-center text-xs font-bold border border-white/30 rounded-full hover:bg-white/20">{language === 'en' ? 'EN' : 'CN'}</button>
             </div>
             <button onClick={() => setShowMobileStats(true)} className="md:hidden p-2 rounded-full hover:bg-white/20 text-white"><PieChart size={20} /></button>
             <div className="hidden lg:flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 sm:border-l border-white/20 text-right">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-none mb-1">{user.name}</span>
                    <span className="text-[10px] uppercase opacity-75 bg-white/20 px-1.5 py-0.5 rounded">{user.role === 'admin' ? t.admin : t.user}</span>
                </div>
                <button onClick={logout} className="p-2 rounded-full bg-white/10 hover:bg-red-500 hover:text-white transition-all"><LogOut size={16} /></button>
             </div>
             <button className="md:hidden p-1.5 sm:p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex max-w-[1920px] mx-auto w-full relative">
         <div className="hidden lg:block w-72 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-shrink-0 shadow-sm overflow-y-auto custom-scrollbar"><StatsSidebar /></div>
         <div className="flex-1 p-2 sm:p-4 lg:p-6 overflow-hidden h-full">{activeTab === 'calendar' ? <Calendar /> : <AdminDashboard />}</div>
         {showMobileStats && (
             <div className="fixed inset-0 z-40 lg:hidden">
                 <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileStats(false)}></div>
                 <div className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl flex flex-col pt-[calc(env(safe-area-inset-top)+24px)]">
                     <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 mt-4">
                         <h2 className="font-bold text-lg dark:text-white">{t.stats}</h2>
                         <button onClick={() => setShowMobileStats(false)}><X size={24} className="text-gray-500" /></button>
                     </div>
                     <div className="flex-1 overflow-y-auto no-scrollbar"><StatsSidebar /></div>
                 </div>
             </div>
         )}
      </main>
      {showUserModal && <UserModal onClose={() => setShowUserModal(false)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <MainLayout />
  </AppProvider>
);

export default App;
