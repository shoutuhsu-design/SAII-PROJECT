
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { generateCalendarGrid, toLocalDateString, getDaysInMonth, generateColor } from '../utils';
import { ChevronLeft, ChevronRight, Plus, X, Check, Trash2, Edit2, Calendar as CalendarIcon, Filter, AlertCircle, ChevronDown, Search, GripHorizontal, BellRing, MessageSquare, Send, User, Smartphone, Clock } from 'lucide-react';
import { DICTIONARY } from '../constants';
import { Task } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarService } from '../utils/CalendarService';

// --- Internal Component: Generic Wheel Picker (For Mobile Filters Only) ---
const GenericWheelPicker: React.FC<{ 
    options: { label: string; value: string }[]; 
    value: string; 
    onChange: (val: string) => void; 
    onClose: () => void; 
    title: string 
}> = ({ options, value, onChange, onClose, title }) => {
    
    const [localValue, setLocalValue] = useState(value);
    const scrollTimeout = useRef<any>(null);

    useEffect(() => {
        const idx = options.findIndex(o => o.value === value);
        if (idx !== -1) {
            setTimeout(() => {
                const el = document.getElementById(`opt-container`);
                if(el) el.scrollTop = idx * 40;
            }, 10);
        }
    }, []);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.target as HTMLDivElement;
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        
        scrollTimeout.current = setTimeout(() => {
            const index = Math.round(target.scrollTop / 40);
            if (options[index] && options[index].value !== localValue) {
                setLocalValue(options[index].value);
                onChange(options[index].value); 
            }
        }, 100);
    };

    return (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end animate-in slide-in-from-bottom duration-300">
            <div className="bg-white dark:bg-gray-800 w-full rounded-t-2xl p-4 pb-8 shadow-2xl">
                 <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <button onClick={onClose} className="text-gray-500 font-medium text-sm">Cancel</button>
                    <span className="font-bold text-gray-800 dark:text-white">{title}</span>
                    <button onClick={onClose} className="text-zte-blue font-bold text-sm">Done</button>
                </div>
                <div className="relative h-48 overflow-hidden">
                     <div className="absolute top-1/2 -translate-y-1/2 w-full h-10 bg-gray-100/50 dark:bg-gray-700/50 border-y border-zte-blue/20 pointer-events-none rounded-lg" />
                     <div 
                        id="opt-container"
                        className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar py-20"
                        onScroll={handleScroll}
                     >
                         {options.map((opt, i) => (
                             <div 
                                key={opt.value}
                                onClick={() => {
                                    setLocalValue(opt.value);
                                    onChange(opt.value);
                                    const el = document.getElementById(`opt-container`);
                                    if(el) el.scrollTop = i * 40;
                                }}
                                className={`h-10 flex items-center justify-center snap-center text-sm transition-all cursor-pointer truncate px-4 ${opt.value === localValue ? 'font-bold text-zte-blue text-lg' : 'text-gray-400'}`}
                             >
                                 {opt.label}
                             </div>
                         ))}
                     </div>
                </div>
            </div>
        </div>
    );
};

