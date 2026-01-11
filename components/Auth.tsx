
import React, { useState } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { Logo } from './Logo';
import { User } from '../types';
import { Calendar, BarChart3, FileText, CheckCircle2, LayoutGrid, Clock, User as UserIcon, Lock, Fingerprint, ArrowRight, ShieldCheck, Check, Loader2 } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { login, register, users, language, setLanguage, updateUser } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ employeeId: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // States for password reset flow
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [tempUser, setTempUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const t = DICTIONARY[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
        // Flow 1: Handling Password Reset
        if (isSettingPassword && tempUser) {
            if (newPassword !== confirmPassword) {
                setError(t.passwordMismatch);
                setIsLoading(false);
                return;
            }
            if (newPassword.trim() === '') {
                setError("Password cannot be empty");
                setIsLoading(false);
                return;
            }
            const updatedUser = { ...tempUser, password: newPassword };
            await updateUser(updatedUser); // Await this if context supports it, but currently it's void/promise
            const res = await login(updatedUser);
            if (res !== true) setError(res as string);
            setIsLoading(false);
            return;
        }

        // Flow 2: Normal Login / Register
        if (isLogin) {
            const user = users.find(u => u.employeeId === form.employeeId && u.password === form.password);
            
            if (user) {
                if (user.password === '') {
                    setTempUser(user);
                    setIsSettingPassword(true);
                    setError(""); 
                } else {
                    const res = await login(user);
                    if (res !== true) {
                        setError(res as string);
                    }
                }
            } else {
                setError(t.invalidCredentials);
            }
        } else {
            if (users.find(u => u.employeeId === form.employeeId)) {
                setError(t.userExists);
                setIsLoading(false);
                return;
            }
            const success = await register({
                id: Date.now().toString(),
                employeeId: form.employeeId,
                password: form.password,
                name: form.name,
                role: 'user',
                color: '#' + Math.floor(Math.random()*16777215).toString(16),
                status: 'pending' // Explicitly set status to pending for admin approval
            });
            
            if (success) {
                setSuccessMsg(t.regSuccessWait);
                setIsLogin(true);
                setForm({...form, password: ''}); // clear password
            }
        }
    } catch (e: any) {
        setError(e.message || "An error occurred");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row relative overflow-hidden bg-white">
      
      {/* MOBILE BACKGROUND */}
      <div className="absolute inset-0 lg:hidden z-0 overflow-hidden pointer-events-none">
         <div className="absolute inset-0 bg-gradient-to-br from-[#E0F2FA] via-[#F0F9FF] to-white"></div>
         <div className="absolute top-[-15%] right-[-15%] w-[80vw] h-[80vw] bg-[#008ED3]/10 rounded-full blur-[80px]"></div>
         <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-[#008ED3]/5 rounded-full blur-[60px]"></div>
         <div className="absolute inset-0 opacity-[0.015]" style={{backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`}}></div>
      </div>

      {/* LEFT SIDE (DESKTOP) */}
      <div className="hidden lg:flex lg:w-1/2 bg-zte-blue relative overflow-hidden flex-col justify-between p-12 text-white z-10 h-full">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

        <div className="z-10">
           <div className="h-10 w-28 mb-8 opacity-90">
                <Logo variant="white" />
           </div>
           <h1 className="text-4xl font-bold mb-4 leading-tight">{t.loginTitle}</h1>
           <p className="text-blue-100 text-lg max-w-md">{t.loginDesc}</p>
        </div>

        {/* Abstract Calendar UI */}
        <div className="z-10 relative mt-12 flex-1 flex items-center justify-center">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 w-full max-w-md border border-white/20 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
                 <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-500 rounded-lg"><Calendar size={20} className="text-white"/></div>
                         <div className="h-2 w-24 bg-white/40 rounded"></div>
                     </div>
                     <div className="h-8 w-8 rounded-full bg-white/30"></div>
                 </div>
                 <div className="grid grid-cols-4 gap-3 mb-4">
                     {[...Array(8)].map((_, i) => (
                         <div key={i} className="bg-white/5 rounded-lg h-16 p-2 flex flex-col justify-between hover:bg-white/10 transition-colors">
                             <div className="w-4 h-4 rounded-full bg-white/20"></div>
                             <div className={`h-1.5 rounded w-3/4 ${i % 2 === 0 ? 'bg-blue-300' : 'bg-emerald-300'}`}></div>
                         </div>
                     ))}
                 </div>
                 <div className="flex gap-3">
                     <div className="flex-1 bg-emerald-500/20 rounded p-2 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-300" />
                        <div className="h-2 w-12 bg-white/40 rounded"></div>
                     </div>
                      <div className="flex-1 bg-amber-500/20 rounded p-2 flex items-center gap-2">
                        <Clock size={16} className="text-amber-300" />
                        <div className="h-2 w-12 bg-white/40 rounded"></div>
                     </div>
                 </div>
            </div>
        </div>

        <div className="z-10 grid grid-cols-3 gap-6 pt-12">
            <div>
                <LayoutGrid className="mb-2 opacity-80" />
                <h3 className="font-bold text-sm mb-1">{t.feature1}</h3>
                <p className="text-xs text-blue-100 opacity-70">{t.feature1Desc}</p>
            </div>
            <div>
                <BarChart3 className="mb-2 opacity-80" />
                <h3 className="font-bold text-sm mb-1">{t.feature2}</h3>
                <p className="text-xs text-blue-100 opacity-70">{t.feature2Desc}</p>
            </div>
             <div>
                <FileText className="mb-2 opacity-80" />
                <h3 className="font-bold text-sm mb-1">{t.feature3}</h3>
                <p className="text-xs text-blue-100 opacity-70">{t.feature3Desc}</p>
            </div>
        </div>
      </div>

      {/* RIGHT SIDE: FORM */}
      <div className="w-full lg:w-1/2 flex flex-col p-6 md:p-8 lg:p-16 relative z-10 h-full overflow-y-auto">
          
          {/* Top Bar: Language Toggle */}
          <div className="flex justify-end w-full pt-[calc(env(safe-area-inset-top)+12px)] lg:pt-0 mb-4 lg:absolute lg:top-6 lg:right-6 lg:z-20 shrink-0">
            <div className="flex gap-2">
                <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded text-sm font-medium transition-all ${language === 'en' ? 'bg-zte-blue text-white shadow-md' : 'bg-white/50 lg:bg-gray-100 text-gray-700 hover:bg-white'}`}>EN</button>
                <button onClick={() => setLanguage('zh')} className={`px-3 py-1 rounded text-sm font-medium transition-all ${language === 'zh' ? 'bg-zte-blue text-white shadow-md' : 'bg-white/50 lg:bg-gray-100 text-gray-700 hover:bg-white'}`}>中文</button>
            </div>
          </div>

          {/* Center Content: Login Form - Flex 1 to take available space */}
          <div className="flex-1 flex flex-col justify-center items-center w-full min-h-0">
              <div className="w-full max-w-sm bg-white/70 backdrop-blur-xl lg:bg-transparent rounded-3xl lg:rounded-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] lg:shadow-none border border-white/60 lg:border-none p-8 lg:p-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="mb-10 text-center lg:text-left">
                    {/* Unified Mobile Logo: Blue on White (Standard Branding) */}
                    <div className="lg:hidden w-full flex justify-center mb-8">
                        <div className="h-10 w-28">
                             <Logo variant="blue" />
                        </div>
                    </div>
                    
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{isSettingPassword ? t.firstLoginSetup : (isLogin ? t.welcome : t.register)}</h2>
                    <p className="text-gray-500 text-sm sm:text-base">{t.deptName}</p>
                </div>

                {successMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
                        <Check size={16} />{successMsg}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center gap-2 shadow-sm animate-in fade-in">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>{error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {isSettingPassword ? (
                    <>
                        <div className="text-sm text-blue-700 mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 flex items-center gap-2">
                            <ShieldCheck size={16} />
                            <span>Hello <b>{tempUser?.name}</b>, please secure your account.</span>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{t.setNewPassword}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                required
                                type="password" 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 lg:bg-gray-50 text-gray-900 focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-all placeholder-gray-400"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                autoFocus
                                placeholder="••••••••"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{t.confirmPassword}</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                required
                                type="password" 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 lg:bg-gray-50 text-gray-900 focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-all placeholder-gray-400"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {!isLogin && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{t.name}</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 lg:bg-gray-50 text-gray-900 focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-all placeholder-gray-400"
                                        value={form.name}
                                        onChange={e => setForm({...form, name: e.target.value})}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{t.employeeId}</label>
                            <div className="relative">
                                <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                required
                                type="text" 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 lg:bg-gray-50 text-gray-900 focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-all placeholder-gray-400"
                                value={form.employeeId}
                                onChange={e => setForm({...form, employeeId: e.target.value})}
                                placeholder="e.g. 10086"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">{t.password}</label>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                required={!isLogin} 
                                type="password" 
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white/50 lg:bg-gray-50 text-gray-900 focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-all placeholder-gray-400"
                                value={form.password}
                                onChange={e => setForm({...form, password: e.target.value})}
                                placeholder="••••••••"
                                />
                            </div>
                        </div>
                    </>
                )}

                <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-zte-blue hover:bg-zte-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-blue-500/20 mt-6 h-12 flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20}/> : (isSettingPassword ? t.save : (isLogin ? t.login : t.register))}
                    {!isLoading && <ArrowRight size={18} />}
                </button>
                </form>

                {!isSettingPassword && (
                    <div className="mt-8 text-center text-sm pt-6 border-t border-gray-100 lg:border-none">
                    <span className="text-gray-500">{isLogin ? "New employee?" : "Already registered?"}</span>
                    <button 
                        type="button"
                        onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }} 
                        className="ml-1 text-zte-blue hover:text-zte-dark font-bold transition-colors hover:underline"
                    >
                        {isLogin ? t.register : t.login}
                    </button>
                    </div>
                )}
              </div>
          </div>

          {/* Footer - Shrinkable */}
          <div className="mt-8 text-center text-[10px] text-gray-400 pb-safe-bottom shrink-0 lg:absolute lg:bottom-4 lg:left-0 lg:right-0 lg:pb-0">
              &copy; {new Date().getFullYear()} ZTE Southern Africa.
          </div>
      </div>
    </div>
  );
};
