import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  CheckCircle2,
  Crown,
  ShieldCheck,
  Info
} from 'lucide-react';
import DisciplLogo from './DisciplLogo';

export default function AuthView() {
  const { login, register } = useAuth();
  
  // Setup check (only relevant if 0 founders exist)
  const [needsFounderSetup, setNeedsFounderSetup] = useState(false);
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Initial Founder setup fields (only for 1st founder)
  const [founderName, setFounderName] = useState('');
  const [founderEmail, setFounderEmail] = useState('');
  const [founderPassword, setFounderPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    async function checkSetup() {
      try {
        const status = await api.getSetupStatus();
        setNeedsFounderSetup(Boolean(status?.needsFounderSetup));
      } catch (e) {
        console.error('Failed to check setup status', e);
      }
    }
    checkSetup();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter your company email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessNotice('');
      await login(loginEmail.trim(), loginPassword);
    } catch (err) {
      setError(err.message || 'Invalid email or password. If you have not been added yet, please contact your company Founder.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialFounderSetup = async (e) => {
    e.preventDefault();
    if (!founderName.trim() || !founderEmail.trim() || !founderPassword) {
      setError('Please complete all fields to set up the company founder account.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessNotice('');
      await register({
        name: founderName.trim(),
        email: founderEmail.trim(),
        password: founderPassword,
        role: 'founder',
        title: 'Founder & CEO',
        department: 'Executive Leadership',
      });
      setSuccessNotice('Company workspace initialized! Welcome Founder.');
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="flex justify-center mb-3">
          <DisciplLogo size="lg" />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Discipl Task & Deliverables Management Workspace
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-100">
          
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              {needsFounderSetup ? 'Initial Founder Setup' : 'Sign In to Discipl'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {needsFounderSetup 
                ? 'Create the primary executive account for your company.'
                : 'Enter your company credentials to access your workspace.'}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successNotice && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{successNotice}</div>
            </div>
          )}

          {/* INITIAL FOUNDER SETUP FORM (Only shown if company has zero founders) */}
          {needsFounderSetup ? (
            <form onSubmit={handleInitialFounderSetup} className="space-y-4">
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                <Crown className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Registering as the initial Company Founder</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Founder Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jasim"
                    value={founderName}
                    onChange={(e) => setFounderName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Founder Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="admin@discipl.com"
                    value={founderEmail}
                    onChange={(e) => setFounderEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Create admin password"
                    value={founderPassword}
                    onChange={(e) => setFounderPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Initializing...' : 'Initialize Founder Workspace'}
              </button>
            </form>
          ) : (
            /* STANDARD SIGN IN FORM (Direct credentials provided by Founder) */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@discipl.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Sign In to Discipl'}
              </button>

              {/* Direct invitation note */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Invitation-Only Workspace:</strong> Employees and Team Leads are added directly by the Founder. If you haven't received your account credentials, please contact your company Founder.
                </p>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
