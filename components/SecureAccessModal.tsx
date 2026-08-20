import React, { useState } from 'react';
import { ShieldCheck, Lock, X, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export const SecureAccessModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPass = password.trim();
    if (!trimmedPass) {
      setError('Please enter password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmedPass }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          setError('Incorrect password. Please try again.');
        } else if (response.status === 429) {
          setError(data.error || 'Too many attempts. Please try again.');
        } else {
          setError(data.error || 'Authentication error. Please check your password.');
        }
        setLoading(false);
        return;
      }

      if (data.success && data.token) {
        setPassword('');
        setError(null);
        onSuccess(data.token);
      } else {
        setError('Authentication failed. Please check your password.');
      }
    } catch (err) {
      setError('Incorrect password or network glitch. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative space-y-5"
        role="dialog"
        aria-labelledby="secure-access-title"
      >
        <button
          onClick={() => {
            setPassword('');
            setError(null);
            onClose();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close secure access dialog"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl border border-slate-200 dark:border-slate-700">
            <ShieldCheck size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 id="secure-access-title" className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
              Secure Access
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Restricted operational area</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300 animate-in fade-in duration-150">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoFocus
                required
                disabled={loading}
                className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder:text-gray-400"
              />
              <Lock size={16} className="absolute right-3.5 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setError(null);
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 active:scale-95"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              <span>Continue</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
