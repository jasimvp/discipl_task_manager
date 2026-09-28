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
  AlertCircle
} from 'lucide-react';
import DisciplLogo from './DisciplLogo';

export default function DashboardView({ onNavigateTab, onOpenCreateTask, onSelectTask }) {
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
    socket.on('task_reassigned', handleSync);
    socket.on('rejection_requested', handleSync);
    socket.on('task_deleted', handleSync);
    socket.on('access_approved', handleSync);
    socket.on('user_added', handleSync);

    return () => {
      socket.off('task_created', handleSync);
      socket.off('task_updated', handleSync);
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
        <div className="flex items-center gap-3 text-slate-500 font-medium text-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          Loading workspace metrics...
        </div>
      </div>
    );
  }

  const summary = stats?.summary || {};
  const employeeStats = stats?.employeeStats || [];
  const pendingRejections = stats?.pendingRejectionTasks || [];

  // Scoped Employee metrics
  const myCompletedCount = myTasks.filter((t) => t.status === 'completed').length;
  const myInProgressCount = myTasks.filter((t) => t.status === 'in_progress').length;
  const myTodoCount = myTasks.filter((t) => t.status === 'todo').length;
  const myTotalCount = myTasks.length;
  const myCompletionRate = myTotalCount > 0 ? Math.round((myCompletedCount / myTotalCount) * 100) : 0;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Dynamic Welcome Banner tailored to Role */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <DisciplLogo className="w-12 h-12 hidden sm:flex shrink-0" size={28} />
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {isFounder
                    ? 'Discipl Executive Command'
                    : isLead
                    ? `${user?.department || 'Department'} Operations`
                    : 'Personal Workspace'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.name}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
                {isFounder
                  ? 'Complete company-wide visibility: Track real-time progress, employee workloads, pending tasks, and reassignment requests.'
                  : isLead
                  ? 'Monitor team deliverables, manage capacity, assign tasks, and handle reassignment requests.'
                  : 'Manage your deliverables, track your progress, and request reassignment if a task was wrongly assigned.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {(isFounder || isLead) && (
              <button
                onClick={onOpenCreateTask}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Assign Task
              </button>
            )}
            {isFounder && (
              <button
                onClick={() => onNavigateTab('access')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Access Requests
              </button>
            )}
            <button
              onClick={() => onNavigateTab('tasks')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-bold transition-all"
            >
              <ListTodo className="w-4 h-4" />
              {isEmployee ? 'My Tasks' : 'All Tasks'}
            </button>
          </div>
        </div>
      </div>

      {/* REASSIGNMENT ALERT BANNER (For Founders & Team Leads) */}
      {(isFounder || isLead) && pendingRejections.length > 0 && (
        <div className="rounded-3xl border border-amber-300/80 bg-amber-50/90 p-5 shadow-xs animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 text-sm">
                    {pendingRejections.length} Task Reassignment Request{pendingRejections.length > 1 ? 's' : ''} Pending
                  </h3>
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Action Required</span>
                </div>
                <p className="text-amber-800 text-xs mt-0.5">
                  Employees have reported tasks assigned by mistake or outside their expertise. Review reasons and reassign.
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW A: EMPLOYEE USER-SCOPED WORKSPACE                                  */}
      {/* ========================================================================= */}
      {isEmployee && (
        <div className="space-y-6">
          {/* Personal KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Assigned to Me
              </span>
              <div className="text-2xl font-black text-slate-900">{myTotalCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">Total active deliverables</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block mb-1">
                Completed
              </span>
              <div className="text-2xl font-black text-emerald-600">{myCompletedCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">{myCompletionRate}% delivered</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block mb-1">
                In Progress
              </span>
              <div className="text-2xl font-black text-blue-600">{myInProgressCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">Actively working</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider block mb-1">
                Pending / To Do
              </span>
              <div className="text-2xl font-black text-amber-600">{myTodoCount}</div>
              <p className="text-[11px] text-slate-400 mt-1">Queued tasks</p>
            </div>
          </div>

          {/* My Deliverables List (Focused, Distraction-Free) */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  My Assigned Deliverables ({myTasks.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your progress directly or request reassignment if wrongly allocated.
                </p>
              </div>
            </div>

            {myTasks.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="font-bold text-slate-800 text-sm">No tasks assigned yet!</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your founder or team lead will assign deliverables to you soon. When they do, they will appear right here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {myTasks.map((t) => {
                  const isRejected = t.rejection_status === 'requested';
                  return (
                    <div key={t.id} className="p-6 hover:bg-slate-50/70 transition-colors space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              t.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-700'
                                : t.priority === 'high'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {t.priority}
                            </span>
                            <span className="text-xs font-semibold text-slate-400">Task #{t.id}</span>
                            {t.due_date && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                Due: {t.due_date}
                              </span>
                            )}
                          </div>
                          <h3 
                            onClick={() => onSelectTask(t.id)}
                            className="font-bold text-slate-900 text-base cursor-pointer hover:text-indigo-600 transition-colors"
                          >
                            {t.title}
                          </h3>
                        </div>

                        {/* Status selector */}
                        <div className="flex items-center gap-2">
                          <select
                            value={t.status}
                            onChange={(e) => handleQuickStatusUpdate(t.id, e.target.value, e.target.value === 'completed' ? 100 : t.progress_pct)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                              t.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : t.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Under Review</option>
                            <option value="completed">Completed</option>
                          </select>

                          <button
                            onClick={() => onSelectTask(t.id)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                          >
                            Open Details
                          </button>
                        </div>
                      </div>

                      {t.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      {/* Rejection requested alert */}
                      {isRejected && (
                        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                          <span className="font-bold block">Reassignment Requested:</span>
                          <span className="italic">"{t.rejection_reason}"</span>
                        </div>
                      )}

                      {/* Inline Progress Bar */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-slate-500 font-medium">Completion Progress</span>
                          <span className="font-bold text-slate-800">{t.progress_pct || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {isFounder ? 'Company Tasks' : 'Team Tasks'}
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ListTodo className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{summary.totalTasks || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Across deliverables</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600">{summary.completedTasks || 0}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {summary.completionRate || 0}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Successfully delivered</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">In Progress</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-blue-600">{summary.inProgressTasks || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Actively being worked on</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Remaining</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-black text-slate-900">{summary.remainingTasks || 0}</div>
                <p className="text-xs text-slate-400 mt-1">Pending delivery completion</p>
              </div>
            </div>
          </div>

          {/* Employee Status & Workload Tracker Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h2 className="font-bold text-base text-slate-900">
                    {isFounder ? 'Company Employee Workload & Status' : 'Team Member Capacity Tracker'}
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time visibility into each member's tasks, completion rates, and active workload.
                </p>
              </div>

              <button
                onClick={onOpenCreateTask}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shrink-0"
              >
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                Assign Task
              </button>
            </div>

            {/* Mobile Card List (sm:hidden) */}
            <div className="sm:hidden divide-y divide-slate-100">
              {employeeStats.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs px-4">
                  No team members registered yet.
                </div>
              ) : (
                employeeStats.map((emp) => {
                  const remaining = (emp.total_tasks || 0) - (emp.completed_tasks || 0);
                  const isSelectedUser = emp.id === user?.id;
                  return (
                    <div key={emp.id} className={`p-4 space-y-3 ${isSelectedUser ? 'bg-indigo-50/20' : ''}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                            alt={emp.name}
                            className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">{emp.name}</span>
                              {isSelectedUser && (
                                <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-bold">You</span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400">{emp.title || emp.department}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          emp.role === 'founder' 
                            ? 'bg-purple-100 text-purple-700' 
                            : emp.role === 'team_lead' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {emp.role === 'founder' ? 'Founder' : emp.role === 'team_lead' ? 'Lead' : 'Employee'}
                        </span>
                      </div>

                      {/* Mini stats */}
                      <div className="grid grid-cols-4 gap-1 text-center bg-slate-50 p-2 rounded-xl text-[10px]">
                        <div>
                          <span className="text-slate-400 block">Assigned</span>
                          <span className="font-bold text-slate-800">{emp.total_tasks || 0}</span>
                        </div>
                        <div>
                          <span className="text-emerald-600 block">Done</span>
                          <span className="font-bold text-emerald-600">{emp.completed_tasks || 0}</span>
                        </div>
                        <div>
                          <span className="text-blue-600 block">Working</span>
                          <span className="font-bold text-blue-600">{emp.in_progress_tasks || 0}</span>
                        </div>
                        <div>
                          <span className="text-amber-600 block">Pending</span>
                          <span className="font-bold text-amber-600">{remaining}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Completion</span>
                          <span className="font-bold text-slate-800">{emp.completion_pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              emp.completion_pct === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${emp.completion_pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View (hidden sm:block) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
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
                <tbody className="divide-y divide-slate-100">
                  {employeeStats.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">
                        No team members registered yet. Invite your colleagues to register for Discipl!
                      </td>
                    </tr>
                  ) : (
                    employeeStats.map((emp) => {
                      const remaining = (emp.total_tasks || 0) - (emp.completed_tasks || 0);
                      const isSelectedUser = emp.id === user?.id;
                      return (
                        <tr 
                          key={emp.id} 
                          className={`hover:bg-slate-50/80 transition-colors ${isSelectedUser ? 'bg-indigo-50/30' : ''}`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <img
                                src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt={emp.name}
                                className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">{emp.name}</span>
                                  {isSelectedUser && (
                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">You</span>
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
                                  ? 'bg-purple-100 text-purple-700' 
                                  : emp.role === 'team_lead' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {emp.role === 'founder' ? 'Founder' : emp.role === 'team_lead' ? 'Team Lead' : 'Employee'}
                              </span>
                              <div className="text-[11px] text-slate-500">{emp.department || emp.team_name || 'General'}</div>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-center font-bold text-slate-900">
                            {emp.total_tasks || 0}
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {emp.completed_tasks || 0}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                              {emp.in_progress_tasks || 0}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className={`font-bold px-2 py-0.5 rounded-md ${
                              remaining > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-400'
                            }`}>
                              {remaining}
                            </span>
                          </td>

                          <td className="py-4 px-6 min-w-[180px]">
                            <div>
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="font-bold text-slate-700">{emp.completion_pct}%</span>
                                <span className="text-slate-400">{emp.completed_tasks}/{emp.total_tasks} done</span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
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
