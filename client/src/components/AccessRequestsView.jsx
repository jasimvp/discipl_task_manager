import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  UserCheck, 
  UserX, 
  UserPlus, 
  Clock, 
  ShieldCheck, 
  Building, 
  Briefcase, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Trash2,
  X
} from 'lucide-react';
import UserAvatar from './UserAvatar';

export default function AccessRequestsView() {
  const { user, refreshUsers, socket } = useAuth();
  const [requests, setRequests] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  // Direct Add Employee modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('Welcome@2026');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteDept, setInviteDept] = useState('Engineering & Tech');
  const [inviteTitle, setInviteTitle] = useState('');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqs, allUsers, teamList] = await Promise.all([
        api.getAccessRequests(),
        api.getUsers(),
        api.getTeams(),
      ]);
      setRequests(reqs);
      setActiveUsers(allUsers);
      setTeams(teamList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleReqUpdated = () => {
      loadData();
    };

    socket.on('new_access_request', handleReqUpdated);
    socket.on('access_request_updated', handleReqUpdated);
    socket.on('user_added', handleReqUpdated);
    socket.on('user_removed', handleReqUpdated);

    return () => {
      socket.off('new_access_request', handleReqUpdated);
      socket.off('access_request_updated', handleReqUpdated);
      socket.off('user_added', handleReqUpdated);
      socket.off('user_removed', handleReqUpdated);
    };
  }, [socket]);

  // Handle Approve
  const handleApprove = async (reqId, role, teamId) => {
    try {
      await api.approveAccessRequest(reqId, { role, team_id: teamId });
      setMessage('Access granted successfully! The employee can now sign in.');
      loadData();
      refreshUsers();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to approve');
    }
  };

  // Handle Reject
  const handleReject = async (reqId) => {
    if (!window.confirm('Are you sure you want to decline this access request?')) return;
    try {
      await api.rejectAccessRequest(reqId);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to reject');
    }
  };

  // Handle Revoke / Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to revoke this user\'s access and remove them from the company?')) return;
    try {
      await api.deleteUser(userId);
      loadData();
      refreshUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  };

  // Handle Invite / Add Employee
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingInvite(true);
      setInviteError('');
      await api.inviteUser({
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        password: invitePassword,
        role: inviteRole,
        department: inviteDept,
        title: inviteTitle.trim() || (inviteRole === 'team_lead' ? 'Team Lead' : 'Employee'),
        team_id: inviteTeamId ? Number(inviteTeamId) : null,
      });

      setMessage(`Employee ${inviteName} successfully added!`);
      setIsInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      loadData();
      refreshUsers();
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setInviteError(err.message || 'Failed to add user');
    } finally {
      setSubmittingInvite(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-purple-200 mb-2">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Founder Access Control Panel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Employee Access & Join Requests
            </h1>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-xl">
              Founders have complete control over who joins the company. Approve or decline employee registration requests, or add team members directly.
            </p>
          </div>

          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee Directly
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {/* SECTION 1: PENDING ACCESS REQUESTS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-base text-slate-900">
                Pending Registration Requests ({requests.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              These employees signed up and are waiting for your approval to enter the workspace.
            </p>
          </div>
          {requests.length > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Action Needed
            </span>
          )}
        </div>

        {requests.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">No Pending Requests</p>
            <p className="text-xs text-slate-400">
              All employee access requests have been reviewed and approved.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => (
              <div key={req.id} className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <UserAvatar
                    name={req.name}
                    avatar={req.avatar}
                    role={req.role}
                    size="lg"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.role === 'team_lead' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        Requested: {req.role === 'team_lead' ? 'Team Lead' : 'Employee'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {req.email}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {req.department || 'General'}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(req.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleReject(req.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 text-xs font-semibold transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleApprove(req.id, req.role, req.team_id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                  >
                    <UserCheck className="w-4 h-4" />
                    Approve & Grant Access
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ACTIVE COMPANY MEMBERS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-base text-slate-900">
                Active Approved Members ({activeUsers.length})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Employees and Team Leaders with active access to company tasks and chats.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Member</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department / Team</th>
                <th className="py-3 px-4 text-center">Active Tasks</th>
                <th className="py-3 px-6 text-right">Access Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeUsers.map((m) => {
                const isMe = m.id === user?.id;
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={m.name}
                          avatar={m.avatar}
                          role={m.role}
                          size="sm"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{m.name}</span>
                            {isMe && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded font-bold">You</span>}
                          </div>
                          <span className="text-[11px] text-slate-400">{m.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.role === 'founder'
                          ? 'bg-purple-100 text-purple-700'
                          : m.role === 'team_lead'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {m.role === 'founder' ? 'Founder' : m.role === 'team_lead' ? 'Team Lead' : 'Employee'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-slate-600 font-medium">{m.department || m.team_name || 'General'}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-slate-800">{m.active_tasks_count || 0}</span>
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      {!isMe && (
                        <button
                          onClick={() => handleDeleteUser(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Revoke access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: DIRECT ADD EMPLOYEE */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Add Company Employee</h3>
                <p className="text-[11px] text-slate-500">Create an approved account directly</p>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6 space-y-3.5">
              {inviteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {inviteError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="alex@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password *
                </label>
                <input
                  type="text"
                  required
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-indigo-500"
                  >
                    <option value="employee">💼 Employee</option>
                    <option value="team_lead">🛡️ Team Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Team
                  </label>
                  <select
                    value={inviteTeamId}
                    onChange={(e) => setInviteTeamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-indigo-500"
                  >
                    <option value="">Select Team...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fullstack Developer"
                  value={inviteTitle}
                  onChange={(e) => setInviteTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30"
                >
                  {submittingInvite ? 'Adding...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
