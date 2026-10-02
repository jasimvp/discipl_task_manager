import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  Send,
  Lock,
  Users
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function AddEmployeeModal({ isOpen, onClose, onUserAdded }) {
  const { user } = useAuth();
  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';

  const [activeTab, setActiveTab] = useState('invite'); // 'invite' | 'unassigned' | 'pending' | 'preapproved'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome@2026');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('Engineering & Tech');
  const [title, setTitle] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [addedUserDetails, setAddedUserDetails] = useState(null);

  // Pending users, preapproved invites, unassigned, teams
  const [pendingUsers, setPendingUsers] = useState([]);
  const [preapprovedInvites, setPreapprovedInvites] = useState([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState([]);
  const [teamsList, setTeamsList] = useState([]);
  const [selectedTeamMap, setSelectedTeamMap] = useState({});
  const [loadingLists, setLoadingLists] = useState(false);

  const loadData = async () => {
    try {
      setLoadingLists(true);
      const promises = [
        api.getUnassignedEmployees().catch(() => []),
        api.getTeams().catch(() => [])
      ];
      if (isFounder) {
        promises.push(api.getPendingUsers().catch(() => []));
        promises.push(api.getCompanyInvites().catch(() => []));
      }
      const results = await Promise.all(promises);
      setUnassignedEmployees(results[0] || []);
      setTeamsList(results[1] || []);
      if (isFounder) {
        setPendingUsers(results[2] || []);
        setPreapprovedInvites(results[3] || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLists(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setEmail('');
      setPassword('Welcome@2026');
      setRole('employee');
      setDepartment(user?.department || 'Engineering & Tech');
      setTitle('');
      setError('');
      setSuccessMessage('');
      setAddedUserDetails(null);
      setActiveTab('invite');
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
      setAddedUserDetails(null);
      const defaultTitle = role === 'founder' 
        ? 'Co-Founder' 
        : role === 'team_lead' 
        ? 'Team Lead' 
        : 'Software Engineer';

      const matchingTeam = teamsList.find((t) => t.name === department);

      const res = await api.addEmployee({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || 'Welcome@2026',
        role: role,
        department: department,
        team_id: matchingTeam ? matchingTeam.id : undefined,
        title: title.trim() || defaultTitle,
      });

      setSuccessMessage(res.message);
      setAddedUserDetails({
        name: res.user?.name || name.trim() || email.split('@')[0],
        email: res.user?.email || res.email || email.trim().toLowerCase(),
        role: res.user?.role || role,
        department: res.user?.department || department,
        password: password.trim() || res.temporaryPassword || 'Welcome@2026'
      });
      setName('');
      setEmail('');
      setPassword('Welcome@2026');
      setTitle('');
      loadData();
      if (onUserAdded && res.user) onUserAdded(res.user);
    } catch (err) {
      setError(err.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimUnassigned = async (targetEmp) => {
    try {
      setLoading(true);
      setError('');
      const chosenTeamId = selectedTeamMap[targetEmp.id];
      const targetTeam = teamsList.find((t) => t.id === Number(chosenTeamId)) 
        || teamsList.find((t) => t.name === targetEmp.department) 
        || (user?.team_id ? teamsList.find((t) => t.id === user.team_id) : teamsList[0]);

      const res = await api.addExistingMemberToTeam({
        user_id: targetEmp.id,
        team_id: targetTeam?.id || chosenTeamId || user?.team_id,
      });
      setSuccessMessage(res.message);
      loadData();
      if (onUserAdded && res.user) onUserAdded(res.user);
    } catch (err) {
      setError(err.message || 'Failed to add member to team');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePendingUser = async (u) => {
    try {
      setLoading(true);
      await api.approveAccessRequest(u.id, {
        role: u.role || 'employee',
        department: u.department || 'Engineering & Tech',
        title: u.title || 'Software Engineer'
      });
      loadData();
      if (onUserAdded) onUserAdded(u);
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
                {isLead ? 'Add Member to Team' : 'Link Teammate to Discipl'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {isLead ? `Add a new member to ${user?.department || 'your team'}` : 'Add employee work emails to grant workspace access'}
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
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-3 gap-2 bg-slate-50/30 dark:bg-slate-800/20 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'invite'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {isLead ? '+ Add New Member' : '+ Add by Email'}
          </button>

          {/* Unassigned Teammates tab (available to Team Leads and Founders) */}
          <button
            type="button"
            onClick={() => setActiveTab('unassigned')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'unassigned'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Unassigned Employees</span>
            {unassignedEmployees.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                {unassignedEmployees.length}
              </span>
            )}
          </button>
          
          {isFounder && (
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Registered Waiting</span>
              {pendingUsers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {pendingUsers.length}
                </span>
              )}
            </button>
          )}

          {isFounder && (
            <button
              type="button"
              onClick={() => setActiveTab('preapproved')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
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
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {addedUserDetails && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 text-xs space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Employee Account Created & Activated!</span>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/90 p-3.5 rounded-xl space-y-2 text-slate-700 dark:text-slate-300 text-xs border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-500">Employee Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{addedUserDetails.name}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-500">Employee Email ID:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">{addedUserDetails.email}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-500">Workspace Role:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {addedUserDetails.role === 'founder' ? '👑 Co-Founder' : addedUserDetails.role === 'team_lead' ? '🛡️ Team Lead' : '💼 Employee'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{addedUserDetails.department}</span>
                </div>
                {addedUserDetails.password && (
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-semibold text-slate-500">Login Password:</span>
                    <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                      {addedUserDetails.password}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                The employee can log in immediately using the email and password above.
              </p>
            </div>
          )}

          {successMessage && !addedUserDetails && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* TAB 1: ADD NEW MEMBER / INVITE BY EMAIL */}
          {activeTab === 'invite' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-purple-900 dark:text-purple-300 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                <span className="leading-relaxed">
                  Enter the employee's details and select their department. If you provide an initial password, their account is instantly activated so they can log in right away!
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name (Optional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:focus:ring-purple-900/50 outline-hidden"
                  />
                </div>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Login Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    placeholder="Welcome@2026"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-purple-500 outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                  The employee will use this password and email to log in. Default is Welcome@2026.
                </p>
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
                    Department *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-purple-500 outline-hidden"
                  >
                    {teamsList.length > 0 ? (
                      teamsList.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))
                    ) : (
                      <>
                        <option value="Engineering & Tech">Engineering & Tech</option>
                        <option value="Product & Design">Product & Design</option>
                        <option value="Marketing & Growth">Marketing & Growth</option>
                        <option value="Operations & Management">Operations & Management</option>
                      </>
                    )}
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
                    placeholder="e.g. Senior Frontend Developer"
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
                  <span>
                    {loading
                      ? 'Processing...'
                      : password.trim()
                      ? 'Create & Activate Account Instantly'
                      : isLead
                      ? 'Add Member to Department'
                      : 'Authorize & Link Email to Discipl'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* TAB: UNASSIGNED EMPLOYEES (Available to Team Lead & Founder) */}
          {activeTab === 'unassigned' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Approved employees currently not assigned to any specific team:
                </p>
                <button
                  onClick={loadData}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLists ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {unassignedEmployees.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  No unassigned employees found. All active members are already in teams!
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {unassignedEmployees.map((emp) => (
                    <div key={emp.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={emp.name} avatar={emp.avatar} role={emp.role} size="md" />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{emp.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{emp.email}</p>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            {emp.title || 'Employee'} • {emp.department || 'No department'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {teamsList.length > 0 && (
                          <select
                            value={selectedTeamMap[emp.id] || teamsList.find(t => t.name === emp.department)?.id || user?.team_id || teamsList[0]?.id}
                            onChange={(e) => setSelectedTeamMap(prev => ({ ...prev, [emp.id]: Number(e.target.value) }))}
                            className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs focus:border-purple-500 outline-hidden"
                          >
                            {teamsList.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => handleClaimUnassigned(emp)}
                          disabled={loading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: REGISTERED USERS WAITING TO BE LINKED (Founder only) */}
          {activeTab === 'pending' && isFounder && (
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

          {/* TAB 3: PRE-AUTHORIZED EMAILS (Founder only) */}
          {activeTab === 'preapproved' && isFounder && (
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
