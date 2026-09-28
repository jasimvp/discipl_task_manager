import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  AlertCircle, 
  MessageSquare, 
  Users, 
  Bell, 
  ChevronDown, 
  ShieldAlert, 
  CheckCircle2, 
  KeyRound, 
  LogOut,
  Briefcase
} from 'lucide-react';
import { api } from '../services/api';
import DisciplLogo from './DisciplLogo';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, socket } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [reassignmentCount, setReassignmentCount] = useState(0);
  const [pendingAccessCount, setPendingAccessCount] = useState(0);

  const isFounder = user?.role === 'founder';
  const isLead = user?.role === 'team_lead';
  const isEmployee = user?.role === 'employee';

  const loadNotificationsAndStats = async () => {
    try {
      const notifData = await api.getNotifications();
      setNotifications(notifData.notifications || []);
      setUnreadCount(notifData.unreadCount || 0);

      const stats = await api.getDashboardStats();
      setReassignmentCount(stats.summary?.pendingRejections || 0);

      if (isFounder) {
        const reqs = await api.getAccessRequests();
        setPendingAccessCount(reqs.length || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotificationsAndStats();
  }, [user]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      loadNotificationsAndStats();
    };

    socket.on('task_created', handleUpdate);
    socket.on('task_updated', handleUpdate);
    socket.on('task_reassigned', handleUpdate);
    socket.on('rejection_requested', handleUpdate);
    socket.on('new_access_request', handleUpdate);
    socket.on('access_request_updated', handleUpdate);

    return () => {
      socket.off('task_created', handleUpdate);
      socket.off('task_updated', handleUpdate);
      socket.off('task_reassigned', handleUpdate);
      socket.off('rejection_requested', handleUpdate);
      socket.off('new_access_request', handleUpdate);
      socket.off('access_request_updated', handleUpdate);
    };
  }, [socket, user]);

  const handleMarkRead = async () => {
    await api.markNotificationsRead();
    setUnreadCount(0);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'founder':
        return <span className="bg-purple-100 text-purple-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-purple-200 flex items-center gap-1">👑 Founder</span>;
      case 'team_lead':
        return <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200 flex items-center gap-1">🛡️ Team Lead</span>;
      case 'employee':
        return <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200 flex items-center gap-1">💼 Employee</span>;
      default:
        return null;
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Discipl Brand with 'D' Logo - Clean without 'Enterprise' tag */}
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setActiveTab('dashboard')}>
            <DisciplLogo className="w-10 h-10" size={26} />
            <div>
              <span className="font-extrabold text-2xl text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                Discipl
              </span>
              <p className="text-[10px] font-medium text-slate-400 hidden sm:block tracking-wide">
                {isFounder ? 'Executive Command' : isLead ? 'Team Operations' : 'Personal Workspace'}
              </p>
            </div>
          </div>

          {/* Navigation Tabs - Dynamically Scoped per User Role */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {/* Dashboard tab */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{isEmployee ? 'My Workspace' : isLead ? 'Team Dashboard' : 'Dashboard'}</span>
            </button>

            {/* Tasks tab */}
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'tasks'
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>{isEmployee ? 'My Tasks' : 'Tasks'}</span>
            </button>

            {/* Reassignments Tab (Visible to Founder and Team Lead) */}
            {(isFounder || isLead) && (
              <button
                onClick={() => setActiveTab('reassignments')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === 'reassignments'
                    ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <AlertCircle className={`w-4 h-4 ${reassignmentCount > 0 ? 'text-amber-600 animate-pulse' : ''}`} />
                <span>Reassignments</span>
                {reassignmentCount > 0 && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                    {reassignmentCount}
                  </span>
                )}
              </button>
            )}

            {/* Messages Tab */}
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'messages'
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Messages</span>
            </button>

            {/* Team Directory Tab */}
            <button
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'team'
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>{isLead ? 'My Team' : 'Team'}</span>
            </button>

            {/* Founder Access Requests Tab */}
            {isFounder && (
              <button
                onClick={() => setActiveTab('access')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
                  activeTab === 'access'
                    ? 'bg-purple-50 text-purple-800 ring-1 ring-purple-200 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <KeyRound className="w-4 h-4 text-purple-600" />
                <span>Access</span>
                {pendingAccessCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-bounce">
                    {pendingAccessCount}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* User Controls & Profile */}
          <div className="flex items-center space-x-3">
            
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications && unreadCount > 0) handleMarkRead();
                }}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-ping" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">Notifications</span>
                    <button
                      onClick={handleMarkRead}
                      className="text-xs text-indigo-600 hover:underline font-semibold"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-slate-400">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-3 text-xs hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-indigo-50/40' : ''}`}>
                          <div className="flex items-start gap-2">
                            {n.type === 'access_request' ? (
                              <KeyRound className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                            ) : n.type === 'task_rejected' ? (
                              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            ) : n.type === 'task_completed' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                            ) : (
                              <Bell className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800">{n.title}</p>
                              <p className="text-slate-600 mt-0.5">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 transition-all text-left bg-white shadow-2xs"
              >
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user?.name}
                  className="w-8 h-8 rounded-xl object-cover ring-2 ring-slate-100"
                />
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{user?.name}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div>{getRoleBadge(user?.role)}</div>
                </div>
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                    <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{user?.department || 'General'}</p>
                    <div className="mt-2">{getRoleBadge(user?.role)}</div>
                  </div>

                  {/* Sign Out Button */}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out (ലോഗൗട്ട്)
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
