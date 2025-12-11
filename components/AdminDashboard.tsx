import React, { useMemo, useState } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { getPeriodRange, isTaskInPeriod } from '../utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileDown, CalendarRange, CalendarDays, Calendar, Trophy, AlertTriangle, User as UserIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { Logo } from './Logo';

declare const html2canvas: any;
declare const jspdf: any;

export const AdminDashboard: React.FC = () => {
  const { users, tasks, language } = useApp();
  const t = DICTIONARY[language];
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // --- Statistics Logic ---

  // Helper to get stats for any specific period name
  const getStatsForPeriod = (p: 'day' | 'week' | 'month') => {
      const { start, end } = getPeriodRange(p);
      const stats = users.filter(u => u.role !== 'admin').map(u => {
        const userTasks = tasks.filter(task => 
            task.employeeId === u.employeeId && 
            isTaskInPeriod(task, start, end)
        );
        const completed = userTasks.filter(t => t.status === 'completed').length;
        return {
            name: u.name,
            total: userTasks.length,
            completed: completed,
            rate: userTasks.length ? Math.round((completed / userTasks.length) * 100) : 0,
            pending: userTasks.length - completed,
            color: u.color
        };
      });
      
      // Calculate average rate for suggestion
      const activeStats = stats.filter(s => s.total > 0);
      const avgRate = activeStats.length ? activeStats.reduce((acc, curr) => acc + curr.rate, 0) / activeStats.length : 0;
      let suggestion = t.suggestionMid;
      if (avgRate >= 80) suggestion = t.suggestionHigh;
      if (avgRate < 50 && activeStats.length > 0) suggestion = t.suggestionLow;
      if (activeStats.length === 0) suggestion = "No active tasks for this period.";
      
      return { stats, suggestion };
  };

  // Current interactive stats based on state
  const { stats: currentPeriodStats, suggestion: currentSuggestion } = useMemo(() => getStatsForPeriod(period), [users, tasks, period]);

  // Category Distribution (Global)
  const categoryData = useMemo(() => {
      const counts: Record<string, number> = {};
      tasks.forEach(t => {
          const cat = t.category || 'Uncategorized';
          counts[cat] = (counts[cat] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  // Workload Trend
  const trendData = useMemo(() => {
      const data = [];
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const activeCount = tasks.filter(t => t.startDate <= dateStr && t.endDate >= dateStr).length;
          const completedCount = tasks.filter(t => t.endDate === dateStr && t.status === 'completed').length;
          data.push({
              date: dateStr.substring(5), // MM-DD
              active: activeCount,
              completed: completedCount
          });
      }
      return data;
  }, [tasks]);

  const COLORS = ['#0067A5', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const exportPDF = async () => {
    setIsGeneratingPdf(true);
    // Wait for the hidden report view to render
    setTimeout(async () => {
        const element = document.getElementById('pdf-report-container');
        if (!element || !html2canvas || !jspdf) {
            setIsGeneratingPdf(false);
            return;
        }

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`ZTE_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error("PDF Export failed", err);
            alert("Failed to export PDF");
        } finally {
            setIsGeneratingPdf(false);
        }
    }, 800);
  };

  // Helper for Red/Black List (Leaderboard)
  const getLeaderboard = (stats: any[]) => {
    // Filter only those with tasks
    const active = stats.filter(s => s.total > 0);
    // Sort descending by rate
    const sorted = [...active].sort((a, b) => b.rate - a.rate);
    
    // Top 3 (High Rate) -> Red List
    const redList = sorted.slice(0, 3).filter(s => s.rate >= 80);
    
    // Bottom 3 (Low Rate) -> Black List (Only if rate < 100)
    const blackList = sorted.filter(s => s.rate < 80).sort((a, b) => a.rate - b.rate).slice(0, 3);
    
    return { redList, blackList };
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 relative" id="dashboard-content">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t.dashboard}</h2>
          <div className="flex gap-4">
            <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                {(['day', 'week', 'month'] as const).map(p => (
                    <button 
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${period === p ? 'bg-white dark:bg-gray-600 shadow text-zte-blue' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                         {p === 'day' ? <Calendar size={14}/> : p === 'week' ? <CalendarDays size={14}/> : <CalendarRange size={14}/>} {t[p]}
                    </button>
                ))}
            </div>

            <button 
                onClick={exportPDF}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 bg-zte-blue text-white px-4 py-2 rounded shadow hover:bg-zte-dark transition-colors text-sm disabled:opacity-50"
            >
                <FileDown size={18} /> {isGeneratingPdf ? t.generatingPdf : t.exportPdf}
            </button>
          </div>
      </div>

      {/* Main Stats UI (Interactive) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border-l-4 border-zte-blue">
              <h3 className="text-gray-500 text-sm font-semibold">{t.totalTasks}</h3>
              <p className="text-3xl font-bold dark:text-white">{tasks.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border-l-4 border-emerald-500">
              <h3 className="text-gray-500 text-sm font-semibold">{t.completed}</h3>
              <p className="text-3xl font-bold dark:text-white">{tasks.filter(t => t.status === 'completed').length}</p>
          </div>
           <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border-l-4 border-amber-500">
              <h3 className="text-gray-500 text-sm font-semibold">{t.pending}</h3>
              <p className="text-3xl font-bold dark:text-white">{tasks.filter(t => t.status === 'pending').length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
              <h3 className="text-gray-500 text-sm font-semibold">{t.staffCount}</h3>
              <p className="text-3xl font-bold dark:text-white">{users.length - 1}</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold dark:text-white">{t.efficiencyByUser}</h3>
                 <span className="text-xs font-bold text-zte-blue bg-blue-50 px-2 py-1 rounded uppercase">{t[period]}</span>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentPeriodStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="completed" fill="#10B981" name={t.completed} stackId="a"/>
                        <Bar dataKey="total" fill="#0067A5" name={t.totalTasks} />
                    </BarChart>
                </ResponsiveContainer>
              </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-bold mb-4 dark:text-white">{t.categoryDistribution}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                            {categoryData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
              </div>
          </div>
      </div>
      
      {/* Detailed Stats Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">{t.taskAnalysis}</h3>
              <span className="text-xs text-gray-500 uppercase">{t.period}: {t[period]}</span>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                          <th className="px-6 py-3">{t.name}</th>
                          <th className="px-6 py-3">{t.totalTasks}</th>
                          <th className="px-6 py-3">{t.completed}</th>
                          <th className="px-6 py-3">{t.rate}</th>
                          <th className="px-6 py-3">{t.status}</th>
                      </tr>
                  </thead>
                  <tbody>
                      {currentPeriodStats.map((stat) => (
                          <tr key={stat.name} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{stat.name}</td>
                              <td className="px-6 py-4">{stat.total}</td>
                              <td className="px-6 py-4">{stat.completed}</td>
                              <td className="px-6 py-4">
                                  <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700 max-w-[100px]">
                                      <div className="bg-zte-blue h-1.5 rounded-full" style={{ width: `${stat.rate}%` }}></div>
                                  </div>
                              </td>
                              <td className="px-6 py-4">
                                  {stat.rate > 80 ? 
                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">{t.statusExcellent}</span> :
                                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">{stat.rate < 50 ? t.statusLow : t.statusNormal}</span>
                                  }
                              </td>
                          </tr>
                      ))}
                      {currentPeriodStats.length === 0 && (
                          <tr>
                              <td colSpan={5} className="text-center py-4 text-gray-400">{t.noTasks}</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* 
         HIDDEN PDF REPORT CONTAINER 
         This is rendered off-screen but visible to html2canvas.
         Designed for A4 paper size width (approx 800px-1000px).
      */}
      {isGeneratingPdf && (
        <div id="pdf-report-container" className="absolute top-0 left-0 bg-white p-12 w-[1000px] z-[9999] text-gray-800 font-sans" style={{ minHeight: '1400px' }}>
            {/* 1. Header with Logo */}
            <div className="flex justify-between items-end border-b-4 border-zte-blue pb-6 mb-8">
                <div>
                   <div className="h-12 w-32 mb-4">
                       <Logo variant="blue" />
                   </div>
                   <h1 className="text-3xl font-extrabold text-zte-blue uppercase tracking-tight">{t.reportTitle}</h1>
                   <p className="text-gray-500 font-medium mt-1">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-lg font-bold text-gray-800">{t.title}</h2>
                    <p className="text-sm text-gray-500">{t.deptName}</p>
                    <div className="mt-4 bg-zte-blue text-white text-xs px-3 py-1 rounded-full inline-block font-bold uppercase tracking-widest">
                        {t[period]} REPORT
                    </div>
                </div>
            </div>

            {/* 2. Overview Cards */}
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-zte-blue rounded-full"></div>
                {t.reportOverview}
            </h3>
            <div className="grid grid-cols-4 gap-6 mb-10">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <div className="text-gray-500 text-xs font-bold uppercase">{t.totalTasks}</div>
                    <div className="text-3xl font-bold text-zte-blue mt-1">
                        {tasks.filter(t => isTaskInPeriod(t, getPeriodRange(period).start, getPeriodRange(period).end)).length}
                    </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                    <div className="text-gray-500 text-xs font-bold uppercase">{t.completed}</div>
                    <div className="text-3xl font-bold text-emerald-600 mt-1">
                        {tasks.filter(t => t.status === 'completed' && isTaskInPeriod(t, getPeriodRange(period).start, getPeriodRange(period).end)).length}
                    </div>
                </div>
                 <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                    <div className="text-gray-500 text-xs font-bold uppercase">{t.pending}</div>
                    <div className="text-3xl font-bold text-amber-500 mt-1">
                        {tasks.filter(t => t.status === 'pending' && isTaskInPeriod(t, getPeriodRange(period).start, getPeriodRange(period).end)).length}
                    </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <div className="text-gray-500 text-xs font-bold uppercase">{t.staffCount}</div>
                    <div className="text-3xl font-bold text-purple-600 mt-1">{users.length - 1}</div>
                </div>
            </div>

            {/* 3. Red & Black List (Leaderboard) */}
            {(() => {
                const { redList, blackList } = getLeaderboard(currentPeriodStats);
                return (
                    <div className="mb-10">
                        <div className="grid grid-cols-2 gap-8">
                            {/* Red List */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Trophy size={20} className="text-yellow-200" fill="currentColor" />
                                        <h4 className="font-bold text-lg">{t.redList}</h4>
                                    </div>
                                    <div className="bg-white/20 px-2 py-0.5 rounded text-xs">Top Performers</div>
                                </div>
                                <div className="bg-white p-4">
                                    <p className="text-xs text-gray-500 mb-3">{t.redListDesc}</p>
                                    {redList.length > 0 ? (
                                        <div className="space-y-3">
                                            {redList.map((s, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32'}}>
                                                            {idx + 1}
                                                        </div>
                                                        <div className="font-bold text-gray-800">{s.name}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{s.completed}/{s.total}</span>
                                                        <span className="font-bold text-red-600">{s.rate}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-gray-400 text-sm">No data for Honor Roll</div>
                                    )}
                                </div>
                            </div>

                            {/* Black List */}
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gradient-to-r from-gray-700 to-gray-900 px-6 py-4 text-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={20} className="text-yellow-400" />
                                        <h4 className="font-bold text-lg">{t.blackList}</h4>
                                    </div>
                                    <div className="bg-white/20 px-2 py-0.5 rounded text-xs">Focus Required</div>
                                </div>
                                <div className="bg-white p-4">
                                     <p className="text-xs text-gray-500 mb-3">{t.blackListDesc}</p>
                                     {blackList.length > 0 ? (
                                        <div className="space-y-3">
                                            {blackList.map((s, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">
                                                            !
                                                        </div>
                                                        <div className="font-bold text-gray-700">{s.name}</div>
                                                    </div>
                                                     <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{s.completed}/{s.total}</span>
                                                        <span className="font-bold text-gray-600">{s.rate}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 text-emerald-600">
                                            <CheckCircle size={32} className="mb-2 opacity-50" />
                                            <span className="text-sm font-medium">No alerts. Good job!</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 4. Detailed Stats Table */}
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-zte-blue rounded-full"></div>
                {t.efficiencyByUser}
            </h3>
            <table className="w-full text-sm text-left text-gray-600 mb-8 border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                    <tr>
                        <th className="px-6 py-3 border-r">{t.name}</th>
                        <th className="px-6 py-3 border-r text-center">{t.totalTasks}</th>
                        <th className="px-6 py-3 border-r text-center">{t.completed}</th>
                        <th className="px-6 py-3 border-r text-center">{t.pending}</th>
                        <th className="px-6 py-3 border-r text-center">{t.rate}</th>
                        <th className="px-6 py-3 text-center">{t.status}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {currentPeriodStats.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-4 italic text-gray-400">{t.noTasks}</td></tr>
                    ) : (
                        currentPeriodStats.map(s => (
                            <tr key={s.name} className="border-t hover:bg-gray-50">
                                <td className="px-6 py-3 border-r font-medium text-gray-800">{s.name}</td>
                                <td className="px-6 py-3 border-r text-center">{s.total}</td>
                                <td className="px-6 py-3 border-r text-center text-emerald-600 font-bold">{s.completed}</td>
                                <td className="px-6 py-3 border-r text-center text-amber-500">{s.pending}</td>
                                <td className="px-6 py-3 border-r text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-20 bg-gray-200 rounded-full h-2"><div className="bg-zte-blue h-2 rounded-full" style={{width: `${s.rate}%`}}></div></div>
                                        <span className="font-bold">{s.rate}%</span>
                                    </div>
                                </td>
                                <td className="px-6 py-3 text-center">
                                    {s.rate >= 80 ? 
                                        <span className="text-green-700 font-bold text-xs bg-green-100 px-2 py-1 rounded border border-green-200">{t.statusExcellent}</span> : 
                                        <span className={`text-xs px-2 py-1 rounded font-bold border ${s.rate < 50 ? 'text-red-700 bg-red-100 border-red-200' : 'text-amber-700 bg-amber-100 border-amber-200'}`}>
                                            {s.rate < 50 ? t.statusLow : t.statusNormal}
                                        </span>
                                    }
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
            </table>

            {/* 5. Conclusion */}
            <div className="bg-blue-50 border-l-4 border-zte-blue p-6 rounded-r-lg shadow-sm">
                <h4 className="font-bold text-lg text-zte-blue mb-2 flex items-center gap-2">
                    <AlertCircle size={20} /> {t.suggestion}
                </h4>
                <p className="text-gray-700 leading-relaxed">
                    {currentPeriodStats.length > 0 ? currentSuggestion : "No data available for analysis."}
                </p>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-300 text-center text-xs text-gray-400">
                <p>System Generated Report &bull; ZTE Schedule Management System &bull; Confidential</p>
            </div>
        </div>
      )}
    </div>
  );
};