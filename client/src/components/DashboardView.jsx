import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  CheckCircle2, 
  Clock, 
  ListTodo, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  ArrowRight, 
  PlusCircle, 
  Sparkles,
  RefreshCw,
  Briefcase,
  KeyRound,
  ShieldCheck,
  Check,
  Calendar,
  AlertCircle,
  Link2,
  UserPlus,
  Lock
} from 'lucide-react';
import DisciplLogo from './DisciplLogo';
import UserAvatar from './UserAvatar';

export default function DashboardView({ onNavigateTab, onOpenCreateTask, onSelectTask, onOpenAddEmployee }) {
  const { user, socket } = useAuth();
  const [stats, setStats] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';
  const isEmployee = user?.role === 'employee';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, tasksData] = await Promise.all([
        api.getDashboardStats(),
        api.getTasks(isEmployee ? { assigned_to: user?.id } : isLead ? { team_id: user?.team_id } : {}),
      ]);
      setStats(statsData);
      setMyTasks(tasksData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  // Real-time dynamic updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => fetchDashboardData();

    socket.on('task_created', handleSync);
    socket.on('task_updated', handleSync);
    socket.on('task_claimed', handleSync);
    socket.on('task_reassigned', handleSync);
    socket.on('rejection_requested', handleSync);
    socket.on('task_deleted', handleSync);
    socket.on('access_approved', handleSync);
    socket.on('user_added', handleSync);

    return () => {
      socket.off('task_created', handleSync);
      socket.off('task_updated', handleSync);
      socket.off('task_claimed', handleSync);
      socket.off('task_reassigned', handleSync);
      socket.off('rejection_requested', handleSync);
      socket.off('task_deleted', handleSync);
      socket.off('access_approved', handleSync);
      socket.off('user_added', handleSync);
    };
  }, [socket]);

  // Quick progress update for employees directly from dashboard
  const handleQuickStatusUpdate = async (taskId, newStatus, newProgress) => {
    try {
      await api.updateTask(taskId, {
        status: newStatus,
        progress_pct: newProgress,
      });
      fetchDashboardData();
    } catch (err) {
      alert(err.message || 'Failed to update task');
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-medium text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600 dark:text-indigo-400" />
          Loading workspace metrics...
        </div>
      </div>
    );
  }

  const summary = stats?.summary || {};
  const employeeStats = stats?.employeeStats || [];

  // Employee-specific calculation
  const myCompletedCount = myTasks.filter((t) => t.status === 'completed').length;
  const myInProgressCount = myTasks.filter((t) => t.status === 'in_progress').length;
  const myTodoCount = myTasks.filter((t) => t.status === 'todo').length;
  const myTotalCount = myTasks.length;
  const myCompletionRate = myTotalCount > 0 ? Math.round((myCompletedCount / myTotalCount) * 100) : 0;

  return (
    <div className="space-y-6 pb-12 transition-colors">
      
      {/* Dynamic Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isFounder 
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                  : isLead 
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isFounder ? '👑 Founder View' : isLead ? '🛡️ Team Lead View' : '💼 Employee Workspace'}
              </span>
              <span className="text-xs text-slate-400 font-medium">Discipl Real-Time Hub</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isFounder 
                ? 'High-level visibility into company-wide project delivery, team capacity, and deliverables.'
                : isLead 
                ? `Supervise deliverables and track capacity for the ${user?.department || 'core'} department.`
                : 'Manage your tasks, attach proof deliverables, and collaborate with your teammates.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {/* Founder Add Teammate by Email */}
            {isFounder && (
              <button
                onClick={onOpenAddEmployee}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>Link Teammate</span>
              </button>
            )}

            {/* Quick Action: Create Task (Founder & Lead) */}
            {(isFounder || isLead) && (
              <button
                onClick={onOpenCreateTask}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Assign Task</span>
              </button>
            )}

            <button
              onClick={() => onNavigateTab('tasks')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition-all"
            >
              <span>{isEmployee ? 'My Tasks Board' : 'View Task Board'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Urgent Reassignment Banner */}
      {(isFounder || isLead) && (summary.pendingRejections || 0) > 0 && (
        <div className="rounded-3xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                {summary.pendingRejections} Reassignment Request(s) Require Your Action
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Employees have reported misallocated deliverables requiring reassignment.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('reassignments')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shrink-0 shadow-xs"
          >
            Review & Reassign
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW A: EMPLOYEE USER-SCOPED WORKSPACE                                  */}
      {/* ========================================================================= */}
      {isEmployee && (
        <div className="space-y-6">
          {/* Personal KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Assigned to Me
              </span>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{myTotalCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">Total active deliverables</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                Completed
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{myCompletedCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">{myCompletionRate}% delivered</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block mb-1">
                In Progress
              </span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{myInProgressCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">Actively working</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                Pending / To Do
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{myTodoCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">Queued tasks</p>
            </div>
          </div>

          {/* My Deliverables List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  My Assigned Deliverables ({myTasks.length})
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Update your progress directly or click to view deliverables and discussions.
                </p>
              </div>
            </div>

            {myTasks.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">No tasks assigned yet!</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your founder or team lead will assign deliverables to you soon.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {myTasks.map((t) => {
                  const isRejected = t.rejection_status === 'requested';
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isOverdue = t.due_date && t.due_date < todayStr && t.status !== 'completed';
                  const isDueToday = t.due_date && t.due_date === todayStr && t.status !== 'completed';
                  const isClaimedByMe = t.claimed_by === user?.id;
                  const isClaimedByOther = t.claimed_by && t.claimed_by !== user?.id && t.status === 'in_progress';
                  const assignees = t.assignees || (t.assignee_name ? [{ id: t.assigned_to, name: t.assignee_name, avatar: t.assignee_avatar, role: t.assignee_role }] : []);

                  return (
                    <div key={t.id} className="p-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              t.priority === 'urgent'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                : t.priority === 'high'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                            }`}>
                              {t.priority}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">Task #{t.id}</span>
                            {t.due_date && (
                              <span className={`text-xs flex items-center gap-1 ${
                                isOverdue ? 'text-rose-600 font-bold' : isDueToday ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'
                              }`}>
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Due: {t.due_date}
                              </span>
                            )}
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
                              <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-200 dark:border-indigo-800">
                                <Link2 className="w-3 h-3 text-indigo-500" />
                                Deliverable Attached
                              </span>
                            )}
                            {t.claimed_by_name && t.status === 'in_progress' && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                                isClaimedByMe 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              }`}>
                                <Lock className="w-2.5 h-2.5" />
                                {isClaimedByMe ? 'You are active worker' : `Started by ${t.claimed_by_name}`}
                              </span>
                            )}
                          </div>
                          <h3 
                            onClick={() => onSelectTask(t.id)}
                            className="font-bold text-slate-900 dark:text-white text-base cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            {t.title}
                          </h3>
                        </div>

                        {/* Status selector */}
                        <div className="flex items-center gap-2">
                          <select
                            disabled={isClaimedByOther}
                            value={t.status}
                            onChange={(e) => handleQuickStatusUpdate(t.id, e.target.value, e.target.value === 'completed' ? 100 : t.progress_pct)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                              t.status === 'completed'
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : t.status === 'in_progress'
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            } ${isClaimedByOther ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Under Review</option>
                            <option value="completed">Completed</option>
                          </select>

                          <button
                            onClick={() => onSelectTask(t.id)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            Open Details
                          </button>
                        </div>
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      {/* Multi-assignees */}
                      {assignees.length > 1 && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="text-[11px] font-semibold text-slate-400">Co-Assignees:</span>
                          <div className="flex items-center -space-x-1.5">
                            {assignees.map((a) => (
                              <UserAvatar key={a.id} name={a.name} avatar={a.avatar} role={a.role} size="xs" />
                            ))}
                          </div>
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            {assignees.map(a => a.name).join(', ')}
                          </span>
                        </div>
                      )}

                      {/* Inline Progress Bar */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Completion Progress</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{t.progress_pct || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              t.progress_pct === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${t.progress_pct || 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B & C: FOUNDER & TEAM LEAD OPERATIONS DASHBOARD                    */}
      {/* ========================================================================= */}
      {(isFounder || isLead) && (
        <div className="space-y-8">
          
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isFounder ? 'Company Tasks' : 'Team Tasks'}
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <ListTodo className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{summary.totalTasks || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Across deliverables</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Completed</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">{summary.completedTasks || 0}</span>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    {summary.completionRate || 0}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Successfully delivered</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">In Progress</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400">{summary.inProgressTasks || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Actively being worked on</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Remaining</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{summary.remainingTasks || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Pending delivery completion</p>
              </div>
            </div>
          </div>

          {/* Employee Status & Workload Tracker Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h2 className="font-bold text-base text-slate-900 dark:text-white">
                    {isFounder ? 'Company Employee Workload & Capacity' : 'Team Member Capacity Tracker'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time visibility into each member's tasks, completion rates, and active workload.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isFounder && (
                  <button
                    onClick={onOpenAddEmployee}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Link Teammate
                  </button>
                )}

                <button
                  onClick={onOpenCreateTask}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                >
                  <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Assign Task
                </button>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3.5 px-6">Member</th>
                    <th className="py-3.5 px-4">Role / Department</th>
                    <th className="py-3.5 px-4 text-center">Assigned</th>
                    <th className="py-3.5 px-4 text-center">Completed</th>
                    <th className="py-3.5 px-4 text-center">In Progress</th>
                    <th className="py-3.5 px-4 text-center">Remaining</th>
                    <th className="py-3.5 px-6">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {employeeStats.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">
                        No team members registered yet.
                      </td>
                    </tr>
                  ) : (
                    employeeStats.map((emp) => {
                      const remaining = (emp.total_tasks || 0) - (emp.completed_tasks || 0);
                      const isSelectedUser = emp.id === user?.id;
                      return (
                        <tr 
                          key={emp.id} 
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${isSelectedUser ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''}`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <UserAvatar
                                name={emp.name}
                                avatar={emp.avatar}
                                role={emp.role}
                                size="md"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm">{emp.name}</span>
                                  {isSelectedUser && (
                                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded font-bold">You</span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400">{emp.title}</span>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="space-y-0.5">
                              <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                emp.role === 'founder' 
                                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' 
                                  : emp.role === 'team_lead' 
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300' 
                                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              }`}>
                                {emp.role === 'founder' ? 'Founder' : emp.role === 'team_lead' ? 'Team Lead' : 'Employee'}
                              </span>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{emp.department || emp.team_name || 'General'}</div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center font-bold text-slate-900 dark:text-white">
                            {emp.total_tasks || 0}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                              {emp.completed_tasks || 0}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                              {emp.in_progress_tasks || 0}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className={`font-bold px-2 py-0.5 rounded-md ${
                              remaining > 0 ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60' : 'text-slate-400'
                            }`}>
                              {remaining}
                            </span>
                          </td>

                          <td className="py-4 px-6 min-w-[180px]">
                            <div>
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-bold text-slate-700 dark:text-slate-300">{emp.completion_pct}%</span>
                                <span className="text-slate-400">{emp.completed_tasks}/{emp.total_tasks} done</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    emp.completion_pct === 100 
                                      ? 'bg-emerald-500' 
                                      : emp.completion_pct > 50 
                                      ? 'bg-indigo-600' 
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${emp.completion_pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
