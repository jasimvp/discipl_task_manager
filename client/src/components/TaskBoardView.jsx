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
  ArrowRight
} from 'lucide-react';

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* Priority filter */}
          <div>
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
          <div>
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
              All Columns ({tasks.length})
            </button>
            {columns.map((c) => {
              const count = tasks.filter((t) => t.status === c.key).length;
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
                const colTasks = tasks.filter((t) => t.status === col.key);
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
                      return (
                        <div
                          key={t.id}
                          onClick={() => onSelectTask(t.id)}
                          className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                            isRejected 
                              ? 'border-amber-400 ring-2 ring-amber-100 shadow-sm' 
                              : 'border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          {/* Priority and Reassignment Warning Badge */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            {getPriorityBadge(t.priority)}
                            {isRejected && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 animate-pulse">
                                <ShieldAlert className="w-3 h-3 text-amber-600" />
                                Reassignment Requested
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
                              <img
                                src={t.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={t.assignee_name}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <span className="truncate max-w-[90px] font-medium text-slate-700">
                                {t.assignee_name || 'Unassigned'}
                              </span>
                            </div>

                            {t.due_date && (
                              <div className="flex items-center gap-1 text-slate-500">
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
            {tasks.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No deliverables found matching your criteria.
              </div>
            ) : (
              tasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTask(t.id)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(t.priority)}
                      <span className="text-[10px] text-slate-400">#{t.id}</span>
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
                      <img
                        src={t.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={t.assignee_name}
                        className="w-6 h-6 rounded-md object-cover"
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
              ))
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
                  {tasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTask(t.id)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-6 max-w-xs">
                        <div>
                          <span className="font-bold text-slate-900 text-sm block truncate">{t.title}</span>
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
                          <img
                            src={t.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={t.assignee_name}
                            className="w-6 h-6 rounded-md object-cover"
                          />
                          <span className="font-semibold text-slate-800">{t.assignee_name || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-slate-600">{t.due_date || 'None'}</span>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
