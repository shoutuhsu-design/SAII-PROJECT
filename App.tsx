
import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context';
import { AuthScreen } from './components/Auth';
import { Calendar } from './components/Calendar';
import { AdminDashboard } from './components/AdminDashboard';
import { StatsSidebar } from './components/StatsSidebar';
import { Logo } from './components/Logo';
import { DICTIONARY } from './constants';
import { LogOut, Sun, Moon, LayoutDashboard, Calendar as CalIcon, Users, FileSpreadsheet, Menu, PieChart, X, Globe } from 'lucide-react';
import { UserModal } from './components/UserModal';
import { ImportModal } from './components/ImportModal';
import { NotificationBell } from './components/NotificationBell';

const MainLayout: React.FC = () => {
  const { user, logout, language, setLanguage, theme, setTheme } = useApp();
  const t = DICTIONARY[language];
  const [activeTab, setActiveTab] = useState<'calendar' | 'admin'>('calendar');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileStats, setShowMobileStats] = useState(false);

  // --- App Ready / Launch Screen Removal Logic ---
  useEffect(() => {
    // Only runs on mount.
    // We use a safe delay to ensure the browser has painted the React tree 
    // underneath the #app-shell before we fade the shell out.
    
    // Check if we are on mobile (matching the CSS media query)
    const isMobile = window.innerWidth <= 1024;

    if (isMobile) {
        requestAnimationFrame(() => {
          // 600ms delay gives enough time for React to hydrate and render images/icons
          setTimeout(() => {
            document.body.classList.add('app-ready');

            // Remove the shell from DOM after the CSS transition (0.6s) completes
            setTimeout(() => {
               const shell = document.getElementById('app-shell');
               if (shell) shell.remove();
            }, 700);
          }, 600); 
        });
    } else {
        // Desktop: Immediate ready
        document.body.classList.add('app-ready');
    }
  }, []);

  if (!user) return <AuthScreen />;

  return (
    <div className={`flex flex-col h-screen-safe w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden`}>
      {/* 
        Redesigned Header with FORCED Safe Area Padding for Mobile
        pt-[calc(env(safe-area-inset-top)+24px)]: Ensures at least 24px spacer on top of safe area for mobile status bars.
        md:pt-0: Strictly removes this padding on desktop/tablet to maintain original design.
      */}
      <header className="bg-gradient-to-r from-zte-blue to-zte-dark text-white shadow-lg z-30 relative shrink-0 pt-[calc(env(safe-area-inset-top)+24px)] md:pt-0 transition-all duration-300">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 lg:h-20 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-2 sm:gap-6 min-w-0 flex-1 sm:flex-none">
            <div className="flex items-center gap-2 sm:gap-3">
               <div className="h-6 w-16 sm:h-8 sm:w-24 shrink-0">
                  <Logo className="h-full w-full" variant="white" />
               </div>
               <div className="h-6 sm:h-8 w-px bg-white/20 hidden sm:block"></div>
               <div className="flex flex-col justify-center min-w-0">
                  <h1 className="text-xs sm:text-lg font-bold tracking-wide leading-tight mb-0.5 sm:mb-1 truncate">{t.title}</h1>
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.1em] sm:tracking-[0.2em] text-blue-100/80 leading-none truncate">{t.deptName}</p>
               </div>
            </div>
          </div>

          {/* Desktop Navigation - Visible on Medium screens and up */}
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

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4 z-30 shrink-0">
             <div className="flex items-center gap-1 sm:border-r border-white/20 sm:pr-4">
                {/* Admin Only: User Management (Desktop) */}
                {user.role === 'admin' && (
                    <button 
                        onClick={() => setShowUserModal(true)}
                        className="hidden md:block p-2.5 rounded-full hover:bg-white/20 text-white transition-colors tooltip-wrapper relative group"
                        title={t.userManagement}
                    >
                        <Users size={20} />
                    </button>
                )}
                {/* Public: Import/Export (Desktop) */}
                <button 
                    onClick={() => setShowImportModal(true)}
                    className="hidden md:block p-2.5 rounded-full hover:bg-white/20 text-white transition-colors relative group"
                    title={t.import}
                >
                    <FileSpreadsheet size={20} />
                </button>
                
                {/* Notification Bell */}
                <NotificationBell />
             </div>

             {/* Theme & Language (Desktop/Tablet) */}
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

             {/* Mobile Stats Toggle - Moved OUT of the menu into the navbar */}
             <button 
                onClick={() => setShowMobileStats(true)}
                className="md:hidden p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                title={t.stats}
             >
                <PieChart size={20} />
             </button>

             {/* User Profile (Desktop) */}
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
             
             {/* Mobile Menu Button */}
             <button className="md:hidden p-1.5 sm:p-2 active:opacity-70" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
             </button>
          </div>
        </div>

        {/* 
            Mobile Menu Dropdown (App-like Grid Layout) 
            Redesigned to look like a control center
            UPDATED COLOR SCHEME: 
            - Light Mode: Light Blue Gradient to match Login Page
            - Dark Mode: Gray Gradient Frosted Glass Effect
        */}
        {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-gradient-to-br from-[#E0F2FA] via-[#F0F9FF] to-white dark:from-gray-900/90 dark:via-gray-800/90 dark:to-gray-900/90 backdrop-blur-xl border-t border-white/40 dark:border-white/10 shadow-2xl z-50 animate-in slide-in-from-top-4 duration-200 safe-pb rounded-b-3xl mx-2 mt-1 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
                <div className="p-4 space-y-4">
                    
                    {/* User Profile Card - Updated for Light/Dark Theme */}
                    <div className="flex items-center gap-4 bg-white/60 dark:bg-white/5 p-4 rounded-2xl border border-white/50 dark:border-white/5 shadow-sm">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-lg font-bold shadow-lg text-white">
                            {user.name.charAt(0)}
                        </div>
                        <div className="flex flex-col flex-1">
                             <span className="text-base font-bold text-gray-900 dark:text-white">{user.name}</span>
                             <span className="text-xs text-gray-500 dark:text-gray-400">{user.role === 'admin' ? t.admin : t.user}</span>
                        </div>
                    </div>

                    {/* App Grid Actions - Updated for Light/Dark Theme */}
                    <div className="grid grid-cols-4 gap-3">
                         {/* Navigation Items (Span 2 cols) */}
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

                         {/* Admin Tools (Square) */}
                         {user.role === 'admin' && (
                            <button onClick={() => {setShowUserModal(true); setMobileMenuOpen(false)}} className="aspect-square rounded-2xl bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1 active:scale-95 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                                <Users size={20} />
                                <span className="text-[10px] font-medium opacity-80">{t.userManagement.split(' ')[0]}</span>
                            </button>
                         )}

                         {/* Common Tools (Square) */}
                         <button onClick={() => {setShowImportModal(true); setMobileMenuOpen(false)}} className="aspect-square rounded-2xl bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1 active:scale-95 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                            <FileSpreadsheet size={20} />
                            <span className="text-[10px] font-medium opacity-80">{t.import}</span>
                         </button>

                         {/* Theme */}
                         <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="aspect-square rounded-2xl bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1 active:scale-95 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                             {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                             <span className="text-[10px] font-medium opacity-80">{theme === 'light' ? 'Dark' : 'Light'}</span>
                         </button>

                         {/* Language */}
                         <button onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')} className="aspect-square rounded-2xl bg-white/60 dark:bg-white/5 text-gray-700 dark:text-gray-200 flex flex-col items-center justify-center gap-1 active:scale-95 border border-white/50 dark:border-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm">
                             <Globe size={20} />
                             <span className="text-[10px] font-medium opacity-80">{language === 'en' ? 'CN' : 'EN'}</span>
                         </button>
                    </div>

                    {/* Logout Button - Updated for Light/Dark Theme */}
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

      {/* Main Body */}
      <main className="flex-1 overflow-hidden flex max-w-[1920px] mx-auto w-full relative">
         {/* Desktop Sidebar */}
         <div className="hidden lg:block w-72 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-shrink-0 z-0 shadow-sm overflow-y-auto custom-scrollbar">
             <StatsSidebar />
         </div>

         {/* Content Area */}
         <div className="flex-1 p-2 sm:p-4 lg:p-6 overflow-hidden relative h-full">
            {activeTab === 'calendar' ? <Calendar /> : <AdminDashboard />}
         </div>
         
         {/* 
            Mobile Stats Drawer (Overlay)
            Added pt-[calc(env(safe-area-inset-top)+24px)] to ensure the drawer header (Title + Close X) is not hidden behind status bar.
         */}
         {showMobileStats && (
             <div className="fixed inset-0 z-40 lg:hidden">
                 <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileStats(false)}></div>
                 <div className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200 pt-[calc(env(safe-area-inset-top)+24px)] safe-pb">
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

      {/* Modals */}
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
