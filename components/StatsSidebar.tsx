
import React, { useState, useMemo } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { toLocalDateString } from '../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CalendarDays, CalendarRange, Calendar, User as UserIcon, XCircle, Activity, Briefcase } from 'lucide-react';

export const StatsSidebar: React.FC = () => {
  const { user, users, tasks, language, filterUserId, filterCategory, setFilterUserId } = useApp();
  const t = DICTIONARY[language];
  
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');

  if (!user) return null;

  const activeFilteredUser = useMemo(() => {
    if (user.role !== 'admin' || !filterUserId || filterUserId === 'all') return null;
    const searchId = String(filterUserId).trim();
    return users.find(u => String(u.employeeId).trim() === searchId);
  }, [users, filterUserId, user.role]);

  const relevantTasks = useMemo(() => {
    let base = [...tasks];
    if (user.role === 'admin') {
      if (filterUserId && filterUserId !== 'all') {
        const targetId = String(filterUserId).trim();
        base = base.filter(t => String(t.employeeId).trim() === targetId);
      }
    } else {
      const myId = String(user.employeeId).trim();
      base = base.filter(t => String(t.employeeId).trim() === myId);
    }
    if (filterCategory && filterCategory !== 'all') {
      base = base.filter(t => t.category === filterCategory);
    }
    return base;
  }, [tasks, user.role, user.employeeId, filterUserId, filterCategory]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalDateString(now);
    const currentDay = now.getDay();
    
    const startOfWeekDate = new Date(now);
    startOfWeekDate.setDate(now.getDate() - currentDay);
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);

    const startOfMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    return relevantTasks.filter(task => {
        if (period === 'day') return task.startDate <= todayStr && task.endDate >= todayStr;
        if (period === 'week') return task.startDate <= toLocalDateString(endOfWeekDate) && task.endDate >= toLocalDateString(startOfWeekDate);
        return task.startDate <= endOfMonth && task.endDate >= startOfMonth;
    });
  }, [relevantTasks, period]);

  const stats = useMemo(() => {
    const today = toLocalDateString(new Date());
    const completed = filteredTasks.filter(t => t.status === 'completed').length;
    const overdue = filteredTasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
    const ongoing = filteredTasks.filter(t => t.status !== 'completed' && t.endDate >= today).length;
    const total = filteredTasks.length;
    return { completed, overdue, ongoing, total };
  }, [filteredTasks]);

  const topCategories = useMemo(() => {
      const counts: Record<string, number> = {};
      filteredTasks.forEach(t => {
          counts[t.category] = (counts[t.category] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3) // Top 3
        .map(([name, count]) => ({ name, count, percent: Math.round((count / filteredTasks.length) * 100) }));
  }, [filteredTasks]);

  const completionRate = stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  // 本地管理逻辑建议 (启发式)
  const localAnalysis = useMemo(() => {
    const today = toLocalDateString(new Date());
    const overdueTasks = filteredTasks.filter(t => t.status !== 'completed' && t.endDate < today);
    
    if (stats.total === 0) return language === 'zh' ? "当前周期暂无任务安排。" : "No tasks scheduled for this period.";
    
    if (overdueTasks.length > 0) {
      const topOverdue = overdueTasks[0].title;
      return language === 'zh' 
        ? `检测到逾期风险！请优先处理【${topOverdue}】等 ${overdueTasks.length} 项任务，避免进度滞后。`
        : `Overdue Alert! Please prioritize "${topOverdue}" and ${overdueTasks.length - 1} other items to stay on track.`;
    }

    if (completionRate === 100) return language === 'zh' ? "任务已全部达成！表现优秀，请继续保持。" : "All tasks completed! Excellent performance, keep it up.";
    if (completionRate >= 70) return language === 'zh' ? "进度稳健，目前执行效率理想，请按计划推进剩余工作。" : "Progress is steady. Execution efficiency is ideal, proceed as planned.";
    
    return language === 'zh' ? "建议评估任务优先级，提高待办事项的转换效率。" : "Recommendation: Evaluate task priorities and improve completion efficiency.";
  }, [filteredTasks, stats, completionRate, language]);

  const data = [
    { name: t.completed, value: stats.completed },
    { name: t.pending, value: stats.ongoing },
    { name: t.overdue, value: stats.overdue },
  ];
  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="w-full h-full p-4 flex flex-col gap-5 overflow-y-auto no-scrollbar bg-white dark:bg-gray-800">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
           <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
             <Activity size={18} className="text-zte-blue" />
             {t.statsOverview}
           </h3>
           <div className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-zte-blue px-2 py-0.5 rounded-full">LIVE</div>
        </div>
        {user.role === 'admin' && (
          <div className="flex items-center text-xs font-medium h-6">
            {activeFilteredUser ? (
              <div className="flex items-center gap-1.5 text-zte-blue">
                <UserIcon size={12} />
                <span>正在查看: <span className="font-bold underline">{activeFilteredUser.name}</span></span>
                <button onClick={() => setFilterUserId('all')} className="ml-1 text-gray-400 hover:text-red-500"><XCircle size={14} /></button>
              </div>
            ) : <span className="text-gray-400 flex items-center gap-1.5"><Activity size={12}/> 全局汇总统计</span>}
          </div>
        )}
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl shrink-0 shadow-inner">
        <button onClick={() => setPeriod('day')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${period === 'day' ? 'bg-white dark:bg-gray-600 shadow-sm text-zte-blue' : 'text-gray-400'}`}><Calendar size={14} /> {t.day}</button>
        <button onClick={() => setPeriod('week')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${period === 'week' ? 'bg-white dark:bg-gray-600 shadow-sm text-zte-blue' : 'text-gray-400'}`}><CalendarDays size={14} /> {t.week}</button>
        <button onClick={() => setPeriod('month')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all ${period === 'month' ? 'bg-white dark:bg-gray-600 shadow-sm text-zte-blue' : 'text-gray-400'}`}><CalendarRange size={14} /> {t.month}</button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-soft border border-gray-100 dark:border-gray-700 shrink-0">
        <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t[period]} {t.totalTasks}</span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">{stats.total}</span>
        </div>
        <div className="h-44 -mx-4">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} innerRadius={45} outerRadius={65} paddingAngle={8} dataKey="value" stroke="none">
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-soft border border-gray-100 dark:border-gray-700 shrink-0">
         <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">{t.completionRate}</h3>
         <div className="flex items-end justify-between mb-3">
            <span className="text-3xl font-black text-gray-900 dark:text-white">{completionRate}%</span>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg">{stats.completed}/{stats.total}</span>
         </div>
         <div className="overflow-hidden h-3 flex rounded-full bg-gray-100 dark:bg-gray-700 p-0.5">
            <div style={{ width: `${completionRate}%` }} className="bg-gradient-to-r from-zte-blue to-blue-400 rounded-full transition-all duration-1000"></div>
         </div>
      </div>

      {/* NEW SECTION: Category Breakdown to fill whitespace */}
      {topCategories.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-soft border border-gray-100 dark:border-gray-700 shrink-0">
             <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-1"><Briefcase size={12}/> {language === 'zh' ? '分类占比 (Top 3)' : 'Top Categories'}</h3>
             <div className="space-y-3">
                 {topCategories.map((cat, i) => (
                     <div key={cat.name} className="flex flex-col gap-1">
                         <div className="flex justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                             <span className="truncate max-w-[120px]">{cat.name}</span>
                             <span>{cat.count}</span>
                         </div>
                         <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                             <div 
                                style={{width: `${cat.percent}%`}} 
                                className={`h-full rounded-full ${i === 0 ? 'bg-purple-500' : i === 1 ? 'bg-pink-500' : 'bg-indigo-500'}`}
                             ></div>
                         </div>
                     </div>
                 ))}
             </div>
          </div>
      )}

      {/* Enhanced Suggestions Area */}
      <div className="bg-gradient-to-br from-zte-blue/5 to-transparent dark:from-zte-blue/10 dark:to-transparent p-5 rounded-3xl border border-zte-blue/10 mt-auto shrink-0 relative overflow-hidden">
         <div className="absolute -right-4 -top-4 w-24 h-24 bg-zte-blue/5 rounded-full blur-2xl"></div>
         <h4 className="text-[10px] font-bold text-zte-blue mb-3 uppercase tracking-wider flex items-center gap-1.5 relative z-10">
            <Activity size={12}/> {language === 'zh' ? '智能分析' : 'Smart Insight'}
         </h4>
         <div className="flex gap-3 relative z-10">
            <div className="w-1 bg-zte-blue/30 rounded-full shrink-0"></div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed italic">
                {localAnalysis}
            </p>
         </div>
      </div>
    </div>
  );
};
