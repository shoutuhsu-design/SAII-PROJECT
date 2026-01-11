
import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context';
import { AuthScreen } from './components/Auth';
import { Calendar } from './components/Calendar';
import { AdminDashboard } from './components/AdminDashboard';
import { StatsSidebar } from './components/StatsSidebar';
import { Logo } from './components/Logo';
import { DICTIONARY } from './constants';
import { LogOut, Sun, Moon, LayoutDashboard, Calendar as CalIcon, Users, FileSpreadsheet, Menu, PieChart, X, Globe, Bell, Smartphone, UserCog } from 'lucide-react';
import { UserModal } from './components/UserModal';
import { ImportModal } from './components/ImportModal';
import { NotificationBell } from './components/NotificationBell';

// --- 全局 Toast 组件 ---
const AppUIToast: React.FC = () => {
    const [toast, setToast] = useState<{title: string, body: string} | null>(null);
    const timer = React.useRef<any>(null);

    useEffect(() => {
        const handler = (e: any) => {
            if (timer.current) clearTimeout(timer.current);
            setToast({ title: e.detail.title, body: e.detail.body });
            timer.current = setTimeout(() => setToast(null), 5000);
        };
        window.addEventListener('app-ui-notification', handler);
        return () => {
            window.removeEventListener('app-ui-notification', handler);
            if (timer.current) clearTimeout(timer.current);
        };
    }, []);

    if (!toast) return null;

    return (
        <div className="fixed top-24 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[99999] animate-in slide-in-from-top-4 duration-300">
            <div className="bg-white dark:bg-gray-800 border-l-4 border-zte-blue shadow-2xl rounded-xl p-4 flex items-start gap-4 ring-1 ring-black/5">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-full text-zte-blue shrink-0">
                    <Bell size={20} className="animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{toast.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{toast.body}</p>
                </div>
                <button onClick={() => setToast(null)} className="text-gray-400 p-1 hover:text-gray-600">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

const MainLayout: React.FC = () => {
  const { user, logout, language, setLanguage, theme, setTheme, requestNotifyPermission } = useApp();
  const t = DICTIONARY[language];
  const [activeTab, setActiveTab] = useState<'calendar' | 'admin'>('calendar');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);

  // Inactivity Timer State
  const inactivityTimerRef = useRef<any>(null);
  // 1 hour in milliseconds
  const INACTIVITY_LIMIT = 60 * 60 * 1000;

  useEffect(() => {
    if (user) {
        requestNotifyPermission();
        
        // --- Desktop Inactivity Timeout Logic ---
        // Only run on desktop (width > 1024px)
        if (window.innerWidth > 1024) {
            const resetTimer = () => {
                if (inactivityTimerRef.current) {
                    clearTimeout(inactivityTimerRef.current);
                }
                inactivityTimerRef.current = setTimeout(() => {
                    alert(t.sessionExpired);
                    logout();
                }, INACTIVITY_LIMIT);
            };

            // Initialize timer
            resetTimer();

            // Listeners for user activity
            const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
            events.forEach(event => window.addEventListener(event, resetTimer));

            return () => {
                if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
                events.forEach(event => window.removeEventListener(event, resetTimer));
            };
        }
    }

    const isMobile = window.innerWidth <= 1024;
    if (isMobile) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            document.body.classList.add('app-ready');
            setTimeout(() => {
               const shell = document.getElementById('app-shell');
               if (shell) shell.remove();
            }, 700);
          }, 600); 
        });
    } else {
        document.body.classList.add('app-ready');
        const shell = document.getElementById('app-shell');
        if (shell) shell.remove();
    }
  }, [user, requestNotifyPermission, logout, t.sessionExpired]);

  if (!user) return <AuthScreen />;

  return (
    <div className={`flex flex-col h-screen w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden`}>
      <AppUIToast />
      {/* 优化点：调整安全区域留白为 +12px，确保在移动端拥有专业的商务间距 */}
      <header className="bg-gradient-to-r from-zte-blue to-zte-dark text-white shadow-lg z-30 sticky top-0 shrink-0 pt-[calc(env(safe-area-inset-top)+12px)] md:pt-0 transition-all duration-300">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-12 sm:h-16 lg:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 sm:flex-none">
            <div className="flex items-center gap-2 sm:gap-3">
               <div className="h-5 w-14 sm:h-8 sm:w-24 shrink-0">
                  <Logo className="h-full w-full" variant="white" />
               </div>
               <div className="h-6 sm:h-8 w-px bg-white/20 hidden sm:block"></div>
               <div className="flex flex-col justify-center min-w-0">
                  <h1 className="text-[10px] sm:text-lg font-bold tracking-wide leading-tight mb-0 sm:mb-1 truncate">
                    <span className="hidden sm:inline">{t.title}</span>
                    <span className="sm:hidden">{t.titleMobile || t.title}</span>
                  </h1>
                  <p className="text-[8px] sm:text-[10px] uppercase tracking-[0.05em] sm:tracking-[0.2em] text-blue-100/80 leading-none truncate">{t.deptName}</p>
               </div>
            </div>
          </div>

          {user.role === 'admin' && (
            <nav className="hidden md:flex items-center bg-black/10 backdrop-blur-sm p-1.5 rounded-full border border-white/10 mx-4">
               <button 
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 px-4 lg:px-6 py-2 rounded-full text-xs lg:text-sm font-medium transition-all duration-300 ${activeTab === 'calendar' ? 'bg-white text-zte-blue shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}
               >
                   <CalIcon size={16} /> {t.calendar}
               </button>
               <button 
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 lg:px-6 py-2 rounded-full text-xs lg:text-sm font-medium transition-all duration-300 ${activeTab === 'admin' ? 'bg-white text-zte-blue shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}
               >
                   <LayoutDashboard size={16} /> {t.dashboard}
               </button>
            </nav>
          )}

          <div className="flex items-center gap-2 sm:gap-4 z-30 shrink-0">
             <div className="flex items-center gap-1 sm:border-r border-white/20 sm:pr-4">
                {/* 
                    修改：允许所有用户点击此按钮。
                    管理员显示 Users 图标 (用户管理)，普通用户显示 UserCog 图标 (个人设置) 
                */}
                <button 
                    onClick={() => setShowUserModal(true)}
                    className="hidden md:block p-2.5 rounded-full hover:bg-white/20 text-white transition-colors tooltip-wrapper relative group"
                    title={user.role === 'admin' ? t.userManagement : t.updateUser}
                >
                    {user.role === 'admin' ? <Users size={20} /> : <UserCog size={20} />}
                </button>

                {/* Import/Export 仅管理员或特定逻辑下显示，此处保持不变 */}
                <button 
                    onClick={() => setShowImportModal(true)}
                    className="hidden md:block p-2.5 rounded-full hover:bg-white/20 text-white transition-colors relative group"
                    title={t.import}
                >
                    <FileSpreadsheet size={20} />
                </button>
                <NotificationBell />
             </div>

             <div className="hidden sm:flex items-center gap-2">
                <button 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                >
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </button>
                <button 
                  onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
                  className="w-8 h-8 flex items-center justify-center text-xs font-bold border border-white/30 rounded-full hover:bg-white/20 transition-colors"
                >
                  {language === 'en' ? 'EN' : 'CN'}
                </button>
             </div>

             <button 
                onClick={() => setShowMobileStats(true)}
                className="md:hidden p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                title={t.stats}
             >
                <PieChart size={18} />
             </button>

             <div className="hidden lg:flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 sm:border-l border-white/20">
                <div className="flex flex-col items-end text-right">
                    <span className="text-sm font-semibold leading-none mb-1">{user.name}</span>
                    <span className="text-[10px] uppercase opacity-75 leading-none bg-white/20 px-1.5 py-0.5 rounded">{user.role === 'admin' ? t.admin : t.user}</span>
                </div>
                <button 
                  onClick={logout} 
                  className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-red-500 hover:text-white transition-all border border-white/10 shadow-sm group"
                  title={t.logout}
                >
                  <LogOut size={16} className="sm:w-[18px] sm:h-[18px] group-hover:scale-110 transition-transform" />
                </button>
             </div>
             
             <button className="md:hidden p-1.5 active:opacity-70" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
             </button>
          </div>
        </div>

        {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-gradient-to-br from-[#E0F2FA] via-[#F0F9FF] to-white dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-900/90 backdrop-blur-xl border-t border-white/40 dark:border-white/10 shadow-2xl z-50 animate-in slide-in-from-top-4 duration-200 pb-[env(safe-area-inset-bottom)] rounded-b-3xl mx-2 mt-1 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-4 bg-white/60 dark:bg-white/5 p-4 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg font-bold shadow-lg text-white">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col flex-1">
                             <span className="text-base font-bold text-gray-900 dark:text-white">{user.name}</span>
                             <span className="text-xs text-gray-500 dark:text-gray-400">{user.role === 'admin' ? t.admin : t.user}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                         {user.role === 'admin' && (
                            <>
                                <button 
                                    onClick={() => {setActiveTab('calendar'); setMobileMenuOpen(false)}} 
                                    className={`col-span-2 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border ${activeTab === 'calendar' ? 'bg-zte-blue text-white border-zte-blue shadow-md' : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm'}`}
                                >
                                    <CalIcon size={24} /> 
                                    <span className="text-xs font-bold">{t.calendar}</span>
                                </button>
                                <button 
                                    onClick={() => {setActiveTab('admin'); setMobileMenuOpen(false)}} 
                                    className={`col-span-2 p-3 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border ${activeTab === 'admin' ? 'bg-zte-blue text-white border-zte-blue shadow-md' : 'bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm'}`}
                                >
                                    <LayoutDashboard size={24} /> 
                                    <span className="text-xs font-bold">{t.dashboard}</span>
                                </button>
                            </>
                         )}

                         {/* 
                             修改：所有用户都可以访问用户管理/个人设置 
                             管理员显示 "User Mgmt", 普通用户显示 "Profile"
                         */}
                         <button onClick={() => {setShowUserModal(true); setMobileMenuOpen(false)}} className="aspect-square rounded-2xl bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1 active:scale-95 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                             {user.role === 'admin' ? <Users size={20} /> : <UserCog size={20} />}
                             <span className="text-[10px] font-medium opacity-80">{user.role === 'admin' ? t.userManagement.split(' ')[0] : (language === 'zh' ? '个人' : 'Profile')}</span>
                         </button>

                         <button onClick={() => {setShowImportModal(true); setMobileMenuOpen(false)}} className="aspect-square rounded-2xl bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1 active:scale-95 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                            <Smartphone size={20} />
                            <span className="text-[10px] font-medium opacity-80">{language === 'zh' ? '同步日历' : 'Sync'}</span>
                         </button>

                         <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="aspect-square rounded-2xl bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1 active:scale-95 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                             {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                             <span className="text-[10px] font-medium opacity-80">{theme === 'light' ? 'Dark' : 'Light'}</span>
                         </button>

                         <button onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} className="aspect-square rounded-2xl bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1 active:scale-95 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                             <Globe size={20} />
                             <span className="text-[10px] font-medium opacity-80">{language === 'en' ? 'CN' : 'EN'}</span>
                         </button>
                    </div>

                    <button 
                        onClick={logout}
                        className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-900/30 p-3 rounded-2xl flex items-center justify-center gap-2 font-bold active:scale-[0.98] transition-all shadow-sm"
                    >
                        <LogOut size={18} /> {t.logout}
                    </button>
                </div>
            </div>
        )}
      </header>

      <main className="flex-1 overflow-hidden flex max-w-[1920px] mx-auto w-full relative">
         <div className="hidden lg:block w-72 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-shrink-0 z-0 shadow-sm overflow-y-auto custom-scrollbar">
             <StatsSidebar />
         </div>

         <div className="flex-1 p-2 sm:p-4 lg:p-6 overflow-hidden relative h-full">
            {activeTab === 'calendar' ? <Calendar /> : <AdminDashboard />}
         </div>
         
         {showMobileStats && (
             <div className="fixed inset-0 z-40 lg:hidden">
                 <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileStats(false)}></div>
                 <div className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200 pt-[calc(env(safe-area-inset-top)+24px)] pb-[env(safe-area-inset-bottom)]">
                     <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 mt-4">
                         <h2 className="font-bold text-lg dark:text-white">{t.stats}</h2>
                         <button onClick={() => setShowMobileStats(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                             <X size={24} className="text-gray-500 dark:text-gray-400" />
                         </button>
                     </div>
                     <div className="flex-1 overflow-y-auto no-scrollbar">
                        <StatsSidebar />
                     </div>
                 </div>
             </div>
         )}
      </main>

      {showUserModal && <UserModal onClose={() => setShowUserModal(false)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
