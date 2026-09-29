import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Clock, 
  Mail, 
  ShieldAlert, 
  RefreshCw, 
  LogOut, 
  CheckCircle2, 
  Sparkles,
  Building
} from 'lucide-react';
import DisciplLogo from './DisciplLogo';

export default function PendingWorkspaceView({ user }) {
  const { logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleCheckStatus = async () => {
    try {
      setChecking(true);
      setStatusMsg('');
      const me = await api.getMe();
      if (me && me.status === 'approved') {
        window.location.reload();
      } else {
        setStatusMsg('Founder has not linked your email yet. Please check back shortly or notify your Founder.');
      }
    } catch (e) {
      setStatusMsg('Unable to check status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-4">
          <DisciplLogo size="lg" />
        </div>
        
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-100 dark:border-slate-800 text-left">
          
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 mb-1">
                Awaiting Founder Workspace Linking
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Welcome, {user?.name || 'Teammate'}!
              </h2>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 mb-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              <Mail className="w-4 h-4 text-indigo-500" />
              <span>Registered Work Email</span>
            </div>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate">
              {user?.email}
            </p>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
            <p>
              നിങ്ങളുടെ ഡിസൈപ്പിൾ അക്കൗണ്ട് വിജയകരമായി ക്രിയേറ്റ് ചെയ്തിരിക്കുന്നു. കമ്പനി ടാസ്കുകളും വർക്ക്സ്പേസും ആക്സസ് ചെയ്യുന്നതിന്, ഫൗണ്ടർ നിങ്ങളുടെ ഇമെയിൽ (<strong>{user?.email}</strong>) കമ്പനി സിസ്റ്റത്തിൽ ലിങ്ക് ചെയ്യേണ്ടതുണ്ട്.
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Your Founder links employee emails directly from their dashboard. Once your email is linked, this page will automatically unlock with full workspace access in real-time!
            </p>
          </div>

          {statusMsg && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
              {statusMsg}
            </div>
          )}

          <div className="space-y-2.5">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>Sign Out</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
