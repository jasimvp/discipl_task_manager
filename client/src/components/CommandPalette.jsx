import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Search,
  X,
  LayoutDashboard,
  CheckSquare,
  MessageSquare,
  Users,
  AlertCircle,
  KeyRound,
  ArrowRight,
  Clock,
  AlertTriangle,
  Link2,
  Calendar,
  UserPlus
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function CommandPalette({
  isOpen,
  onClose,
  onSelectTask,
  onNavigateTab,
  onOpenChatWithUser,
  onOpenAddEmployee,
}) {
  const { user, availableUsers } = useAuth();
  const [query, setQuery] = useState('');
  const [taskResults, setTaskResults] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';

  // Navigation shortcuts
  const navigationItems = [
    {
      id: 'nav-dashboard',
      type: 'nav',
      title: user?.role === 'employee' ? 'My Workspace Dashboard' : isLead ? 'Team Dashboard' : 'Executive Dashboard',
      description: 'Overview of deliverables, workload metrics and tasks',
      icon: LayoutDashboard,
      action: () => onNavigateTab('dashboard'),
      keywords: ['dashboard', 'home', 'overview', 'metrics', 'workspace'],
    },
    {
      id: 'nav-tasks',
      type: 'nav',
      title: 'Deliverables & Task Board',
      description: 'Kanban board & list view of all tasks',
      icon: CheckSquare,
      action: () => onNavigateTab('tasks'),
      keywords: ['tasks', 'board', 'kanban', 'deliverables', 'list', 'todo'],
    },
    {
      id: 'nav-messages',
      type: 'nav',
      title: 'Messages & Team Chat',
      description: 'Direct communication with teammates and leaders',
      icon: MessageSquare,
      action: () => onNavigateTab('messages'),
      keywords: ['messages', 'chat', 'direct', 'conversation', 'inbox'],
    },
    {
      id: 'nav-team',
      type: 'nav',
      title: isLead ? 'My Team Workload' : 'Team Directory & Workload',
      description: 'Team member capacity and task distributions',
      icon: Users,
      action: () => onNavigateTab('team'),
      keywords: ['team', 'members', 'workload', 'capacity', 'directory', 'employees'],
    },
    ...((isFounder || isLead)
      ? [
          {
            id: 'nav-reassignments',
            type: 'nav',
            title: 'Reassignment Requests',
            description: 'Review tasks flagged by employees as misallocated',
            icon: AlertCircle,
            action: () => onNavigateTab('reassignments'),
            keywords: ['reassignments', 'rejected', 'wrong', 'review', 'dispute'],
          },
        ]
      : []),
    ...((isFounder || isLead) && onOpenAddEmployee
      ? [
          {
            id: 'action-add-employee',
            type: 'nav',
            title: isLead ? '+ Add Member to Team' : '+ Add Teammate / Employee',
            description: isLead ? 'Add an employee directly to your team' : 'Directly add an employee or team lead using their work email',
            icon: UserPlus,
            action: () => onOpenAddEmployee(),
            keywords: ['add', 'employee', 'teammate', 'invite', 'user', 'member', 'hire'],
          },
        ]
      : []),
  ];

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Search tasks via debounce
  useEffect(() => {
    if (!isOpen) return;
    if (!query.trim()) {
      setTaskResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoadingTasks(true);
        const data = await api.getTasks({ search: query.trim() });
        setTaskResults(data.slice(0, 5)); // top 5 matches
      } catch (err) {
        console.error('Failed to search tasks in CommandPalette', err);
      } finally {
        setLoadingTasks(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Filter navigation items based on query
  const filteredNav = query.trim()
    ? navigationItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase()))
      )
    : navigationItems;

  // Filter team members based on query
  const filteredUsers = query.trim()
    ? (availableUsers || [])
        .filter(
          (u) =>
            u.id !== user?.id &&
            (u.name.toLowerCase().includes(query.toLowerCase()) ||
              (u.email && u.email.toLowerCase().includes(query.toLowerCase())) ||
              (u.department && u.department.toLowerCase().includes(query.toLowerCase())) ||
              (u.title && u.title.toLowerCase().includes(query.toLowerCase())) ||
              u.role.toLowerCase().includes(query.toLowerCase()))
        )
        .slice(0, 4)
    : [];

  // Combine items for keyboard navigation index
  const allItems = [
    ...taskResults.map((t) => ({ type: 'task', data: t })),
    ...filteredUsers.map((u) => ({ type: 'user', data: u })),
    ...filteredNav.map((n) => ({ type: 'nav', data: n })),
  ];

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, taskResults.length]);

  // Handle keyboard navigation (Arrow Up, Arrow Down, Enter, Escape)
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (allItems.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % allItems.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (allItems.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        executeItem(allItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const executeItem = (item) => {
    if (item.type === 'task') {
      onSelectTask(item.data.id);
      onClose();
    } else if (item.type === 'user') {
      if (onOpenChatWithUser) onOpenChatWithUser(item.data.id);
      onClose();
    } else if (item.type === 'nav') {
      item.data.action();
      onClose();
    }
  };

  if (!isOpen) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-start justify-center p-3 sm:p-6 pt-[10vh] sm:pt-[14vh] transition-all"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-150 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/40">
          <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search deliverables, teammates, or navigate views... (Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 outline-hidden font-medium"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/70 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-3 space-y-4 max-h-[60vh]">
          {loadingTasks && (
            <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              Searching company deliverables...
            </div>
          )}

          {/* TASKS SECTION */}
          {taskResults.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                Tasks & Deliverables
              </div>
              <div className="space-y-1 mt-1">
                {taskResults.map((t) => {
                  flatIndex++;
                  const currentIndex = flatIndex;
                  const isSelected = selectedIndex === currentIndex;

                  return (
                    <div
                      key={`task-${t.id}`}
                      onClick={() => executeItem({ type: 'task', data: t })}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.2 rounded-full ${
                            t.priority === 'urgent'
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              : t.priority === 'high'
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                          }`}>
                            {t.priority}
                          </span>
                          <span className="font-bold text-xs truncate">{t.title}</span>
                          {t.deliverable_url && (
                            <span className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                              <Link2 className="w-2.5 h-2.5" />
                              Proof
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>#{t.id}</span>
                          <span>•</span>
                          <span>{t.status.replace('_', ' ').toUpperCase()}</span>
                          {t.assignee_name && (
                            <>
                              <span>•</span>
                              <span>Assigned to {t.assignee_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-300 dark:text-slate-600'}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TEAM MEMBERS SECTION */}
          {filteredUsers.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                Teammates
              </div>
              <div className="space-y-1 mt-1">
                {filteredUsers.map((u) => {
                  flatIndex++;
                  const currentIndex = flatIndex;
                  const isSelected = selectedIndex === currentIndex;

                  return (
                    <div
                      key={`user-${u.id}`}
                      onClick={() => executeItem({ type: 'user', data: u })}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`px-3 py-2 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar
                          name={u.name}
                          avatar={u.avatar}
                          role={u.role}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs truncate">{u.name}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-medium">
                              {u.role === 'founder' ? '👑 Founder' : u.role === 'team_lead' ? '🛡️ Lead' : '💼 Employee'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {u.title || u.department || u.email}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">
                        Direct Message →
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* NAVIGATION VIEWS */}
          {filteredNav.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-3 py-1">
                Navigation
              </div>
              <div className="space-y-1 mt-1">
                {filteredNav.map((item) => {
                  flatIndex++;
                  const currentIndex = flatIndex;
                  const isSelected = selectedIndex === currentIndex;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.id}
                      onClick={() => executeItem({ type: 'nav', data: item })}
                      onMouseEnter={() => setSelectedIndex(currentIndex)}
                      className={`px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-xs block truncate">{item.title}</span>
                          <span className="text-[11px] text-slate-400 block truncate">{item.description}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                        Jump to ↵
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No results message */}
          {query.trim() && allItems.length === 0 && !loadingTasks && (
            <div className="py-8 text-center text-xs text-slate-400 space-y-1">
              <p className="font-semibold text-slate-600 dark:text-slate-300">No results found for "{query}"</p>
              <p>Try searching for a deliverable title, teammate name, or navigation view.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span><kbd className="font-semibold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">↑</kbd> <kbd className="font-semibold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">↓</kbd> Navigate</span>
            <span><kbd className="font-semibold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">↵</kbd> Select</span>
          </div>
          <span><kbd className="font-semibold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
