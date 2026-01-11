
import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { X, UserPlus, Trash2, Edit2, RotateCcw, Check, Ban, Shield, Smartphone, List, Plus, RefreshCw, AlertTriangle, Loader2, UserCog, Lock } from 'lucide-react';
import { User, Role } from '../types';

interface UserModalProps {
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ onClose }) => {
  const { language, users, addUser, updateUser, deleteUser, user: currentUser, refreshData, logout } = useApp();
  const t = DICTIONARY[language];
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mobile View State: 'form' or 'list'
  const [mobileView, setMobileView] = useState<'form' | 'list'>('list');
  
  // Form State
  const [formData, setFormData] = useState({ name: '', employeeId: '', password: '', role: 'user' as Role });

  // 判断是否为管理员
  const isAdmin = currentUser?.role === 'admin';

  // Auto-refresh data when the modal opens to show latest registrations
  useEffect(() => {
    handleRefresh();
  }, []);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      await refreshData();
      setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    if (editingUser) {
        setFormData({ name: editingUser.name, employeeId: editingUser.employeeId, password: '', role: editingUser.role });
        setMobileView('form'); // Switch to form when editing
    } else {
        // 如果不是管理员，默认进入编辑自己模式
        if (!isAdmin && currentUser) {
             setEditingUser(currentUser);
        } else {
             setFormData({ name: '', employeeId: '', password: '', role: 'user' });
        }
    }
  }, [editingUser, isAdmin, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let success = false;

    if (editingUser) {
        const updatedUser: User = {
            ...editingUser,
            name: formData.name,
            employeeId: formData.employeeId, // 非管理员在UI上被禁用，但这里也保持逻辑一致
            password: formData.password ? formData.password : editingUser.password,
            role: formData.role // 同上
        };
        
        success = await updateUser(updatedUser);
        if (success) {
            // Security Policy: Force logout if current user changed their own password
            if (formData.password && editingUser.id === currentUser?.id) {
                alert(t.passwordChangedRelogin);
                onClose();
                logout();
                return; // Stop execution here
            }

            setEditingUser(null);
            setMobileView('list'); // Go back to list after edit
        }
    } else {
        if (!formData.name || !formData.employeeId || !formData.password) {
            setIsSubmitting(false);
            return;
        }
        if (users.find(u => u.employeeId === formData.employeeId)) {
            alert(t.userExists);
            setIsSubmitting(false);
            return;
        }

        const u: User = {
            id: Date.now().toString(),
            name: formData.name,
            employeeId: formData.employeeId,
            password: formData.password,
            role: formData.role,
            status: 'active', // Admin created users are active by default
            color: '#' + Math.floor(Math.random()*16777215).toString(16),
            activeSessions: 0
        };
        success = await addUser(u);
        if (success) {
            setMobileView('list'); // Go back to list after add
            setFormData({ name: '', employeeId: '', password: '', role: 'user' });
        }
    }
    
    setIsSubmitting(false);
  };

  const handleApprove = async (user: User) => {
      await updateUser({ ...user, status: 'active' });
  };

  const handleReject = async (user: User) => {
      if(confirm("Reject this user registration?")) {
          await updateUser({ ...user, status: 'rejected' });
      }
  };

  const handleResetSessions = (user: User) => {
      if(confirm(`Reset active sessions for ${user.name}? This will clear the session count (Current: ${user.activeSessions}).`)) {
          updateUser({ ...user, activeSessions: 0 });
      }
  };

  // Split users into Pending and Others for explicit display
  // 非管理员只能看到自己
  const pendingUsers = useMemo(() => isAdmin ? users.filter(u => u.status === 'pending') : [], [users, isAdmin]);
  const otherUsers = useMemo(() => {
      const targetUsers = isAdmin ? users : users.filter(u => u.id === currentUser?.id);
      return targetUsers.filter(u => u.status !== 'pending').sort((a, b) => a.name.localeCompare(b.name));
  }, [users, isAdmin, currentUser]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 md:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 md:rounded-lg shadow-xl w-full max-w-5xl flex flex-col h-full md:max-h-[90vh] overflow-hidden">
        
        {/* Header - 优化：调整移动端顶部安全区域留白为 +12px */}
        <div className="flex justify-between items-center px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] md:p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div className="flex items-center gap-3">
              <h2 className="text-lg md:text-xl font-bold dark:text-white">
                  {isAdmin ? t.userManagement : (language === 'zh' ? '个人设置' : 'My Profile')}
              </h2>
              {pendingUsers.length > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                      <AlertTriangle size={12}/> {pendingUsers.length} Pending
                  </span>
              )}
          </div>
          <div className="flex items-center gap-1">
              <button onClick={handleRefresh} className={`text-gray-500 hover:text-zte-blue p-2 rounded-full transition-all ${isRefreshing ? 'animate-spin text-zte-blue' : ''}`} title="Refresh Data">
                <RefreshCw size={20} />
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <X size={24} />
              </button>
          </div>
        </div>
        
        {/* Mobile Toggle Tabs */}
        <div className="flex md:hidden border-b dark:border-gray-700">
            <button 
                onClick={() => setMobileView('list')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mobileView === 'list' ? 'text-zte-blue border-b-2 border-zte-blue bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 dark:text-gray-400'}`}
            >
                <List size={16} /> List
                {pendingUsers.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            <button 
                onClick={() => setMobileView('form')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mobileView === 'form' ? 'text-zte-blue border-b-2 border-zte-blue bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 dark:text-gray-400'}`}
            >
                {editingUser ? <Edit2 size={16} /> : <Plus size={16} />} {editingUser ? (isAdmin ? t.updateUser : (language === 'zh' ? '修改资料' : 'Edit Profile')) : t.addUser}
            </button>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Form Section */}
           <div className={`bg-gray-50 dark:bg-gray-700 p-5 rounded-lg h-fit border border-gray-100 dark:border-gray-600 overflow-y-auto ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold dark:text-white flex items-center gap-2">
                        {editingUser ? <Edit2 size={18} /> : <UserPlus size={18} />} 
                        {editingUser ? (isAdmin ? t.updateUser : (language === 'zh' ? '修改资料' : 'Edit Profile')) : t.addUser}
                    </h4>
                    {editingUser && isAdmin && (
                        <button onClick={() => { setEditingUser(null); setMobileView('list'); }} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                             <RotateCcw size={12} /> {t.cancel}
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.name}</label>
                        <input 
                            className="w-full text-sm p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none transition-all"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                            placeholder="Full Name"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.employeeId}</label>
                        <div className="relative">
                            <input 
                                className={`w-full text-sm p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none transition-all ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                value={formData.employeeId}
                                onChange={e => setFormData({...formData, employeeId: e.target.value})}
                                required
                                readOnly={!isAdmin} // 非管理员只读
                                placeholder="ID Number"
                            />
                            {!isAdmin && <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />}
                        </div>
                    </div>
                    {/* Role Selection */}
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.userRole}</label>
                        <div className="relative">
                            <select 
                                className={`w-full text-sm p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none transition-all bg-white ${!isAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed appearance-none' : ''}`}
                                value={formData.role}
                                onChange={e => setFormData({...formData, role: e.target.value as Role})}
                                disabled={!isAdmin} // 非管理员禁用
                            >
                                <option value="user">{t.user}</option>
                                <option value="admin">{t.admin}</option>
                            </select>
                            {!isAdmin && <Lock size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.password}</label>
                        <input 
                            className="w-full text-sm p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none transition-all"
                            type="password"
                            placeholder={editingUser ? t.resetPassword : 'Set Password'}
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            required={!editingUser} 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${editingUser ? 'bg-amber-500 hover:bg-amber-600' : 'bg-zte-blue hover:bg-zte-dark'}`}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (editingUser ? t.save : t.addUser)}
                    </button>
                </form>
            </div>

            {/* User List Section */}
            <div className={`lg:col-span-2 overflow-y-auto border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col ${mobileView === 'form' ? 'hidden md:flex' : 'flex'}`}>
                
                {/* PENDING USERS SECTION (High Visibility) */}
                {pendingUsers.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800">
                        <div className="px-4 py-3 flex items-center gap-2 text-sm font-bold text-amber-800 dark:text-amber-400">
                            <AlertTriangle size={16} /> 
                            <span>Pending Approvals ({pendingUsers.length})</span>
                        </div>
                        <div className="divide-y divide-amber-100 dark:divide-amber-800/50">
                            {pendingUsers.map(user => (
                                <div key={user.id} className="p-3 md:p-4 flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-amber-600 font-bold shadow-sm ring-2 ring-amber-200">
                                            {user.name.charAt(0)}
                                         </div>
                                         <div>
                                             <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                {user.name}
                                                <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded uppercase">Pending</span>
                                             </div>
                                             <div className="text-xs text-gray-500">{user.employeeId} • {user.role}</div>
                                         </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApprove(user)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all">
                                            <Check size={14}/> {t.approve}
                                        </button>
                                        <button onClick={() => handleReject(user)} className="bg-white hover:bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm active:scale-95 transition-all">
                                            <Ban size={14}/> {t.reject}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* OTHER USERS TABLE */}
                <table className="hidden md:table w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-600 dark:text-gray-300 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3">{t.name}</th>
                            <th className="px-4 py-3">{t.userStatus}</th>
                            <th className="px-4 py-3">{t.role}</th>
                            <th className="px-4 py-3 text-center">{t.sessions}</th>
                            <th className="px-4 py-3 text-right">{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {otherUsers.map((user) => (
                            <tr key={user.id} className={`bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 ${editingUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{backgroundColor: user.color}}></div>
                                    <div>
                                        <div>{user.name}</div>
                                        <div className="text-[10px] text-gray-400">{user.employeeId}</div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs border ${user.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                        {user.status || 'active'}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <span className={`text-xs font-bold ${user.activeSessions && user.activeSessions >= 3 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                            {user.activeSessions || 0}/3
                                        </span>
                                        {(user.activeSessions || 0) > 0 && isAdmin && (
                                            <button onClick={() => handleResetSessions(user)} title={t.resetSessions} className="text-gray-400 hover:text-red-500">
                                                <Smartphone size={12} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                    {(currentUser?.role === 'admin' || currentUser?.id === user.id) && (
                                        <button onClick={() => setEditingUser(user)} className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors" title={t.edit}>
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    {currentUser?.role === 'admin' && currentUser.id !== user.id && (
                                        <button onClick={() => { if(confirm(t.confirmDelete)) deleteUser(user.id) }} className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors" title={t.delete}>
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile Card List (For Other Users) */}
                <div className="md:hidden flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                     {otherUsers.map(user => (
                         <div key={user.id} className="p-4 flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{backgroundColor: user.color}}>
                                 {user.name.charAt(0)}
                             </div>
                             <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-start">
                                     <h4 className="font-bold text-gray-900 dark:text-white truncate">{user.name}</h4>
                                     <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                         {user.role}
                                     </span>
                                 </div>
                                 <div className="text-xs text-gray-500">{user.employeeId}</div>
                                 <div className="flex items-center gap-2 mt-1">
                                      <div className={`flex items-center gap-1 text-[10px] px-1.5 rounded ${user.status === 'rejected' ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                          <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'rejected' ? 'bg-red-500' : 'bg-green-500'}`}></div> 
                                          {user.status || 'active'}
                                      </div>
                                      <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 rounded">
                                          <Smartphone size={10} /> {user.activeSessions || 0}/3
                                      </div>
                                 </div>
                             </div>
                             
                             <div className="flex flex-col gap-2">
                                {(currentUser?.role === 'admin' || currentUser?.id === user.id) && (
                                    <button onClick={() => setEditingUser(user)} className="p-2 bg-gray-100 dark:bg-gray-700 text-blue-500 rounded-full">
                                        <Edit2 size={16} />
                                    </button>
                                )}
                                {currentUser?.role === 'admin' && currentUser.id !== user.id && (
                                    <button onClick={() => { if(confirm(t.confirmDelete)) deleteUser(user.id) }} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full">
                                        <Trash2 size={16} />
                                    </button>
                                )}
                             </div>
                         </div>
                     ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
