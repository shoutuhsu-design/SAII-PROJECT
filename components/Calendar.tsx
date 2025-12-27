
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context';
import { generateCalendarGrid, toLocalDateString } from '../utils';
import { ChevronLeft, ChevronRight, Plus, X, Check, Trash2, Calendar as CalendarIcon, Filter, AlertCircle, ChevronDown, Search, MessageSquare, Send } from 'lucide-react';
import { DICTIONARY } from '../constants';
import { Task } from '../types';

export const Calendar: React.FC = () => {
  const { 
    user, users, tasks, comments, language, 
    addTask, updateTask, deleteTask, addComment,
    filterUserId, setFilterUserId,
    filterCategory, setFilterCategory,
    filterStatus, setFilterStatus 
  } = useApp();
  
  const t = DICTIONARY[language];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // NOTE: Filters are now managed in Context (useApp) to share state with StatsSidebar

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});

  // Custom User Select State
  const [isUserSelectOpen, setIsUserSelectOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const userSelectRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Detail View State
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const [newComment, setNewComment] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const calendarDays = generateCalendarGrid(year, month);
  
  // Close user select when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSelectRef.current && !userSelectRef.current.contains(event.target as Node)) {
        setIsUserSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Derived Data for Filters ---
  const categories = useMemo(() => {
    const cats = new Set(tasks.map(t => t.category).filter(Boolean));
    return Array.from(cats);
  }, [tasks]);

  const taskComments = useMemo(() => {
      if (!selectedTask) return [];
      return comments.filter(c => c.taskId === selectedTask.id);
  }, [comments, selectedTask]);

  // --- Filter Logic ---
  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      // 1. User Filter
      if (user?.role === 'admin') {
        if (filterUserId !== 'all' && task.employeeId !== filterUserId) return false;
      } else {
        if (task.employeeId !== user?.employeeId) return false;
      }

      // 2. Category Filter
      if (filterCategory !== 'all' && task.category !== filterCategory) return false;

      // 3. Status Filter
      if (filterStatus !== 'all') {
          if (filterStatus === 'completed' && task.status !== 'completed') return false;
          if (filterStatus === 'pending' && task.status !== 'pending') return false;
          if (filterStatus === 'overdue') {
              const today = toLocalDateString(new Date());
              const isOverdue = task.endDate < today && task.status !== 'completed';
              if (!isOverdue) return false;
          }
      }

      return true;
    });
  }, [tasks, user, filterUserId, filterCategory, filterStatus]);

  const getTasksForDay = (date: Date) => {
    const dateStr = toLocalDateString(date);
    return visibleTasks.filter(t => t.startDate <= dateStr && t.endDate >= dateStr);
  };

  // --- Status & Color Logic (Traffic Lights) ---
  const getTaskStyle = (task: Task) => {
      const today = toLocalDateString(new Date());
      const isOverdue = task.endDate < today && task.status !== 'completed';

      // Base style
      let styleClass = "border-l-[3px] sm:border-l-4 shadow-sm ";
      let bgColor = "";
      let borderColor = "";

      if (task.status === 'completed') {
          // Green Light
          bgColor = "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200";
          borderColor = "border-green-500";
      } else if (isOverdue) {
          // Red Light (Overdue)
          bgColor = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200";
          borderColor = "border-red-500";
      } else {
          // Pending / Normal (User Color or Amber/Blue)
          // Using User Color for the bar to keep identification, but background neutral
          bgColor = "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200";
          // We apply the border color dynamically via inline style if needed, or use default
          borderColor = "border-zte-blue"; 
      }

      return { className: `${styleClass} ${bgColor} ${borderColor}`, isOverdue };
  };

  const getUserColor = (empId: string) => {
      const u = users.find(u => u.employeeId === empId);
      return u?.color || '#9ca3af';
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnDay = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTask) return;

    const start = new Date(draggedTask.startDate);
    const end = new Date(draggedTask.endDate);
    const durationMs = end.getTime() - start.getTime();
    
    const newStartDateStr = toLocalDateString(targetDate);
    const newStartObj = new Date(targetDate);
    const newEndObj = new Date(newStartObj.getTime() + durationMs);
    const newEndDateStr = toLocalDateString(newEndObj);

    updateTask({
        ...draggedTask,
        startDate: newStartDateStr,
        endDate: newEndDateStr
    });

    setDraggedTask(null);
    setIsDragging(false);
  };

  const handleDropDelete = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedTask) {
        if (confirm(`${t.confirmDelete} "${draggedTask.title}"?`)) {
            deleteTask(draggedTask.id);
            setSelectedTask(null);
        }
    }
    setDraggedTask(null);
    setIsDragging(false);
  };

  // --- Standard Event Handlers ---
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsEditing(false);
    setSelectedTask(null);
    setActiveTab('details');
    if (window.innerWidth < 1024) {
        setTimeout(() => {
            document.getElementById('task-details-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  };

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setSelectedTask(task);
    setSelectedDate(null);
    setIsEditing(false);
    setActiveTab('details');
    if (window.innerWidth < 1024) {
        setTimeout(() => {
            document.getElementById('task-details-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  };

  const handleSaveTask = () => {
    if (!editForm.title || !user) return;
    const assignedTo = editForm.employeeId || (filterUserId !== 'all' ? filterUserId : user.employeeId);

    if (selectedTask) {
        updateTask({ ...selectedTask, ...editForm, employeeId: assignedTo } as Task);
    } else {
        const dateStr = selectedDate ? toLocalDateString(selectedDate) : toLocalDateString(new Date());
        const newTask: Task = {
            id: Date.now().toString(),
            employeeId: assignedTo,
            category: editForm.category || 'General',
            title: editForm.title!,
            description: editForm.description || '',
            startDate: editForm.startDate || dateStr,
            endDate: editForm.endDate || dateStr,
            status: 'pending'
        };
        addTask(newTask);
    }
    setIsEditing(false);
    setSelectedTask(null);
    if(selectedTask) setSelectedDate(null); 
  };

  const handleDelete = (id: string) => {
      if(confirm(t.confirmDelete)) {
          deleteTask(id);
          setSelectedTask(null);
          setIsEditing(false);
      }
  };

  const toggleComplete = (task: Task) => {
      updateTask({ ...task, status: task.status === 'completed' ? 'pending' : 'completed' });
  };

  const handleInitCreate = () => {
      setIsEditing(true); 
      setEditForm({
          employeeId: filterUserId !== 'all' ? filterUserId : user?.employeeId
      });
  };
  
  const handlePostComment = async () => {
      if (!newComment.trim() || !selectedTask || !user) return;
      await addComment({
          id: Date.now().toString(),
          taskId: selectedTask.id,
          employeeId: user.employeeId,
          content: newComment,
          createdAt: new Date().toISOString()
      });
      setNewComment('');
  };

  // Helper for filtered users in custom select
  const filteredUsersForSelect = users.filter(u => 
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
    u.employeeId.includes(userSearchQuery)
  );

  const selectedUserObj = users.find(u => u.employeeId === editForm.employeeId);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 overflow-y-auto lg:overflow-hidden pb-40 lg:pb-0 relative no-scrollbar">
      
      {/* Delete Drop Zone (Visible only when dragging) - Fixed Floating Bottom */}
      {isDragging && (
        <div 
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 w-64 h-24 bg-red-100/90 dark:bg-red-900/90 border-2 border-dashed border-red-500 text-red-600 dark:text-red-300 rounded-2xl shadow-2xl flex flex-col items-center justify-center backdrop-blur-md transition-all animate-in slide-in-from-bottom-4 duration-200"
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={handleDropDelete}
        >
             <Trash2 size={32} className="mb-1" />
             <span className="font-bold text-sm uppercase tracking-wider">{t.dropToDelete}</span>
        </div>
      )}

      {/* Calendar Grid Area */}
      <div className="w-full h-auto shrink-0 lg:flex-1 lg:h-full lg:shrink bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col overflow-visible lg:overflow-hidden transition-colors relative z-0">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col xl:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 sticky top-0 z-20">
            {/* Month Nav */}
            <div className="flex items-center gap-2 sm:gap-4 w-full xl:w-auto justify-between xl:justify-start">
                <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-1.5 text-zte-blue hover:bg-zte-light dark:hover:bg-gray-700 rounded transition-colors active:scale-95"><ChevronLeft size={20}/></button>
                <h2 className="text-base sm:text-xl font-bold text-gray-800 dark:text-white text-center flex-1 xl:flex-none xl:w-40 truncate">{t.months[month]} {year}</h2>
                <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-1.5 text-zte-blue hover:bg-zte-light dark:hover:bg-gray-700 rounded transition-colors active:scale-95"><ChevronRight size={20}/></button>
            </div>
            
            {/* Filters & Actions - Scrollable on mobile or wrapped */}
            <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                 <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 p-1 rounded-md border border-gray-200 dark:border-gray-600 shrink-0">
                    <Filter size={14} className="text-gray-400 ml-1" />
                    
                    {/* User Filter (Admin Only) */}
                    {user?.role === 'admin' && (
                        <select 
                            value={filterUserId} 
                            onChange={(e) => setFilterUserId(e.target.value)}
                            className="bg-transparent text-xs sm:text-sm text-gray-700 dark:text-gray-200 outline-none p-1 w-20 sm:w-32 truncate"
                        >
                            <option value="all">{t.allUsers}</option>
                            {users.map(u => (
                                <option key={u.id} value={u.employeeId}>{u.name}</option>
                            ))}
                        </select>
                    )}
                    
                    {/* Category Filter */}
                    <select 
                        value={filterCategory} 
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm text-gray-700 dark:text-gray-200 outline-none p-1 border-l border-gray-200 dark:border-gray-600 w-20 sm:w-32 truncate"
                    >
                        <option value="all">{t.filterCategory}: {t.all}</option>
                        {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    {/* Status Filter */}
                    <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="bg-transparent text-xs sm:text-sm text-gray-700 dark:text-gray-200 outline-none p-1 border-l border-gray-200 dark:border-gray-600 w-20 sm:w-32 truncate"
                    >
                        <option value="all">{t.filterStatus}: {t.all}</option>
                        <option value="pending">{t.pending}</option>
                        <option value="completed">{t.completed}</option>
                        <option value="overdue">{t.overdue}</option>
                    </select>
                 </div>
            </div>
        </div>

        {/* Grid Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            {t.weekdays.map(d => (
                <div key={d} className="p-2 sm:p-3 text-center text-[10px] sm:text-sm font-bold text-zte-blue dark:text-gray-400 uppercase tracking-wide">{d}</div>
            ))}
        </div>

        {/* Grid Body */}
        <div className="grid grid-cols-7 h-auto lg:flex-1 auto-rows-auto lg:auto-rows-fr bg-white dark:bg-gray-800 lg:overflow-y-auto relative z-10">
            {calendarDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="bg-gray-50/50 dark:bg-gray-900/30 border-r border-b border-gray-100 dark:border-gray-700" />;
                
                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = selectedDate?.toDateString() === day.toDateString();
                const dayTasks = getTasksForDay(day);

                return (
                    <div 
                        key={i} 
                        onClick={() => handleDayClick(day)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnDay(e, day)}
                        className={`min-h-[60px] sm:min-h-[100px] border-r border-b border-gray-100 dark:border-gray-700 p-0.5 sm:p-1 cursor-pointer transition-colors relative flex flex-col group active:bg-gray-100 dark:active:bg-gray-800
                            ${isSelected ? 'bg-blue-50/50 dark:bg-gray-800 ring-1 ring-inset ring-zte-blue' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                            ${isToday ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                        `}
                    >
                        <div className={`w-full flex justify-center py-0.5 sm:py-1 mb-0.5 ${isToday ? 'font-bold text-zte-blue' : 'text-gray-500 dark:text-gray-400'}`}>
                            <span className="text-[10px] sm:text-base">{day.getDate()}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 sm:gap-1 w-full overflow-hidden">
                            {dayTasks.slice(0, 4).map(task => {
                                const { className, isOverdue } = getTaskStyle(task);
                                const userColor = getUserColor(task.employeeId);
                                
                                return (
                                    <div 
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task)}
                                        onClick={(e) => handleTaskClick(e, task)}
                                        className={`text-[9px] sm:text-xs px-1 sm:px-1.5 py-0.5 rounded truncate flex items-center justify-between hover:shadow-md transition-all cursor-pointer active:scale-95 ${className}`}
                                        style={{ 
                                            // Dynamic Left Border color based on User
                                            borderLeftColor: userColor
                                        }}
                                        title={`${task.title} (${task.status})`}
                                    >
                                        <div className="flex items-center gap-1 overflow-hidden">
                                             <span className="truncate leading-tight font-medium">{task.title}</span>
                                        </div>
                                        <div className="flex items-center">
                                            {isOverdue && <AlertCircle size={8} className="flex-shrink-0 text-red-600 dark:text-red-400 sm:w-[10px] sm:h-[10px]" />}
                                        </div>
                                    </div>
                                );
                            })}
                            {dayTasks.length > 4 && (
                                <div className="text-[8px] sm:text-[10px] sm:text-xs text-center text-gray-400 font-medium leading-none">+{dayTasks.length - 4}</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Side Panel (Task Details & Comments) - Stacks on bottom for mobile */}
      <div id="task-details-panel" className="w-full shrink-0 lg:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md border-l border-gray-100 dark:border-gray-700 flex flex-col p-4 min-h-[400px] transition-colors relative z-20 safe-pb">
        {(selectedDate || selectedTask) ? (
            <>
                <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate pr-2">
                        {isEditing ? (selectedTask ? t.edit : t.addTask) : (selectedTask ? selectedTask.title : selectedDate?.toDateString())}
                    </h3>
                    <div className="flex gap-2 flex-shrink-0">
                        {!isEditing && !selectedTask && (
                             <button onClick={handleInitCreate} className="p-1.5 text-white bg-zte-blue hover:bg-zte-dark rounded-full transition-colors shadow-sm active:scale-90"><Plus size={18} /></button>
                        )}
                        {!isEditing && selectedTask && (
                            <>
                                <button onClick={() => toggleComplete(selectedTask)} className={`p-1.5 rounded transition-colors active:scale-90 ${selectedTask.status === 'completed' ? 'text-green-600 bg-green-50 dark:bg-green-900/30' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}><Check size={18} /></button>
                                <button onClick={() => { setIsEditing(true); setEditForm(selectedTask); setActiveTab('details'); }} className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors active:scale-90"><CalendarIcon size={18}/></button>
                                <button onClick={() => handleDelete(selectedTask.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors active:scale-90"><Trash2 size={18} /></button>
                                <button onClick={() => { setSelectedTask(null); setSelectedDate(new Date(selectedTask.startDate)); setActiveTab('details'); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors active:scale-90"><X size={18}/></button>
                            </>
                        )}
                    </div>
                </div>

                {/* Tabs for Details vs Comments (Only visible when a Task is Selected and NOT editing) */}
                {selectedTask && !isEditing && (
                    <div className="flex border-b border-gray-100 dark:border-gray-700 mb-4">
                        <button 
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${activeTab === 'details' ? 'text-zte-blue' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            {t.tabDetails}
                            {activeTab === 'details' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-zte-blue"></div>}
                        </button>
                        <button 
                            onClick={() => setActiveTab('comments')}
                            className={`flex-1 pb-2 text-sm font-medium transition-colors relative ${activeTab === 'comments' ? 'text-zte-blue' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                        >
                            {t.tabComments} {taskComments.length > 0 && <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 rounded-full">{taskComments.length}</span>}
                            {activeTab === 'comments' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-zte-blue"></div>}
                        </button>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    {isEditing ? (
                        <div className="space-y-3">
                            {/* Responsible Person Selection (Only for Admin) - Custom Beautiful Combobox */}
                            {user?.role === 'admin' && (
                                <div className="relative" ref={userSelectRef}>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t.responsiblePerson}</label>
                                    
                                    {/* Trigger Button */}
                                    <div 
                                        onClick={() => { setIsUserSelectOpen(!isUserSelectOpen); setUserSearchQuery(''); }}
                                        className={`w-full border p-2 rounded-lg flex items-center justify-between cursor-pointer transition-all bg-gray-50 dark:bg-gray-700
                                            ${isUserSelectOpen ? 'border-zte-blue ring-2 ring-zte-blue/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}
                                    >
                                        {selectedUserObj ? (
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: selectedUserObj.color }}>
                                                    {selectedUserObj.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col leading-none">
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedUserObj.name}</span>
                                                    <span className="text-[10px] text-gray-500">{selectedUserObj.employeeId}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-gray-400">Select person...</span>
                                        )}
                                        <ChevronDown size={16} className={`text-gray-400 transition-transform ${isUserSelectOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {/* Dropdown List */}
                                    {isUserSelectOpen && (
                                        <div className="absolute z-30 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-600 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                            {/* Search Input */}
                                            <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                                                <div className="relative">
                                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input 
                                                        autoFocus
                                                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:border-zte-blue"
                                                        placeholder="Search name or ID..."
                                                        value={userSearchQuery}
                                                        onChange={e => setUserSearchQuery(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            {/* List */}
                                            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1">
                                                {filteredUsersForSelect.length > 0 ? (
                                                    filteredUsersForSelect.map(u => {
                                                        const isSelected = editForm.employeeId === u.employeeId;
                                                        return (
                                                            <div 
                                                                key={u.id}
                                                                onClick={() => { setEditForm({...editForm, employeeId: u.employeeId}); setIsUserSelectOpen(false); }}
                                                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group
                                                                    ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                                                                `}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-sm" style={{ backgroundColor: u.color }}>
                                                                        {u.name.charAt(0)}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-sm font-medium ${isSelected ? 'text-zte-blue dark:text-blue-300' : 'text-gray-700 dark:text-gray-200'}`}>{u.name}</span>
                                                                        <span className="text-[10px] text-gray-400 group-hover:text-gray-500">{u.employeeId}</span>
                                                                    </div>
                                                                </div>
                                                                {isSelected && <Check size={16} className="text-zte-blue" />}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="p-3 text-center text-xs text-gray-400">No matching users</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <input 
                                placeholder={t.category} 
                                className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-colors"
                                value={editForm.category || ''}
                                onChange={e => setEditForm({...editForm, category: e.target.value})}
                            />
                            <input 
                                placeholder={t.taskTitle} 
                                className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-colors"
                                value={editForm.title || ''}
                                onChange={e => setEditForm({...editForm, title: e.target.value})}
                            />
                            <textarea 
                                placeholder={t.description} 
                                className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 rounded h-24 text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-colors resize-none"
                                value={editForm.description || ''}
                                onChange={e => setEditForm({...editForm, description: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t.start}</label>
                                    <input type="date" className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none" 
                                        value={editForm.startDate || (selectedDate ? toLocalDateString(selectedDate) : '')} 
                                        onChange={e => setEditForm({...editForm, startDate: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t.end}</label>
                                    <input type="date" className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none" 
                                        value={editForm.endDate || (selectedDate ? toLocalDateString(selectedDate) : '')} 
                                        onChange={e => setEditForm({...editForm, endDate: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={handleSaveTask} className="flex-1 bg-zte-blue text-white py-2.5 rounded font-medium hover:bg-zte-dark transition-colors shadow-sm">{t.save}</button>
                                <button onClick={() => setIsEditing(false)} className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 rounded font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">{t.cancel}</button>
                            </div>
                        </div>
                    ) : (
                        activeTab === 'comments' && selectedTask ? (
                            <div className="flex flex-col h-full">
                                <div className="flex-1 space-y-3 mb-4">
                                    {taskComments.length === 0 ? (
                                        <div className="text-center text-gray-400 py-8 text-sm flex flex-col items-center gap-2">
                                            <MessageSquare size={24} className="opacity-50" />
                                            {t.noComments}
                                        </div>
                                    ) : (
                                        taskComments.map(comment => {
                                            const author = users.find(u => u.employeeId === comment.employeeId);
                                            return (
                                                <div key={comment.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] text-white font-bold" style={{ backgroundColor: author?.color || '#999' }}>
                                                                {author?.name.charAt(0)}
                                                            </div>
                                                            <span className="text-xs font-bold text-gray-800 dark:text-white">{author?.name}</span>
                                                            {author?.role === 'admin' && <span className="text-[9px] bg-blue-100 text-blue-600 px-1 rounded">Admin</span>}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed pl-7">{comment.content}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                {user?.role === 'admin' && (
                                    <div className="mt-auto border-t border-gray-100 dark:border-gray-700 pt-3">
                                        <div className="flex gap-2">
                                            <input 
                                                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zte-blue dark:text-white"
                                                placeholder={t.writeComment}
                                                value={newComment}
                                                onChange={e => setNewComment(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handlePostComment()}
                                            />
                                            <button 
                                                onClick={handlePostComment}
                                                disabled={!newComment.trim()}
                                                className="bg-zte-blue text-white p-2 rounded-lg hover:bg-zte-dark disabled:opacity-50 disabled:hover:bg-zte-blue transition-colors"
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {selectedTask ? (
                                    <>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                            <span className="px-2 py-1 bg-blue-50 text-zte-blue dark:bg-blue-900/30 dark:text-blue-200 rounded text-xs font-semibold uppercase tracking-wide">{selectedTask.category}</span>
                                            <span className="text-xs">{selectedTask.startDate} - {selectedTask.endDate}</span>
                                        </div>
                                        <div className="text-sm font-medium flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white" style={{ backgroundColor: getUserColor(selectedTask.employeeId) }}>
                                                {users.find(u => u.employeeId === selectedTask.employeeId)?.name.charAt(0)}
                                            </div>
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {users.find(u => u.employeeId === selectedTask.employeeId)?.name}
                                            </span>
                                        </div>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                                            {selectedTask.description || <span className="italic text-gray-400">{t.noDesc}</span>}
                                        </p>
                                        <div>
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${selectedTask.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                                <div className={`w-2 h-2 rounded-full ${selectedTask.status === 'completed' ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                                                {selectedTask.status === 'completed' ? t.completed : t.pending}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        {getTasksForDay(selectedDate!).length === 0 ? (
                                            <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                                                    <CalendarIcon size={20} className="text-gray-300 dark:text-gray-500" />
                                                </div>
                                                <p>{t.noTasks}</p>
                                            </div>
                                        ) : (
                                            getTasksForDay(selectedDate!).map(task => {
                                                const { className, isOverdue } = getTaskStyle(task);
                                                return (
                                                <div 
                                                    key={task.id} 
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task)}
                                                    onClick={(e) => handleTaskClick(e, task)}
                                                    className={`group p-3 border rounded-lg hover:shadow-md cursor-pointer transition-all active:scale-[0.98] ${className}`}
                                                    style={{borderLeftColor: getUserColor(task.employeeId)}}
                                                >
                                                    <div className="font-semibold text-gray-800 dark:text-white transition-colors">{task.title}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-2 items-center">
                                                        <span className="bg-white/50 px-1.5 py-0.5 rounded">{task.category}</span>
                                                        <div className="flex items-center gap-2">
                                                            {isOverdue && <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={10} /> {t.late}</span>}
                                                            <span className="font-medium flex items-center gap-1">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getUserColor(task.employeeId) }}></div>
                                                                {users.find(u => u.employeeId === task.employeeId)?.name}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )})
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <CalendarIcon size={48} className="mb-4 text-gray-200 dark:text-gray-700" />
                <p>Select a date to view details</p>
            </div>
        )}
      </div>
    </div>
  );
};
