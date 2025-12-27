
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { getPeriodRange, isTaskInPeriod, toLocalDateString } from '../utils';
import { getAnomalyAnalysis } from '../geminiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Image as ImageIcon, AlertCircle, Clock, PieChart as PieChartIcon, Activity, CheckCircle, FileText, Search, User, TrendingUp, Award, ChevronLeft, ChevronRight, Trophy, Calendar as CalendarIcon, Briefcase, Sparkles, Bot, Loader2, Download, X, Share2 } from 'lucide-react';
import { supabase, uploadFile, getSignedUrl } from '../supabaseClient';

declare const html2canvas: any;
declare const jspdf: any;

export const AdminDashboard: React.FC = () => {
  const { users, tasks, language } = useApp();
  const t = DICTIONARY[language];
  const [period] = useState<'day' | 'week' | 'month'>('week');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [personnelSearch, setPersonnelSearch] = useState('');
  
  // Preview Modal State
  const [previewImage, setPreviewImage] = useState<{ url: string, downloadUrl: string, filename: string } | null>(null);

  // AI State
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const today = toLocalDateString(new Date());
  const { start, end } = getPeriodRange(period);

  // --- Stats Logic (Filtered by Period) ---
  const currentTasks = tasks.filter(t => isTaskInPeriod(t, start, end));
  const total = currentTasks.length;
  const completed = currentTasks.filter(t => t.status === 'completed').length;
  const overdue = currentTasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Category Data
  const categories = useMemo(() => {
      const counts: any = {};
      currentTasks.forEach(t => counts[t.category] = (counts[t.category] || 0) + 1);
      return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value);
  }, [currentTasks]);

  // Personnel Stats
  const userStats = useMemo(() => {
      return users.filter(u => u.role !== 'admin').map(u => {
          const myTasks = currentTasks.filter(t => t.employeeId === u.employeeId);
          const done = myTasks.filter(t => t.status === 'completed').length;
          return {
              name: u.name,
              total: myTasks.length,
              completed: done,
              pending: myTasks.length - done,
              rate: myTasks.length ? Math.round((done / myTasks.length) * 100) : 0
          };
      });
  }, [users, currentTasks]);

  // Honor Roll (Red List) Logic - Based on Current Period Performance
  const honorRollStats = useMemo(() => {
      return userStats
        .filter(u => u.total > 0) // Only consider users with tasks
        .sort((a, b) => {
             // Sort by Completion Rate desc, then by Total Completed desc
             if (b.rate !== a.rate) return b.rate - a.rate;
             return b.completed - a.completed;
        })
        .slice(0, 5); // Top 5
  }, [userStats]);

  // --- Detailed Personnel Statistics for Table ---
  const detailedUserStats = useMemo(() => {
      const activeUsers = users.filter(u => u.role !== 'admin' && (u.status === 'active' || u.status === 'pending'));
      
      // Filter by search
      const filteredUsers = activeUsers.filter(u => 
        u.name.toLowerCase().includes(personnelSearch.toLowerCase()) ||
        u.employeeId.includes(personnelSearch)
      );

      return filteredUsers.map(u => {
          const uTasks = tasks.filter(t => t.employeeId === u.employeeId);
          
          const normal = uTasks.filter(t => t.status === 'completed').length;
          const pending = uTasks.filter(t => t.status === 'pending' && t.endDate >= today).length;
          const overdue = uTasks.filter(t => t.status === 'pending' && t.endDate < today).length;
          const abnormal = uTasks.filter(t => (t.modificationCount || 0) > 3).length;

          return {
              user: u,
              normal,
              pending,
              overdue,
              abnormal
          };
      }).sort((a, b) => b.overdue - a.overdue); // Default sort by overdue count (risk)
  }, [users, tasks, personnelSearch, today]);

  // --- Advanced Analysis (Using Global Tasks for Risk Assessment) ---
  const overdueStats = useMemo(() => {
      return users.filter(u => u.role !== 'admin').map(u => {
          const userTasks = tasks.filter(t => t.employeeId === u.employeeId);
          const total = userTasks.length;
          const userOverdue = userTasks.filter(t => t.status !== 'completed' && t.endDate < today).length;
          return {
              name: u.name,
              count: userOverdue,
              rate: total > 0 ? Math.round((userOverdue / total) * 100) : 0
          };
      }).filter(u => u.count > 0).sort((a, b) => b.count - a.count);
  }, [users, tasks, today]);

  const anomalies = useMemo(() => {
     // Check Stagnant Tasks globally
     const stagnantCount = tasks.filter(t => {
         if (t.status === 'completed') return false;
         const startDate = new Date(t.startDate);
         const now = new Date();
         const diffTime = Math.abs(now.getTime() - startDate.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
         return diffDays > 7;
     }).length;

     // Check Overloaded Users globally
     const overloadedUsers = users.filter(u => u.role !== 'admin').map(u => {
         const pendingCount = tasks.filter(t => t.employeeId === u.employeeId && t.status === 'pending').length;
         return { name: u.name, count: pendingCount };
     }).filter(u => u.count > 5);

     return { stagnantCount, overloadedUsers };
  }, [tasks, users]);

  const handleAiAnalysis = async () => {
      if (isAnalyzing) return;
      setIsAnalyzing(true);
      const result = await getAnomalyAnalysis(tasks, users, language);
      setAiAnalysis(result);
      setIsAnalyzing(false);
  };

  // UPDATED: Export Logic - Now opens a Preview Modal
  const exportImage = async () => {
    setIsGeneratingPdf(true);
    
    setTimeout(async () => {
        const el = document.getElementById('dashboard-content');
        if (el && html2canvas) {
            try {
                const scrollTop = el.scrollTop;
                el.scrollTop = 0; // Reset scroll to capture full height

                const scrollHeight = el.scrollHeight;
                const clientWidth = el.clientWidth;
                
                const canvas = await html2canvas(el, { 
                    scale: 2, 
                    useCORS: true,
                    width: clientWidth,
                    height: scrollHeight,
                    windowHeight: scrollHeight,
                    x: 0,
                    y: 0,
                    backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#F9FAFB'
                });

                el.scrollTop = scrollTop; // Restore scroll

                canvas.toBlob(async (blob: Blob | null) => {
                    if (!blob) {
                        alert("Failed to generate image data.");
                        setIsGeneratingPdf(false);
                        return;
                    }

                    try {
                        const fileName = `Report_${today}_${Date.now()}.png`;
                        
                        // 1. Upload the file
                        await uploadFile('exports', fileName, blob);
                        
                        // 2. Get Preview URL (Inline display)
                        const previewUrl = await getSignedUrl('exports', fileName);
                        
                        // 3. Get Download URL (Attachment)
                        // Note: We use the same file, but this URL forces 'Save As' behavior
                        const downloadUrl = await getSignedUrl('exports', fileName, { download: fileName });

                        setPreviewImage({
                            url: previewUrl,
                            downloadUrl: downloadUrl,
                            filename: fileName
                        });

                    } catch (error: any) {
                        console.error("Export Error:", error);
                        alert(`Export Failed: ${error.message}`);
                    } finally {
                        setIsGeneratingPdf(false);
                    }

                }, 'image/png');

            } catch (err) {
                console.error("Export failed:", err);
                alert("Failed to export image.");
                setIsGeneratingPdf(false);
            }
        } else {
            setIsGeneratingPdf(false);
        }
    }, 500);
  };

  const handleDownload = () => {
      if (previewImage) {
          // Trigger download in WebView compatible way
          const link = document.createElement('a');
          link.href = previewImage.downloadUrl;
          link.download = previewImage.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Optional: Give feedback
          // alert("Downloading started...");
      }
  };

  const COLORS = ['#008ED3', '#10B981', '#F59E0B', '#EF4444'];

  return (
    <>
    <style>{`
      @media (max-width: 768px) {
        #dashboard-content::-webkit-scrollbar {
          display: none;
        }
        #dashboard-content {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      }
    `}</style>
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 custom-scrollbar safe-pb" id="dashboard-content">
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-8 max-w-[1600px] mx-auto pb-24">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-zte-blue pb-4 gap-4">
            <div>
                <h1 className="text-xl sm:text-3xl font-bold uppercase text-gray-800 dark:text-white leading-tight">{t.reportTitle}</h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">{t.deptName} | {today}</p>
            </div>
            <div className="flex gap-3 print:hidden self-end">
                <button 
                  onClick={exportImage} 
                  disabled={isGeneratingPdf}
                  className="bg-zte-blue hover:bg-zte-dark text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingPdf ? <Loader2 className="animate-spin" size={16}/> : <ImageIcon size={16}/>}
                  {t.exportPdf}
                </button>
            </div>
        </div>

        {/* Overview KPI Cards - Mobile: Dense Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
             <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-16 sm:w-24 h-16 sm:h-24 bg-blue-50 dark:bg-blue-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                 <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">{t.totalTasks}</p>
                 <h3 className="text-xl sm:text-3xl font-extrabold text-gray-800 dark:text-white mt-1 sm:mt-2 relative z-10 truncate">{total}</h3>
                 <div className="h-1 w-6 sm:w-12 bg-blue-500 rounded mt-2 sm:mt-4"></div>
             </div>
             <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-16 sm:w-24 h-16 sm:h-24 bg-emerald-50 dark:bg-emerald-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                 <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">{t.completed}</p>
                 <h3 className="text-xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2 relative z-10 truncate">{completed}</h3>
                 <div className="h-1 w-6 sm:w-12 bg-emerald-500 rounded mt-2 sm:mt-4"></div>
             </div>
             <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-16 sm:w-24 h-16 sm:h-24 bg-amber-50 dark:bg-amber-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                 <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">{t.pending}</p>
                 <h3 className="text-xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 sm:mt-2 relative z-10 truncate">{total - completed}</h3>
                 <div className="h-1 w-6 sm:w-12 bg-amber-500 rounded mt-2 sm:mt-4"></div>
             </div>
             <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-16 sm:w-24 h-16 sm:h-24 bg-red-50 dark:bg-red-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                 <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider relative z-10">{t.overdue}</p>
                 <h3 className="text-xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1 sm:mt-2 relative z-10 truncate">{overdue}</h3>
                 <div className="h-1 w-6 sm:w-12 bg-red-500 rounded mt-2 sm:mt-4"></div>
             </div>
        </div>

        {/* 3-Column Analysis: Honor Roll (Red), Risk (Black), Anomaly */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            
            {/* 1. Honor Roll (Red List) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-red-50 to-white dark:from-red-900/20 dark:to-gray-800 rounded-t-xl">
                     <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-red-800 dark:text-red-400">
                        <Award className="text-red-600 dark:text-red-400" size={20}/> {t.redList}
                     </h3>
                     <span className="text-[10px] uppercase font-bold text-red-400 border border-red-200 rounded px-1.5 bg-white dark:bg-transparent">Top 5</span>
                </div>
                <div className="p-3 sm:p-4 flex-1">
                    {honorRollStats.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                            {honorRollStats.map((u, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-gray-700/30 border border-red-50 dark:border-red-900/30 transition-colors rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold shadow-sm 
                                            ${idx === 0 ? 'bg-yellow-400 text-white ring-2 ring-yellow-200' : 
                                              idx === 1 ? 'bg-gray-300 text-gray-700' : 
                                              idx === 2 ? 'bg-amber-600 text-white' : 'bg-red-50 text-red-600'}`}>
                                            {idx <= 2 ? <Trophy size={12}/> : idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-gray-800 dark:text-white flex items-center gap-2 truncate">
                                                {u.name}
                                                {idx === 0 && <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1 rounded hidden sm:inline-block">MVP</span>}
                                            </div>
                                            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">{u.completed} Done</div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">{u.rate}%</div>
                                        <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase">{t.rate}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-6 sm:py-8">
                            <p className="text-xs sm:text-sm">No data available.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Overdue Analysis (Black List) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl">
                     <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-gray-800 dark:text-white">
                        <AlertCircle className="text-gray-600 dark:text-gray-400" size={20}/> {t.overdueAnalysis}
                     </h3>
                     {overdueStats.length > 0 && <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{overdueStats.length}</span>}
                </div>
                <div className="p-3 sm:p-4 flex-1">
                    {overdueStats.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                             {overdueStats.slice(0, 5).map((u, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 sm:p-3 bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg text-xs sm:text-sm font-bold shadow-sm bg-gray-800 text-white`}>
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-gray-800 dark:text-white truncate">{u.name}</div>
                                            <div className="text-[10px] sm:text-xs text-gray-500 font-medium truncate">{t.overdueRate}: {u.rate}%</div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-300">{u.count}</div>
                                        <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase">{t.overdueCount}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 py-6 sm:py-8">
                            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-2">
                                <CheckCircle size={24} className="text-green-500"/>
                            </div>
                            <p className="font-medium text-xs text-gray-500">{t.statusExcellent}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Anomaly Detection with Gemini AI */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-full">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50 rounded-t-xl">
                     <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-gray-800 dark:text-white">
                        <Activity className="text-amber-500" size={20}/> {t.anomalyDetection}
                     </h3>
                     <button 
                        onClick={handleAiAnalysis}
                        disabled={isAnalyzing}
                        className="text-[10px] bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded-full flex items-center gap-1 transition-colors border border-indigo-200 disabled:opacity-50"
                     >
                         {isAnalyzing ? <Activity size={10} className="animate-spin" /> : <Sparkles size={10} />}
                         {language === 'zh' ? 'AI 分析' : 'AI Analysis'}
                     </button>
                </div>
                <div className="p-3 sm:p-4 flex flex-col justify-center h-full">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl text-center border border-amber-100 dark:border-amber-800/50">
                            <div className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-500">{anomalies.stagnantCount}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mt-1 tracking-wide">{t.longPending}</div>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl text-center border border-purple-100 dark:border-purple-800/50">
                            <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-500">{anomalies.overloadedUsers.length}</div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mt-1 tracking-wide">{t.overloadedStaff}</div>
                        </div>
                    </div>
                    {anomalies.overloadedUsers.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-2 sm:p-3 rounded-lg flex items-start gap-2 mb-2">
                             <AlertCircle size={14} className="text-red-500 mt-0.5 shrink-0"/>
                             <div className="text-xs text-red-800 dark:text-red-200">
                                 <span className="font-bold">Attention:</span> {anomalies.overloadedUsers.map(u => u.name).join(', ')}
                             </div>
                        </div>
                    )}
                    
                    {/* Gemini AI Output Area */}
                    {aiAnalysis && (
                        <div className="mt-auto bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 p-3 rounded-lg flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
                                <Bot size={12} /> {language === 'zh' ? '智能分析' : 'Smart Analysis'}
                            </div>
                            <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed italic">
                                "{aiAnalysis}"
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-[300px] lg:h-[400px]">
                <h4 className="font-bold text-sm sm:text-base text-gray-800 dark:text-white mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-zte-blue"/>{t.efficiencyByUser}</h4>
                <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={userStats} barSize={20}>
                        <XAxis dataKey="name" tick={{fontSize: 10}} interval={0} stroke="#9CA3AF"/>
                        <YAxis stroke="#9CA3AF" fontSize={10}/>
                        <Tooltip 
                            contentStyle={{backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '12px'}}
                        />
                        <Bar dataKey="completed" name={t.completed} fill="#10B981" radius={[4, 4, 0, 0]} stackId="a"/>
                        <Bar dataKey="pending" name={t.pending} fill="#E5E7EB" radius={[4, 4, 0, 0]} stackId="a"/>
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

        {/* Detailed Personnel Statistics Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
             <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/50 dark:bg-gray-800">
                 <h3 className="font-bold text-base sm:text-lg flex items-center gap-2 text-gray-800 dark:text-white self-start sm:self-center">
                    <Briefcase size={18} className="text-zte-blue"/> {language === 'zh' ? '人员任务统计' : 'Personnel Task Statistics'}
                 </h3>
                 <div className="relative w-full sm:w-auto">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                     <input 
                        className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-full text-xs sm:text-sm w-full sm:w-64 focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none dark:bg-gray-700 dark:text-white transition-all" 
                        placeholder={t.filterUser} 
                        value={personnelSearch} 
                        onChange={e=>setPersonnelSearch(e.target.value)}
                     />
                 </div>
             </div>
             
             {/* Desktop Table */}
             <div className="hidden md:block overflow-x-auto min-h-[300px]">
                 <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                     <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 font-bold tracking-wider">
                         <tr>
                             <th className="px-6 py-4">{t.name}</th>
                             <th className="px-6 py-4 text-center text-emerald-600 dark:text-emerald-400">{language === 'zh' ? '正常 (已完成)' : 'Normal (Completed)'}</th>
                             <th className="px-6 py-4 text-center text-red-600 dark:text-red-400">{t.overdue}</th>
                             <th className="px-6 py-4 text-center text-amber-600 dark:text-amber-400">{t.pending}</th>
                             <th className="px-6 py-4 text-center text-purple-600 dark:text-purple-400">
                                 {language === 'zh' ? '异常 (修改>3次)' : 'Abnormal (>3 edits)'}
                             </th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                         {detailedUserStats.map(stat => (
                             <tr key={stat.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                 <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold shadow-sm" style={{backgroundColor: stat.user.color}}>
                                         {stat.user.name.charAt(0)}
                                     </div>
                                     <div className="flex flex-col">
                                         <span>{stat.user.name}</span>
                                         <span className="text-[10px] text-gray-400">{stat.user.employeeId}</span>
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 text-center font-bold text-gray-700 dark:text-gray-300">
                                     <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-1 rounded-full">{stat.normal}</span>
                                 </td>
                                 <td className="px-6 py-4 text-center font-bold">
                                     {stat.overdue > 0 ? (
                                         <span className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 px-3 py-1 rounded-full">{stat.overdue}</span>
                                     ) : (
                                         <span className="text-gray-300">-</span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 text-center font-bold">
                                     {stat.pending > 0 ? (
                                        <span className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-1 rounded-full">{stat.pending}</span>
                                     ) : (
                                        <span className="text-gray-300">-</span>
                                     )}
                                 </td>
                                 <td className="px-6 py-4 text-center font-bold">
                                     {stat.abnormal > 0 ? (
                                         <span className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 px-3 py-1 rounded-full flex items-center justify-center gap-1 mx-auto w-fit">
                                             <AlertCircle size={12}/> {stat.abnormal}
                                         </span>
                                     ) : (
                                         <span className="text-gray-300">-</span>
                                     )}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>

             {/* Mobile Card List */}
             <div className="md:hidden flex flex-col p-3 gap-3">
                {detailedUserStats.map(stat => (
                     <div key={stat.user.id} className="bg-white dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col gap-3">
                         <div className="flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 pb-3">
                             <div className="w-10 h-10 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-sm" style={{backgroundColor: stat.user.color}}>{stat.user.name.charAt(0)}</div>
                             <div>
                                 <div className="font-bold text-sm text-gray-900 dark:text-white">{stat.user.name}</div>
                                 <div className="text-[10px] text-gray-500">{stat.user.employeeId}</div>
                             </div>
                         </div>
                         <div className="grid grid-cols-2 gap-2 text-xs">
                             <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg flex justify-between items-center text-emerald-800 dark:text-emerald-300">
                                 <span>{language === 'zh' ? '正常' : 'Normal'}</span>
                                 <span className="font-bold text-sm">{stat.normal}</span>
                             </div>
                             <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg flex justify-between items-center text-red-800 dark:text-red-300">
                                 <span>{t.overdue}</span>
                                 <span className="font-bold text-sm">{stat.overdue}</span>
                             </div>
                             <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg flex justify-between items-center text-amber-800 dark:text-amber-300">
                                 <span>{t.pending}</span>
                                 <span className="font-bold text-sm">{stat.pending}</span>
                             </div>
                             <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg flex justify-between items-center text-purple-800 dark:text-purple-300">
                                 <span>{language === 'zh' ? '异常' : 'Abnormal'}</span>
                                 <span className="font-bold text-sm">{stat.abnormal}</span>
                             </div>
                         </div>
                     </div>
                ))}
             </div>

             {detailedUserStats.length === 0 && (
                 <div className="text-center py-12 text-gray-400 text-sm">
                     No personnel found.
                 </div>
             )}
        </div>
      </div>

      {/* Preview Image Modal Overlay */}
      {previewImage && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-lg flex flex-col gap-4">
                  {/* Image Container */}
                  <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-white">
                       <img 
                          src={previewImage.url} 
                          alt="Report Preview" 
                          className="w-full h-auto max-h-[70vh] object-contain"
                       />
                       {/* Floating Close Button for Mobile convenience */}
                       <button 
                         onClick={() => setPreviewImage(null)}
                         className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full backdrop-blur-md transition-colors"
                       >
                           <X size={20} />
                       </button>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => setPreviewImage(null)}
                          className="py-3 px-4 rounded-xl border border-white/20 text-white font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                      >
                          <X size={18} /> {language === 'zh' ? '关闭' : 'Close'}
                      </button>
                      <button 
                          onClick={handleDownload}
                          className="py-3 px-4 rounded-xl bg-zte-blue text-white font-bold text-sm shadow-lg hover:bg-zte-dark active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                          <Download size={18} /> {language === 'zh' ? '保存到手机' : 'Save Image'}
                      </button>
                  </div>
                  
                  {/* Hint */}
                  <p className="text-center text-white/50 text-xs">
                      {language === 'zh' 
                        ? '提示：如果点击保存无效，请尝试长按图片保存。' 
                        : 'Tip: If save fails, try long-pressing the image.'}
                  </p>
              </div>
          </div>
      )}

    </div>
    </>
  );
};
