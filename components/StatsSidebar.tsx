
import React, { useState, useMemo } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { toLocalDateString } from '../utils';
import { getEfficiencyAnalysis } from '../geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle, Clock, CalendarDays, CalendarRange, Calendar, Sparkles, Loader2 } from 'lucide-react';

export const StatsSidebar: React.FC = () => {
  const { user, tasks, language } = useApp();
  const t = DICTIONARY[language];
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  
  // AI State
  const [aiEfficiencyInsight, setAiEfficiencyInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  if (!user) return null;

  // Filter tasks: Admin sees ALL tasks, Regular user sees ONLY their own.
  // relevantTasks contains ALL tasks for the user (global scope)
  const relevantTasks = useMemo(() => {
      if (user.role === 'admin') {
          return tasks;
      }
      return tasks.filter(task => task.employeeId === user.employeeId);
  }, [tasks, user.employeeId, user.role]);

  // filteredTasks is only for the specific period view visualization (Pie chart)
  const filteredTasks = useMemo(() => {
    const now = new Date();
    // Fix: Use local date string instead of UTC-based toISOString
    const todayStr = toLocalDateString(now);
    
    // Day Range
    const startOfDay = todayStr;
    const endOfDay = todayStr;

    // Week Range (Sunday to Saturday)
    const currentDay = now.getDay(); // 0 is Sunday
    const startOfWeekDate = new Date(now);
    startOfWeekDate.setDate(now.getDate() - currentDay);
    const endOfWeekDate = new Date(startOfWeekDate);
    endOfWeekDate.setDate(startOfWeekDate.getDate() + 6);
    
    const startOfWeek = toLocalDateString(startOfWeekDate);
    const endOfWeek = toLocalDateString(endOfWeekDate);

    // Month Range
    const startOfMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = toLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0));

    return relevantTasks.filter(task => {
        const taskStart = task.startDate;
        const taskEnd = task.endDate;

        // Check overlapping intervals
        if (period === 'day') {
            return taskStart <= endOfDay && taskEnd >= startOfDay;
        } else if (period === 'week') {
            return taskStart <= endOfWeek && taskEnd >= startOfWeek;
        } else {
            return taskStart <= endOfMonth && taskEnd >= startOfMonth;
        }
    });
  }, [relevantTasks, period]);

  const completed = filteredTasks.filter(t => t.status === 'completed').length;
  const pending = filteredTasks.filter(t => t.status === 'pending').length;
  const total = filteredTasks.length;
  
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const handleAnalyzeEfficiency = async () => {
    if (isLoadingInsight) return;
    setIsLoadingInsight(true);
    
    // Pass ALL relevant tasks (not just the filtered period view) to AI for holistic analysis
    // This allows AI to see global overdue tasks and full backlog.
    const insight = await getEfficiencyAnalysis(relevantTasks, period, language);
    
    setAiEfficiencyInsight(insight);
    setIsLoadingInsight(false);
  };

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
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{t.stats} ({t[period]})</h3>
            {user.role === 'admin' && <span className="text-[10px] bg-blue-100 text-zte-blue px-1.5 py-0.5 rounded font-bold">{t.allUsers}</span>}
        </div>
        
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

      <div className="flex-1 bg-gradient-to-br from-zte-blue to-zte-dark rounded-lg p-4 text-white shadow-md relative group">
        <div className="flex justify-between items-start mb-2">
           <h4 className="font-bold opacity-90">{t.efficiency}</h4>
           <button 
             onClick={handleAnalyzeEfficiency} 
             disabled={isLoadingInsight}
             className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full flex items-center gap-1 transition-all"
           >
             {isLoadingInsight ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
             Analyze
           </button>
        </div>
        
        <div className="space-y-3">
            {total === 0 ? (
                 <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-white/70" />
                    <span className="text-sm opacity-80">{t.noTasksScheduled}</span>
                 </div>
            ) : completionRate === 100 ? (
                <div className="flex items-center gap-2">
                    <CheckCircle size={16} className="text-emerald-300" />
                    <span className="text-sm opacity-80">{t[`allCaughtUp_${period}` as keyof typeof t]}</span>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-300" />
                    <span className="text-sm opacity-80">
                        {language === 'zh' 
                            ? `${t[`tasksRemaining_${period}` as keyof typeof t]}: ${pending}` 
                            : `${pending} ${t[`tasksRemaining_${period}` as keyof typeof t]}`
                        }
                    </span>
                </div>
            )}
            <div className="text-xs opacity-70 mt-2 border-t border-white/20 pt-2 min-h-[40px] italic">
               {aiEfficiencyInsight || t.efficiencyTip}
            </div>
        </div>
      </div>
    </div>
  );
};
