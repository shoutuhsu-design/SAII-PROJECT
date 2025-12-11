import React, { useState } from 'react';
import { useApp } from '../context';
import { generateCalendarGrid } from '../utils';
import { ChevronLeft, ChevronRight, Plus, X, Check, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { DICTIONARY } from '../constants';
import { Task } from '../types';

export const Calendar: React.FC = () => {
  const { user, users, tasks, language, addTask, updateTask, deleteTask } = useApp();
  const t = DICTIONARY[language];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Task>>({});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const calendarDays = generateCalendarGrid(year, month);
  
  // Filter logic
  const visibleTasks = tasks.filter(task => {
    if (user?.role === 'admin') {
      return filterUserId === 'all' ? true : task.employeeId === filterUserId;
    }
    return task.employeeId === user?.employeeId;
  });

  const getTasksForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return visibleTasks.filter(t => t.startDate <= dateStr && t.endDate >= dateStr);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsEditing(false);
    setSelectedTask(null);
  };

  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setSelectedTask(task);
    setSelectedDate(null);
    setIsEditing(false);
  };

  const handleSaveTask = () => {
    if (!editForm.title || !user) return;
    
    if (selectedTask) {
        // Update
        updateTask({ ...selectedTask, ...editForm } as Task);
    } else {
        // Create
        const dateStr = selectedDate?.toISOString().split('T')[0];
        const newTask: Task = {
            id: Date.now().toString(),
            employeeId: user.employeeId,
            category: editForm.category || 'General',
            title: editForm.title!,
            description: editForm.description || '',
            startDate: editForm.startDate || dateStr!,
            endDate: editForm.endDate || dateStr!,
            status: 'pending'
        };
        addTask(newTask);
    }
    setIsEditing(false);
    setSelectedTask(null);
    if(selectedTask) setSelectedDate(null); // Return to list view if updating
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

  // Helper to get user color
  const getUserColor = (empId: string) => {
      const u = users.find(u => u.employeeId === empId);
      return u?.color || '#9ca3af';
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-4 overflow-hidden">
      {/* Calendar Grid Area */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col h-full overflow-hidden transition-colors">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
            <div className="flex items-center gap-4">
                <button onClick={() => setCurrentDate(new Date(year, month - 1))} className="p-1.5 text-zte-blue hover:bg-zte-light dark:hover:bg-gray-700 rounded transition-colors"><ChevronLeft size={20}/></button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white w-40 text-center">{t.months[month]} {year}</h2>
                <button onClick={() => setCurrentDate(new Date(year, month + 1))} className="p-1.5 text-zte-blue hover:bg-zte-light dark:hover:bg-gray-700 rounded transition-colors"><ChevronRight size={20}/></button>
            </div>
            
            {user?.role === 'admin' && (
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 hidden sm:inline">{t.filterUser}:</span>
                    <select 
                        value={filterUserId} 
                        onChange={(e) => setFilterUserId(e.target.value)}
                        className="p-2 border border-gray-200 dark:border-gray-600 rounded-md text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-zte-blue transition-colors cursor-pointer"
                    >
                        <option value="all">{t.allUsers}</option>
                        {users.map(u => (
                            <option key={u.id} value={u.employeeId}>{u.name} ({u.employeeId})</option>
                        ))}
                    </select>
                </div>
            )}
        </div>

        {/* Grid Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            {t.weekdays.map(d => (
                <div key={d} className="p-3 text-center text-sm font-bold text-zte-blue dark:text-gray-400 uppercase tracking-wide">{d}</div>
            ))}
        </div>

        {/* Grid Body */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto bg-white dark:bg-gray-800">
            {calendarDays.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} className="bg-gray-50/50 dark:bg-gray-900/30 border-r border-b border-gray-100 dark:border-gray-700" />;
                
                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = selectedDate?.toDateString() === day.toDateString();
                const dayTasks = getTasksForDay(day);

                return (
                    <div 
                        key={i} 
                        onClick={() => handleDayClick(day)}
                        className={`min-h-[100px] border-r border-b border-gray-100 dark:border-gray-700 p-1 cursor-pointer transition-colors relative flex flex-col
                            ${isSelected ? 'z-10 bg-white dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                            ${isToday ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                        `}
                    >
                        {/* Selection Ring */}
                        {isSelected && <div className="absolute inset-0 border-2 border-zte-blue pointer-events-none"></div>}

                        <div className={`w-full flex justify-center py-1 mb-1 ${isToday ? 'font-bold text-zte-blue' : 'text-gray-500 dark:text-gray-400'}`}>
                            {day.getDate()}
                        </div>
                        <div className="flex flex-col gap-1 w-full">
                            {dayTasks.slice(0, 3).map(task => (
                                <div 
                                    key={task.id}
                                    onClick={(e) => handleTaskClick(e, task)}
                                    className={`text-xs px-1.5 py-0.5 rounded truncate text-white shadow-sm flex items-center justify-between hover:opacity-90 transition-opacity
                                        ${task.status === 'completed' ? 'opacity-60 grayscale' : ''}
                                    `}
                                    style={{ backgroundColor: getUserColor(task.employeeId) }}
                                    title={task.title}
                                >
                                    <span className="truncate mr-1">{task.title}</span>
                                    {task.status === 'completed' && <Check size={10} className="flex-shrink-0" />}
                                </div>
                            ))}
                            {dayTasks.length > 3 && (
                                <div className="text-xs text-center text-gray-400 font-medium">+{dayTasks.length - 3} {t.more}</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Side Panel (Task Details) */}
      <div className="w-full lg:w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md border-l border-gray-100 dark:border-gray-700 flex flex-col p-4 overflow-y-auto transition-colors">
        {(selectedDate || selectedTask) ? (
            <>
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate pr-2">
                        {isEditing ? (selectedTask ? t.edit : t.addTask) : (selectedTask ? selectedTask.title : selectedDate?.toDateString())}
                    </h3>
                    <div className="flex gap-2 flex-shrink-0">
                        {!isEditing && !selectedTask && (
                             <button onClick={() => { setIsEditing(true); setEditForm({}); }} className="p-1.5 text-white bg-zte-blue hover:bg-zte-dark rounded-full transition-colors shadow-sm"><Plus size={18} /></button>
                        )}
                        {!isEditing && selectedTask && (
                            <>
                                <button onClick={() => toggleComplete(selectedTask)} className={`p-1.5 rounded transition-colors ${selectedTask.status === 'completed' ? 'text-green-600 bg-green-50 dark:bg-green-900/30' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}><Check size={18} /></button>
                                <button onClick={() => { setIsEditing(true); setEditForm(selectedTask); }} className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"><CalendarIcon size={18}/></button>
                                <button onClick={() => handleDelete(selectedTask.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={18} /></button>
                                <button onClick={() => { setSelectedTask(null); setSelectedDate(new Date(selectedTask.startDate)); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"><X size={18}/></button>
                            </>
                        )}
                    </div>
                </div>

                {isEditing ? (
                    <div className="space-y-3">
                        <input 
                            placeholder={t.category} 
                            className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2.5 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue focus:border-transparent outline-none transition-colors"
                            value={editForm.category || ''}
                            onChange={e => setEditForm({...editForm, category: e.target.value})}
                        />
                         <input 
                            placeholder={t.title} 
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
                                    value={editForm.startDate || selectedDate?.toISOString().split('T')[0]} 
                                    onChange={e => setEditForm({...editForm, startDate: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 block">{t.end}</label>
                                <input type="date" className="w-full border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-2 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-zte-blue outline-none" 
                                    value={editForm.endDate || selectedDate?.toISOString().split('T')[0]} 
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
                    <div className="space-y-4">
                        {selectedTask ? (
                            <>
                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <span className="px-2 py-1 bg-blue-50 text-zte-blue dark:bg-blue-900/30 dark:text-blue-200 rounded text-xs font-semibold uppercase tracking-wide">{selectedTask.category}</span>
                                    <span className="text-xs">{selectedTask.startDate} - {selectedTask.endDate}</span>
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
                                    getTasksForDay(selectedDate!).map(task => (
                                        <div 
                                            key={task.id} 
                                            onClick={() => setSelectedTask(task)}
                                            className="group p-3 border border-gray-100 dark:border-gray-700 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-all shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-gray-600 bg-white dark:bg-gray-800"
                                        >
                                            <div className="font-semibold text-gray-800 dark:text-white group-hover:text-zte-blue transition-colors">{task.title}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between mt-2 items-center">
                                                <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{task.category}</span>
                                                <span className="font-medium flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getUserColor(task.employeeId) }}></div>
                                                    {users.find(u => u.employeeId === task.employeeId)?.name}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}
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