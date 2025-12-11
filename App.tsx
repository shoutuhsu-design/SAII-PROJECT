import React, { useState } from 'react';
import { AppProvider, useApp } from './context';
import { AuthScreen } from './components/Auth';
import { Calendar } from './components/Calendar';
import { AdminDashboard } from './components/AdminDashboard';
import { StatsSidebar } from './components/StatsSidebar';
import { Logo } from './components/Logo';
import { DICTIONARY } from './constants';
import { LogOut, Sun, Moon, LayoutDashboard, Calendar as CalIcon, Users, FileSpreadsheet, Menu } from 'lucide-react';
import { UserModal } from './components/UserModal';
import { ImportModal } from './components/ImportModal';

const MainLayout: React.FC = () => {
  const { user, logout, language, setLanguage, theme, setTheme } = useApp();
  const t = DICTIONARY[language];
  const [activeTab, setActiveTab] = useState<'calendar' | 'admin'>('calendar');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return <AuthScreen />;

  return (
    <div className={`flex flex-col h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
      {/* Redesigned Header */}
      <header className="bg-gradient-to-r from-zte-blue to-zte-dark text-white shadow-lg z-20 relative">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
               <div className="h-8 w-24">
                  {/* Pass variant='white' to make the logo white on blue background */}
                  <Logo className="h-full w-full" variant="white" />
               </div>
               <div className="h-8 w-px bg-white/20 hidden sm:block"></div>
               <div className="flex flex-col justify-center">
                  <h1 className="text-lg font-bold tracking-wide leading-none mb-1">{t.title}</h1>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-100/80 leading-none">{t.deptName}</p>
               </div>
            </div>
          </div>

          {/* Desktop Navigation - Centered Pills */}
          {user.role === 'admin' && (
            <nav className="hidden xl:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/10 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
               <button 
                onClick={() => setActiveTab('calendar')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'calendar' ? 'bg-white text-zte-blue shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}
               >
                   <CalIcon size={16} /> {t.calendar}
               </button>
               <button 
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${activeTab === 'admin' ? 'bg-white text-zte-blue shadow-lg scale-105' : 'text-white hover:bg-white/10'}`}
               >
                   <LayoutDashboard size={16} /> {t.dashboard}
               </button>
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-4">
             {/* Admin Tools */}
             {user.role === 'admin' && (
                <div className="hidden md:flex items-center gap-1 border-r border-white/20 pr-4 mr-1">
                    <button 
                        onClick={() => setShowUserModal(true)}
                        className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors tooltip-wrapper relative group"
                        title={t.userManagement}
                    >
                        <Users size={20} />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-black/80 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{t.userManagement}</span>
                    </button>
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors relative group"
                        title={t.import}
                    >
                        <FileSpreadsheet size={20} />
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-black/80 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">{t.import}</span>
                    </button>
                </div>
             )}

             {/* Theme & Language */}
             <div className="flex items-center gap-2">
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

             {/* User Profile */}
             <div className="flex items-center gap-3 pl-2 border-l border-white/20">
                <div className="hidden lg:flex flex-col items-end text-right">
                    <span className="text-sm font-semibold leading-none mb-1">{user.name}</span>
                    <span className="text-[10px] uppercase opacity-75 leading-none bg-white/20 px-1.5 py-0.5 rounded">{user.role}</span>
                </div>
                <button 
                  onClick={logout} 
                  className="p-2 rounded-full bg-white/10 hover:bg-red-500 hover:text-white transition-all border border-white/10 shadow-sm group"
                  title={t.logout}
                >
                  <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                </button>
             </div>
             
             {/* Mobile Menu Button */}
             <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu size={24} />
             </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
            <div className="md:hidden bg-zte-dark border-t border-white/10 p-4 space-y-3 shadow-inner">
                {user.role === 'admin' && (
                    <div className="flex flex-col gap-2 pb-3 border-b border-white/10">
                         <button onClick={() => {setActiveTab('calendar'); setMobileMenuOpen(false)}} className={`p-3 rounded text-left ${activeTab === 'calendar' ? 'bg-white text-zte-blue' : 'text-white hover:bg-white/10'}`}>{t.calendar}</button>
                         <button onClick={() => {setActiveTab('admin'); setMobileMenuOpen(false)}} className={`p-3 rounded text-left ${activeTab === 'admin' ? 'bg-white text-zte-blue' : 'text-white hover:bg-white/10'}`}>{t.dashboard}</button>
                         <div className="flex gap-2 mt-2">
                            <button onClick={() => setShowUserModal(true)} className="flex-1 p-2 bg-white/10 rounded text-center text-sm">{t.userManagement}</button>
                            <button onClick={() => setShowImportModal(true)} className="flex-1 p-2 bg-white/10 rounded text-center text-sm">{t.import}</button>
                         </div>
                    </div>
                )}
            </div>
        )}
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-hidden flex max-w-[1920px] mx-auto w-full">
         {/* Sidebar - only show on large screens or if not admin dashboard */}
         <div className="hidden lg:block w-72 bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex-shrink-0 z-0 shadow-sm">
             <StatsSidebar />
         </div>

         {/* Content Area */}
         <div className="flex-1 p-4 lg:p-6 overflow-hidden relative">
            {activeTab === 'calendar' ? <Calendar /> : <AdminDashboard />}
         </div>
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