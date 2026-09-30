import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  X, 
  Calendar, 
  User, 
  Flag, 
  Users, 
  Check, 
  Search, 
  GitMerge, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Lock,
  Layers,
  Sparkles
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function TaskModal({ isOpen, onClose, onTaskCreated }) {
  const { user, availableUsers } = useAuth();
  const [workflowType, setWorkflowType] = useState('standard'); // 'standard' or 'chain'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState([]);
  const [teamId, setTeamId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assigneeSearch, setAssigneeSearch] = useState('');

  // Sequential Chain Stages state
  const [stages, setStages] = useState([
    { title: 'Stage 1: Design / UI/UX Mockup', assigned_to: '', description: 'Create user flows, wireframes, and design specs.' },
    { title: 'Stage 2: Backend & Database Schema', assigned_to: '', description: 'Build APIs, database models, and logic.' },
    { title: 'Stage 3: Frontend Integration & QA', assigned_to: '', description: 'Connect client UI to APIs and verify deliverables.' },
  ]);

  useEffect(() => {
    if (isOpen) {
      api.getTeams().then(setTeams).catch(console.error);
      setWorkflowType('standard');
      setTitle('');
      setDescription('');
      setPriority('medium');
      setSelectedAssigneeIds([]);
      setTeamId('');
      setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
      setError('');
      setAssigneeSearch('');
      setStages([
        { title: 'Stage 1: Design / UI/UX Mockup', assigned_to: '', description: 'Create user flows, wireframes, and design specs.' },
        { title: 'Stage 2: Backend & Database Schema', assigned_to: '', description: 'Build APIs, database models, and logic.' },
        { title: 'Stage 3: Frontend Integration & QA', assigned_to: '', description: 'Connect client UI to APIs and verify deliverables.' },
      ]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleAssignee = (userId) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddStage = () => {
    setStages((prev) => [
      ...prev,
      {
        title: `Stage ${prev.length + 1}: Review & Deployment`,
        assigned_to: '',
        description: '',
      },
    ]);
  };

  const handleRemoveStage = (index) => {
    if (stages.length <= 2) {
      setError('A sequential chain workflow must have at least 2 stages.');
      return;
    }
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStageChange = (index, field, value) => {
    setStages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    if (workflowType === 'chain') {
      if (stages.length < 2) {
        setError('Please configure at least 2 sequential stages for this workflow.');
        return;
      }

      for (let i = 0; i < stages.length; i++) {
        if (!stages[i].title.trim()) {
          setError(`Please provide a title for Stage ${i + 1}.`);
          return;
        }
        if (!stages[i].assigned_to) {
          setError(`Please assign a teammate for Stage ${i + 1} ("${stages[i].title}").`);
          return;
        }
      }

      try {
        setLoading(true);
        await api.createTask({
          title: title.trim(),
          description: description.trim(),
          priority,
          team_id: teamId ? Number(teamId) : null,
          due_date: dueDate || null,
          is_chain: true,
          stages: stages.map((s, idx) => ({
            stage_order: idx + 1,
            title: s.title.trim(),
            description: s.description ? s.description.trim() : '',
            assigned_to: Number(s.assigned_to),
          })),
        });

        if (onTaskCreated) onTaskCreated();
        onClose();
      } catch (err) {
        setError(err.message || 'Failed to create sequential workflow');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Standard Deliverable Validation
    if (selectedAssigneeIds.length === 0) {
      setError('Please select at least one employee assignee for this deliverable.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.createTask({
        title: title.trim(),
        description: description.trim(),
        priority,
        assigned_to_ids: selectedAssigneeIds,
        assigned_to: selectedAssigneeIds[0],
        team_id: teamId ? Number(teamId) : null,
        due_date: dueDate || null,
      });

      if (onTaskCreated) onTaskCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = availableUsers.filter((u) => {
    const q = assigneeSearch.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.title && u.title.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <span>Create & Assign Deliverable</span>
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Choose standard shared deliverable or multi-stage sequential dependency pipeline
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Type Selector Tabs */}
        <div className="px-5 sm:px-6 pt-4 pb-1 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setWorkflowType('standard')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                workflowType === 'standard'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Standard Shared Task</span>
            </button>
            <button
              type="button"
              onClick={() => setWorkflowType('chain')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                workflowType === 'chain'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <GitMerge className="w-4 h-4 text-purple-500" />
              <span>⛓️ Sequential Chain / Pipeline</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Workflow Info Callout */}
          {workflowType === 'chain' && (
            <div className="p-3.5 rounded-2xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 text-purple-900 dark:text-purple-200 text-xs flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <GitMerge className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-purple-950 dark:text-purple-100">
                  Sequential Dependency Workflow (ചെയിൻ വർക്ക്)
                </h4>
                <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                  ഓരോ സ്റ്റേജും കൃത്യമായ മുൻഗണനാ ക്രമത്തിൽ ലോക്ക് ചെയ്യപ്പെടും. Stage 1 ചെയ്യുന്നയാൾ വർക്ക് പൂർത്തിയാക്കി ഹാൻഡ്-ഓഫ് ചെയ്യുമ്പോൾ അടുത്ത സ്റ്റേജിലുള്ള ആൾക്ക് ഓട്ടോമാറ്റിക് ആയി അൺലോക്ക് ആയി നോട്ടിഫിക്കേഷൻ ലഭിക്കും.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {workflowType === 'chain' ? 'Workflow Deliverable Title *' : 'Deliverable Title *'}
            </label>
            <input
              type="text"
              required
              placeholder={workflowType === 'chain' ? "e.g. Design & Launch User Checkout Flow" : "e.g. Implement Payment Gateway Integration"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-hidden text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Overall Description & Specifications
            </label>
            <textarea
              rows={2}
              placeholder="Provide general context, goals, specifications, or technical expectations for the team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-hidden text-xs resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-slate-400" />
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 text-xs"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 text-xs"
              />
            </div>
          </div>

          {/* Department / Team */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Department Team (Optional)
            </label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 text-xs"
            >
              <option value="">Select Team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* ========================================================================= */}
          {/* CASE A: SEQUENTIAL CHAIN WORKFLOW PIPELINE BUILDER                         */}
          {/* ========================================================================= */}
          {workflowType === 'chain' ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Sequential Stages Pipeline ({stages.length} Steps)</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-3">
                {stages.map((st, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center shrink-0 ${
                          idx === 0 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {idx === 0 ? 'Step 1 (Starts First)' : `Step ${idx + 1} (Waiting on Step ${idx})`}
                        </span>
                      </div>

                      {stages.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Remove Stage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Stage Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={st.title}
                          onChange={(e) => handleStageChange(idx, 'title', e.target.value)}
                          placeholder={`Stage ${idx + 1} Name`}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Assigned Specialist *
                        </label>
                        <select
                          required
                          value={st.assigned_to}
                          onChange={(e) => handleStageChange(idx, 'assigned_to', e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                        >
                          <option value="">Select Specialist</option>
                          {availableUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.title || u.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={st.description}
                        onChange={(e) => handleStageChange(idx, 'description', e.target.value)}
                        placeholder="Deliverable output expected from this stage (e.g. Figma links, API routes, or code PR)..."
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/60 text-slate-900 dark:text-white text-[11px]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                💡 Upon creation, <strong>Step 1</strong> will be marked Active and its assignee will be notified immediately. Subsequent stages unlock one by one as each specialist completes their stage.
              </p>
            </div>
          ) : (
            /* ========================================================================= */
            /* CASE B: STANDARD MULTI-ASSIGNEE SELECTION                                 */
            /* ========================================================================= */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Assign to Employees * (Multiple allowed)</span>
                </label>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedAssigneeIds.length} selected
                </span>
              </div>

              {/* Quick search input */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter teammates by name or department..."
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-hidden"
                />
              </div>

              {/* Selected Assignees Pills */}
              {selectedAssigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5 p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40">
                  {selectedAssigneeIds.map((id) => {
                    const u = availableUsers.find((user) => user.id === id);
                    if (!u) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-600 text-white shadow-2xs"
                      >
                        <span>{u.name}</span>
                        <button
                          type="button"
                          onClick={() => toggleAssignee(id)}
                          className="hover:text-indigo-200 ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Teammates List */}
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No teammates found</div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedAssigneeIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleAssignee(u.id)}
                        className={`w-full flex items-center justify-between p-2.5 text-left text-xs transition-colors ${
                          isSelected 
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar name={u.name} avatar={u.avatar} role={u.role} size="sm" />
                          <div className="truncate">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {u.title || u.role} • {u.department || 'General'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400">
                            {u.active_tasks_count || 0} active
                          </span>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-3" />}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
                💡 Multiple assignees will all receive this deliverable. When one clicks "Start Task", the task locks to prevent duplicate work, and completing it syncs across everyone.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50 ${
                workflowType === 'chain'
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {loading
                  ? 'Creating...'
                  : workflowType === 'chain'
                  ? `Create ${stages.length}-Stage Workflow`
                  : `Assign to ${selectedAssigneeIds.length} Member(s)`}
              </span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
