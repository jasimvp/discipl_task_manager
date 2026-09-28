import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User,
  ShieldAlert,
  ArrowRight,
  Link2,
  ExternalLink
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function TaskBoardView({ onOpenCreateTask, onSelectTask }) {
  const { user, availableUsers, socket } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [scope, setScope] = useState(user?.role === 'employee' ? 'mine' : 'all'); // 'mine' or 'all'
  const [mobileKanbanCol, setMobileKanbanCol] = useState('all'); // 'all' or column key for mobile
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedPriority) params.priority = selectedPriority;
      
      if (user?.role === 'employee' && scope === 'mine') {
        params.assigned_to = user.id;
      } else if (selectedAssignee) {
        params.assigned_to = selectedAssignee;
      }

      const data = await api.getTasks(params);
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, search, selectedPriority, selectedAssignee, scope]);

  // Real-time task events via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => fetchTasks();

    socket.on('task_created', handleSync);
    socket.on('task_updated', handleSync);
    socket.on('task_reassigned', handleSync);
    socket.on('rejection_requested', handleSync);
    socket.on('task_deleted', handleSync);

    return () => {
      socket.off('task_created', handleSync);
      socket.off('task_updated', handleSync);
      socket.off('task_reassigned', handleSync);
      socket.off('rejection_requested', handleSync);
      socket.off('task_deleted', handleSync);
    };
  }, [socket]);

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';

  const columns = [
    { key: 'todo', label: 'To Do', color: 'slate', badgeBg: 'bg-slate-100 text-slate-700' },
    { key: 'in_progress', label: 'In Progress', color: 'blue', badgeBg: 'bg-blue-100 text-blue-700' },
    { key: 'review', label: 'Under Review', color: 'purple', badgeBg: 'bg-purple-100 text-purple-700' },
    { key: 'completed', label: 'Completed', color: 'emerald', badgeBg: 'bg-emerald-100 text-emerald-700' },
  ];

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Urgent</span>;
      case 'high':
        return <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">High</span>;
      case 'medium':
        return <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Medium</span>;
      case 'low':
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Low</span>;
      default:
        return null;
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isTaskOverdue = (t) => Boolean(t.due_date && t.due_date < todayStr && t.status !== 'completed');
  const isTaskDueToday = (t) => Boolean(t.due_date && t.due_date === todayStr && t.status !== 'completed');

  const overdueCount = tasks.filter(isTaskOverdue).length;
  const displayedTasks = showOverdueOnly ? tasks.filter(isTaskOverdue) : tasks;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header & Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {isFounder 
                ? 'Discipl Deliverables Board' 
                : isLead 
                ? `${user?.department ? user.department + ' ' : ''}Deliverables` 
                : scope === 'mine' ? 'My Deliverables' : 'Team Deliverables'}
            </h1>
            <p className="text-xs text-slate-500">
              {isFounder 
                ? 'Executive overview of all company tasks across all teams & employees' 
                : isLead 
                ? 'Team deliverables and task assignments' 
                : scope === 'mine'
                ? 'Tasks assigned directly to you'
                : 'All deliverables across your department'}
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-3">
            {/* Scope toggle for employees & leads */}
            {!isFounder && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setScope('mine')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    scope === 'mine'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎯 My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    scope === 'all'
                      ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌐 All Tasks
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Create Task Button (Founder & Team Lead) */}
            {(isFounder || isLead) && (
              <button
                onClick={onOpenCreateTask}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Assign Task
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          
          {/* Search */}
          <div className="relative sm:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks by title or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* Priority filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 bg-white"
            >
              <option value="">All Priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>

          {/* Assignee filter */}
          <div className="sm:col-span-3">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 bg-white"
            >
              <option value="">All Assignees</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Overdue Quick Filter Toggle */}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                showOverdueOnly
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : overdueCount > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${showOverdueOnly ? 'text-white' : overdueCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
              <span>Overdue</span>
              {overdueCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  showOverdueOnly ? 'bg-white text-rose-700' : 'bg-rose-200 text-rose-800'
                }`}>
                  {overdueCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="space-y-4">
          {/* Mobile Quick Column Selector Tabs */}
          <div className="flex md:hidden overflow-x-auto pb-1 gap-1.5 no-scrollbar">
            <button
              onClick={() => setMobileKanbanCol('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                mobileKanbanCol === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              All Columns ({displayedTasks.length})
            </button>
            {columns.map((c) => {
              const count = displayedTasks.filter((t) => t.status === c.key).length;
              return (
                <button
                  key={c.key}
                  onClick={() => setMobileKanbanCol(c.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    mobileKanbanCol === c.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    mobileKanbanCol === c.key ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kanban Columns (Horizontal snap-scroll on mobile, 4-col grid on desktop) */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-5 md:overflow-visible pb-4">
            {columns
              .filter((col) => mobileKanbanCol === 'all' || mobileKanbanCol === col.key)
              .map((col) => {
                const colTasks = displayedTasks.filter((t) => t.status === col.key);
                return (
                  <div
                    key={col.key}
                    className="w-[85vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none flex flex-col bg-slate-100/70 p-3.5 rounded-3xl min-h-[480px]"
                  >
                    
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-2 py-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">{col.label}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.2 rounded-full ${col.badgeBg}`}>
                          {colTasks.length}
                        </span>
                      </div>
                    </div>

                {/* Task Cards Column */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-400">
                      No tasks in {col.label}
                    </div>
                  ) : (
                    colTasks.map((t) => {
                      const isRejected = t.rejection_status === 'requested';
                      const isOverdue = isTaskOverdue(t);
                      const isDueToday = isTaskDueToday(t);

                      return (
                        <div
                          key={t.id}
                          onClick={() => onSelectTask(t.id)}
                          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                            isRejected 
                              ? 'border-amber-400 ring-2 ring-amber-100 shadow-sm' 
                              : isOverdue
                              ? 'border-rose-300 hover:border-rose-400 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          {/* Priority and Urgency Badges */}
                          <div className="flex items-center justify-between gap-1 flex-wrap mb-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getPriorityBadge(t.priority)}
                              {isOverdue && (
                                <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Overdue
                                </span>
                              )}
                              {isDueToday && (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Due Today
                                </span>
                              )}
                              {t.deliverable_url && (
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200" title={t.deliverable_url}>
                                  <Link2 className="w-3 h-3 text-indigo-500" />
                                  Proof
                                </span>
                              )}
                            </div>
                            {isRejected && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 animate-pulse">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                Reassignment
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                            {t.title}
                          </h3>

                          {t.description && (
                            <p className="text-slate-500 text-xs mt-1.5 line-clamp-2">
                              {t.description}
                            </p>
                          )}

                          {/* Rejection reason snippet if requested */}
                          {isRejected && (
                            <div className="mt-2.5 p-2 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 italic line-clamp-2">
                              "{t.rejection_reason}"
                            </div>
                          )}

                          {/* Progress bar */}
                          <div className="mt-3 pt-2.5 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                              <span>Progress</span>
                              <span className="font-semibold text-slate-700">{t.progress_pct || 0}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  t.progress_pct === 100 
                                    ? 'bg-emerald-500' 
                                    : t.progress_pct > 50 
                                    ? 'bg-indigo-500' 
                                    : 'bg-amber-500'
                                }`}
                                style={{ width: `${t.progress_pct || 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Assignee & Due Date */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <UserAvatar
                                name={t.assignee_name}
                                avatar={t.assignee_avatar}
                                role={t.assignee_role}
                                size="xs"
                              />
                              <span className="truncate max-w-[90px] font-medium text-slate-700">
                                {t.assignee_name || 'Unassigned'}
                              </span>
                            </div>

                            {t.due_date && (
                              <div className={`flex items-center gap-1 text-[11px] ${
                                isOverdue
                                  ? 'text-rose-600 font-bold'
                                  : isDueToday
                                  ? 'text-amber-700 font-bold'
                                  : 'text-slate-500'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(t.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* LIST TABLE VIEW (Responsive Cards on Mobile, Full Table on Desktop) */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Mobile Card View (md:hidden) */}
          <div className="md:hidden space-y-3">
            {displayedTasks.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No deliverables found matching your criteria.
              </div>
            ) : (
              displayedTasks.map((t) => {
                const isOverdue = isTaskOverdue(t);
                const isDueToday = isTaskDueToday(t);

                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className={`bg-white p-4 rounded-2xl border shadow-2xs space-y-3 active:scale-[0.99] transition-all cursor-pointer ${
                      isOverdue ? 'border-rose-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getPriorityBadge(t.priority)}
                        <span className="text-[10px] text-slate-400">#{t.id}</span>
                        {isOverdue && (
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Overdue
                          </span>
                        )}
                        {isDueToday && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Due Today
                          </span>
                        )}
                        {t.deliverable_url && (
                          <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200">
                            <Link2 className="w-3 h-3 text-indigo-500" />
                            Proof
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : t.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : t.status === 'review'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{t.title}</h3>
                      {t.rejection_status === 'requested' && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full mt-1 border border-amber-200">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          Reassignment Requested
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          name={t.assignee_name}
                          avatar={t.assignee_avatar}
                          role={t.assignee_role}
                          size="xs"
                        />
                        <span className="font-semibold text-slate-700 text-xs truncate max-w-[120px]">
                          {t.assignee_name || 'Unassigned'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{t.progress_pct || 0}%</span>
                        <span className="text-indigo-600 font-bold text-xs">Details →</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-6">Task Title</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Assignee</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Progress</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedTasks.map((t) => {
                    const isOverdue = isTaskOverdue(t);
                    const isDueToday = isTaskDueToday(t);

                    return (
                      <tr
                        key={t.id}
                        onClick={() => onSelectTask(t.id)}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                          isOverdue ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="py-4 px-6 max-w-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm block truncate">{t.title}</span>
                              {t.deliverable_url && (
                                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.2 rounded-full border border-indigo-200 shrink-0 flex items-center gap-1" title={t.deliverable_url}>
                                  <Link2 className="w-3 h-3 text-indigo-500" />
                                  Proof
                                </span>
                              )}
                            </div>
                            {t.rejection_status === 'requested' && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full mt-1 border border-amber-200">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                Reassignment Requested
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : t.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : t.status === 'review'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {t.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>

                        <td className="py-4 px-4">{getPriorityBadge(t.priority)}</td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <UserAvatar
                              name={t.assignee_name}
                              avatar={t.assignee_avatar}
                              role={t.assignee_role}
                              size="xs"
                            />
                            <span className="font-semibold text-slate-800">{t.assignee_name || 'Unassigned'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className={`font-medium ${
                              isOverdue ? 'text-rose-600 font-bold' : isDueToday ? 'text-amber-700 font-bold' : 'text-slate-600'
                            }`}>
                              {t.due_date || 'None'}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                            {isDueToday && (
                              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Due Today
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-center">
                          <span className="font-bold text-slate-800">{t.progress_pct || 0}%</span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button className="text-indigo-600 font-semibold hover:underline">
                            Details →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
