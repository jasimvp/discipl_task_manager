import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  X, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  ShieldAlert, 
  Send,
  Trash2,
  Check
} from 'lucide-react';

export default function TaskDetailsModal({ taskId, isOpen, onClose, onTaskUpdated }) {
  const { user, availableUsers } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Rejection Request state (for employee)
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // Reassignment state (for founder/team lead)
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [reassignNote, setReassignNote] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  // Status & Progress update state
  const [currentStatus, setCurrentStatus] = useState('todo');
  const [currentProgress, setCurrentProgress] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const data = await api.getTask(taskId);
      setTask(data);
      setCurrentStatus(data.status);
      setCurrentProgress(data.progress_pct || 0);
    } catch (e) {
      setError(e.message || 'Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails();
      setShowRejectForm(false);
      setShowReassignForm(false);
      setRejectionReason('');
      setNewAssigneeId('');
      setReassignNote('');
      setError('');
    }
  }, [isOpen, taskId]);

  if (!isOpen) return null;

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';
  const isAssignee = task?.assigned_to === user?.id;
  const canReassign = isFounder || isLead;

  // Handle employee requesting rejection / reassignment
  const handleRequestRejection = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Please provide a reason why this task was wrongly assigned.');
      return;
    }

    try {
      setSubmittingReject(true);
      setError('');
      await api.requestRejection(taskId, rejectionReason.trim());
      await fetchTaskDetails();
      setShowRejectForm(false);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to submit rejection request');
    } finally {
      setSubmittingReject(false);
    }
  };

  // Handle Founder / Lead reassigning task
  const handleReassign = async (e) => {
    e.preventDefault();
    if (!newAssigneeId) {
      setError('Please select a new employee.');
      return;
    }

    try {
      setSubmittingReassign(true);
      setError('');
      await api.reassignTask(taskId, {
        new_assignee_id: Number(newAssigneeId),
        notes: reassignNote.trim(),
      });
      await fetchTaskDetails();
      setShowReassignForm(false);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to reassign task');
    } finally {
      setSubmittingReassign(false);
    }
  };

  // Handle dismiss rejection request
  const handleDismissRejection = async () => {
    try {
      setSubmittingReassign(true);
      await api.reassignTask(taskId, { dismiss_rejection: true, notes: 'Reassignment declined by manager.' });
      await fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to dismiss rejection request');
    } finally {
      setSubmittingReassign(false);
    }
  };

  // Handle status & progress update
  const handleUpdateStatusAndProgress = async (newStatus, newProgress) => {
    try {
      setUpdatingStatus(true);
      await api.updateTask(taskId, {
        status: newStatus !== undefined ? newStatus : currentStatus,
        progress_pct: newProgress !== undefined ? newProgress : currentProgress,
      });
      if (newStatus !== undefined) setCurrentStatus(newStatus);
      if (newProgress !== undefined) setCurrentProgress(newProgress);
      await fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Delete Task
  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(taskId);
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete task');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
              task?.priority === 'urgent'
                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                : task?.priority === 'high'
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : task?.priority === 'medium'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}>
              {task?.priority} Priority
            </span>
            <span className="text-xs text-slate-400">Task #{task?.id}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">{task?.title}</h2>
            <p className="text-slate-600 text-sm mt-2 whitespace-pre-line bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              {task?.description || 'No detailed description provided.'}
            </p>
          </div>

          {/* REASSIGNMENT / REJECTION REQUEST BANNER (Crucial User Requirement) */}
          {task?.rejection_status === 'requested' && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Reassignment Requested by Employee
                    </h4>
                    <span className="text-[10px] text-amber-700">
                      {task.rejected_at ? new Date(task.rejected_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 font-medium mt-1">
                    Employee Reason:
                  </p>
                  <blockquote className="text-xs text-amber-800 bg-white/80 p-2.5 rounded-xl border border-amber-200 mt-1 italic">
                    "{task.rejection_reason}"
                  </blockquote>
                </div>
              </div>

              {/* Founder / Team Lead action controls */}
              {canReassign && (
                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-end gap-2">
                  <button
                    onClick={handleDismissRejection}
                    disabled={submittingReassign}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/50 text-amber-800 text-xs font-semibold transition-colors"
                  >
                    Decline Request
                  </button>
                  <button
                    onClick={() => setShowReassignForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Accept & Reassign Task
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form to reassign (Founder & Lead) */}
          {showReassignForm && canReassign && (
            <form onSubmit={handleReassign} className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Select New Employee to Reassign Task
                </h4>
                <button
                  type="button"
                  onClick={() => setShowReassignForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Assign To Employee:
                </label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-indigo-500"
                >
                  <option value="">Select Employee...</option>
                  {availableUsers
                    .filter((u) => u.id !== task?.assigned_to)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.title || u.role}) - {u.active_tasks_count || 0} active tasks
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Reassignment Note / Instructions (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Handing off from Ananya for backend tuning..."
                  value={reassignNote}
                  onChange={(e) => setReassignNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={submittingReassign}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                >
                  {submittingReassign ? 'Reassigning...' : 'Confirm Reassignment'}
                </button>
              </div>
            </form>
          )}

          {/* Form for Employee to request reassignment (Wrongly assigned task) */}
          {showRejectForm && isAssignee && (
            <form onSubmit={handleRequestRejection} className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Request Task Reassignment
                </h4>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-amber-800">
                Explain why this task was wrongly assigned (e.g. wrong domain, lack of access, or schedule conflict) so your team lead or founder can reassign it.
              </p>
              <textarea
                rows={3}
                required
                placeholder="State why this task should be assigned to another teammate..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-200 bg-white text-xs focus:border-amber-500 outline-hidden resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={submittingReject}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                >
                  {submittingReject ? 'Submitting...' : 'Send Reassignment Request'}
                </button>
              </div>
            </form>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Assigned To</span>
              <div className="flex items-center gap-2">
                <img
                  src={task?.assignee_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={task?.assignee_name}
                  className="w-6 h-6 rounded-md object-cover"
                />
                <div>
                  <span className="font-bold text-slate-800">{task?.assignee_name || 'Unassigned'}</span>
                  <span className="text-[10px] text-slate-500 block">{task?.assignee_title}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Assigned By</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-800">{task?.creator_name}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Due Date</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{task?.due_date || 'No deadline'}</span>
              </div>
            </div>
          </div>

          {/* Status & Progress Management */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Status & Progress Tracking
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                currentStatus === 'completed'
                  ? 'bg-emerald-100 text-emerald-700'
                  : currentStatus === 'in_progress'
                  ? 'bg-blue-100 text-blue-700'
                  : currentStatus === 'review'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {currentStatus.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Status Selector */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'todo', label: 'To Do', color: 'slate' },
                { key: 'in_progress', label: 'In Progress', color: 'blue' },
                { key: 'review', label: 'Under Review', color: 'purple' },
                { key: 'completed', label: 'Completed', color: 'emerald' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleUpdateStatusAndProgress(s.key, s.key === 'completed' ? 100 : currentProgress)}
                  className={`py-2 px-1 text-center text-xs rounded-xl font-semibold border transition-all ${
                    currentStatus === s.key
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Progress Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700">Completion: {currentProgress}%</span>
                <span className="text-slate-400">
                  {currentProgress === 100 ? '🎉 All tasks done' : `${100 - currentProgress}% remaining`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={currentProgress}
                onChange={(e) => setCurrentProgress(Number(e.target.value))}
                onMouseUp={() => handleUpdateStatusAndProgress(currentStatus, currentProgress)}
                onTouchEnd={() => handleUpdateStatusAndProgress(currentStatus, currentProgress)}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Activity Log */}
          {task?.activities && task.activities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Activity History
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {task.activities.map((act) => (
                  <div key={act.id} className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-slate-800">{act.details}</p>
                      <span className="text-[10px] text-slate-400">
                        {new Date(act.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div>
            {canReassign && (
              <button
                onClick={handleDeleteTask}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-xs flex items-center gap-1 font-semibold"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* If task is assigned to current employee and not already requested */}
            {isAssignee && task?.rejection_status !== 'requested' && !showRejectForm && (
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Wrong Task? Request Reassignment
              </button>
            )}

            {/* Founder / Lead can also reassign directly at any time */}
            {canReassign && !showReassignForm && task?.rejection_status !== 'requested' && (
              <button
                type="button"
                onClick={() => setShowReassignForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-600" />
                Reassign Task
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
