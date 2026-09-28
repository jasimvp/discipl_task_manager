import React, { useState } from 'react';
import { api } from '../services/api';
import {
  X,
  UserPlus,
  Mail,
  User,
  Lock,
  Building,
  Briefcase,
  Check,
  Copy,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Crown
} from 'lucide-react';

export default function AddEmployeeModal({ isOpen, onClose, onUserAdded }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Welcome@2026');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('Engineering & Tech');
  const [title, setTitle] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdEmployee, setCreatedEmployee] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGeneratePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let pass = 'Dis@';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const defaultTitle = role === 'founder' 
        ? 'Co-Founder' 
        : role === 'team_lead' 
        ? 'Team Lead' 
        : 'Software Engineer';

      const res = await api.addEmployee({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        department,
        title: title.trim() || defaultTitle,
      });

      setCreatedEmployee({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        department,
        title: title.trim() || defaultTitle,
      });

      if (onUserAdded) onUserAdded(res.user);
    } catch (err) {
      setError(err.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdEmployee) return;
    const text = `Discipl Workspace Credentials\n---------------------------\nName: ${createdEmployee.name}\nEmail: ${createdEmployee.email}\nPassword: ${createdEmployee.password}\nRole: ${createdEmployee.role}\nLogin at: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResetForm = () => {
    setName('');
    setEmail('');
    setPassword('Welcome@2026');
    setRole('employee');
    setDepartment('Engineering & Tech');
    setTitle('');
    setError('');
    setCreatedEmployee(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleResetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                {createdEmployee ? 'Teammate Added' : 'Add Teammate to Discipl'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {createdEmployee ? 'Account created directly by Founder' : 'Manual employee addition by email'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS SCREEN WITH CREDENTIALS */}
          {createdEmployee ? (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-base">
                  {createdEmployee.name} added successfully!
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct access granted. Share these credentials with the employee so they can log in immediately.
                </p>
              </div>

              {/* Credentials Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Employee Credentials</span>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                    Active (Approved)
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono font-bold text-slate-800">{createdEmployee.email}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Password:</span>
                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {createdEmployee.password}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="font-semibold text-slate-700 capitalize">{createdEmployee.role.replace('_', ' ')}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-semibold text-slate-700">{createdEmployee.department}</span>
                </div>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopyCredentials}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Credentials Copied to Clipboard!' : 'Copy Login Details to Clipboard'}</span>
              </button>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex-1 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  + Add Another Employee
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ADD EMPLOYEE FORM */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Nair"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Company Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="priya@discipl.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Role in Discipl *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'employee', label: 'Employee', icon: '💼' },
                    { key: 'team_lead', label: 'Team Lead', icon: '🛡️' },
                    { key: 'founder', label: 'Co-Founder', icon: '👑' },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => setRole(r.key)}
                      className={`p-2.5 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                        role === r.key
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200 font-bold shadow-xs'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-base">{r.icon}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Department & Job Title */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-indigo-500"
                  >
                    <option value="Engineering & Tech">Engineering</option>
                    <option value="Product & Design">Design & Product</option>
                    <option value="Marketing & Growth">Marketing</option>
                    <option value="Operations & Management">Operations</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder={role === 'founder' ? 'Co-Founder' : role === 'team_lead' ? 'Team Lead' : 'e.g. Developer'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Assign Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Enter or generate a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono focus:border-indigo-500 outline-hidden"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  The employee will use this password and their email to sign in directly.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? 'Adding Employee...' : 'Confirm & Add Teammate'}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>
  );
}
