import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { X, UserPlus, Trash2, Edit2, RotateCcw } from 'lucide-react';
import { User } from '../types';

interface UserModalProps {
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ onClose }) => {
  const { language, users, addUser, deleteUser, user: currentUser } = useApp();
  const t = DICTIONARY[language];
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', employeeId: '', password: '' });

  useEffect(() => {
    if (editingUser) {
        setFormData({ name: editingUser.name, employeeId: editingUser.employeeId, password: '' });
    } else {
        setFormData({ name: '', employeeId: '', password: '' });
    }
  }, [editingUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
        // Update Mode
        // In a real app with backend, we would call an update API. 
        // Here we delete and re-add to simulate update while keeping ID.
        // NOTE: This simple state logic in Context is limited. We'll simulate update by reusing the `addUser` which pushes to array.
        // We need to actually modify the user in context. Ideally we should have `updateUser` in context.
        // Since we don't have updateUser in context interface in previous file, we will delete then add with same ID.
        
        // However, looking at context.tsx provided previously, there is NO updateUser method exposed for Users (only updateTask).
        // I will use a workaround: Delete old -> Add new. This changes the internal ID if I let it regenerate, 
        // so I must preserve the internal ID or just use employeeId as key.
        // Let's rely on deleteUser then addUser, but keeping the original ID is better.
        
        // Actually, let's keep it simple. Delete the old record and add a new one.
        deleteUser(editingUser.id);
        
        const updatedUser: User = {
            ...editingUser,
            name: formData.name,
            // If password field is empty, keep old password
            password: formData.password ? formData.password : editingUser.password, 
            employeeId: formData.employeeId // Usually ID shouldn't change, but allowing correction is fine
        };
        addUser(updatedUser);
        setEditingUser(null);
    } else {
        // Create Mode
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
            role: 'user'
        };
        addUser(u);
    }
    setFormData({ name: '', employeeId: '', password: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">{t.userManagement}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Form Section */}
           <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg h-fit border border-gray-100 dark:border-gray-600">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold dark:text-white flex items-center gap-2">
                        {editingUser ? <Edit2 size={18} /> : <UserPlus size={18} />} 
                        {editingUser ? t.updateUser : t.addUser}
                    </h4>
                    {editingUser && (
                        <button onClick={() => setEditingUser(null)} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                             <RotateCcw size={12} /> {t.cancel}
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.name}</label>
                        <input 
                            className="w-full text-sm p-2.5 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-zte-blue outline-none"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.employeeId}</label>
                        <input 
                            className="w-full text-sm p-2.5 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-zte-blue outline-none"
                            value={formData.employeeId}
                            onChange={e => setFormData({...formData, employeeId: e.target.value})}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t.password}</label>
                        <input 
                            className="w-full text-sm p-2.5 border rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-zte-blue outline-none"
                            type="password"
                            placeholder={editingUser ? t.resetPassword : ''}
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            required={!editingUser} 
                        />
                    </div>
                    <button type="submit" className={`w-full text-white py-2.5 rounded text-sm font-medium transition-colors shadow-sm ${editingUser ? 'bg-amber-500 hover:bg-amber-600' : 'bg-zte-blue hover:bg-zte-dark'}`}>
                        {editingUser ? t.save : t.addUser}
                    </button>
                </form>
            </div>

            {/* User List */}
            <div className="lg:col-span-2 overflow-x-auto border rounded-lg dark:border-gray-700">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-600 dark:text-gray-300">
                        <tr>
                            <th className="px-4 py-3">{t.name}</th>
                            <th className="px-4 py-3">{t.employeeId}</th>
                            <th className="px-4 py-3">{t.role}</th>
                            <th className="px-4 py-3 text-right">{t.actions}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className={`bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${editingUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{backgroundColor: user.color}}></div>
                                    {user.name}
                                </td>
                                <td className="px-4 py-3">{user.employeeId}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                    {user.id !== currentUser?.id && user.role !== 'admin' && (
                                        <>
                                            <button 
                                                onClick={() => setEditingUser(user)} 
                                                className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded transition-colors"
                                                title={t.edit}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => { if(confirm(t.confirmDelete)) deleteUser(user.id) }} 
                                                className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors"
                                                title={t.delete}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};