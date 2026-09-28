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
  UserCheck, 
  Sparkles,
  RefreshCw,
  FolderGit2
} from 'lucide-react';

export default function DashboardView({ onNavigateTab, onOpenCreateTask, onSelectTask }) {
  const { user, socket } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  // Real-time dynamic updates via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => fetchStats();

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
          Loading dashboard metrics...
        </div>
      </div>
    );
  }

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';
  const isEmployee = user?.role === 'employee';

  const summary = stats?.summary || {};
  const employeeStats = stats?.employeeStats || [];
  const pendingRejections = stats?.pendingRejectionTasks || [];

  return (
    <div className="space-y-8 pb-12">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-indigo-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>
                {isFounder ? 'Discipl Executive Command Center' : isLead ? 'Discipl Team Leader Command Center' : 'Discipl Workspace'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name} 👋
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              {isFounder 
                ? 'Complete company-wide visibility: Track real-time progress, employee workloads, pending tasks, and reassignment requests.'
                : isLead
                ? 'Manage your team deliverables, assign tasks, review employee progress, and resolve any wrongly assigned tasks.'
                : 'Stay on top of your assigned deliverables, update your progress, and request reassignment if a task is wrongly allocated.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(isFounder || isLead) && (
              <button
                onClick={onOpenCreateTask}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                Assign New Task
              </button>
            )}
            <button
              onClick={() => onNavigateTab('tasks')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 backdrop-blur-md text-white border border-white/10 text-sm font-semibold transition-all"
            >
              <ListTodo className="w-4 h-4" />
              View All Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Rejection / Wrong Assignment Alert Box (If any pending) */}
      {pendingRejections.length > 0 && (isFounder || isLead) && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 text-base">
                    {pendingRejections.length} Reassignment Request{pendingRejections.length > 1 ? 's' : ''} Pending Review
                  </h3>
                  <span className="bg-amber-200 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold">Action Required</span>
                </div>
                <p className="text-amber-800 text-xs mt-1">
                  Employees have reported tasks assigned by mistake or outside their domain. Review their reasons and reassign to the right team member.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('reassignments')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs"
            >
              Review & Reassign
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-200/60 grid sm:grid-cols-2 gap-3">
            {pendingRejections.slice(0, 2).map((item) => (
              <div key={item.id} className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 truncate">{item.title}</span>
                  <span className="text-[10px] text-rose-600 font-semibold uppercase">{item.priority}</span>
                </div>
                <p className="text-slate-600 text-[11px] mt-1 line-clamp-2 italic">
                  "{item.rejection_reason}"
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  <span>Reported by: <strong>{item.assigned_to_name}</strong></span>
                  <button
                    onClick={() => {
                      if (onSelectTask) onSelectTask(item.id);
                    }}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Open Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tasks</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ListTodo className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{summary.totalTasks || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Across all departments</p>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{summary.completedTasks || 0}</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                {summary.completionRate || 0}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Successfully delivered</p>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">{summary.inProgressTasks || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Actively being worked on</p>
          </div>
        </div>

        {/* Remaining to Complete */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">{summary.remainingTasks || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Pending delivery completion</p>
          </div>
        </div>

      </div>

      {/* Employee Status & Workload Table (Key requirement for Founders & Leads) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-lg text-slate-900">
                Employee Task Status & Workload Tracker
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Real-time monitoring of each employee's completed vs. pending tasks and current workload capacity.
            </p>
          </div>

          {(isFounder || isLead) && (
            <button
              onClick={onOpenCreateTask}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 text-indigo-600" />
              Assign Task
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-6">Employee</th>
                <th className="py-3.5 px-4">Role / Department</th>
                <th className="py-3.5 px-4 text-center">Assigned Tasks</th>
                <th className="py-3.5 px-4 text-center">Completed</th>
                <th className="py-3.5 px-4 text-center">In Progress</th>
                <th className="py-3.5 px-4 text-center">Remaining</th>
                <th className="py-3.5 px-6">Completion Progress</th>
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
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
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

                    <td className="py-4 px-4 text-center">
                      <span className="font-bold text-slate-900 text-sm">{emp.total_tasks || 0}</span>
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
                          <span className="text-slate-400">
                            {emp.completed_tasks}/{emp.total_tasks} done
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              emp.completion_pct === 100 
                                ? 'bg-emerald-500' 
                                : emp.completion_pct > 50 
                                ? 'bg-indigo-500' 
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${emp.completion_pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
