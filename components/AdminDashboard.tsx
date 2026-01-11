
import React, { useMemo, useState } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { toLocalDateString } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Image as ImageIcon, AlertCircle, Activity, Briefcase, Trophy, Award, TrendingUp, PieChart as PieChartIcon, Loader2, X, Download, Eye, Clock, FileText, AlertTriangle, ChevronRight, List } from 'lucide-react';
import { uploadFile, getSignedUrl } from '../supabaseClient';
import { User, Task } from '../types';

declare const html2canvas: any;

const getOverdueDays = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const now = new Date();
    end.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    const diff = now.getTime() - end.getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
};

const getDaysLate = (endDateStr: string, completedAtStr: string) => {
    const end = new Date(endDateStr);
    const completed = new Date(completedAtStr);
    end.setHours(0,0,0,0);
    completed.setHours(0,0,0,0);
    const diff = completed.getTime() - end.getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
};

export const AdminDashboard: React.FC = () => {
  const { users, tasks, language } = useApp();
  const t = DICTIONARY[language];
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [previewImage, setPreviewImage] = useState<{ url: string, downloadUrl: string, filename: string } | null>(null);
  
  // State for the Detail Modal
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);

  const today = toLocalDateString(new Date());

  // 1. Define Valid Users (Exclude 'rejected' AND 'System_Admin')
  const statsUsers = useMemo(() => {
      return users.filter(u => u.status !== 'rejected' && u.name !== 'System_Admin');
  }, [users]);

  // Define the scope: Full Natural Year (Current Year)
  // Also exclude tasks belonging to System_Admin or rejected users
  const yearlyTasks = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;
    
    // Get IDs of valid users
    const validUserIds = new Set(statsUsers.map(u => u.employeeId));

    // Filter tasks
    return tasks.filter(t => 
        t.startDate <= yearEnd && 
        t.endDate >= yearStart &&
        validUserIds.has(t.employeeId)
    );
  }, [tasks, statsUsers]);

  const { total, completed, pending, overdue } = useMemo(() => {
    const completedCount = yearlyTasks.filter(t => t.status === 'completed').length;
    const overdueCount = yearlyTasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
    
    return {
      total: yearlyTasks.length,
      completed: completedCount,
      pending: yearlyTasks.length - completedCount,
      overdue: overdueCount
    };
  }, [yearlyTasks, today]);

  const categories = useMemo(() => {
      const counts: any = {};
      yearlyTasks.forEach(t => counts[t.category] = (counts[t.category] || 0) + 1);
      return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value);
  }, [yearlyTasks]);

  const userStats = useMemo(() => {
      return statsUsers.map(u => {
          const myTasks = yearlyTasks.filter(t => t.employeeId === u.employeeId);
          const completed = myTasks.filter(t => t.status === 'completed').length;
          
          // ---------------------------------------------------------
          // NEW LOGIC: On-Time Rate Calculation
          // Denominator: Total tasks that SHOULD be completed by today (EndDate <= Today)
          // ---------------------------------------------------------
          const tasksDueByToday = myTasks.filter(t => t.endDate <= today);
          
          // Numerator: Of the tasks due by today, how many were completed ON TIME?
          const completedOnTime = tasksDueByToday.filter(t => {
              if (t.status !== 'completed') return false; // If pending/overdue, it's not done
              
              // Check completion timestamp
              if (t.completedAt) {
                  return getDaysLate(t.endDate, t.completedAt) <= 0;
              }
              // Legacy data fallback (assume on time if marked completed and no timestamp, 
              // strictly speaking we don't know, but we give benefit of doubt or rely on current status)
              return true; 
          }).length;

          const overdue = myTasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
          // Pending implies not completed AND not yet overdue
          const pending = myTasks.filter(t => t.status !== 'completed' && t.endDate >= today).length;

          return {
              name: u.name,
              employeeId: u.employeeId,
              total: myTasks.length,
              targetLoad: tasksDueByToday.length, // Tasks that should be done by now
              completed: completed,
              pending: pending,
              overdue: overdue,
              rate: myTasks.length ? Math.round((completed / myTasks.length) * 100) : 0, // General Completion Rate
              
              // New On-Time Rate: (OnTime / DueByToday)
              onTimeRate: tasksDueByToday.length > 0 ? Math.round((completedOnTime / tasksDueByToday.length) * 100) : 0
          };
      });
  }, [statsUsers, yearlyTasks, today]);

  // 2. Red List: Only Highest On-Time Completion Rate (Top 1)
  const honorRollStats = useMemo(() => {
      return userStats
        .filter(u => u.targetLoad > 0) // Filter: Must have had tasks due by today
        .sort((a, b) => {
            if (b.onTimeRate !== a.onTimeRate) return b.onTimeRate - a.onTimeRate; // Primary: On-Time Rate
            return b.targetLoad - a.targetLoad; // Secondary: Volume of due tasks (tie-breaker)
        }) 
        .slice(0, 1) // Only 1 person
        .map(u => ({ ...u, displayRate: u.onTimeRate })); // Use onTimeRate for display
  }, [userStats]);

  const detailedUserStats = useMemo(() => {
      const activeStatsUsers = statsUsers.filter(u => u.status === 'active' || u.status === 'pending');
      
      const filteredUsers = activeStatsUsers.filter(u => 
        u.name.toLowerCase().includes(personnelSearch.toLowerCase()) ||
        u.employeeId.includes(personnelSearch)
      );
      return filteredUsers.map(u => {
          const uTasks = yearlyTasks.filter(t => t.employeeId === u.employeeId);
          const normal = uTasks.filter(t => t.status === 'completed').length;
          const pending = uTasks.filter(t => t.status === 'pending' && t.endDate >= today).length;
          const overdue = uTasks.filter(t => t.status === 'pending' && t.endDate < today).length;
          
          // Anomaly Logic: 
          // 1. Modification count > 3 (Handled by context to only count time changes)
          // 2. Currently Pending AND Overdue by > 3 Days (Severe Overdue)
          // 3. Completed but was > 3 Days Late (Late Completion)
          const abnormal = uTasks.filter(t => {
              const isFrequentMod = (t.modificationCount || 0) > 3;
              
              const daysOverdueCurrent = getOverdueDays(t.endDate);
              const isSeverelyOverdue = t.status !== 'completed' && daysOverdueCurrent > 3;

              let isLateCompletion = false;
              if (t.status === 'completed' && t.completedAt) {
                   const daysLate = getDaysLate(t.endDate, t.completedAt);
                   if (daysLate > 3) isLateCompletion = true;
              }

              return isFrequentMod || isSeverelyOverdue || isLateCompletion;
          }).length;

          return { user: u, normal, pending, overdue, abnormal };
      }).sort((a, b) => b.overdue - a.overdue);
  }, [statsUsers, yearlyTasks, personnelSearch, today]);

  const overdueAnalysisData = useMemo(() => {
      return statsUsers.map(u => {
          const userTasks = yearlyTasks.filter(t => t.employeeId === u.employeeId);
          const totalCount = userTasks.length;
          const userOverdue = userTasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
          return {
              name: u.name,
              count: userOverdue,
              rate: totalCount > 0 ? Math.round((userOverdue / totalCount) * 100) : 0
          };
      }).filter(u => u.count > 0).sort((a, b) => b.count - a.count);
  }, [statsUsers, yearlyTasks, today]);

  // 3. Anomaly Detection (Corrected Logic)
  const anomalies = useMemo(() => {
     // Logic Fix: Stagnant = Overdue AND (StartDate was > 7 days ago)
     const sevenDaysAgo = new Date();
     sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
     const sevenDaysAgoStr = toLocalDateString(sevenDaysAgo);

     const stagnantTasksList = yearlyTasks.filter(t => {
         // Must be overdue
         if (t.status === 'completed' || t.endDate >= today) return false;
         // Must have started a long time ago (stuck)
         return t.startDate <= sevenDaysAgoStr;
     });

     // Logic Fix: Overloaded = Users with > 5 OVERDUE tasks
     const overloadedUsersList = statsUsers.map(u => {
         const overdueCount = yearlyTasks.filter(t => 
             t.employeeId === u.employeeId && 
             t.status !== 'completed' && 
             t.endDate < today
         ).length;
         return { name: u.name, count: overdueCount, employeeId: u.employeeId };
     }).filter(u => u.count > 5);

     return { 
         stagnantCount: stagnantTasksList.length, 
         stagnantTasksList,
         overloadedUsers: overloadedUsersList 
     };
  }, [yearlyTasks, statsUsers, today]);

  // Tasks for the specific user in the modal
  const selectedUserTasks = useMemo(() => {
      if (!viewingUser) return [];
      return yearlyTasks.filter(t => t.employeeId === viewingUser.employeeId).sort((a, b) => {
          // Sort logic: Overdue first, then pending, then completed
          const isOverdueA = a.status !== 'completed' && a.endDate < today;
          const isOverdueB = b.status !== 'completed' && b.endDate < today;
          if (isOverdueA && !isOverdueB) return -1;
          if (!isOverdueA && isOverdueB) return 1;
          
          if (a.status === 'pending' && b.status === 'completed') return -1;
          if (a.status === 'completed' && b.status === 'pending') return 1;

          return a.startDate.localeCompare(b.startDate);
      });
  }, [viewingUser, yearlyTasks, today]);

  const exportImage = async () => {
    setIsGeneratingPdf(true);
    // Slight delay to allow UI state to update (spinner)
    await new Promise(resolve => setTimeout(resolve, 100));

    const el = document.getElementById('dashboard-content');
    if (el && html2canvas) {
        try {
            // Strategy: Clone the element to render it fully without scroll constraints
            const clone = el.cloneNode(true) as HTMLElement;
            
            // We need to ensure the clone has the same width as the original to maintain layout
            // especially for charts (ResponsiveContainer)
            const originalWidth = el.clientWidth;
            
            // Apply styles to the clone to make it fully expanded off-screen
            Object.assign(clone.style, {
                position: 'fixed', // Fixed to remove it from document flow affecting others
                top: '-10000px',
                left: '0',
                width: `${originalWidth}px`, // Enforce original width
                height: 'auto', // Allow height to expand to fit content
                maxHeight: 'none',
                overflow: 'visible',
                zIndex: '-1000'
            });

            // If dark mode, ensure background is set explicitly as html2canvas might transparent it
            const isDark = document.documentElement.classList.contains('dark');
            clone.style.backgroundColor = isDark ? '#111827' : '#F9FAFB';

            // Remove id to avoid conflicts
            clone.id = 'dashboard-content-export-clone';

            document.body.appendChild(clone);

            // Capture
            const canvas = await html2canvas(clone, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: isDark ? '#111827' : '#F9FAFB',
                width: clone.scrollWidth,
                height: clone.scrollHeight,
                windowWidth: clone.scrollWidth,
                windowHeight: clone.scrollHeight,
                x: 0,
                y: 0
            });

            // Clean up
            document.body.removeChild(clone);
            
            canvas.toBlob(async (blob: Blob | null) => {
                if (!blob) { setIsGeneratingPdf(false); return; }
                const fileName = `Report_${today}_${Date.now()}.png`;
                await uploadFile('exports', fileName, blob);
                const previewUrl = await getSignedUrl('exports', fileName);
                const downloadUrl = await getSignedUrl('exports', fileName, { download: fileName });
                setPreviewImage({ url: previewUrl, downloadUrl: downloadUrl, filename: fileName });
                setIsGeneratingPdf(false);
            }, 'image/png');
        } catch (err) { 
            console.error("Export failed:", err);
            setIsGeneratingPdf(false); 
        }
    } else { setIsGeneratingPdf(false); }
  };

  const COLORS = ['#008ED3', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 custom-scrollbar safe-pb" id="dashboard-content">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-8 max-w-[1600px] mx-auto pb-24">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-zte-blue pb-4 gap-4">
            <div>
                <h1 className="text-xl sm:text-3xl font-bold uppercase text-gray-800 dark:text-white leading-tight">{t.reportTitle}</h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">{t.deptName} | {today}</p>
            </div>
            <div className="flex gap-3 self-end">
                <button onClick={exportImage} disabled={isGeneratingPdf} className="hidden md:flex bg-zte-blue hover:bg-zte-dark text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50">
                  {isGeneratingPdf ? <Loader2 className="animate-spin" size={16}/> : <ImageIcon size={16}/>}
                  {t.exportPdf}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
             <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-16 sm:w-24 h-16 sm:h-24 bg-blue-50 dark:bg-blue-900/10 rounded-bl-full -mr-4 -mt-4"></div>
                 <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">{t.totalTasks} ({new Date().getFullYear()})</p>
                 <h3 className="text-xl sm:text-3xl font-extrabold text-gray-800 dark:text-white mt-1 sm:mt-2 relative z-10">{total}</h3>
                 <div className="h-1 w-6 sm:w-12 bg-blue-500 rounded mt-2 sm:mt-4"></div>
             </div>
             <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-16 sm:w-24 h-16 sm:h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-full -mr-4 -mt-4"></div>
                 <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">{t.completed}</p>
                 <h3 className="text-xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2 relative z-10">{completed}</h3>
                 <div className="h-1 w-6 sm:w-12 bg-emerald-500 rounded mt-2 sm:mt-4"></div>
             </div>
             <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-16 sm:w-24 h-16 sm:h-24 bg-amber-50 dark:bg-amber-900/10 rounded-bl-full -mr-4 -mt-4"></div>
                 <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">{t.pending}</p>
                 <h3 className="text-xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 sm:mt-2 relative z-10">{pending}</h3>
                 <div className="h-1 w-6 sm:w-12 bg-amber-500 rounded mt-2 sm:mt-4"></div>
             </div>
             <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-16 sm:w-24 h-16 sm:h-24 bg-red-50 dark:bg-red-900/10 rounded-bl-full -mr-4 -mt-4"></div>
                 <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">{t.overdue}</p>
                 <h3 className="text-xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1 sm:mt-2 relative z-10">{overdue}</h3>
                 <div className="h-1 w-6 sm:w-12 bg-red-500 rounded mt-2 sm:mt-4"></div>
             </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-gray-800">
                     <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-red-800 dark:text-red-400"><Award size={20}/> {t.redList}</h3>
                </div>
                <div className="p-3 sm:p-4 flex-1">
                    {honorRollStats.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                            {honorRollStats.map((u, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-gray-700/30 border border-red-50 dark:border-red-900/30 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold shadow-sm bg-yellow-400 text-white`}>
                                            <Trophy size={12}/>
                                        </div>
                                        <div className="font-bold text-sm text-gray-800 dark:text-white truncate">{u.name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">{u.displayRate}%</div>
                                        <div className="text-[10px] text-gray-400">{language === 'zh' ? '按期完成率' : 'On-Time Rate'}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="text-center py-6 text-gray-400 text-sm">No data.</div>}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                     <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-gray-800 dark:text-white"><AlertCircle size={20}/> {t.overdueAnalysis}</h3>
                </div>
                <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
                    {overdueAnalysisData.length > 0 ? (
                        <div className="space-y-2">
                             {overdueAnalysisData.slice(0, 5).map((u, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-lg">
                                    <div className="font-bold text-sm text-gray-800 dark:text-white">{u.name}</div>
                                    <div className="text-right"><div className="text-lg font-bold text-red-600">{u.count}</div></div>
                                </div>
                            ))}
                        </div>
                    ) : <div className="text-center py-6 text-gray-400 text-sm">Great performance!</div>}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                     <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-gray-800 dark:text-white"><Activity className="text-amber-500" size={20}/> {t.anomalyDetection}</h3>
                     {/* 4. Add Details Button */}
                     <button 
                        onClick={() => setShowAnomalyModal(true)}
                        className="p-1.5 text-gray-500 hover:text-zte-blue hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View Details"
                     >
                         <Eye size={16} />
                     </button>
                </div>
                <div className="p-3 sm:p-4 flex flex-col justify-center h-full">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl text-center border border-amber-100">
                            <div className="text-2xl font-bold text-amber-600">{anomalies.stagnantCount}</div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">{t.longPending}</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl text-center border border-purple-100">
                            <div className="text-2xl font-bold text-purple-600">{anomalies.overloadedUsers.length}</div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold mt-1">{t.overloadedStaff}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-[300px] lg:h-[400px]">
                <h4 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-zte-blue"/> 工作完成概况</h4>
                <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={userStats} barSize={20}>
                        <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} stroke="#9CA3AF"/>
                        <YAxis stroke="#9CA3AF" fontSize={10}/>
                        <Tooltip contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px'}} />
                        <Bar dataKey="completed" name={t.completed} fill="#10B981" stackId="a"/>
                        <Bar dataKey="pending" name={t.pending} fill="#E5E7EB" stackId="a"/>
                        <Bar dataKey="overdue" name={t.overdue} fill="#EF4444" radius={[4, 4, 0, 0]} stackId="a"/>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-[300px] lg:h-[400px]">
                <h4 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white mb-4 flex items-center gap-2"><PieChartIcon size={16} className="text-zte-blue"/>{t.categoryDistribution}</h4>
                <ResponsiveContainer width="100%" height="85%">
                    <PieChart>
                        <Pie data={categories} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={5}>
                            {categories.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} strokeWidth={2} stroke="#fff"/>)}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius: '8px', fontSize: '12px'}}/>
                        <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{fontSize: '10px'}}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
             <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50 dark:bg-gray-800">
                 <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-gray-800 dark:text-white"><Briefcase size={18} className="text-zte-blue"/> 人员任务统计</h3>
                 <div className="relative w-full sm:w-auto">
                     <input className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-full text-xs sm:text-sm w-full sm:w-64 focus:ring-2 focus:ring-zte-blue outline-none dark:bg-gray-700 dark:text-white" placeholder={t.filterUser} value={personnelSearch} onChange={e=>setPersonnelSearch(e.target.value)} />
                 </div>
             </div>
             <div className="overflow-x-auto min-h-[300px]">
                 <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                     <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                         <tr>
                             <th className="px-6 py-4">{t.name}</th>
                             <th className="px-6 py-4 text-center">已完成</th>
                             <th className="px-6 py-4 text-center">已逾期</th>
                             <th className="px-6 py-4 text-center">待办</th>
                             <th className="px-6 py-4 text-center">异常</th>
                             {/* Only visible on Medium+ screens to strictly preserve mobile UI */}
                             <th className="px-6 py-4 text-center hidden md:table-cell">{t.actions}</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                         {detailedUserStats.map(stat => (
                             <tr key={stat.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                 <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{backgroundColor: stat.user.color}}>{stat.user.name.charAt(0)}</div>
                                     <div className="flex flex-col"><span>{stat.user.name}</span><span className="text-[10px] text-gray-400">{stat.user.employeeId}</span></div>
                                 </td>
                                 <td className="px-6 py-4 text-center"><span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">{stat.normal}</span></td>
                                 <td className="px-6 py-4 text-center"><span className={stat.overdue > 0 ? "bg-red-50 text-red-700 px-3 py-1 rounded-full" : "text-gray-300"}>{stat.overdue || "-"}</span></td>
                                 <td className="px-6 py-4 text-center"><span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full">{stat.pending}</span></td>
                                 <td className="px-6 py-4 text-center"><span className={stat.abnormal > 0 ? "bg-purple-50 text-purple-700 px-3 py-1 rounded-full" : "text-gray-300"}>{stat.abnormal || "-"}</span></td>
                                 {/* PC Only Action Button */}
                                 <td className="px-6 py-4 text-center hidden md:table-cell">
                                     <button 
                                        onClick={() => setViewingUser(stat.user)}
                                        className="text-zte-blue hover:text-white hover:bg-zte-blue p-2 rounded-full transition-all" 
                                        title={language === 'zh' ? '查看详情' : 'View Details'}
                                     >
                                         <Eye size={18} />
                                     </button>
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
      </div>

      {previewImage && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-lg flex flex-col gap-4">
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white">
                       <img src={previewImage.url} alt="Report Preview" className="w-full h-auto max-h-[70vh] object-contain" />
                       <button onClick={() => setPreviewImage(null)} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full"><X size={20} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setPreviewImage(null)} className="py-3 px-4 rounded-xl border border-white/20 text-white font-bold text-sm">
                          {language === 'zh' ? '关闭' : 'Close'}
                      </button>
                      <a 
                        href={previewImage.downloadUrl} 
                        download={previewImage.filename} 
                        className="py-3 px-4 rounded-xl bg-zte-blue text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2"
                      >
                          <Download size={18} />
                          {language === 'zh' ? '下载图片' : 'Download Image'}
                      </a>
                  </div>
              </div>
          </div>
      )}

      {/* Anomaly Details Modal */}
      {showAnomalyModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                          <Activity className="text-amber-500" size={20}/> {t.anomalyDetection}
                      </h3>
                      <button onClick={() => setShowAnomalyModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                          <X size={20} className="text-gray-500" />
                      </button>
                  </div>
                  <div className="p-4 md:p-6 overflow-y-auto space-y-6">
                       {/* Stagnant Tasks Section */}
                       <div>
                           <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                               <span className="w-2 h-2 bg-amber-500 rounded-full"></span> {t.longPending} (Overdue &gt; 1 Week)
                           </h4>
                           <div className="border rounded-lg dark:border-gray-700 overflow-hidden">
                               {anomalies.stagnantTasksList.length > 0 ? (
                                   <table className="w-full text-sm text-left">
                                       <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 uppercase">
                                           <tr>
                                               <th className="px-4 py-2">{t.taskTitle}</th>
                                               <th className="px-4 py-2">{t.name}</th>
                                               <th className="px-4 py-2">{t.start}</th>
                                           </tr>
                                       </thead>
                                       <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                           {anomalies.stagnantTasksList.map(task => {
                                               const user = statsUsers.find(u => u.employeeId === task.employeeId);
                                               return (
                                                   <tr key={task.id}>
                                                       <td className="px-4 py-2 font-medium text-gray-800 dark:text-white truncate max-w-[200px]" title={task.title}>{task.title}</td>
                                                       <td className="px-4 py-2 text-gray-600 dark:text-gray-300">{user?.name || task.employeeId}</td>
                                                       <td className="px-4 py-2 text-gray-500 font-mono text-xs">{task.startDate}</td>
                                                   </tr>
                                               );
                                           })}
                                       </tbody>
                                   </table>
                               ) : (
                                   <div className="p-4 text-center text-gray-400 text-sm">{language === 'zh' ? '无长期停滞任务' : 'No stagnant tasks detected.'}</div>
                               )}
                           </div>
                       </div>

                       {/* Overloaded Staff Section */}
                       <div>
                           <h4 className="font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                               <span className="w-2 h-2 bg-purple-500 rounded-full"></span> {t.overloadedStaff} (&gt; 5 Overdue Tasks)
                           </h4>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               {anomalies.overloadedUsers.length > 0 ? (
                                   anomalies.overloadedUsers.map((item, i) => (
                                       <div key={i} className="flex items-center justify-between p-3 border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10 rounded-lg">
                                           <div className="flex items-center gap-2">
                                               <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-200 flex items-center justify-center font-bold text-xs">
                                                   {item.name.charAt(0)}
                                               </div>
                                               <div>
                                                   <div className="font-bold text-sm text-gray-800 dark:text-white">{item.name}</div>
                                                   <div className="text-[10px] text-gray-500">{item.employeeId}</div>
                                               </div>
                                           </div>
                                           <div className="text-right">
                                               <div className="text-lg font-bold text-purple-600">{item.count}</div>
                                               <div className="text-[10px] text-purple-400 uppercase">Overdue</div>
                                           </div>
                                       </div>
                                   ))
                               ) : (
                                   <div className="col-span-full p-4 text-center text-gray-400 text-sm border rounded-lg dark:border-gray-700">
                                       {language === 'zh' ? '无积压人员' : 'No overloaded staff detected.'}
                                   </div>
                               )}
                           </div>
                       </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                      <button onClick={() => setShowAnomalyModal(false)} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-bold transition-colors">
                          {language === 'zh' ? '关闭' : 'Close'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* User Task Details Modal (PC Only) */}
      {viewingUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-lg" style={{backgroundColor: viewingUser.color}}>
                              {viewingUser.name.charAt(0)}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{viewingUser.name} - {language === 'zh' ? '任务详情' : 'Task Details'}</h3>
                              <p className="text-xs text-gray-500 uppercase tracking-wide">{viewingUser.employeeId}</p>
                          </div>
                      </div>
                      <button onClick={() => setViewingUser(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                          <X size={20} className="text-gray-500" />
                      </button>
                  </div>
                  
                  {/* Table Content */}
                  <div className="flex-1 overflow-auto p-0">
                      <table className="w-full text-sm text-left">
                          <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
                              <tr>
                                  <th className="px-6 py-4 font-bold">{t.taskTitle}</th>
                                  <th className="px-6 py-4 font-bold text-center">{t.category}</th>
                                  <th className="px-6 py-4 font-bold text-center">{language === 'zh' ? '起止时间' : 'Duration'}</th>
                                  <th className="px-6 py-4 font-bold text-center">{t.status}</th>
                                  <th className="px-6 py-4 font-bold">{language === 'zh' ? '异常/描述' : 'Description/Anomaly'}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {selectedUserTasks.length > 0 ? selectedUserTasks.map(task => {
                                  const isOverdue = task.status !== 'completed' && task.endDate < today;
                                  const isFrequentEdit = (task.modificationCount || 0) > 3;
                                  let isLateCompletion = false;
                                  if (task.status === 'completed' && task.completedAt) {
                                       const daysLate = getDaysLate(task.endDate, task.completedAt);
                                       if (daysLate > 3) isLateCompletion = true;
                                  }

                                  return (
                                      <tr key={task.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isOverdue || isLateCompletion ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white max-w-[200px]">
                                              <div className="truncate" title={task.title}>{task.title}</div>
                                          </td>
                                          <td className="px-6 py-4 text-center text-gray-500">{task.category}</td>
                                          <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{task.startDate}</span>
                                                <span className="text-[10px] text-gray-300 dark:text-gray-600">to</span>
                                                <span className={`text-xs font-mono font-bold ${isOverdue ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>{task.endDate}</span>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${task.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : (isOverdue ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200')}`}>
                                                  {task.status === 'completed' ? t.completed : (isOverdue ? t.overdue : t.pending)}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300 max-w-[300px]">
                                              <div className="flex flex-col gap-1.5">
                                                  {isOverdue && (
                                                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded w-fit">
                                                          <Clock size={10} /> {language === 'zh' ? '已逾期' : 'Overdue'}
                                                      </span>
                                                  )}
                                                  {isLateCompletion && (
                                                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded w-fit">
                                                          <Clock size={10} /> {language === 'zh' ? '严重逾期完成' : 'Late Completion (>3 Days)'}
                                                      </span>
                                                  )}
                                                  {isFrequentEdit && (
                                                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded w-fit">
                                                          <AlertTriangle size={10} /> {language === 'zh' ? '频繁修改' : 'Frequent Edits'}
                                                      </span>
                                                  )}
                                                  <p className="text-xs leading-relaxed line-clamp-2" title={task.description}>
                                                      {task.description || <span className="text-gray-400 italic">{t.noDesc}</span>}
                                                  </p>
                                              </div>
                                          </td>
                                      </tr>
                                  );
                              }) : (
                                  <tr>
                                      <td colSpan={5} className="text-center py-12 text-gray-400">
                                          <FileText size={32} className="mx-auto mb-2 opacity-20"/>
                                          {language === 'zh' ? '该用户暂无任务记录' : 'No tasks found for this user.'}
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
                  
                  {/* Footer */}
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                      <button onClick={() => setViewingUser(null)} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-bold transition-colors">
                          {language === 'zh' ? '关闭' : 'Close'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
