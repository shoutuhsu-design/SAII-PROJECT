
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { Bell, Check, AlertCircle, Clock, Info, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { Notify } from '../plugin';

export const NotificationBell: React.FC = () => {
  const { notifications, markNotificationsRead, language, user, requestNotifyPermission } = useApp();
  const t = DICTIONARY[language];
  const [isOpen, setIsOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'prompt' | 'granted' | 'denied'>('granted');
  const [isSyncing, setIsSyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const checkStatus = async () => {
      // 性能优化：如果已经是授权状态，无需频繁轮询原生接口
      if (permissionStatus === 'granted') return;
      
      if (Notify && typeof Notify.checkPermission === 'function') {
          const res = await Notify.checkPermission();
          setPermissionStatus(res.display as any);
      }
  };

  useEffect(() => {
    checkStatus();
    // 降低频率至 60 秒一次，显著降低后台功耗
    const interval = setInterval(checkStatus, 60000);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        clearInterval(interval);
    };
  }, [permissionStatus]);

  const handleFixPermission = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsSyncing(true);
      try {
          const res = await Notify.requestPermission();
          if (res.display === 'granted') {
              setPermissionStatus('granted');
          }
      } finally {
          setIsSyncing(false);
          checkStatus();
      }
  };

  const handleManualGrant = (e: React.MouseEvent) => {
      e.stopPropagation();
      localStorage.setItem('zte_notify_manual_granted', 'true');
      setPermissionStatus('granted');
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
        onClick={() => setIsOpen(!isOpen)}
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
                <div className="flex gap-2 items-center">
                    {unreadCount > 0 && (
                        <button onClick={markNotificationsRead} className="p-1.5 text-zte-blue hover:bg-blue-50 rounded-md transition-colors">
                            <Check size={14}/>
                        </button>
                    )}
                </div>
            </div>

            {permissionStatus !== 'granted' && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border-b border-amber-100 dark:border-amber-900/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                            <AlertCircle size={14} /> 通知权限未授予
                        </span>
                        <button 
                            onClick={handleFixPermission} 
                            disabled={isSyncing}
                            className={`text-[10px] bg-amber-500 text-white px-3 py-1 rounded font-bold hover:bg-amber-600 transition-colors shadow-sm ${isSyncing ? 'opacity-50' : ''}`}
                        >
                            {isSyncing ? '同步中...' : '点击修复'}
                        </button>
                    </div>
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 opacity-90 leading-relaxed mb-3">
                        移动端 App 需要系统授权才能在后台提醒您。若已在系统设置中开启，请尝试手动刷新。
                    </p>
                    <button 
                        onClick={handleManualGrant}
                        className="text-[10px] w-full border border-amber-300 bg-white dark:bg-gray-700 text-amber-700 dark:text-amber-400 py-2 rounded-md hover:bg-amber-100 flex items-center justify-center gap-1 font-bold shadow-sm"
                    >
                        <ShieldCheck size={12}/> 我已在设置中开启 (手动覆盖状态)
                    </button>
                </div>
            )}
            
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
                                        <h4 className={`text-sm ${!n.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>{n.title}</h4>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                            {n.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed break-words">{n.message}</p>
                                </div>
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
