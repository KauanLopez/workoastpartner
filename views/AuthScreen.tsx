import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

interface Props {
  initialMode: 'LOGIN' | 'SIGNUP';
  onSuccess: (user: any) => void;
}

const AuthScreen: React.FC<Props> = ({ initialMode, onSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);


  useEffect(() => {
    const savedEmail = localStorage.getItem('workoast_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    const timeoutPromise = new Promise<{ user: null, error: any }>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. Please check your connection and try again.")), 15000)
    );

    try {
      let result;
      if (mode === 'LOGIN') {
        result = await Promise.race([
          authService.signIn(email, password),
          timeoutPromise
        ]);
      } else {
        if (!displayName.trim()) {
          setError("Partner Name is required.");
          setLoading(false);
          return;
        }
        result = await Promise.race([
          authService.signUp(email, password, displayName),
          timeoutPromise
        ]);
      }

      if (result.error) {
        setError(result.error.message || "Authentication failed. Please try again.");
        setLoading(false);
      } else {
        if (mode === 'LOGIN') {
          if (rememberMe) {
            localStorage.setItem('workoast_remembered_email', email);
          } else {
            localStorage.removeItem('workoast_remembered_email');
          }
        }

        if (mode === 'SIGNUP') {
          setShowConfirmation(true);
          setLoading(false);
        } else {
          onSuccess(result.user);
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please check your connection.");
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
    setError(null);
  };

  if (showConfirmation) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center bg-background-light dark:bg-background-dark p-4 font-sans">
        <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-card p-10 shadow-2xl text-center animate-fade-in-down border border-border-light dark:border-border-dark">
          <div className="mx-auto size-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 mb-6">
            <span className="material-symbols-outlined text-4xl">mark_email_read</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight font-display">Check your inbox</h2>

          <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            We've sent a confirmation link to <br />
            <span className="font-bold text-gray-800 dark:text-gray-200">{email}</span>.
            <br />Please verify your email to access your account.
          </p>

          <button
            onClick={() => { setShowConfirmation(false); setMode('LOGIN'); }}
            className="w-full h-12 rounded-btn bg-primary hover:bg-primary-hover text-white font-semibold shadow-sm transition-all active:scale-95"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-background-light dark:bg-background-dark p-4 font-sans">
      <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-card p-10 shadow-2xl border border-border-light dark:border-border-dark animate-scale-in">


        <div className="flex flex-col items-center mb-8">
          <img
            src="https://media.licdn.com/dms/image/v2/D4D0BAQEOfFvQZ5wlhw/company-logo_200_200/company-logo_200_200/0/1698861766133/workoast_logo?e=2147483647&v=beta&t=7VZcCV5p6RHzOvBROOi3P5nIDBcSEql14HswDk4fDLQ"
            alt="WorkoastPartner Logo"
            className="size-12 rounded-btn mb-5"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight font-display">
            WorkoastPartner
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">
            {mode === 'LOGIN' ? 'Welcome back! Please enter your details.' : 'Create an account to get started.'}
          </p>
        </div>


        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {mode === 'SIGNUP' && (
            <div className="animate-fade-in-down">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Partner Name</label>
              <input
                type="text"
                required={mode === 'SIGNUP'}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Acme Corp"
                autoComplete="organization"
                className="w-full px-4 py-3.5 rounded-input bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-border-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-input bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-border-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'LOGIN' ? "current-password" : "new-password"}
              className="w-full px-4 py-3.5 rounded-input bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-border-dark text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
            />
          </div>

          {mode === 'LOGIN' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-800 dark:border-gray-600"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-600 dark:text-gray-400 font-medium cursor-pointer select-none">
                Remember me
              </label>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium text-center animate-pulse">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`mt-4 w-full h-12 rounded-btn font-semibold transition-all flex items-center justify-center
              ${loading
                ? 'bg-primary/70 cursor-not-allowed text-white'
                : 'bg-primary hover:bg-primary-hover text-white active:scale-95'
              }`}
          >
            {loading ? (
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              mode === 'LOGIN' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>


        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'LOGIN' ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={!loading ? toggleMode : undefined}
              className={`font-bold text-primary hover:text-primary-hover hover:underline transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {mode === 'LOGIN' ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;