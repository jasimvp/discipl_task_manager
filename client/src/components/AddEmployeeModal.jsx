import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  UserPlus,
  Mail,
  User,
  Building,
  Briefcase,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Crown,
  Clock,
  Trash2,
  RefreshCw,
  Send
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function AddEmployeeModal({ isOpen, onClose, onUserAdded }) {
  const [activeTab, setActiveTab] = useState('invite'); // 'invite' | 'pending' | 'preapproved'
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('Engineering & Tech');
  const [title, setTitle] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Pending users and preapproved invites
  const [pendingUsers, setPendingUsers] = useState([]);
  const [preapprovedInvites, setPreapprovedInvites] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);

  const loadData = async () => {
    try {
      setLoadingLists(true);
      const [pending, invites] = await Promise.all([
        api.getPendingUsers().catch(() => []),
        api.getCompanyInvites().catch(() => [])
      ]);
      setPendingUsers(pending || []);
      setPreapprovedInvites(invites || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('employee');
      setDepartment('Engineering & Tech');
      setTitle('');
      setError('');
      setSuccessMessage('');
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide the employee work email.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');
      const defaultTitle = role === 'founder' 
        ? 'Co-Founder' 
        : role === 'team_lead' 
        ? 'Team Lead' 
        : 'Software Engineer';

      const res = await api.addEmployee({
        email: email.trim().toLowerCase(),
        role,
        department,
        title: title.trim() || defaultTitle,
      });

      setSuccessMessage(res.message);
      setEmail('');
      setTitle('');
      loadData();
      if (onUserAdded && res.user) onUserAdded(res.user);
    } catch (err) {
      setError(err.message || 'Failed to link employee email');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePendingUser = async (user) => {
    try {
      setLoading(true);
      await api.approveAccessRequest(user.id, {
        role: user.role || 'employee',
        department: user.department || 'Engineering & Tech',
        title: user.title || 'Software Engineer'
      });
      loadData();
      if (onUserAdded) onUserAdded(user);
    } catch (err) {
      setError(err.message || 'Failed to approve user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvite = async (id) => {
    try {
      await api.deleteCompanyInvite(id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 transition-colors">
        
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                Link Teammate to Discipl
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                Add employee work emails to grant workspace access
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-3 gap-2 bg-slate-50/30 dark:bg-slate-800/20 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'invite'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Add by Email
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Registered Waiting to Link</span>
            {pendingUsers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preapproved')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'preapproved'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Pre-Authorized Emails</span>
            {preapprovedInvites.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                {preapprovedInvites.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* TAB 1: ADD BY EMAIL */}
          {activeTab === 'invite' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-purple-900 dark:text-purple-300 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">
                  Enter the employee's work email. If the employee already registered with this email, they will be instantly linked into Discipl. If not, this email will be pre-authorized so they get instant access when they sign up!
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Employee Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. backend.dev@discipl.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Workspace Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-purple-500 outline-hidden"
                  >
                    <option value="employee">💼 Employee</option>
                    <option value="team_lead">🛡️ Team Lead</option>
                    <option value="founder">👑 Co-Founder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-purple-500 outline-hidden"
                  >
                    <option value="Engineering & Tech">Engineering & Tech</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Marketing & Growth">Marketing & Growth</option>
                    <option value="Operations & Management">Operations</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Designation / Title (Optional)
                </label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Senior Backend Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-purple-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Linking Email...' : 'Authorize & Link Email to Discipl'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTERED USERS WAITING TO BE LINKED */}
          {activeTab === 'pending' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Employees who have self-registered and are waiting for your confirmation:
                </p>
                <button
                  onClick={loadData}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLists ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {pendingUsers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  No registered employees waiting to be linked.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pendingUsers.map((u) => (
                    <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.name} avatar={u.avatar} role={u.role} size="md" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{u.email}</p>
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                            {u.title || u.role} • {u.department}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleApprovePendingUser(u)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Link to Company</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRE-AUTHORIZED EMAILS */}
          {activeTab === 'preapproved' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Emails you have pre-authorized for Discipl:
                </p>
                <button
                  onClick={loadData}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLists ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {preapprovedInvites.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  No pending email invites. Use the "Add by Email" tab to pre-authorize teammates!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {preapprovedInvites.map((inv) => (
                    <div key={inv.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{inv.email}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {inv.role} • {inv.department} • Added {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteInvite(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Remove pre-authorized email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
