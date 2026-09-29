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
  ExternalLink,
  Lock,
  Users
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
    socket.on('task_claimed', handleSync);
    socket.on('task_reassigned', handleSync);
    socket.on('rejection_requested', handleSync);
    socket.on('task_deleted', handleSync);

    return () => {
      socket.off('task_created', handleSync);
      socket.off('task_updated', handleSync);
      socket.off('task_claimed', handleSync);
      socket.off('task_reassigned', handleSync);
      socket.off('rejection_requested', handleSync);
      socket.off('task_deleted', handleSync);
    };
  }, [socket]);

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';

  const columns = [
    { key: 'todo', label: 'To Do', badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
    { key: 'in_progress', label: 'In Progress', badgeBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' },
    { key: 'review', label: 'Under Review', badgeBg: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' },
    { key: 'completed', label: 'Completed', badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' },
  ];

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'urgent':
        return <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Urgent</span>;
      case 'high':
        return <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full">High</span>;
      case 'medium':
        return <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Medium</span>;
      case 'low':
        return <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">Low</span>;
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
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isFounder 
                ? 'Discipl Deliverables Board' 
                : isLead 
                ? `${user?.department ? user.department + ' ' : ''}Deliverables` 
                : scope === 'mine' ? 'My Deliverables' : 'Team Deliverables'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
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
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setScope('mine')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    scope === 'mine'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🎯 My Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    scope === 'all'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🌐 All Tasks
                </button>
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
                <span>Assign Deliverable</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          
          {/* Search */}
          <div className="relative sm:col-span-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks by title or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* Priority filter */}
          <div className="sm:col-span-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
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
          <div className="sm:col-span-2 flex items-center">
            <button
              type="button"
              onClick={() => setShowOverdueOnly(!showOverdueOnly)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                showOverdueOnly
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : overdueCount > 0
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900 hover:bg-rose-100'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${overdueCount > 0 ? 'text-rose-500 animate-pulse' : ''}`} />
              <span>Overdue ({overdueCount})</span>
            </button>
          </div>

        </div>
      </div>

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="space-y-4">
          
          {/* Mobile column selector */}
          <div className="flex md:hidden overflow-x-auto gap-2 pb-2">
            <button
              onClick={() => setMobileKanbanCol('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                mobileKanbanCol === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors ${
                    mobileKanbanCol === c.key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    mobileKanbanCol === c.key ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Kanban Columns */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-5 md:overflow-visible pb-4">
            {columns
              .filter((col) => mobileKanbanCol === 'all' || mobileKanbanCol === col.key)
              .map((col) => {
                const colTasks = displayedTasks.filter((t) => t.status === col.key);
                return (
                  <div
                    key={col.key}
                    className="w-[85vw] max-w-[340px] shrink-0 snap-center md:w-auto md:max-w-none flex flex-col bg-slate-100/70 dark:bg-slate-800/40 p-3.5 rounded-3xl min-h-[480px] border border-slate-200/60 dark:border-slate-800/60"
                  >
                    
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-2 py-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">{col.label}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.2 rounded-full ${col.badgeBg}`}>
                          {colTasks.length}
                        </span>
                      </div>
                    </div>

                    {/* Task Cards Column */}
                    <div className="space-y-3 flex-1 overflow-y-auto">
                      {colTasks.length === 0 ? (
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center text-xs text-slate-400">
                          No tasks in {col.label}
                        </div>
                      ) : (
                        colTasks.map((t) => {
                          const isRejected = t.rejection_status === 'requested';
                          const isOverdue = isTaskOverdue(t);
                          const isDueToday = isTaskDueToday(t);
                          const isClaimedByMe = t.claimed_by === user?.id;
                          const isClaimedByOther = t.claimed_by && t.claimed_by !== user?.id && t.status === 'in_progress';
                          const assignees = t.assignees || (t.assignee_name ? [{ id: t.assigned_to, name: t.assignee_name, avatar: t.assignee_avatar, role: t.assignee_role }] : []);

                          return (
                            <div
                              key={t.id}
                              onClick={() => onSelectTask(t.id)}
                              className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                                isRejected 
                                  ? 'border-amber-400 ring-2 ring-amber-100 dark:ring-amber-900 shadow-sm' 
                                  : isOverdue
                                  ? 'border-rose-300 hover:border-rose-400 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                              }`}
                            >
                              {/* Priority and Urgency Badges */}
                              <div className="flex items-center justify-between gap-1 flex-wrap mb-2">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {getPriorityBadge(t.priority)}
                                  {isOverdue && (
                                    <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 dark:border-rose-800 animate-pulse">
                                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                                      Overdue
                                    </span>
                                  )}
                                  {isDueToday && (
                                    <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      Due Today
                                    </span>
                                  )}
                                  {t.deliverable_url && (
                                    <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200 dark:border-indigo-800" title={t.deliverable_url}>
                                      <Link2 className="w-3 h-3 text-indigo-500" />
                                      Proof
                                    </span>
                                  )}
                                </div>
                                {isRejected && (
                                  <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 animate-pulse">
                                    <ShieldAlert className="w-3 h-3 text-amber-600" />
                                    Reassignment
                                  </span>
                                )}
                              </div>

                              {/* Active worker concurrency lock indicator */}
                              {t.claimed_by_name && t.status === 'in_progress' && (
                                <div className="mb-2">
                                  {isClaimedByMe ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                      <span>⚡ Active (You)</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                                      <Lock className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                      <span>Started by {t.claimed_by_name}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              <h3 className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2">
                                {t.title}
                              </h3>

                              {t.description && (
                                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 line-clamp-2">
                                  {t.description}
                                </p>
                              )}

                              {/* Progress bar */}
                              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
                                  <span>Progress</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t.progress_pct || 0}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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

                              {/* Multi-Assignee & Due Date Footer */}
                              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {assignees.length > 1 ? (
                                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                                      {assignees.slice(0, 3).map((a) => (
                                        <UserAvatar key={a.id} name={a.name} avatar={a.avatar} role={a.role} size="xs" />
                                      ))}
                                      {assignees.length > 3 && (
                                        <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 w-5 h-5 rounded-full flex items-center justify-center border border-white dark:border-slate-900">
                                          +{assignees.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  ) : assignees.length === 1 ? (
                                    <UserAvatar name={assignees[0].name} avatar={assignees[0].avatar} role={assignees[0].role} size="xs" />
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                  )}
                                  
                                  <span className="truncate max-w-[100px] font-medium text-slate-700 dark:text-slate-300 text-[11px]">
                                    {assignees.length > 1 ? `${assignees.length} assignees` : (assignees[0]?.name || 'Unassigned')}
                                  </span>
                                </div>

                                {t.due_date && (
                                  <div className={`flex items-center gap-1 text-[11px] shrink-0 ${
                                    isOverdue
                                      ? 'text-rose-600 font-bold'
                                      : isDueToday
                                      ? 'text-amber-700 dark:text-amber-400 font-bold'
                                      : 'text-slate-500 dark:text-slate-400'
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

      {/* LIST TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Mobile Card View (md:hidden) */}
          <div className="md:hidden space-y-3">
            {displayedTasks.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No deliverables found matching your criteria.
              </div>
            ) : (
              displayedTasks.map((t) => {
                const isOverdue = isTaskOverdue(t);
                const isDueToday = isTaskDueToday(t);
                const assignees = t.assignees || (t.assignee_name ? [{ id: t.assigned_to, name: t.assignee_name, avatar: t.assignee_avatar, role: t.assignee_role }] : []);

                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectTask(t.id)}
                    className={`bg-white dark:bg-slate-900 p-4 rounded-2xl border shadow-2xs space-y-3 active:scale-[0.99] transition-all cursor-pointer ${
                      isOverdue ? 'border-rose-200 dark:border-rose-900' : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getPriorityBadge(t.priority)}
                        <span className="text-[10px] text-slate-400">#{t.id}</span>
                        {isOverdue && (
                          <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200 dark:border-rose-800 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            Overdue
                          </span>
                        )}
                        {isDueToday && (
                          <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Due Today
                          </span>
                        )}
                        {t.claimed_by_name && t.status === 'in_progress' && (
                          <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                            <Lock className="w-2.5 h-2.5 text-amber-600" />
                            {t.claimed_by_name}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        t.status === 'completed'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                          : t.status === 'in_progress'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                          : t.status === 'review'
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {t.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">{t.title}</h3>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="flex items-center gap-1.5">
                        {assignees.length > 1 ? (
                          <div className="flex items-center -space-x-1.5">
                            {assignees.slice(0, 2).map((a) => (
                              <UserAvatar key={a.id} name={a.name} avatar={a.avatar} role={a.role} size="xs" />
                            ))}
                            <span className="text-[9px] font-bold text-slate-500 pl-1">{assignees.length} assignees</span>
                          </div>
                        ) : (
                          <>
                            <UserAvatar name={assignees[0]?.name} avatar={assignees[0]?.avatar} role={assignees[0]?.role} size="xs" />
                            <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs truncate max-w-[120px]">
                              {assignees[0]?.name || 'Unassigned'}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{t.progress_pct || 0}%</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">Details →</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table View (hidden md:block) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Task Title</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Assignee(s)</th>
                    <th className="py-3.5 px-4">Due Date</th>
                    <th className="py-3.5 px-4 text-center">Progress</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedTasks.map((t) => {
                    const isOverdue = isTaskOverdue(t);
                    const isDueToday = isTaskDueToday(t);
                    const assignees = t.assignees || (t.assignee_name ? [{ id: t.assigned_to, name: t.assignee_name, avatar: t.assignee_avatar, role: t.assignee_role }] : []);

                    return (
                      <tr
                        key={t.id}
                        onClick={() => onSelectTask(t.id)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          isOverdue ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
                        }`}
                      >
                        <td className="py-4 px-6 max-w-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">{t.title}</span>
                              {t.deliverable_url && (
                                <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.2 rounded-full border border-indigo-200 dark:border-indigo-800 shrink-0 flex items-center gap-1" title={t.deliverable_url}>
                                  <Link2 className="w-3 h-3 text-indigo-500" />
                                  Proof
                                </span>
                              )}
                              {t.claimed_by_name && t.status === 'in_progress' && (
                                <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-2 py-0.2 rounded-full border border-amber-200 dark:border-amber-800 shrink-0 flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5 text-amber-600" />
                                  {t.claimed_by_name}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5 truncate">{t.description || 'No description'}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            t.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : t.status === 'in_progress'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                              : t.status === 'review'
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}>
                            {t.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          {getPriorityBadge(t.priority)}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            {assignees.length > 1 ? (
                              <div className="flex items-center -space-x-1.5">
                                {assignees.slice(0, 3).map((a) => (
                                  <UserAvatar key={a.id} name={a.name} avatar={a.avatar} role={a.role} size="xs" />
                                ))}
                                {assignees.length > 3 && (
                                  <span className="text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 w-5 h-5 rounded-full flex items-center justify-center border border-white dark:border-slate-800">
                                    +{assignees.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <UserAvatar name={assignees[0]?.name} avatar={assignees[0]?.avatar} role={assignees[0]?.role} size="xs" />
                            )}
                            <span className="font-medium truncate max-w-[120px]">
                              {assignees.length > 1 ? `${assignees.length} assignees` : (assignees[0]?.name || 'Unassigned')}
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {t.due_date ? (
                            <div className="flex flex-col">
                              <span className={isOverdue ? 'text-rose-600 font-bold' : isDueToday ? 'text-amber-700 font-bold' : ''}>
                                {t.due_date}
                              </span>
                              {isOverdue && (
                                <span className="text-[10px] text-rose-500 font-bold">⚠️ Overdue</span>
                              )}
                              {isDueToday && (
                                <span className="text-[10px] text-amber-600 font-bold">⏰ Due Today</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="w-24 mx-auto">
                            <span className="font-bold text-[11px] block mb-1">{t.progress_pct || 0}%</span>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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
                        </td>

                        <td className="py-4 px-6 text-right">
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                            View →
                          </span>
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
