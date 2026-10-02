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
  Check,
  ExternalLink,
  Link2,
  Paperclip,
  Lock,
  Unlock,
  Play,
  Pause,
  Users,
  GitMerge,
  ArrowRight,
  Layers,
  AlertCircle
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function TaskDetailsModal({ taskId, isOpen, onClose, onTaskUpdated }) {
  const { user, availableUsers, socket } = useAuth();
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
  const [claimingTask, setClaimingTask] = useState(false);

  // Deliverable / Proof of Work state
  const [isEditingDeliverable, setIsEditingDeliverable] = useState(false);
  const [deliverableInputUrl, setDeliverableInputUrl] = useState('');
  const [deliverableInputNotes, setDeliverableInputNotes] = useState('');
  const [savingDeliverable, setSavingDeliverable] = useState(false);

  // Sequential Chain Stage completion state
  const [stageDeliverableUrl, setStageDeliverableUrl] = useState('');
  const [stageDeliverableNotes, setStageDeliverableNotes] = useState('');
  const [completingStage, setCompletingStage] = useState(false);

  // Task Discussion & Comments state
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentDeliverableUrl, setCommentDeliverableUrl] = useState('');
  const [showAttachDeliverableInComment, setShowAttachDeliverableInComment] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const data = await api.getTask(taskId);
      setTask(data);
      setCurrentStatus(data.status);
      setCurrentProgress(data.progress_pct || 0);
      setComments(data.comments || []);
      setDeliverableInputUrl(data.deliverable_url || '');
      setDeliverableInputNotes(data.deliverable_notes || '');
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
      setIsEditingDeliverable(false);
      setCommentText('');
      setCommentDeliverableUrl('');
      setShowAttachDeliverableInComment(false);
      setRejectionReason('');
      setNewAssigneeId('');
      setReassignNote('');
      setError('');
    }
  }, [isOpen, taskId]);

  // Real-time task and comment updates via Socket.IO
  useEffect(() => {
    if (!socket || !taskId) return;

    const handleCommentAdded = (payload) => {
      if (Number(payload.taskId) === Number(taskId) && payload.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === payload.comment.id)) return prev;
          return [...prev, payload.comment];
        });
      }
    };

    const handleTaskUpdated = (updatedTask) => {
      if (updatedTask && Number(updatedTask.id) === Number(taskId)) {
        setTask(updatedTask);
        setCurrentStatus(updatedTask.status);
        setCurrentProgress(updatedTask.progress_pct || 0);
      }
    };

    socket.on('task_comment_added', handleCommentAdded);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_claimed', () => fetchTaskDetails());
    socket.on('chain_stage_updated', () => fetchTaskDetails());

    return () => {
      socket.off('task_comment_added', handleCommentAdded);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_claimed', () => fetchTaskDetails());
      socket.off('chain_stage_updated', () => fetchTaskDetails());
    };
  }, [socket, taskId]);

  if (!isOpen) return null;

  if (loading && !task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            ടാസ്ക് വിവരങ്ങൾ ലഭ്യമാക്കുന്നു...
          </p>
          <p className="text-xs text-slate-400">Loading task #{taskId} details...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">ടാസ്ക് വിവരങ്ങൾ ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>
          </div>
          <div className="flex justify-center gap-2 pt-2">
            <button
              onClick={fetchTaskDetails}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold"
            >
              വീണ്ടും ശ്രമിക്കുക (Retry)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
            >
              അടയ്ക്കുക (Close)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';
  
  // Multi-assignee checks
  const assigneesList = task?.assignees && task.assignees.length > 0 
    ? task.assignees 
    : (task?.assignee_name ? [{ id: task.assigned_to, name: task.assignee_name, avatar: task.assignee_avatar, role: task.assignee_role, title: task.assignee_title }] : []);
  
  const isAssignee = assigneesList.some((a) => Number(a.id) === Number(user?.id)) || Number(task?.assigned_to) === Number(user?.id);
  const canReassign = isFounder || isLead;

  // Sequential Chain variables
  const isChain = Boolean(task?.is_chain);
  const stages = task?.stages || [];
  const activeStage = stages.find((s) => s.status === 'active');
  const nextStage = activeStage ? stages.find((s) => s.stage_order > activeStage.stage_order) : null;
  const isActiveStageAssignee = Number(activeStage?.assigned_to) === Number(user?.id);
  const canCompleteActiveStage = isActiveStageAssignee || isFounder || isLead;
  const myPendingStage = stages.find((s) => Number(s.assigned_to) === Number(user?.id) && s.status === 'pending');

  // Concurrency Claim Lock checks
  const isClaimedByMe = Number(task?.claimed_by) === Number(user?.id);
  const isClaimedByOther = Boolean(task?.claimed_by && Number(task.claimed_by) !== Number(user?.id) && task?.status === 'in_progress');
  const isCompleted = task?.status === 'completed';

  // Handle claiming task (Starting work)
  const handleClaimTask = async () => {
    try {
      setClaimingTask(true);
      setError('');
      await api.claimTask(taskId);
      await fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to start task');
    } finally {
      setClaimingTask(false);
    }
  };

  // Handle releasing task claim
  const handleReleaseClaim = async () => {
    try {
      setClaimingTask(true);
      setError('');
      await api.releaseTaskClaim(taskId);
      await fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to release claim');
    } finally {
      setClaimingTask(false);
    }
  };

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
    if (isClaimedByOther && !isFounder && !isLead) {
      setError(`Cannot modify: Task is actively locked by ${task?.claimed_by_name || 'another assignee'}.`);
      return;
    }

    try {
      setUpdatingStatus(true);
      setError('');
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

  // Handle saving deliverable link
  const handleSaveDeliverable = async (e) => {
    if (e) e.preventDefault();
    try {
      setSavingDeliverable(true);
      setError('');
      await api.updateTask(taskId, {
        deliverable_url: deliverableInputUrl.trim() || null,
        deliverable_notes: deliverableInputNotes.trim() || null,
      });
      await fetchTaskDetails();
      setIsEditingDeliverable(false);
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to update deliverable');
    } finally {
      setSavingDeliverable(false);
    }
  };

  // Handle completing stage in sequential chain workflow
  const handleCompleteStage = async (e) => {
    if (e) e.preventDefault();
    try {
      setCompletingStage(true);
      setError('');
      await api.completeStage(taskId, {
        deliverable_url: stageDeliverableUrl.trim() || undefined,
        deliverable_notes: stageDeliverableNotes.trim() || undefined,
      });
      setStageDeliverableUrl('');
      setStageDeliverableNotes('');
      await fetchTaskDetails();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to complete stage');
    } finally {
      setCompletingStage(false);
    }
  };

  // Handle posting a comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      setSubmittingComment(true);
      setError('');
      const res = await api.addTaskComment(taskId, {
        content: commentText.trim(),
        deliverable_url: commentDeliverableUrl.trim() || undefined,
      });
      if (res.comment) {
        setComments((prev) => {
          if (prev.some((c) => c.id === res.comment.id)) return prev;
          return [...prev, res.comment];
        });
      }
      setCommentText('');
      setCommentDeliverableUrl('');
      setShowAttachDeliverableInComment(false);
      if (commentDeliverableUrl.trim()) {
        fetchTaskDetails();
      }
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const isOverdue = task?.due_date && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0)) && task?.status !== 'completed';
  const isDueToday = task?.due_date && new Date(task.due_date).toDateString() === new Date().toDateString() && task?.status !== 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500">
              #{task?.id || taskId}
            </span>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
              task?.priority === 'urgent'
                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                : task?.priority === 'high'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                : task?.priority === 'medium'
                ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
            }`}>
              {task?.priority?.toUpperCase()} PRIORITY
            </span>
            {task?.team_name && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline-block">
                • {task.team_name}
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Title & Description */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {task?.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-xs mt-2 whitespace-pre-line bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
              {task?.description || 'No detailed description provided.'}
            </p>
          </div>

          {/* Quick Reassignment Callout for Employee */}
          {isAssignee && task?.rejection_status !== 'requested' && !showRejectForm && (
            <div className="p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    തെറ്റായ ടാസ്ക് ആണോ? (Wrongly Assigned Deliverable?)
                  </h4>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">
                    ഈ വർക്ക് നിങ്ങളുടേതല്ലെങ്കിൽ കാരണം രേഖപ്പെടുത്തി റീ-അസൈൻ ചെയ്യാൻ ടീം ലീഡിനോട് ഇവിടെ അഭ്യർത്ഥിക്കാം.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
              >
                റീ-അസൈൻമെന്റ് അഭ്യർത്ഥിക്കുക
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CASE A: SEQUENTIAL CHAIN WORKFLOW PIPELINE & STAGE HANDOFF               */}
          {/* ========================================================================= */}
          {isChain ? (
            <div className="rounded-3xl border-2 border-purple-200 dark:border-purple-900/60 bg-linear-to-b from-purple-50/50 via-white to-slate-50 dark:from-purple-950/20 dark:via-slate-900 dark:to-slate-900 p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <GitMerge className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Sequential Dependency Pipeline</span>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                        {stages.filter((s) => s.status === 'completed').length} / {stages.length} Done
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Work flows sequentially through stages. Each stage unlocks automatically once the prior stage submits deliverables.
                    </p>
                  </div>
                </div>
              </div>

              {/* Stage Stepper List */}
              <div className="space-y-3 pt-1">
                {stages.map((st, idx) => {
                  const isStCompleted = st.status === 'completed';
                  const isStActive = st.status === 'active';
                  const isStPending = st.status === 'pending';
                  const isMine = st.assigned_to === user?.id;

                  return (
                    <div
                      key={st.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isStActive
                          ? 'border-purple-400 dark:border-purple-600 bg-purple-50/80 dark:bg-purple-950/50 ring-2 ring-purple-400/20 shadow-xs'
                          : isStCompleted
                          ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              isStCompleted
                                ? 'bg-emerald-600 text-white'
                                : isStActive
                                ? 'bg-purple-600 text-white ring-2 ring-purple-300 dark:ring-purple-700'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {isStCompleted ? (
                              <Check className="w-4 h-4 stroke-3" />
                            ) : isStActive ? (
                              <span>{st.stage_order}</span>
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                                {st.title}
                              </h4>
                              {isStCompleted && (
                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.2 rounded-full">
                                  Completed
                                </span>
                              )}
                              {isStActive && (
                                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.2 rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
                                  Active Stage
                                </span>
                              )}
                              {isStPending && (
                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-700/60 px-2 py-0.2 rounded-full flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5" />
                                  Waiting on Step {st.stage_order - 1}
                                </span>
                              )}
                              {isMine && (
                                <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.2 rounded-full">
                                  Assigned to You
                                </span>
                              )}
                            </div>

                            {st.description && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                                {st.description}
                              </p>
                            )}

                            {/* Specialist info */}
                            <div className="flex items-center gap-2 mt-2">
                              <UserAvatar name={st.assignee_name} avatar={st.assignee_avatar} role={st.assignee_role} size="xs" />
                              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                {st.assignee_name} <span className="text-slate-400 font-normal">({st.assignee_title || st.assignee_role})</span>
                              </span>
                            </div>

                            {/* Deliverable Proof & Notes if completed */}
                            {isStCompleted && (st.deliverable_url || st.deliverable_notes) && (
                              <div className="mt-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/50 space-y-1">
                                {st.deliverable_url && (
                                  <a
                                    href={st.deliverable_url.startsWith('http') ? st.deliverable_url : `https://${st.deliverable_url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-emerald-700 dark:text-emerald-300 hover:underline text-[11px] flex items-center gap-1 truncate"
                                  >
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{st.deliverable_url}</span>
                                  </a>
                                )}
                                {st.deliverable_notes && (
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                    "{st.deliverable_notes}"
                                  </p>
                                )}
                                {st.completed_at && (
                                  <span className="text-[10px] text-slate-400 block">
                                    Completed: {new Date(st.completed_at).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stage Handoff / Completion Action Form */}
              {activeStage && canCompleteActiveStage && (
                <form
                  onSubmit={handleCompleteStage}
                  className="p-4 rounded-2xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-300 dark:border-purple-800 space-y-3 animate-in fade-in duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider">
                      {isActiveStageAssignee
                        ? `Your Stage is Active: ${activeStage.title}`
                        : `Manager Handoff: Active Stage (${activeStage.title})`}
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      Step {activeStage.stage_order} of {stages.length}
                    </span>
                  </div>

                  <p className="text-[11px] text-purple-800 dark:text-purple-300">
                    {nextStage
                      ? `Attach deliverable proof or notes below to complete your stage and automatically hand off to ${nextStage.assignee_name} (Step ${nextStage.stage_order}).`
                      : `This is the final stage of the workflow. Completing this stage marks the entire deliverable 100% finished!`}
                  </p>

                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="Asset / Deliverable URL (e.g. Figma file, GitHub branch/PR, preview link)..."
                      value={stageDeliverableUrl}
                      onChange={(e) => setStageDeliverableUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-purple-500 outline-hidden"
                    />

                    <input
                      type="text"
                      placeholder="Handoff notes for the next specialist (e.g. 'Figma designs approved, API token attached')..."
                      value={stageDeliverableNotes}
                      onChange={(e) => setStageDeliverableNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:border-purple-500 outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={completingStage}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {completingStage ? (
                        <span>Handing Off...</span>
                      ) : nextStage ? (
                        <>
                          <span>Complete Stage & Hand Off to Next Specialist</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Complete Final Stage & Finish Deliverable</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Waiting Notice for queued employee */}
              {myPendingStage && !isActiveStageAssignee && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    നിങ്ങൾ <strong>Step {myPendingStage.stage_order} ("{myPendingStage.title}")</strong> ലേക്ക് ഷെഡ്യൂൾ ചെയ്യപ്പെട്ടിരിക്കുന്നു. ഇതിന് മുൻപുള്ള സ്റ്റേജ് പൂർത്തിയാകുമ്പോൾ നിങ്ങൾക്ക് ഇൻസ്റ്റന്റ് നോട്ടിഫിക്കേഷൻ ലഭിക്കുന്നതാണ്.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* CASE B: STANDARD DELIVERABLE CONCURRENCY CLAIM WORK LOCK BANNER          */
            /* ========================================================================= */
            <>
              {isCompleted ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Deliverable Completed
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Completed and synced across all assignees!
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/80 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200">
                    100% DONE
                  </span>
                </div>
              ) : isClaimedByOther ? (
                <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                          Deliverable In Progress by {task.claimed_by_name || 'Teammate'}
                        </h4>
                        <span className="text-[10px] text-amber-700 dark:text-amber-400">
                          Active Lock
                        </span>
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                        ഓവർലാപ്പ് ഒഴിവാക്കാനായി ഈ ടാസ്ക് നിലവിൽ <strong>{task.claimed_by_name}</strong> വർക്ക് ചെയ്യുകയാണ്. {task.claimed_by_name} ഇത് കംപ്ലീറ്റ് ചെയ്യുമ്പോൾ നിങ്ങളുടെ ഡാഷ്‌ബോർഡിലും ഓട്ടോമാറ്റിക് ആയി കംപ്ലീറ്റ് ആയി സിങ്ക് ആകുന്നതാണ്.
                      </p>
                    </div>
                  </div>
                </div>
              ) : isClaimedByMe ? (
                <div className="rounded-2xl border-2 border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                        You are Actively Working on this Deliverable
                      </h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Locked to prevent duplicate work. Teammates can see you are active.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReleaseClaim}
                      disabled={claimingTask}
                      className="px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5 inline mr-1" />
                      Pause / Release
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatusAndProgress('completed', 100)}
                      disabled={updatingStatus}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <Check className="w-3.5 h-3.5 inline mr-1" />
                      Complete Task
                    </button>
                  </div>
                </div>
              ) : task?.status === 'todo' && isAssignee ? (
                <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Ready to Start Working?
                      </h4>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-400">
                        Clicking "Start Task" locks the task so other assignees know work is underway.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClaimTask}
                    disabled={claimingTask}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{claimingTask ? 'Locking Task...' : 'Start Working (Claim Task)'}</span>
                  </button>
                </div>
              ) : null}
            </>
          )}

          {/* REASSIGNMENT REQUEST BANNER */}
          {task?.rejection_status === 'requested' && (
            <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                      Reassignment Requested by Assignee
                    </h4>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">
                      {task.rejected_at ? new Date(task.rejected_at).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-300 font-medium mt-1">
                    Employee Reason:
                  </p>
                  <blockquote className="text-xs text-amber-800 dark:text-amber-200 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 mt-1 italic">
                    "{task.rejection_reason}"
                  </blockquote>
                </div>
              </div>

              {canReassign && (
                <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800 flex items-center justify-end gap-2">
                  <button
                    onClick={handleDismissRejection}
                    disabled={submittingReassign}
                    className="px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-200 text-xs font-semibold"
                  >
                    Decline Request
                  </button>
                  <button
                    onClick={() => setShowReassignForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Accept & Reassign
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Form to reassign (Founder & Lead) */}
          {showReassignForm && canReassign && (
            <form onSubmit={handleReassign} className="bg-indigo-50/70 dark:bg-slate-800 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  Select New Employee to Reassign Task
                </h4>
                <button
                  type="button"
                  onClick={() => setShowReassignForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assign To Employee:
                </label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:border-indigo-500"
                >
                  <option value="">Select Employee...</option>
                  {availableUsers
                    .filter((u) => !assigneesList.some((a) => a.id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.title || u.role}) - {u.active_tasks_count || 0} active tasks
                      </option>
                    ))}
                </select>
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

          {/* Form for Employee to request reassignment */}
          {showRejectForm && isAssignee && (
            <form onSubmit={handleRequestRejection} className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Request Task Reassignment
                </h4>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>
              <textarea
                rows={3}
                required
                placeholder="State why this task should be assigned to another teammate..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-amber-500 outline-hidden resize-none"
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

          {/* Metadata Grid (Assignees, Creator, Due Date) */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-3">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1.5 font-semibold uppercase tracking-wider">
                Assigned Team Members ({assigneesList.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {assigneesList.map((a) => {
                  const isWorker = Number(task?.claimed_by) === Number(a.id);
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-2 p-2 rounded-xl border ${
                        isWorker 
                          ? 'border-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/50' 
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <UserAvatar name={a.name} avatar={a.avatar} role={a.role} size="xs" />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-900 dark:text-white">{a.name}</span>
                          {isWorker && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-indigo-600 text-white">
                              Active Worker
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {a.title || a.role}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">Assigned By</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{task?.creator_name}</span>
              </div>

              <div>
                <span className="text-slate-400 dark:text-slate-500 block text-[11px] mb-1">Due Date</span>
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{task?.due_date || 'No deadline'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Deliverable / Proof of Work */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Deliverable / Proof of Work
                </span>
              </div>
              {task?.deliverable_url && (
                <button
                  type="button"
                  onClick={() => setIsEditingDeliverable(!isEditingDeliverable)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {isEditingDeliverable ? 'Cancel' : 'Edit Link'}
                </button>
              )}
            </div>

            {task?.deliverable_url && !isEditingDeliverable ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <div className="min-w-0 flex-1">
                  <a
                    href={task.deliverable_url.startsWith('http') ? task.deliverable_url : `https://${task.deliverable_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-indigo-700 dark:text-indigo-300 hover:underline text-xs flex items-center gap-1.5 truncate"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{task.deliverable_url}</span>
                  </a>
                  {task.deliverable_notes && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{task.deliverable_notes}</p>
                  )}
                </div>
                <a
                  href={task.deliverable_url.startsWith('http') ? task.deliverable_url : `https://${task.deliverable_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs"
                >
                  <span>Verify Work</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : !task?.deliverable_url && !isEditingDeliverable ? (
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Link2 className="w-4 h-4 text-slate-400" />
                  <span>No deliverable / proof link attached yet.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingDeliverable(true)}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900 transition-colors"
                >
                  + Attach Link (PR / Figma / Doc)
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveDeliverable} className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="url"
                  required
                  placeholder="https://github.com/... or Figma or Google Doc link"
                  value={deliverableInputUrl}
                  onChange={(e) => setDeliverableInputUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Optional notes or instructions..."
                  value={deliverableInputNotes}
                  onChange={(e) => setDeliverableInputNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 outline-hidden"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingDeliverable(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingDeliverable}
                    className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-xs"
                  >
                    {savingDeliverable ? 'Saving...' : 'Save Deliverable'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Status & Progress Management */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                Status & Progress Tracking
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                currentStatus === 'completed'
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                  : currentStatus === 'in_progress'
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                  : currentStatus === 'review'
                  ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}>
                {currentStatus.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* Status Selector */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'todo', label: 'To Do' },
                { key: 'in_progress', label: 'In Progress' },
                { key: 'review', label: 'Under Review' },
                { key: 'completed', label: 'Completed' },
              ].map((s) => {
                const disabled = isClaimedByOther && !isFounder && !isLead;
                return (
                  <button
                    key={s.key}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleUpdateStatusAndProgress(s.key, s.key === 'completed' ? 100 : currentProgress)}
                    className={`py-2 px-1 text-center text-xs rounded-xl font-semibold border transition-all ${
                      currentStatus === s.key
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-200 dark:ring-indigo-900'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Progress Slider */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Completion: {currentProgress}%</span>
                <span className="text-slate-400">
                  {currentProgress === 100 ? '🎉 Deliverable complete' : `${100 - currentProgress}% remaining`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                disabled={isClaimedByOther && !isFounder && !isLead}
                value={currentProgress}
                onChange={(e) => setCurrentProgress(Number(e.target.value))}
                onMouseUp={() => handleUpdateStatusAndProgress(currentStatus, currentProgress)}
                onTouchEnd={() => handleUpdateStatusAndProgress(currentStatus, currentProgress)}
                className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50"
              />
            </div>
          </div>

          {/* Discussion & Updates Feed */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                  Discussion & Updates ({comments.length})
                </span>
              </div>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-5 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  No comments yet. Start the conversation below.
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={c.user_name} avatar={c.user_avatar} role={c.user_role} size="xs" />
                        <span className="font-bold text-slate-800 dark:text-white text-xs">{c.user_name}</span>
                        <span className="text-[10px] text-slate-500 bg-white dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 font-medium">
                          {c.user_role === 'founder' ? '👑 Founder' : c.user_role === 'team_lead' ? '🛡️ Lead' : '💼 Employee'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 pl-7 whitespace-pre-wrap">{c.content}</p>
                    {c.deliverable_url && (
                      <div className="pl-7 pt-1">
                        <a
                          href={c.deliverable_url.startsWith('http') ? c.deliverable_url : `https://${c.deliverable_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 px-2.5 py-1 rounded-lg"
                        >
                          <Link2 className="w-3 h-3 text-indigo-600" />
                          <span className="truncate max-w-xs">{c.deliverable_url}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Box */}
            <form onSubmit={handlePostComment} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex items-start gap-2">
                <UserAvatar name={user?.name} avatar={user?.avatar} role={user?.role} size="xs" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <textarea
                    rows={2}
                    required
                    placeholder="Write a message, deliverable link, or question..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white text-xs outline-hidden resize-none"
                  />

                  {showAttachDeliverableInComment && (
                    <div className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <input
                        type="url"
                        placeholder="Paste deliverable link (GitHub PR, Figma, etc)..."
                        value={commentDeliverableUrl}
                        onChange={(e) => setCommentDeliverableUrl(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowAttachDeliverableInComment(!showAttachDeliverableInComment)}
                      className={`text-[11px] font-semibold flex items-center gap-1 ${
                        showAttachDeliverableInComment ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                      }`}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span>{showAttachDeliverableInComment ? 'Remove link' : 'Attach link'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>{submittingComment ? 'Sending...' : 'Send'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50/60 dark:bg-slate-800/40 shrink-0">
          <div>
            {canReassign && (
              <button
                onClick={handleDeleteTask}
                className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors text-xs flex items-center gap-1 font-semibold"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isAssignee && task?.rejection_status !== 'requested' && !showRejectForm && (
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 text-xs font-semibold transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Wrong Task? Request Reassignment
              </button>
            )}

            {canReassign && !showReassignForm && task?.rejection_status !== 'requested' && (
              <button
                type="button"
                onClick={() => setShowReassignForm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                Reassign Task
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
