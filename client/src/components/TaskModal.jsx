import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, Calendar, User, Flag, Users, Check, Search, ShieldCheck } from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function TaskModal({ isOpen, onClose, onTaskCreated }) {
  const { user, availableUsers } = useAuth();
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

  useEffect(() => {
    if (isOpen) {
      api.getTeams().then(setTeams).catch(console.error);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setSelectedAssigneeIds([]);
      setTeamId('');
      setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
      setError('');
      setAssigneeSearch('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleAssignee = (userId) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

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
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              Assign Shared Task / Deliverable
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              Can be assigned to multiple employees with real-time concurrency locking
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Deliverable Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Implement Payment Gateway Integration"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-hidden text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description & Specifications
            </label>
            <textarea
              rows={3}
              placeholder="Provide context, acceptance criteria, deliverables or technical expectations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-hidden text-xs resize-none"
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

          {/* MULTI-ASSIGNEE SELECTION */}
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
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Assigning...' : `Assign to ${selectedAssigneeIds.length} Member(s)`}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
