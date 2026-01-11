
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { parseCSV, toLocalDateString } from '../utils';
import { X, Upload, FileSpreadsheet, Loader2, CalendarCheck, Lock, Trash2, CheckSquare, Search, CheckCircle, Smartphone } from 'lucide-react';
import { User, Task } from '../types';
import { supabase, uploadAndGetDownloadUrl } from '../supabaseClient';
import { CalendarService } from '../utils/CalendarService';

// Declare XLSX globally
declare const XLSX: any;

interface ImportModalProps {
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose }) => {
  const { language, importTasks, users, addUsers, tasks, user, deleteTasks } = useApp();
  const t = DICTIONARY[language];
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'batch'>('import');
  
  // Import State
  const [importText, setImportText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch Manage State
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = user?.role === 'admin';
  const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 1024 || CalendarService.isAvailable());

  useEffect(() => {
    // If mobile, force to export tab (where sync is), otherwise follow admin rule
    if (isMobile) {
        setActiveTab('export');
    } else if (!isAdmin) {
        setActiveTab('export');
    }
  }, [isAdmin, isMobile]);

  // Permission check for batch actions
  const canDeleteTask = (task: Task) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (task.createdBy) {
        return task.createdBy === user.employeeId;
    }
    return true; 
  };

  // --- Batch Logic ---
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
        const u = users.find(u => u.employeeId === task.employeeId);
        const searchStr = (task.title + task.category + (u?.name || '')).toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });
  }, [tasks, users, searchTerm]);

  const handleSelectAll = () => {
    // Only select tasks that the current user has permission to delete
    const deletableTasks = filteredTasks.filter(canDeleteTask);
    
    // If all deletable tasks are already selected, clear selection. Otherwise select all deletable.
    // Check if every deletable task ID is in the set
    const allSelected = deletableTasks.length > 0 && deletableTasks.every(t => selectedTaskIds.has(String(t.id)));

    if (allSelected) {
        setSelectedTaskIds(new Set());
    } else {
        setSelectedTaskIds(new Set(deletableTasks.map(t => String(t.id))));
    }
  };

  const toggleSelection = (id: string) => {
    const idStr = String(id);
    const newSet = new Set(selectedTaskIds);
    if (newSet.has(idStr)) newSet.delete(idStr);
    else newSet.add(idStr);
    setSelectedTaskIds(newSet);
  };

  const handleBatchDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    if (confirm(`${t.confirmBatchDelete} (${selectedTaskIds.size})`)) {
        await deleteTasks(Array.from(selectedTaskIds));
        setSelectedTaskIds(new Set());
    }
  };

  // --- Import/Export Logic ---
  const handleImport = async () => {
    if (!importText) return;
    setIsProcessing(true);
    try {
        const parsedResults = parseCSV(importText);
        if (parsedResults.length === 0) {
            alert("No valid tasks found to import.");
            setIsProcessing(false);
            return;
        }

        const newTasks = parsedResults.map((r, idx) => ({
            ...r.task,
            id: `imported-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
            status: 'pending' as const,
            createdBy: user?.employeeId // Set creator to current user (e.g. Admin)
        })) as Task[];

        const newUsers: User[] = [];
        const processedIds = new Set<string>();

        parsedResults.forEach(r => {
            const empId = r.task.employeeId;
            const empName = r.employeeName;
            if (empId && !processedIds.has(empId)) {
                processedIds.add(empId);
                // Check against existing global users list
                const exists = users.find(u => u.employeeId === empId);
                if (!exists) {
                    newUsers.push({
                        id: `auto-${Date.now()}-${empId}`,
                        employeeId: empId,
                        name: empName || `User ${empId}`,
                        role: 'user',
                        password: '', 
                        color: '#' + Math.floor(Math.random()*16777215).toString(16)
                    });
                }
            }
        });

        // Step 1: Create Users first (Critical for Foreign Key constraint)
        if (newUsers.length > 0) {
            try {
                await addUsers(newUsers);
            } catch (userError: any) {
                console.warn("User creation issue:", userError);
                // Continue even if user creation fails (might already exist)
            }
        }
        
        // Step 2: Create Tasks
        await importTasks(newTasks);
        
        let message = `${newTasks.length} ${t.importSuccess}`;
        if (newUsers.length > 0) {
            message += `\n${newUsers.length} ${t.usersCreated}`;
        }
        alert(message);
        onClose();

    } catch (e: any) {
        console.error("Import Error Full:", e);
        // Improved error messaging
        let errorMsg = e.message || "Unknown database error";
        if (typeof e === 'object' && e !== null && 'details' in e) {
             errorMsg += `\nDetails: ${e.details}`;
        }
        if (errorMsg.includes('Column') || errorMsg.includes('relation')) {
             errorMsg = `Database Schema Mismatch:\n${errorMsg}\n\nPlease run the SQL script in Supabase to fix table columns.`;
        }
        alert(`Import Failed:\n${errorMsg}`);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => setImportText(e.target?.result as string);
        reader.readAsText(file);
    } else if (file.name.match(/\.xls.?$/)) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            setImportText(XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]));
        };
        reader.readAsArrayBuffer(file);
    }
  };

  // --- Helper: Upload Blob to Supabase & Redirect to Signed URL ---
  const uploadAndRedirect = async (blob: Blob, filename: string) => {
      setIsProcessing(true);
      try {
          // Use centralized helper that handles auto-creation
          const downloadUrl = await uploadAndGetDownloadUrl('exports', filename, blob);
          window.location.href = downloadUrl;
      } catch (e: any) {
          console.error("Export upload failed:", e);
          alert(`Export failed: ${e.message}`);
      } finally {
          setIsProcessing(false);
      }
  };

  // --- Export Functions ---
  const handleExportExcel = () => {
    if (!tasks.length) {
        alert("No tasks to export");
        return;
    }

    try {
        const exportData = tasks.map(t => {
            const u = users.find(user => user.employeeId === t.employeeId);
            // Updated Export Order: EmployeeID, Name, Title, Category, Description, StartDate, EndDate
            return {
                EmployeeID: t.employeeId,
                Name: u ? u.name : 'Unknown',
                Title: t.title,
                Category: t.category,
                Description: t.description || '',
                StartDate: t.startDate,
                EndDate: t.endDate,
                Status: t.status
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
        
        // Use write with type 'array' to get an ArrayBuffer
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        // Create actual Blob
        const blob = new Blob([wbout], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        
        const filename = `ZTE_Schedule_Export_${toLocalDateString(new Date())}_${Date.now()}.xlsx`;
        
        // Upload and download via URL
        uploadAndRedirect(blob, filename);

    } catch (e) {
        console.error("Export failed", e);
        alert("Export failed");
    }
  };

  const handleExportICS = () => {
    if (!tasks.length) {
        alert("No tasks to export");
        return;
    }

    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ZTE//Schedule//EN\n";
    
    tasks.forEach(t => {
        const start = t.startDate.replace(/-/g, '');
        const end = t.endDate.replace(/-/g, '');
        const u = users.find(user => user.employeeId === t.employeeId);

        icsContent += "BEGIN:VEVENT\n";
        icsContent += `UID:${t.id}@zte-schedule\n`;
        icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\n`;
        icsContent += `DTSTART;VALUE=DATE:${start}\n`;
        icsContent += `DTEND;VALUE=DATE:${end}\n`; 
        icsContent += `SUMMARY:${t.title} (${u?.name || t.employeeId})\n`;
        icsContent += `DESCRIPTION:${t.description || ''} - Category: ${t.category}\n`;
        icsContent += "END:VEVENT\n";
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const filename = `ZTE_Schedule_${toLocalDateString(new Date())}_${Date.now()}.ics`;
    
    uploadAndRedirect(blob, filename);
  };

  const handleSyncToMobileCalendar = async () => {
      if (!CalendarService.isAvailable()) {
          alert(language === 'zh' ? '日历插件不可用，请在移动设备上使用。' : 'Calendar plugin not available. Please use on mobile device.');
          return;
      }
      
      const hasPermission = await CalendarService.hasReadWritePermission();
      if (!hasPermission) {
          const granted = await CalendarService.requestReadWritePermission();
          if (!granted) {
              alert(language === 'zh' ? '需要日历权限才能同步。' : 'Calendar permission required to sync.');
              return;
          }
      }

      const myTasks = isAdmin ? tasks : tasks.filter(t => t.employeeId === user?.employeeId);
      if (myTasks.length === 0) {
          alert(language === 'zh' ? '暂无任务可同步。' : 'No tasks to sync.');
          return;
      }

      if (!confirm(language === 'zh' ? `即将同步 ${myTasks.length} 条任务到手机日历，是否继续？` : `Syncing ${myTasks.length} tasks to phone calendar. Continue?`)) {
          return;
      }

      setIsProcessing(true);
      let successCount = 0;
      
      try {
          for (const t of myTasks) {
              try {
                  const u = users.find(user => user.employeeId === t.employeeId);
                  const title = `[ZTE] ${t.title}`;
                  const notes = `${t.description || ''}\nCategory: ${t.category}\nAssignee: ${u?.name}`;
                  // Sync silently
                  await CalendarService.createEvent(title, "", notes, t.startDate, t.endDate, false);
                  successCount++;
              } catch (err) {
                  console.error("Failed to sync task", t.id, err);
              }
          }
          alert(language === 'zh' ? `成功同步 ${successCount} 条任务到日历。` : `Successfully synced ${successCount} tasks to calendar.`);
      } catch (e) {
          alert(language === 'zh' ? '同步过程中发生错误。' : 'Error occurred during sync.');
      } finally {
          setIsProcessing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 md:p-4">
      <div className="bg-white dark:bg-gray-800 md:rounded-lg shadow-xl w-full max-w-4xl flex flex-col h-full md:max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] md:p-4 border-b dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
          <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold dark:text-white">
                  {isMobile ? (language === 'zh' ? '同步日历' : 'Sync Calendar') : t.dataManagement}
              </h2>
              {/* Desktop Tabs - Hidden on Mobile */}
              <div className="hidden md:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  {isAdmin && (
                    <>
                        <button onClick={() => setActiveTab('import')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'import' ? 'bg-white dark:bg-gray-600 shadow text-zte-blue' : 'text-gray-500'}`}>{t.importBtn}</button>
                        <button onClick={() => setActiveTab('batch')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'batch' ? 'bg-white dark:bg-gray-600 shadow text-zte-blue' : 'text-gray-500'}`}>{t.batchManage}</button>
                    </>
                  )}
                  <button onClick={() => setActiveTab('export')} className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${activeTab === 'export' ? 'bg-white dark:bg-gray-600 shadow text-zte-blue' : 'text-gray-500'}`}>{t.exportData}</button>
              </div>
          </div>
          <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-gray-800" /></button>
        </div>
        
        {/* Mobile Segmented Control - REMOVED for mobile to enforce "Sync Only" feel, kept code for structure if needed but hiding it via logic above */}
        {/* Note: Logic effectively hides import/batch tabs by forcing activeTab='export' and hiding the switcher below. */}
        <div className="md:hidden hidden flex border-b dark:border-gray-700 p-2 gap-2 bg-gray-50 dark:bg-gray-900 overflow-x-auto">
            {/* Intentionally hidden to prevent switching */}
        </div>

        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          {activeTab === 'import' && !isMobile && (
              <div className="space-y-4 max-w-lg mx-auto">
                  <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm border border-blue-100 flex flex-col gap-2">
                      <p className="font-bold flex items-center gap-2"><CheckCircle size={16}/> {t.instruction}</p>
                      <p className="opacity-80 leading-relaxed">{t.uploadInstruction}</p>
                  </div>
                  
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-zte-blue/30 bg-blue-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50/50 transition-colors active:scale-[0.98]">
                      <input type="file" ref={fileInputRef} className="hidden" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} />
                      {fileName ? (
                          <div className="text-center animate-in fade-in zoom-in">
                              <FileSpreadsheet size={48} className="mx-auto mb-3 text-zte-blue"/>
                              <p className="font-bold text-zte-blue">{fileName}</p>
                          </div>
                      ) : (
                          <div className="text-center">
                              <div className="w-16 h-16 bg-blue-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 text-zte-blue">
                                  <Upload size={32} />
                              </div>
                              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{t.clickToUpload}</p>
                              <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, .csv</p>
                          </div>
                      )}
                  </div>
                  
                  {/* Text Import Area */}
                  <div className="hidden md:block">
                     <textarea className="w-full h-32 border rounded-lg p-3 text-sm font-mono dark:bg-gray-900 focus:ring-2 focus:ring-zte-blue outline-none" placeholder={t.pasteCsvPlaceholder} value={importText} onChange={e => setImportText(e.target.value)} />
                  </div>

                  <button onClick={handleImport} disabled={!importText || isProcessing} className="w-full bg-zte-blue text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none">
                      {isProcessing ? <Loader2 className="animate-spin mx-auto"/> : t.importBtn}
                  </button>
              </div>
          )}

          {activeTab === 'export' && (
              <div className="flex flex-col items-center justify-start pt-12 md:pt-0 md:justify-center h-full gap-6">
                   <div className="text-center">
                       <h3 className="text-lg font-bold dark:text-white mb-2">{isMobile ? (language === 'zh' ? '同步任务' : 'Sync Tasks') : t.exportData}</h3>
                       <p className="text-gray-500 text-sm max-w-xs mx-auto">{isMobile ? (language === 'zh' ? '将当前任务列表同步至您的手机日历' : 'Sync current tasks to your phone calendar') : t.exportDesc}</p>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
                        {/* Desktop Only: Excel Export */}
                        {!isMobile && (
                            <button 
                                onClick={handleExportExcel}
                                disabled={isProcessing}
                                className="flex items-center gap-4 p-4 border border-green-200 bg-green-50 rounded-2xl transition-all active:scale-95 hover:shadow-md disabled:opacity-50"
                            >
                                <div className="bg-white p-3 rounded-full shadow-sm text-green-600">
                                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <FileSpreadsheet size={24} />}
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-green-900">{t.exportExcel}</span>
                                    <span className="block text-xs text-green-700 opacity-80">{t.excelDesc}</span>
                                </div>
                            </button>
                        )}

                        {/* Desktop Only: ICS Export */}
                        {!isMobile && (
                            <button 
                                onClick={handleExportICS}
                                disabled={isProcessing}
                                className="flex items-center gap-4 p-4 border border-blue-200 bg-blue-50 rounded-2xl transition-all active:scale-95 hover:shadow-md disabled:opacity-50"
                            >
                                <div className="bg-white p-3 rounded-full shadow-sm text-blue-600">
                                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <CalendarCheck size={24} />}
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-blue-900">{t.exportIcs}</span>
                                    <span className="block text-xs text-blue-700 opacity-80">{t.icsDesc}</span>
                                </div>
                            </button>
                        )}

                        {/* Mobile Sync Button - Only shows on Mobile or if Plugin detected */}
                        {isMobile && (
                            <button 
                                onClick={handleSyncToMobileCalendar}
                                disabled={isProcessing}
                                className="flex items-center gap-4 p-4 border border-purple-200 bg-purple-50 rounded-2xl transition-all active:scale-95 hover:shadow-md disabled:opacity-50"
                            >
                                <div className="bg-white p-3 rounded-full shadow-sm text-purple-600">
                                    {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <Smartphone size={24} />}
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-purple-900">{language === 'zh' ? '同步到手机日历' : 'Sync to Phone Calendar'}</span>
                                    <span className="block text-xs text-purple-700 opacity-80">{language === 'zh' ? '将任务写入系统日历' : 'Add tasks to system calendar'}</span>
                                </div>
                            </button>
                        )}
                   </div>
                   {!isAdmin && !isMobile && (
                        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                             <Lock size={12} /> {t.importRestricted}
                        </div>
                   )}
              </div>
          )}

          {activeTab === 'batch' && !isMobile && (
              <div className="flex flex-col h-full">
                   <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                       <div className="relative w-full sm:w-64">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                           <input className="border rounded-full pl-9 pr-4 py-2 text-sm w-full dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-zte-blue" placeholder={t.searchTasks} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                       </div>
                       <button onClick={handleBatchDelete} disabled={selectedTaskIds.size === 0} className="w-full sm:w-auto bg-red-500 text-white px-4 py-2 rounded-full text-sm disabled:opacity-50 flex items-center justify-center gap-2 font-bold shadow-md shadow-red-500/20 active:scale-95 transition-all"><Trash2 size={16}/> {t.deleteSelected} ({selectedTaskIds.size})</button>
                   </div>
                   
                   <div className="flex-1 overflow-auto border rounded-xl dark:border-gray-700 bg-white dark:bg-gray-800">
                       {/* Desktop Table */}
                       <table className="hidden md:table w-full text-sm text-left text-gray-500 dark:text-gray-400">
                           <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0 text-xs uppercase z-10">
                               <tr>
                                   <th className="p-3 w-10"><button onClick={handleSelectAll}><CheckSquare size={16}/></button></th>
                                   <th className="p-3">{t.name}</th>
                                   <th className="p-3">{t.taskTitle}</th>
                                   <th className="p-3">{t.category}</th>
                                   <th className="p-3">{t.status}</th>
                               </tr>
                           </thead>
                           <tbody>
                               {filteredTasks.length > 0 ? filteredTasks.map(task => {
                                   const isSelected = selectedTaskIds.has(String(task.id));
                                   const u = users.find(u => u.employeeId === task.employeeId);
                                   const isDeletable = canDeleteTask(task);
                                   return (
                                       <tr key={task.id} onClick={() => isDeletable && toggleSelection(String(task.id))} className={`border-b dark:border-gray-700 ${isDeletable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'bg-gray-50/50 cursor-not-allowed opacity-60'} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
                                           <td className="p-3"><div className={`w-4 h-4 border rounded ${isSelected ? 'bg-zte-blue border-zte-blue' : 'border-gray-400'} ${!isDeletable ? 'border-gray-200 bg-gray-100' : ''}`}/></td>
                                           <td className="p-3 font-medium text-gray-900 dark:text-white">{u?.name}</td>
                                           <td className="p-3 truncate max-w-[150px]">{task.title}</td>
                                           <td className="p-3">{task.category}</td>
                                           <td className="p-3">
                                               <span className={`px-2 py-0.5 rounded text-xs ${task.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                                                   {task.status}
                                               </span>
                                           </td>
                                       </tr>
                                   )
                               }) : (
                                   <tr>
                                       <td colSpan={5} className="text-center py-8 text-gray-400">No tasks found.</td>
                                   </tr>
                               )}
                           </tbody>
                       </table>
                   </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