// --- Custom Mobile Date Picker Sheet ---
const MobileDatePickerSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    value: string;
    onChange: (date: string) => void;
    title: string;
}> = ({ isOpen, onClose, value, onChange, title }) => {
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    
    // Reset view when opening
    useEffect(() => {
        if (isOpen && value) setViewDate(new Date(value));
    }, [isOpen, value]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = useMemo(() => generateCalendarGrid(year, month), [year, month]);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl p-4 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">{title}</span>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500"><X size={18} /></button>
                </div>
                
                {/* Month Nav */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <button onClick={() => setViewDate(new Date(year, month - 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><ChevronLeft size={20}/></button>
                    <span className="font-bold text-gray-800 dark:text-white text-lg">{months[month]} {year}</span>
                    <button onClick={() => setViewDate(new Date(year, month + 1))} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"><ChevronRight size={20}/></button>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 mb-2">
                    {['S','M','T','W','T','F','S'].map((d, i) => (
                        <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 overflow-y-auto max-h-[300px]">
                    {days.map((d, i) => {
                        if (!d) return <div key={i} />;
                        const dStr = toLocalDateString(d);
                        const isSelected = dStr === value;
                        const isToday = dStr === toLocalDateString(new Date());
                        return (
                            <button 
                                key={i}
                                onClick={() => { onChange(dStr); onClose(); }}
                                className={`
                                    h-10 w-full rounded-xl flex items-center justify-center text-sm font-medium transition-all active:scale-95
                                    ${isSelected ? 'bg-zte-blue text-white shadow-md' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}
                                    ${isToday && !isSelected ? 'text-zte-blue font-bold bg-blue-50 dark:bg-blue-900/20' : ''}
                                `}
                            >
                                {d.getDate()}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Custom Mobile User Picker Sheet ---
const MobileUserPickerSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    users: any[];
    value: string;
    onChange: (id: string) => void;
}> = ({ isOpen, onClose, users, value, onChange }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl p-4 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[70vh]">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                    <span className="text-lg font-bold text-gray-800 dark:text-white">Select User</span>
                    <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500"><X size={18} /></button>
                </div>
                <div className="overflow-y-auto space-y-2">
                    {users.map(u => {
                        const isSelected = u.employeeId === value;
                        return (
                            <button
                                key={u.id}
                                onClick={() => { onChange(u.employeeId); onClose(); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all active:scale-95 border ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-zte-blue' : 'bg-gray-50 dark:bg-gray-700/50 border-transparent'}`}
                            >
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" style={{backgroundColor: u.color}}>
                                    {u.name.charAt(0)}
                                </div>
                                <div className="flex-1 text-left">
                                    <div className={`font-bold ${isSelected ? 'text-zte-blue' : 'text-gray-800 dark:text-white'}`}>{u.name}</div>
                                    <div className="text-xs text-gray-500">{u.employeeId}</div>
                                </div>
                                {isSelected && <Check size={20} className="text-zte-blue" />}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Internal Component: iOS Action Sheet for Deletion ---
const IOSDeleteSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => void;
    title?: string;
    description?: string;
}> = ({ isOpen, onClose, onDelete, title, description }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            
            {/* Sheet Content */}
            <div className="relative w-full max-w-md mx-4 mb-6 z-10 flex flex-col gap-2 animate-in slide-in-from-bottom-4 duration-300">
                 <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-xl overflow-hidden shadow-lg">
                      <div className="p-4 text-center border-b border-gray-200/50 dark:border-gray-700/50">
                          <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{title || 'Delete Task?'}</h3>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{description || 'This action cannot be undone.'}</p>
                      </div>
                      <button 
                        onClick={() => { onDelete(); onClose(); }}
                        className="w-full py-3.5 text-red-600 dark:text-red-500 font-bold text-lg active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                      >
                          Delete
                      </button>
                 </div>
                 
                 <button 
                    onClick={onClose}
                    className="w-full py-3.5 bg-white dark:bg-gray-800 rounded-xl font-bold text-blue-600 dark:text-blue-400 text-lg shadow-lg active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
                 >
                     Cancel
                 </button>
            </div>
        </div>
    );
};


export const Calendar: React.FC = () => {
  const { 
    user, users, tasks, comments, language, 
    addTask, updateTask, deleteTask, addComment, updateComment, deleteComment, triggerNativeNotify, sendRemoteReminder,
    filterUserId, setFilterUserId,
    filterCategory, setFilterCategory,
    filterStatus, setFilterStatus 
  } = useApp();
  
  const t = DICTIONARY[language];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});
  
  // viewMode: 'month' (default) or 'week' (collapsed)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const userSelectRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  // Track the ID of the task currently being dragged
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [remindFeedback, setRemindFeedback] = useState(false);

  // Mobile Filter Picker State
  const [mobileFilterType, setMobileFilterType] = useState<'user' | 'category' | 'status' | null>(null);
  
  // Mobile Form Picker State
  const [mobilePickerType, setMobilePickerType] = useState<'start' | 'end' | 'user' | null>(null);

  // iOS Delete Sheet State
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const calendarDays = useMemo(() => generateCalendarGrid(year, month), [year, month]);
  
  const isAdmin = useMemo(() => user?.role?.toLowerCase() === 'admin', [user]);

  // Check if calendar sync is possible
  const isMobileCalendar = typeof window !== 'undefined' && (window.innerWidth <= 1024 || CalendarService.isAvailable());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSelectRef.current && !userSelectRef.current.contains(event.target as Node)) {
        setIsUserSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [tasks]);

  const taskComments = useMemo(() => {
      if (!selectedTask) return [];
      return comments.filter(c => c.taskId === selectedTask.id).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments, selectedTask]);

  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      if (isAdmin) {
        if (filterUserId !== 'all' && task.employeeId !== filterUserId) return false;
      } else {
        if (task.employeeId !== user?.employeeId) return false;
      }
      if (filterCategory !== 'all' && task.category !== filterCategory) return false;
      if (filterStatus !== 'all') {
          if (filterStatus === 'completed' && task.status !== 'completed') return false;
          if (filterStatus === 'pending' && task.status !== 'pending') return false;
          if (filterStatus === 'overdue') {
              const today = toLocalDateString(new Date());
              return task.endDate < today && task.status !== 'completed';
          }
      }
      return true;
    });
  }, [tasks, user, filterUserId, filterCategory, filterStatus, isAdmin]);

  const canDeleteTask = (task: Task) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (task.createdBy) {
        return task.createdBy === user.employeeId;
    }
    return true; 
  };

  // Filter Options for Mobile Wheel Picker
  const userOptions = useMemo(() => [
      { label: t.allUsers, value: 'all' },
      ...users.map(u => ({ label: u.name, value: u.employeeId }))
  ], [users, t]);

  const categoryOptions = useMemo(() => [
      { label: t.all, value: 'all' },
      ...categories.map(c => ({ label: c, value: c }))
  ], [categories, t]);

  const statusOptions = useMemo(() => [
      { label: t.all, value: 'all' },
      { label: t.pending, value: 'pending' },
      { label: t.completed, value: 'completed' },
      { label: t.overdue, value: 'overdue' }
  ], [t]);

  const getTasksForDay = (date: Date) => {
    const dateStr = toLocalDateString(date);
    return visibleTasks.filter(t => t.startDate <= dateStr && t.endDate >= dateStr);
  };

  const getTaskStyle = (task: Task) => {
      const today = toLocalDateString(new Date());
      const isOverdue = task.endDate < today && task.status !== 'completed';
      let styleClass = "border-l-[3px] shadow-sm ";
      let bgColor = task.status === 'completed' ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200" : (isOverdue ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200");
      let borderColor = task.status === 'completed' ? "border-green-500" : (isOverdue ? "border-red-500" : "border-zte-blue"); 
      
      // Mobile Label Color - Text friendly
      let mobileColor = task.status === 'completed' ? "bg-green-500 text-white" : (isOverdue ? "bg-red-500 text-white" : "bg-zte-blue text-white");

      return { className: `${styleClass} ${bgColor} ${borderColor}`, isOverdue, mobileColor };
  };

  const getUserColor = (empId: string) => users.find(u => u.employeeId === empId)?.color || '#9ca3af';

  // --- Date Grid Logic (Slicing for Week View) ---
  const displayedDays = useMemo(() => {
    if (viewMode === 'month') return calendarDays;
    
    // Find the row containing the selected date (or today)
    const pivotDate = selectedDate || new Date();
    const pivotDateStr = toLocalDateString(pivotDate);

    // Find index of the pivot date in the full calendar grid
    let targetIdx = calendarDays.findIndex(d => d && toLocalDateString(d) === pivotDateStr);
    
    // Fallback: If selected date is not in current month view, try to find today
    if (targetIdx === -1) {
        const todayStr = toLocalDateString(new Date());
        targetIdx = calendarDays.findIndex(d => d && toLocalDateString(d) === todayStr);
    }
    // Final Fallback: First valid day
    if (targetIdx === -1) targetIdx = calendarDays.findIndex(d => d !== null);
    if (targetIdx === -1) targetIdx = 0; // Should not happen

    const startOfWeekIdx = Math.floor(targetIdx / 7) * 7;
    return calendarDays.slice(startOfWeekIdx, startOfWeekIdx + 7);
  }, [calendarDays, viewMode, selectedDate]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedTask(null);
    setIsEditing(false);
    setActiveTab('details');
  };

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent triggering day click
    setSelectedTask(task);
    setSelectedDate(null);
    setIsEditing(false);
    setActiveTab('details');
  };

  const toggleComplete = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    const updatedTask: Task = { ...task, status: newStatus as Task['status'] };
    setSelectedTask(updatedTask);
    updateTask(updatedTask);
  };

  const handleSaveTask = () => {
    if (!editForm.title || !user) return;
    const assignedTo = editForm.employeeId || (filterUserId !== 'all' ? filterUserId : user.employeeId);
    if (selectedTask) {
        updateTask({ ...selectedTask, ...editForm, employeeId: assignedTo } as Task);
    } else {
        const dateStr = selectedDate ? toLocalDateString(selectedDate) : toLocalDateString(new Date());
        addTask({
            id: Date.now().toString(),
            employeeId: assignedTo,
            category: editForm.category || 'General',
            title: editForm.title!,
            description: editForm.description || '',
            startDate: editForm.startDate || dateStr,
            endDate: editForm.endDate || dateStr,
            status: 'pending'
            // createdBy will be set by context to user.employeeId by default
        });
    }
    setIsEditing(false);
    setSelectedTask(null);
  };

  const confirmDeleteTask = async () => {
      if (pendingDeleteId) {
          await deleteTask(pendingDeleteId);
          setSelectedTask(null);
          setPendingDeleteId(null);
      }
  };

  const initiateDelete = (taskId: string) => {
      setPendingDeleteId(taskId);
      // If mobile, show custom sheet. If desktop, use native confirm
      if (window.innerWidth <= 768) {
          setShowDeleteSheet(true);
      } else {
          if (confirm(t.confirmDelete)) {
              deleteTask(taskId);
              setSelectedTask(null);
          }
      }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !selectedTask || !user) return;
    try {
      if (editingCommentId) {
        await updateComment({ id: editingCommentId, taskId: selectedTask.id, employeeId: user.employeeId, content: newComment, createdAt: new Date().toISOString() });
        setEditingCommentId(null);
      } else {
        await addComment({ id: Date.now().toString(), taskId: selectedTask.id, employeeId: user.employeeId, content: newComment, createdAt: new Date().toISOString() });
      }
      setNewComment('');
    } catch (err) { console.error(err); }
  };

  const handleRemindClick = async () => {
      if (!selectedTask || remindFeedback) return;
      try {
          setRemindFeedback(true);
          await sendRemoteReminder(selectedTask);
          triggerNativeNotify(selectedTask, "【提醒已发出】");
          setTimeout(() => setRemindFeedback(false), 2000);
      } catch (err) { setRemindFeedback(false); }
  };

  const handleSyncSingleTask = async (task: Task) => {
      if (!CalendarService.isAvailable()) {
          alert("Native Calendar not available");
          return;
      }
      const hasPermission = await CalendarService.hasReadWritePermission();
      if (!hasPermission) {
          const granted = await CalendarService.requestReadWritePermission();
          if (!granted) return;
      }

      const u = users.find(user => user.employeeId === task.employeeId);
      const title = `[ZTE] ${task.title}`;
      const notes = `${task.description || ''}\nCategory: ${task.category}\nAssignee: ${u?.name}`;
      
      try {
          // Interactively for single task
          await CalendarService.createEvent(title, "", notes, task.startDate, task.endDate, true);
      } catch (e) {
          console.error(e);
      }
  };

  // --- Touch-Compatible Drag & Drop Logic ---
  const handleDragStart = (task: Task) => {
    setIsDragging(true);
    setDraggingTaskId(task.id);
  };

  const handleDragEnd = async (event: any, info: any, task: Task) => {
    // 1. Check for Drop on Trash Zone
    let isDeleted = false;
    const trashEl = document.getElementById('trash-zone');
    if (trashEl) {
        const rect = trashEl.getBoundingClientRect();
        const dropX = info.point.x;
        const dropY = info.point.y;
        
        if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
             initiateDelete(task.id);
             isDeleted = true;
        }
    }

    // 2. Check for Drop on a Calendar Date Cell (only if not deleted)
    if (!isDeleted) {
        const elements = document.elementsFromPoint(info.point.x, info.point.y);
        const dateElement = elements.find(el => el.hasAttribute('data-date'));
        
        if (dateElement) {
            const dateStr = dateElement.getAttribute('data-date');
            if (dateStr) {
                // Calculate new end date to preserve duration
                const start = new Date(task.startDate);
                const end = new Date(task.endDate);
                const duration = end.getTime() - start.getTime();
                
                const newStart = new Date(dateStr);
                const newEnd = new Date(newStart.getTime() + duration);

                updateTask({
                    ...task,
                    startDate: toLocalDateString(newStart),
                    endDate: toLocalDateString(newEnd)
                });
            }
        }
    }

    setIsDragging(false);
    setDraggingTaskId(null);
  };

  const filteredUsersForSelect = users.filter(u => u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || u.employeeId.includes(userSearchQuery));
  const selectedUserObj = users.find(u => u.employeeId === editForm.employeeId);

  // Helper to check if we are on Desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
  
  // Define max visible tasks per day
  const maxVisibleTasks = viewMode === 'week' ? 6 : 2;

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 overflow-y-auto lg:overflow-hidden relative no-scrollbar">
      
      {/* Filter Picker Modal (Mobile) */}
      <AnimatePresence>
        {mobileFilterType && (
            <GenericWheelPicker 
                title={
                    mobileFilterType === 'user' ? t.filterUser : 
                    mobileFilterType === 'category' ? t.category : t.status
                }
                options={
                    mobileFilterType === 'user' ? userOptions : 
                    mobileFilterType === 'category' ? categoryOptions : statusOptions
                }
                value={
                    mobileFilterType === 'user' ? filterUserId : 
                    mobileFilterType === 'category' ? filterCategory : filterStatus
                }
                onChange={(val) => {
                    if (mobileFilterType === 'user') setFilterUserId(val);
                    else if (mobileFilterType === 'category') setFilterCategory(val);
                    else if (mobileFilterType === 'status') setFilterStatus(val);
                }}
                onClose={() => setMobileFilterType(null)}
            />
        )}
      </AnimatePresence>
      
      {/* Mobile Form Pickers (Bottom Sheets) */}
      <MobileDatePickerSheet 
        isOpen={mobilePickerType === 'start'} 
        onClose={() => setMobilePickerType(null)} 
        title={t.start}
        value={editForm.startDate || ''}
        onChange={(val) => setEditForm({...editForm, startDate: val})}
      />
      
      <MobileDatePickerSheet 
        isOpen={mobilePickerType === 'end'} 
        onClose={() => setMobilePickerType(null)} 
        title={t.end}
        value={editForm.endDate || ''}
        onChange={(val) => setEditForm({...editForm, endDate: val})}
      />

      <MobileUserPickerSheet 
        isOpen={mobilePickerType === 'user'}
        onClose={() => setMobilePickerType(null)}
        users={users}
        value={editForm.employeeId || ''}
        onChange={(id) => setEditForm({...editForm, employeeId: id})}
      />

      {/* iOS Style Delete Action Sheet */}
      <IOSDeleteSheet 
          isOpen={showDeleteSheet} 
          onClose={() => setShowDeleteSheet(false)} 
          onDelete={confirmDeleteTask}
          title={t.confirmDelete}
          description="Are you sure you want to delete this task?"
      />

      {/* Drop Zone for Deletion - Only show if current dragged task is deletable */}
      <AnimatePresence>
        {isDragging && tasks.find(t => t.id === draggingTaskId) && canDeleteTask(tasks.find(t => t.id === draggingTaskId)!) && (
            <motion.div 
                id="trash-zone"
                initial={{ opacity: 0, y: 50, x: "-50%" }}
                animate={{ opacity: 1, y: 0, x: "-50%" }}
                exit={{ opacity: 0, y: 50, x: "-50%" }}
                className="fixed bottom-8 left-1/2 z-[9999] w-64 h-24 bg-red-100/95 dark:bg-red-900/95 border-2 border-dashed border-red-500 text-red-600 dark:text-red-300 rounded-2xl shadow-2xl flex flex-col items-center justify-center backdrop-blur-md"
            >
                <Trash2 size={32} className="mb-2" />
                <span className="font-bold text-sm uppercase tracking-wider">{t.dropToDelete}</span>
            </motion.div>
        )}
      </AnimatePresence>

      {/* --- Calendar Area --- */}
      <motion.div 
        layout
        className="w-full shrink-0 lg:flex-1 lg:h-full lg:shrink bg-white dark:bg-gray-800 rounded-xl shadow-premium flex flex-col overflow-hidden relative z-10"
        initial={false}
        animate={{ 
            height: isDesktop 
                    ? '100%' 
                    : 'auto',
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        // Removed main container gesture to prevent scroll blocking
      >
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 sticky top-0 z-20">
            <div className="flex items-center gap-2 sm:gap-4 w-full xl:w-auto justify-between xl:justify-start">
                <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-1.5 text-zte-blue hover:bg-zte-light dark:hover:bg-gray-700 rounded transition-colors active:scale-95"><ChevronLeft size={20}/></button>
                <h2 className="text-sm sm:text-xl font-bold text-gray-800 dark:text-white text-center flex-1 xl:flex-none xl:w-40 truncate">{t.months[month]} {year}</h2>
                <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-1.5 text-zte-blue hover:bg-zte-light dark:hover:bg-gray-700 rounded transition-colors active:scale-95"><ChevronRight size={20}/></button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
                 {/* Desktop Filter View */}
                 <div className="hidden sm:flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-md border border-gray-200 dark:border-gray-600 shrink-0">
                    <Filter size={14} className="text-gray-400 ml-1" />
                    {isAdmin && (
                        <select value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} className="bg-transparent text-[10px] sm:text-sm text-gray-700 dark:text-gray-200 outline-none p-1 w-16 sm:w-32 truncate">
                            <option value="all">{t.allUsers}</option>
                            {users.map(u => <option key={u.id} value={u.employeeId}>{u.name}</option>)}
                        </select>
                    )}
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-transparent text-[10px] sm:text-sm text-gray-700 dark:text-gray-200 outline-none p-1 border-l border-gray-200 dark:border-gray-600 w-16 sm:w-32 truncate">
                        <option value="all">{t.filterCategory}: {t.all}</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-transparent text-[10px] sm:text-sm text-gray-700 dark:text-gray-200 outline-none p-1 border-l border-gray-200 dark:border-gray-600 w-16 sm:w-32 truncate">
                        <option value="all">{t.filterStatus}: {t.all}</option>
                        <option value="pending">{t.pending}</option>
                        <option value="completed">{t.completed}</option>
                        <option value="overdue">{t.overdue}</option>
                    </select>
                 </div>

                 {/* Mobile Filter View (Horizontal Scrollable Chips) */}
                 <div className="flex sm:hidden items-center gap-2 overflow-x-auto no-scrollbar w-full pb-1 pointer-events-auto">
                    <div className="bg-gray-50 dark:bg-gray-700 p-1.5 rounded-full border border-gray-100 dark:border-gray-600 shrink-0">
                        <Filter size={12} className="text-gray-400" />
                    </div>
                    {isAdmin && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setMobileFilterType('user'); }} 
                            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium border shrink-0 transition-colors ${filterUserId !== 'all' ? 'bg-zte-blue text-white border-zte-blue' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                        >
                           {userOptions.find(o => o.value === filterUserId)?.label || t.allUsers}
                        </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setMobileFilterType('category'); }} 
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium border shrink-0 transition-colors ${filterCategory !== 'all' ? 'bg-zte-blue text-white border-zte-blue' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                    >
                         {filterCategory === 'all' ? t.category : filterCategory}
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setMobileFilterType('status'); }} 
                        className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-medium border shrink-0 transition-colors ${filterStatus !== 'all' ? 'bg-zte-blue text-white border-zte-blue' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}
                    >
                         {statusOptions.find(o => o.value === filterStatus)?.label || t.status}
                    </button>
                 </div>
            </div>
        </div>

        <motion.div 
            layout
            className={`grid grid-cols-7 bg-white dark:bg-gray-800 lg:flex-1 auto-rows-auto lg:auto-rows-fr lg:overflow-y-auto relative z-10 ${viewMode === 'week' ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
            <AnimatePresence initial={false} mode="popLayout">
                {displayedDays.map((day, i) => {
                    if (!day) return <motion.div key={`empty-${i}`} layout className="bg-gray-50/50 dark:bg-gray-900/30 border-r border-b border-gray-100 dark:border-gray-700" />;
                    
                    const dateStr = toLocalDateString(day);
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate?.toDateString() === day.toDateString();
                    const dayTasks = getTasksForDay(day);
                    
                    return (
                        <motion.div 
                            key={day.toISOString()}
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => handleDayClick(day)}
                            // Mark this element as a drop target with its date
                            data-date={dateStr}
                            className={`min-h-[60px] sm:min-h-[100px] border-r border-b border-gray-100 dark:border-gray-700 p-1 cursor-pointer transition-colors relative flex flex-col group active:bg-gray-100 dark:active:bg-gray-800
                                ${isSelected ? 'bg-blue-50/50 dark:bg-gray-800 ring-2 ring-inset ring-zte-blue z-20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                                ${isToday ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                            `}
                        >
                            <div className={`w-full flex justify-center py-0.5 sm:py-1 mb-0.5 pointer-events-none ${isToday ? 'font-bold text-zte-blue' : 'text-gray-500 dark:text-gray-400'}`}>
                                <span className="text-xs sm:text-base">{day.getDate()}</span>
                            </div>
                            
                            {/* Task Visualization Container */}
                            <div className="flex flex-col gap-1 w-full flex-1 min-h-0">
                                {/* Slice to prevent overflow, but show more on mobile (labels are small) */}
                                {dayTasks.slice(0, maxVisibleTasks).map((task) => {
                                    const { className, isOverdue, mobileColor } = getTaskStyle(task);
                                    const isBeingDragged = draggingTaskId === task.id;
                                    
                                    return (
                                        <motion.div
                                            key={task.id}
                                            // Enable Framer Motion Drag
                                            drag
                                            dragSnapToOrigin
                                            dragMomentum={false}
                                            // Scale up when dragging for visibility
                                            whileDrag={{ scale: 1.1, zIndex: 100, opacity: 0.8 }}
                                            onDragStart={() => handleDragStart(task)}
                                            onDragEnd={(e, info) => handleDragEnd(e, info, task)}
                                            onClick={(e) => handleTaskClick(e, task)}
                                            className={`touch-none relative ${isBeingDragged ? 'z-50' : ''}`}
                                        >
                                            {/* Mobile View: Text Label - Now styled like Desktop but colored by Category */}
                                            <div 
                                                className={`sm:hidden text-[9px] px-1 py-0.5 mx-0.5 rounded truncate leading-tight mb-0.5 font-medium transition-all ${className}`}
                                                style={{ borderLeftColor: generateColor(task.category || 'General') }}
                                            >
                                                {task.title}
                                            </div>

                                            {/* Desktop View: Text Pill */}
                                            <div 
                                                className={`hidden sm:flex text-[9px] sm:text-xs px-1.5 py-0.5 rounded truncate items-center justify-between hover:shadow-md transition-all cursor-pointer ${className}`}
                                                style={{ borderLeftColor: getUserColor(task.employeeId) }}
                                            >
                                                <span className="truncate leading-tight font-medium">{task.title}</span>
                                                {isOverdue && <AlertCircle size={8} className="flex-shrink-0 text-red-600" />}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                                {dayTasks.length > maxVisibleTasks && (
                                    <div className="text-[9px] sm:text-[10px] text-center text-gray-500 dark:text-gray-400 font-medium leading-none py-0.5">
                                        +{dayTasks.length - maxVisibleTasks}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </motion.div>

        {/* Swipe Handle Indicator - INTERACTIVE: Click to Toggle, Drag to Swipe */}
        <motion.div 
             className="lg:hidden h-8 flex items-center justify-center bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shrink-0 cursor-grab active:cursor-grabbing z-20"
             onClick={() => setViewMode(prev => prev === 'month' ? 'week' : 'month')}
             onPanEnd={(e, info) => {
                 if (info.offset.y < -10) setViewMode('week');
                 else if (info.offset.y > 10) setViewMode('month');
             }}
             style={{ touchAction: 'none' }} // Crucial: Prevents page scroll while dragging handle
        >
             <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
        </motion.div>
      </motion.div>

      {/* --- TASK LIST / DETAILS PANEL (Shows list for selected day) --- */}
      {/* On Mobile: Flex-auto to expand with content in scrollable root. Desktop: Fixed width. */}
      <div id="task-details-panel" className="w-full shrink-0 flex-auto lg:flex-none lg:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-premium border-l border-gray-100 dark:border-gray-700 flex flex-col p-4 transition-all relative z-20 pb-safe-bottom min-h-[300px]">
        {(selectedDate || selectedTask) ? (
            <>
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate pr-2 flex-1">
                        {isEditing ? (selectedTask ? t.edit : t.addTask) : (selectedTask ? selectedTask.title : selectedDate?.toLocaleDateString())}
                    </h3>
                    <div className="flex gap-1.5 flex-shrink-0">
                        {!isEditing && selectedTask && (
                            <>
                                {isMobileCalendar && (
                                    <button onClick={() => handleSyncSingleTask(selectedTask)} className="p-1.5 text-purple-500 hover:bg-purple-50 rounded transition-colors active:scale-90" title="Add to Calendar">
                                        <Smartphone size={18} />
                                    </button>
                                )}
                                {isAdmin && (
                                    <button onClick={handleRemindClick} className={`p-1.5 rounded transition-all active:scale-90 relative ${remindFeedback ? 'text-green-500 bg-green-50 animate-bounce' : 'text-blue-500 hover:bg-blue-50'}`} title="Remind User">
                                        <BellRing size={18} />
                                    </button>
                                )}
                                <button onClick={() => toggleComplete(selectedTask)} className={`p-1.5 rounded-full transition-all active:scale-90 ${selectedTask.status === 'completed' ? 'text-white bg-green-500 shadow-md' : 'text-gray-400 bg-gray-100 dark:bg-gray-700 dark:text-gray-500 hover:text-gray-600'}`}>
                                    <Check size={18} />
                                </button>
                                <button onClick={() => { setIsEditing(true); setEditForm(selectedTask); setActiveTab('details'); }} className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors active:scale-90"><Edit2 size={18}/></button>
                                {canDeleteTask(selectedTask) && (
                                    <button onClick={(e) => { e.stopPropagation(); initiateDelete(selectedTask.id); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors active:scale-90"><Trash2 size={18} /></button>
                                )}
                                <button onClick={() => { setSelectedTask(null); setSelectedDate(new Date(selectedTask.startDate)); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors active:scale-90"><X size={18}/></button>
                            </>
                        )}
                        {!isEditing && !selectedTask && (
                             <button onClick={() => {
                                 setIsEditing(true);
                                 // Auto-fill default dates
                                 const defaultDate = selectedDate ? toLocalDateString(selectedDate) : toLocalDateString(new Date());
                                 setEditForm({ 
                                     employeeId: filterUserId !== 'all' ? filterUserId : user?.employeeId,
                                     startDate: defaultDate,
                                     endDate: defaultDate
                                 });
                             }} className="p-1.5 text-white bg-zte-blue hover:bg-zte-dark rounded-full shadow-md active:scale-90"><Plus size={18} /></button>
                        )}
                    </div>
                </div>

                {/* Tabs for Details / Comments (Only when task is selected and not editing) */}
                {selectedTask && !isEditing && (
                    <div className="flex gap-4 border-b border-gray-100 dark:border-gray-700 mb-4">
                        <button 
                            onClick={() => setActiveTab('details')} 
                            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'details' ? 'border-zte-blue text-zte-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t.tabDetails}
                        </button>
                        <button 
                            onClick={() => setActiveTab('comments')} 
                            className={`pb-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === 'comments' ? 'border-zte-blue text-zte-blue' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {t.tabComments}
                            {taskComments.length > 0 && <span className="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">{taskComments.length}</span>}
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
                    {isEditing ? (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t.taskTitle}</label>
                                <input className="w-full border p-2.5 rounded text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-zte-blue" value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                             </div>
                             
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t.start}</label>
                                     {/* Desktop Native Input */}
                                     <input 
                                        type="date"
                                        required
                                        className="hidden sm:block w-full border p-2.5 rounded text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-zte-blue bg-white dark:bg-gray-700 min-h-[44px]"
                                        value={editForm.startDate || toLocalDateString(new Date())}
                                        onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                                     />
                                     {/* Mobile Custom Trigger */}
                                     <div 
                                        onClick={() => setMobilePickerType('start')}
                                        className="sm:hidden w-full border p-2.5 rounded text-sm dark:bg-gray-700 dark:text-white bg-white dark:bg-gray-700 min-h-[44px] flex items-center justify-between"
                                     >
                                         <span>{editForm.startDate || toLocalDateString(new Date())}</span>
                                         <CalendarIcon size={16} className="text-gray-400" />
                                     </div>
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t.end}</label>
                                     {/* Desktop Native Input */}
                                     <input 
                                        type="date"
                                        required
                                        className="hidden sm:block w-full border p-2.5 rounded text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-zte-blue bg-white dark:bg-gray-700 min-h-[44px]"
                                        value={editForm.endDate || toLocalDateString(new Date())}
                                        onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                                     />
                                     {/* Mobile Custom Trigger */}
                                     <div 
                                        onClick={() => setMobilePickerType('end')}
                                        className="sm:hidden w-full border p-2.5 rounded text-sm dark:bg-gray-700 dark:text-white bg-white dark:bg-gray-700 min-h-[44px] flex items-center justify-between"
                                     >
                                         <span>{editForm.endDate || toLocalDateString(new Date())}</span>
                                         <CalendarIcon size={16} className="text-gray-400" />
                                     </div>
                                 </div>
                             </div>

                             <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t.category}</label>
                                <input className="w-full border p-2.5 rounded text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-zte-blue" value={editForm.category || ''} onChange={e => setEditForm({...editForm, category: e.target.value})} />
                             </div>

                             {/* Assignee Selector for Admin */}
                             {isAdmin && (
                                 <div>
                                     <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t.filterUser}</label>
                                     {/* Desktop Native Select */}
                                     <select 
                                        className="hidden sm:block w-full border p-2.5 rounded text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-zte-blue" 
                                        value={editForm.employeeId} 
                                        onChange={e => setEditForm({...editForm, employeeId: e.target.value})}
                                     >
                                         {users.map(u => <option key={u.id} value={u.employeeId}>{u.name} ({u.employeeId})</option>)}
                                     </select>
                                     {/* Mobile Custom Trigger */}
                                     <div
                                        onClick={() => setMobilePickerType('user')}
                                        className="sm:hidden w-full border p-2.5 rounded text-sm dark:bg-gray-700 dark:text-white bg-white dark:bg-gray-700 min-h-[44px] flex items-center justify-between"
                                     >
                                         <span className="truncate">{users.find(u => u.employeeId === editForm.employeeId)?.name || 'Select User'}</span>
                                         <ChevronDown size={16} className="text-gray-400" />
                                     </div>
                                 </div>
                             )}

                             <div>
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 block">{t.description}</label>
                                <textarea className="w-full border p-2.5 rounded h-32 text-sm dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-zte-blue resize-none" value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                             </div>

                             <div className="flex gap-3 pt-4">
                                <button onClick={handleSaveTask} className="flex-1 bg-zte-blue text-white py-2 rounded font-bold shadow-sm">{t.save}</button>
                                <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 rounded font-bold">{t.cancel}</button>
                             </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col">
                            {selectedTask ? (
                                activeTab === 'details' ? (
                                    <div className="space-y-4 animate-in fade-in duration-300">
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="px-2.5 py-1 bg-blue-50 text-zte-blue rounded-md text-xs font-bold uppercase tracking-wide">{selectedTask.category}</span>
                                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${selectedTask.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{selectedTask.status}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <CalendarIcon size={16} />
                                            <span className="font-medium">{selectedTask.startDate} <span className="text-gray-300 mx-1">→</span> {selectedTask.endDate}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <User size={16} />
                                            <span className="font-medium">{users.find(u => u.employeeId === selectedTask.employeeId)?.name} <span className="text-gray-300">({selectedTask.employeeId})</span></span>
                                        </div>
                                        
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">{t.description}</label>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 whitespace-pre-wrap">{selectedTask.description || <span className="italic text-gray-400">{t.noDesc}</span>}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col h-full animate-in fade-in duration-300">
                                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
                                            {taskComments.length === 0 ? (
                                                <div className="text-center py-10 text-gray-400">
                                                    <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                                                    <p className="text-sm">{t.noComments}</p>
                                                </div>
                                            ) : (
                                                taskComments.map(comment => {
                                                    const author = users.find(u => u.employeeId === comment.employeeId);
                                                    const isMe = user?.employeeId === comment.employeeId;
                                                    return (
                                                        <div key={comment.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0" style={{backgroundColor: author?.color, color: '#fff'}}>
                                                                {author?.name.charAt(0)}
                                                            </div>
                                                            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${isMe ? 'bg-blue-50 text-blue-900 rounded-tr-none' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                                                <div className="flex justify-between items-center mb-1 gap-4">
                                                                    <span className="font-bold text-xs opacity-70">{author?.name}</span>
                                                                    <span className="text-[10px] opacity-50">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="leading-relaxed">{comment.content}</p>
                                                                {(isMe || isAdmin) && (
                                                                    <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                                                                        <button onClick={() => { setNewComment(comment.content); setEditingCommentId(comment.id); }} className="text-[10px] opacity-60 hover:opacity-100 font-bold">{t.edit}</button>
                                                                        <button onClick={() => deleteComment(comment.id)} className="text-[10px] text-red-500 opacity-60 hover:opacity-100 font-bold">{t.delete}</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                        <div className="relative mt-auto">
                                            <input 
                                                className="w-full bg-gray-100 dark:bg-gray-700 border-0 rounded-full pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-zte-blue outline-none transition-all dark:text-white" 
                                                placeholder={t.writeComment}
                                                value={newComment}
                                                onChange={e => setNewComment(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                                            />
                                            <button 
                                                onClick={handlePostComment}
                                                disabled={!newComment.trim()}
                                                className="absolute right-1.5 top-1.5 p-1.5 bg-zte-blue text-white rounded-full disabled:opacity-50 disabled:bg-gray-300 transition-all hover:bg-zte-dark"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <div className="space-y-3">
                                    {getTasksForDay(selectedDate!).length === 0 ? (
                                        <div className="text-center text-gray-400 py-10 flex flex-col items-center"><CalendarIcon size={24} className="opacity-20 mb-2" /><p>{t.noTasks}</p></div>
                                    ) : (
                                        getTasksForDay(selectedDate!).map(task => {
                                            const { className } = getTaskStyle(task);
                                            return (
                                                <div key={task.id} onClick={(e) => handleTaskClick(e, task)} className={`p-3 border rounded-lg hover:shadow-md cursor-pointer transition-all ${className}`} style={{borderLeftColor: getUserColor(task.employeeId)}}>
                                                    <div className="font-bold text-sm dark:text-white">{task.title}</div>
                                                    <div className="text-[10px] text-gray-500 mt-2 flex justify-between items-center">
                                                        <span className="bg-white/50 px-1.5 py-0.5 rounded font-medium">{task.category}</span>
                                                        <span className="font-bold">{users.find(u => u.employeeId === task.employeeId)?.name}</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </>
        ) : <div className="flex flex-col items-center justify-center h-full text-gray-400"><CalendarIcon size={48} className="opacity-10 mb-4" /><p>Select a date to view details</p></div>}
      </div>
    </div>
  );
};
