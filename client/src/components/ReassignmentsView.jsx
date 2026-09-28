import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  ShieldAlert, 
  UserCheck, 
  ArrowRight, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  UserPlus, 
  Info,
  Calendar
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function ReassignmentsView({ onSelectTask }) {
  const { user, availableUsers } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Reassignment modal dialog state
  const [selectedTaskForReassign, setSelectedTaskForReassign] = useState(null);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [reassignNote, setReassignNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchReassignmentTasks = async () => {
    try {
      setLoading(true);
      // Fetch both pending requests and recently reassigned
      const pendingData = await api.getTasks({ rejection_only: 'true' });
      setTasks(pendingData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReassignmentTasks();
  }, [user]);

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';
  const canManage = isFounder || isLead;

  const handleConfirmReassign = async (e) => {
    e.preventDefault();
    if (!newAssigneeId || !selectedTaskForReassign) return;

    try {
      setSubmitting(true);
      await api.reassignTask(selectedTaskForReassign.id, {
        new_assignee_id: Number(newAssigneeId),
        notes: reassignNote.trim(),
      });
      setMessage('Task successfully reassigned!');
      setSelectedTaskForReassign(null);
      setNewAssigneeId('');
      setReassignNote('');
      fetchReassignmentTasks();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to reassign task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineRequest = async (taskId) => {
    if (!window.confirm('Are you sure you want to decline this reassignment request?')) return;
    try {
      await api.reassignTask(taskId, {
        dismiss_rejection: true,
        notes: 'Reassignment declined by leadership.',
      });
      fetchReassignmentTasks();
    } catch (err) {
      alert(err.message || 'Failed to decline request');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>Reassignment & Delegation Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Wrongly Assigned Task Requests
            </h1>
            <p className="text-amber-100 text-xs sm:text-sm mt-1 max-w-xl">
              When an employee receives a task outside their domain or skill set, their reassignment request appears here for Founders & Team Leads to review and reassign.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center shrink-0">
            <span className="text-2xl font-black">{tasks.length}</span>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-100">
              Pending Requests
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {/* Main List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-base text-slate-900">
            Active Reassignment Submissions ({tasks.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review the rationale submitted by the employee and allocate the task to the right specialist.
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Pending Reassignment Requests!</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All tasks are correctly assigned and in progress. If an employee flags a wrongly assigned task, it will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <div key={task.id} className="p-6 hover:bg-slate-50/70 transition-colors space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        task.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : task.priority === 'high'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {task.priority} Priority
                      </span>
                      <span className="text-xs font-bold text-slate-400">Task #{task.id}</span>
                      {task.due_date && (
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Due: {task.due_date}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{task.title}</h3>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDeclineRequest(task.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
                      >
                        Decline
                      </button>
                      <button
                        onClick={() => setSelectedTaskForReassign(task)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" />
                        Reassign Now
                      </button>
                    </div>
                  )}
                </div>

                {/* Reassignment Reason Quote Box */}
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        name={task.assignee_name}
                        avatar={task.assignee_avatar}
                        role={task.assignee_role}
                        size="xs"
                      />
                      <span className="font-bold text-amber-950">
                        {task.assignee_name} ({task.assignee_title || 'Employee'}):
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-700">
                      {task.rejected_at ? new Date(task.rejected_at).toLocaleString() : 'Recently'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 font-medium italic pl-7">
                    "{task.rejection_reason}"
                  </p>
                </div>

                {/* Additional task details footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Assigned originally by: <strong className="text-slate-700">{task.creator_name}</strong></span>
                  <button
                    onClick={() => onSelectTask(task.id)}
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    View Task Details Modal →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Reassign Dialog */}
      {selectedTaskForReassign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Reassign Task</h3>
                <p className="text-[11px] text-slate-500 truncate max-w-xs">{selectedTaskForReassign.title}</p>
              </div>
              <button
                onClick={() => setSelectedTaskForReassign(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmReassign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Target Employee *
                </label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 bg-white"
                >
                  <option value="">Choose Employee...</option>
                  {availableUsers
                    .filter((u) => u.id !== selectedTaskForReassign.assigned_to)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.title || u.role}) - {u.active_tasks_count || 0} active tasks
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reassignment Note for New Employee (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please take over this deliverable..."
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForReassign(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  {submitting ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
