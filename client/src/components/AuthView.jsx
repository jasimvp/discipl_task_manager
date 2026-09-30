import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  CheckCircle2,
  Crown,
  Briefcase,
  Building,
  Sparkles,
  Info,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import DisciplLogo from './DisciplLogo';

export default function AuthView() {
  const { login, register } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('employee'); // 'founder' | 'team_lead' | 'employee'
  const [regDepartment, setRegDepartment] = useState('Engineering & Tech');
  const [regTitle, setRegTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Handle Role selection and auto-adjust suggested Department / Title
  const handleRoleChange = (newRole) => {
    setRegRole(newRole);
    if (newRole === 'founder') {
      setRegDepartment('Executive Leadership');
      if (!regTitle || regTitle === 'Software Engineer' || regTitle === 'Team Lead') {
        setRegTitle('Founder & CEO');
      }
    } else if (newRole === 'team_lead') {
      setRegDepartment('Engineering & Tech');
      if (!regTitle || regTitle === 'Founder & CEO' || regTitle === 'Software Engineer') {
        setRegTitle('Team Lead');
      }
    } else {
      setRegDepartment('Engineering & Tech');
      if (!regTitle || regTitle === 'Founder & CEO' || regTitle === 'Team Lead') {
        setRegTitle('Software Engineer');
      }
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setError('Please enter your work email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessNotice('');
      await login(loginEmail.trim(), loginPassword);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please complete all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessNotice('');
      
      const defaultTitle = 
        regRole === 'founder' 
          ? 'Founder & CEO' 
          : regRole === 'team_lead' 
          ? 'Team Lead' 
          : 'Software Engineer';

      await register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        department: regDepartment,
        title: regTitle.trim() || defaultTitle,
      });
      setSuccessNotice('Account registered successfully! Welcome to Discipl.');
    } catch (err) {
      setError(err.message || 'Registration failed');
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
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-100 dark:border-slate-800 transition-colors">
          
          {/* Header Switch Tabs */}
          <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); setSuccessNotice(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                authMode === 'login'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Sign In (ലോഗിൻ)
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setError(''); setSuccessNotice(''); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                authMode === 'register'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Register (രജിസ്ട്രേഷൻ)
            </button>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {authMode === 'login' ? 'Sign In to Discipl' : 'Create Your Account'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {authMode === 'login'
                ? 'Enter your work email and password to access workspace.'
                : 'Select your role and set up your profile credentials.'}
            </p>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {successNotice && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium">{successNotice}</div>
            </div>
          )}

          {authMode === 'login' ? (
            /* ======================================================== */
            /* 1. STANDARD SIGN IN FORM                                */
            /* ======================================================== */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@discipl.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Sign In to Discipl (ലോഗിൻ)'}
              </button>

              <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Don't have an account yet? Click <strong>Register (രജിസ്ട്രേഷൻ)</strong> above to create your profile and choose your role.
                </p>
              </div>
            </form>
          ) : (
            /* ======================================================== */
            /* 2. REGISTRATION FORM WITH ROLE SELECTION                 */
            /* ======================================================== */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jasim"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Work Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="name@discipl.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="Set your password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Role Selection Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Your Role (റോൾ തിരഞ്ഞെടുക്കുക) *
                </label>
                <select
                  value={regRole}
                  onChange={(e) => handleRoleChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:border-indigo-500 outline-hidden"
                >
                  <option value="founder">👑 Founder / Executive (ഫൗണ്ടർ)</option>
                  <option value="team_lead">🛡️ Team Lead (ടീം ലീഡ്)</option>
                  <option value="employee">💼 Employee / Specialist (എംപ്ലോയി)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <select
                    value={regDepartment}
                    onChange={(e) => setRegDepartment(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 outline-hidden"
                  >
                    {regRole === 'founder' && (
                      <option value="Executive Leadership">Executive Leadership</option>
                    )}
                    <option value="Engineering & Tech">Engineering & Tech</option>
                    <option value="Product & Design">Product & Design</option>
                    <option value="Marketing & Growth">Marketing & Growth</option>
                    <option value="Operations & Management">Operations & Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Developer"
                    value={regTitle}
                    onChange={(e) => setRegTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>{loading ? 'Creating Account...' : 'Complete Registration (അക്കൗണ്ട് ഉണ്ടാക്കുക)'}</span>
              </button>

              <div className="p-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
                <span>
                  നിങ്ങൾ തിരഞ്ഞെടുക്കുന്ന റോൾ (Founder, Team Lead, Employee) അനുസരിച്ച് നിങ്ങളുടെ വർക്ക്‌സ്‌പേസ് ഡാഷ്‌ബോർഡ് തത്സമയം സജ്ജീകരിക്കപ്പെടും.
                </span>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
