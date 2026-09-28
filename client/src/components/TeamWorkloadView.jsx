import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Users, 
  MessageSquare, 
  PlusCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Mail, 
  Briefcase 
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function TeamWorkloadView({ onOpenCreateTask, onOpenChatWithUser }) {
  const { user, availableUsers } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getDashboardStats();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [user]);

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';
  const employeeStats = stats?.employeeStats || [];

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900">Team Directory & Workload Status</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Check employee availability, progress on assigned tasks, and communicate directly with team members.
          </p>
        </div>

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

      {/* Grid of Employee Workload Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {employeeStats.map((emp) => {
          const remaining = (emp.total_tasks || 0) - (emp.completed_tasks || 0);
          const isMe = emp.id === user?.id;

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-3xl border p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                isMe ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Header with Avatar and Role */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={emp.name}
                      avatar={emp.avatar}
                      role={emp.role}
                      size="lg"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                        {isMe && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">You</span>}
                      </div>
                      <p className="text-xs text-slate-500">{emp.title || 'Team Member'}</p>
                      <p className="text-[10px] text-slate-400">{emp.department || emp.team_name || 'General'}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    emp.role === 'founder'
                      ? 'bg-purple-100 text-purple-700'
                      : emp.role === 'team_lead'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {emp.role === 'founder' ? 'Founder' : emp.role === 'team_lead' ? 'Lead' : 'Employee'}
                  </span>
                </div>

                {/* Task Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center mb-4">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Assigned</span>
                    <span className="font-extrabold text-slate-800 text-sm">{emp.total_tasks || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600 block font-semibold">Done</span>
                    <span className="font-extrabold text-emerald-600 text-sm">{emp.completed_tasks || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600 block font-semibold">Pending</span>
                    <span className="font-extrabold text-amber-600 text-sm">{remaining}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1 mb-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Completion Rate</span>
                    <span className="font-bold text-slate-800">{emp.completion_pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
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
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                {!isMe && (
                  <button
                    onClick={() => onOpenChatWithUser(emp.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    Send Message
                  </button>
                )}
                {isMe && <div className="text-[11px] text-slate-400 italic">Your active profile</div>}

                {(isFounder || isLead) && !isMe && (
                  <button
                    onClick={onOpenCreateTask}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    + Assign Task
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
