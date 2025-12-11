import React, { useState, useMemo } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle, Clock, CalendarDays, CalendarRange, Calendar } from 'lucide-react';

export const StatsSidebar: React.FC = () => {
  const { user, tasks, language } = useApp();
  const t = DICTIONARY[language];
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');

  if (!user) return null;

  // Filter tasks for current user
  const myTasks = useMemo(() => tasks.filter(task => task.employeeId === user.employeeId), [tasks, user.employeeId]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Day Range
    const startOfDay = todayStr;
    const endOfDay = todayStr;

    // Week Range (Sunday to Saturday)
    const currentDay = now.getDay(); // 0 is Sunday
    const startOfWeekDate = new Date(now);
    startOfWeekDate.setDate(now.getDate() - currentDay);
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
    
    const startOfWeek = startOfWeekDate.toISOString().split('T')[0];
    const endOfWeek = endOfWeekDate.toISOString().split('T')[0];

    // Month Range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    return myTasks.filter(task => {
        const taskStart = task.startDate;
        const taskEnd = task.endDate;

        // Check overlapping intervals
        // interval A = [taskStart, taskEnd]
        // interval B = [periodStart, periodEnd]
        // Overlap if taskStart <= periodEnd AND taskEnd >= periodStart
        
        if (period === 'day') {
            return taskStart <= endOfDay && taskEnd >= startOfDay;
        } else if (period === 'week') {
            return taskStart <= endOfWeek && taskEnd >= startOfWeek;
        } else {
            return taskStart <= endOfMonth && taskEnd >= startOfMonth;
        }
    });
  }, [myTasks, period]);

  const completed = filteredTasks.filter(t => t.status === 'completed').length;
  const pending = filteredTasks.filter(t => t.status === 'pending').length;
  const total = filteredTasks.length;
  
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const data = [
    { name: t.completed, value: completed },
    { name: t.pending, value: pending },
  ];
  const COLORS = ['#10B981', '#F59E0B'];

  return (
    <div className="w-full h-full p-4 flex flex-col gap-6">
      
      {/* Period Selector */}
      <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
        <button 
            onClick={() => setPeriod('day')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${period === 'day' ? 'bg-white dark:bg-gray-600 shadow text-zte-blue' : 'text-gray-500 dark:text-gray-400'}`}
        >
            <Calendar size={14} /> {t.day}
        </button>
        <button 
            onClick={() => setPeriod('week')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${period === 'week' ? 'bg-white dark:bg-gray-600 shadow text-zte-blue' : 'text-gray-500 dark:text-gray-400'}`}
        >
            <CalendarDays size={14} /> {t.week}
        </button>
        <button 
            onClick={() => setPeriod('month')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-md transition-all ${period === 'month' ? 'bg-white dark:bg-gray-600 shadow text-zte-blue' : 'text-gray-500 dark:text-gray-400'}`}
        >
            <CalendarRange size={14} /> {t.month}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">{t.stats} ({t[period]})</h3>
        <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t.totalTasks}</span>
            <span className="text-xl font-bold text-zte-blue">{total}</span>
        </div>
        
        <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                </PieChart>
            </ResponsiveContainer>
        </div>
        <div className="flex justify-center text-sm gap-4">
             <div className="flex items-center gap-1 text-emerald-500">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 {t.completed} ({completed})
             </div>
             <div className="flex items-center gap-1 text-amber-500">
                 <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                 {t.pending} ({pending})
             </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
         <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">{t.completionRate}</h3>
         <div className="relative pt-1">
            <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-gray-200 dark:bg-gray-700">
                <div style={{ width: `${completionRate}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-zte-blue transition-all duration-500"></div>
            </div>
            <div className="flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-800 dark:text-white">{completionRate}%</span>
            </div>
         </div>
      </div>

      <div className="flex-1 bg-gradient-to-br from-zte-blue to-zte-dark rounded-lg p-4 text-white shadow-md">
        <h4 className="font-bold mb-2 opacity-90">{t.efficiency}</h4>
        <div className="space-y-3">
            {completionRate === 100 && total > 0 ? (
                <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-300" />
                    <span className="text-sm opacity-80">{t.allCaughtUp} {t[period]}!</span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-300" />
                    <span className="text-sm opacity-80">{pending} {t.tasksRemaining} {t[period]}</span>
                </div>
            )}
            <div className="text-xs opacity-60 mt-2 border-t border-white/20 pt-2">
               {t.efficiencyTip}
            </div>
        </div>
      </div>
    </div>
  );
};