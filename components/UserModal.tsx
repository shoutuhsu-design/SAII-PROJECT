
import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { X, UserPlus, Trash2, Edit2, RotateCcw, Check, Ban, Shield, Smartphone, List, Plus, ChevronRight } from 'lucide-react';
import { User, Role } from '../types';

interface UserModalProps {
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ onClose }) => {
  const { language, users, addUser, updateUser, deleteUser, user: currentUser } = useApp();
  const t = DICTIONARY[language];
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Mobile View State: 'form' or 'list'
  const [mobileView, setMobileView] = useState<'form' | 'list'>('list');
  
  // Form State
  const [formData, setFormData] = useState({ name: '', employeeId: '', password: '', role: 'user' as Role });

  useEffect(() => {
    if (editingUser) {
        setFormData({ name: editingUser.name, employeeId: editingUser.employeeId, password: '', role: editingUser.role });
        setMobileView('form'); // Switch to form when editing
    } else {
        setFormData({ name: '', employeeId: '', password: '', role: 'user' });
    }
  }, [editingUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
        const updatedUser: User = {
            ...editingUser,
            name: formData.name,
            employeeId: formData.employeeId,
            password: formData.password ? formData.password : editingUser.password,
            role: formData.role // Update role
        };
        
        updateUser(updatedUser);
        setEditingUser(null);
        setMobileView('list'); // Go back to list after edit
    } else {
        if (!formData.name || !formData.employeeId || !formData.password) return;
        if (users.find(u => u.employeeId === formData.employeeId)) {
            alert(t.userExists);
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
        addUser(u);
        setMobileView('list'); // Go back to list after add
    }
    setFormData({ name: '', employeeId: '', password: '', role: 'user' });
  };

  const handleApprove = (user: User) => {
      updateUser({ ...user, status: 'active' });
  };

  const handleReject = (user: User) => {
      if(confirm("Reject this user registration?")) {
          updateUser({ ...user, status: 'rejected' });
      }
  };

  const handleResetSessions = (user: User) => {
      if(confirm(`Reset active sessions for ${user.name}? This will clear the session count (Current: ${user.activeSessions}).`)) {
          updateUser({ ...user, activeSessions: 0 });
      }
  };

  // Sort: Pending first, then Active, then Rejected
  const sortedUsers = [...users].sort((a, b) => {
      const statusOrder = { pending: 0, active: 1, rejected: 2 };
      const statusA = a.status || 'active';
      const statusB = b.status || 'active';
      if (statusOrder[statusA] !== statusOrder[statusB]) {
          return statusOrder[statusA] - statusOrder[statusB];
      }
      return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 md:p-4">
      <div className="bg-white dark:bg-gray-800 md:rounded-lg shadow-xl w-full max-w-5xl flex flex-col h-full md:max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] md:p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <h2 className="text-lg md:text-xl font-bold dark:text-white">{t.userManagement}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 p-2">
            <X size={24} />
          </button>
        </div>
        
        {/* Mobile Toggle Tabs */}
        <div className="flex md:hidden border-b dark:border-gray-700">
            <button 
                onClick={() => setMobileView('list')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mobileView === 'list' ? 'text-zte-blue border-b-2 border-zte-blue bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 dark:text-gray-400'}`}
            >
                <List size={16} /> User List
            </button>
            <button 
                onClick={() => setMobileView('form')}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${mobileView === 'form' ? 'text-zte-blue border-b-2 border-zte-blue bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500 dark:text-gray-400'}`}
            >
                {editingUser ? <Edit2 size={16} /> : <Plus size={16} />} {editingUser ? t.updateUser : t.addUser}
            </button>
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-3 gap-6">
           
           {/* Form Section - Hidden on mobile if viewing list */}
           <div className={`bg-gray-50 dark:bg-gray-700 p-5 rounded-lg h-fit border border-gray-100 dark:border-gray-600 overflow-y-auto ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold dark:text-white flex items-center gap-2">
                        {editingUser ? <Edit2 size={18} /> : <UserPlus size={18} />} 
                        {editingUser ? t.updateUser : t.addUser}
                    </h4>
                    {editingUser && (
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
                        <input 
                            className="w-full text-sm p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none transition-all"
                            value={formData.employeeId}
                            onChange={e => setFormData({...formData, employeeId: e.target.value})}
                            required
                            placeholder="ID Number"
                        />
                    </div>
                    {/* Role Selection */}
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.userRole}</label>
                        <select 
                            className="w-full text-sm p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none transition-all bg-white"
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value as Role})}
                        >
                            <option value="user">{t.user}</option>
                            <option value="admin">{t.admin}</option>
                        </select>
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
                    <button type="submit" className={`w-full text-white py-3 rounded-lg text-sm font-bold transition-all shadow-md active:scale-95 ${editingUser ? 'bg-amber-500 hover:bg-amber-600' : 'bg-zte-blue hover:bg-zte-dark'}`}>
                        {editingUser ? t.save : t.addUser}
                    </button>
                </form>
            </div>

            {/* User List - Hidden on mobile if viewing form */}
            <div className={`lg:col-span-2 overflow-y-auto border rounded-lg dark:border-gray-700 bg-white dark:bg-gray-800 ${mobileView === 'form' ? 'hidden md:block' : 'block'}`}>
                {/* Desktop Table */}
                <table className="hidden md:table w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-600 dark:text-gray-300 sticky top-0">
                        <tr>
                            <th className="px-4 py-3">{t.name}</th>
                            <th className="px-4 py-3">{t.userStatus}</th>
                            <th className="px-4 py-3">{t.role}</th>
                            <th className="px-4 py-3 text-center">{t.sessions}</th>
                            <th className="px-4 py-3 text-right">{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map((user) => (
                            <tr key={user.id} className={`bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${editingUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{backgroundColor: user.color}}></div>
                                    <div>
                                        <div>{user.name}</div>
                                        <div className="text-[10px] text-gray-400">{user.employeeId}</div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    {user.status === 'pending' ? (
                                        <div className="flex gap-1">
                                            <button onClick={() => handleApprove(user)} className="px-2 py-1 bg-green-500 text-white rounded text-xs flex items-center gap-1 hover:bg-green-600"><Check size={10}/>{t.approve}</button>
                                            <button onClick={() => handleReject(user)} className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs flex items-center gap-1 hover:bg-red-200"><Ban size={10}/>{t.reject}</button>
                                        </div>
                                    ) : (
                                        <span className={`px-2 py-0.5 rounded text-xs border ${user.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                            {user.status || 'active'}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        <span className={`px-2 py-0.5 rounded text-xs border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <span className={`text-xs font-bold ${user.activeSessions && user.activeSessions >= 3 ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                            {user.activeSessions || 0}/3
                                        </span>
                                        {(user.activeSessions || 0) > 0 && (
                                            <button onClick={() => handleResetSessions(user)} title={t.resetSessions} className="text-gray-400 hover:text-red-500">
                                                <Smartphone size={12} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                    {(currentUser?.role === 'admin' || currentUser?.id === user.id) && (
                                        <button 
                                            onClick={() => setEditingUser(user)} 
                                            className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors"
                                            title={t.edit}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    {currentUser?.role === 'admin' && currentUser.id !== user.id && (
                                        <button 
                                            onClick={() => { if(confirm(t.confirmDelete)) deleteUser(user.id) }} 
                                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                                            title={t.delete}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile Card List */}
                <div className="md:hidden flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
                     {sortedUsers.map(user => (
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
                                      {/* Status Badge */}
                                      {user.status === 'pending' ? (
                                        <span className="text-xs text-amber-500 font-bold">Pending Approval</span>
                                      ) : (
                                        <div className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-1.5 rounded">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div> Active
                                        </div>
                                      )}
                                      {/* Session Count */}
                                      <div className="flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 rounded">
                                          <Smartphone size={10} /> {user.activeSessions || 0}/3
                                      </div>
                                 </div>
                             </div>
                             
                             {/* Actions */}
                             <div className="flex flex-col gap-2">
                                 {user.status === 'pending' ? (
                                     <>
                                        <button onClick={() => handleApprove(user)} className="p-2 bg-green-100 text-green-600 rounded-full"><Check size={16}/></button>
                                        <button onClick={() => handleReject(user)} className="p-2 bg-red-100 text-red-600 rounded-full"><Ban size={16}/></button>
                                     </>
                                 ) : (
                                     <>
                                        <button onClick={() => setEditingUser(user)} className="p-2 bg-gray-100 dark:bg-gray-700 text-blue-500 rounded-full">
                                            <Edit2 size={16} />
                                        </button>
                                        {currentUser?.role === 'admin' && currentUser.id !== user.id && (
                                            <button onClick={() => { if(confirm(t.confirmDelete)) deleteUser(user.id) }} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                     </>
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
