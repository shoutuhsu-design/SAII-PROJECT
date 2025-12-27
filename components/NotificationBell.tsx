import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { Bell, Check, Trash2, AlertCircle, Clock, Info, CheckCircle2 } from 'lucide-react';

export const NotificationBell: React.FC = () => {
  const { notifications, markNotificationsRead, clearNotifications, language } = useApp();
  const t = DICTIONARY[language];
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
      setIsOpen(!isOpen);
      if (!isOpen && unreadCount > 0) {
          // Optional: Mark read immediately on open, or via button
          // markNotificationsRead();
      }
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'alert': return <AlertCircle size={16} className="text-red-500" />;
          case 'warning': return <Clock size={16} className="text-amber-500" />;
          case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
          default: return <Info size={16} className="text-blue-500" />;
      }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleToggle}
        className="p-2.5 rounded-full hover:bg-white/20 text-white transition-colors relative group"
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-pulse' : ''} />
        {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-zte-blue rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                <h3 className="font-bold text-gray-800 dark:text-white text-sm">{t.notifications}</h3>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <button onClick={markNotificationsRead} className="text-xs text-zte-blue hover:underline flex items-center gap-1" title={t.markAllRead}>
                            <Check size={14}/>
                        </button>
                    )}
                    {notifications.length > 0 && (
                         <button onClick={clearNotifications} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                             <Trash2 size={14}/>
                         </button>
                    )}
                </div>
            </div>
            
            <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <Bell size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-xs">{t.noNotifications}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {notifications.map((n) => (
                            <div key={n.id} className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                <div className="mt-0.5 shrink-0 bg-white dark:bg-gray-700 p-1.5 rounded-full shadow-sm h-fit">
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className={`text-sm ${!n.read ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-gray-300'}`}>{n.title}</h4>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                            {n.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed break-words">{n.message}</p>
                                </div>
                                {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0"></div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};
