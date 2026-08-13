import React, { useState, useEffect } from 'react';
import { GenovaLogo } from './GenovaLogo';
import { Mail, CheckCircle2, RefreshCw, AlertCircle, Loader2, ExternalLink, LogOut, ShieldCheck } from 'lucide-react';
import { auth, reloadFirebaseUser, sendFirebaseEmailVerification, logout } from '../services/firebase';

interface Props {
  email: string;
  onVerificationComplete: () => void;
  onCancel?: () => void;
}

export const EmailVerificationScreen: React.FC<Props> = ({
  email,
  onVerificationComplete,
  onCancel
}) => {
  const [checking, setChecking] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'error' | 'success' | 'info'; text: string } | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState<boolean>(false);

  const displayEmail = email || auth.currentUser?.email || 'your email address';

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auto-verify check function when user returns to window/tab
  const checkVerificationState = async (silent = false) => {
    if (checking || verifiedSuccess) return;
    if (!silent) setChecking(true);
    setStatusMessage(null);

    try {
      const refreshedUser = await reloadFirebaseUser();
      if (refreshedUser?.emailVerified) {
        setVerifiedSuccess(true);
        setStatusMessage({
          type: 'success',
          text: 'Email verified successfully! Opening Genova Health...'
        });
        setTimeout(() => {
          onVerificationComplete();
        }, 1200);
      } else if (!silent) {
        setStatusMessage({
          type: 'error',
          text: "Your email hasn't been verified yet. Please click the verification link sent to your email, then try again."
        });
      }
    } catch (err: any) {
      console.error('Error checking email verification status:', err);
      if (!silent) {
        setStatusMessage({
          type: 'error',
          text: err.message || 'Failed to check verification status. Please try again.'
        });
      }
    } finally {
      if (!silent) setChecking(false);
    }
  };

  // Listen for tab focus/visibility change to auto-verify seamlessly
  useEffect(() => {
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkVerificationState(true);
      }
    };

    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, []);

  // Resend Verification Email via Firebase Auth
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setStatusMessage(null);

    try {
      await sendFirebaseEmailVerification();
      setResendCooldown(60); // 60-second cooldown
      setStatusMessage({
        type: 'success',
        text: `Verification link sent to ${displayEmail}. Please check your inbox and spam folder.`
      });
    } catch (err: any) {
      console.error('Failed to send verification email:', err);
      let errorText = 'Failed to resend verification email. Please try again later.';
      if (err.code === 'auth/too-many-requests') {
        errorText = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (err.message) {
        errorText = err.message;
      }
      setStatusMessage({
        type: 'error',
        text: errorText
      });
    } finally {
      setResending(false);
    }
  };

  // Helper to open email inbox webmail or mailto
  const handleOpenEmailApp = () => {
    const domain = displayEmail.split('@')[1]?.toLowerCase() || '';
    if (domain.includes('gmail.com')) {
      window.open('https://mail.google.com', '_blank');
    } else if (domain.includes('outlook.com') || domain.includes('hotmail.com') || domain.includes('live.com')) {
      window.open('https://outlook.live.com', '_blank');
    } else if (domain.includes('yahoo.com')) {
      window.open('https://mail.yahoo.com', '_blank');
    } else if (domain.includes('icloud.com')) {
      window.open('https://www.icloud.com/mail', '_blank');
    } else {
      window.open(`mailto:${displayEmail}`, '_self');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      if (onCancel) onCancel();
    } catch (e) {
      console.error('Error signing out:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
        
        {/* Brand & Heading */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 rounded-2xl shadow-sm">
            <GenovaLogo className="w-10 h-10" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Verify Your Email
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
            Your Genova Health account isn't verified yet. Check your inbox and click the verification link sent to:
          </p>

          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-gray-100 font-mono break-all">
            <Mail size={16} className="text-blue-600 shrink-0" />
            <span>{displayEmail}</span>
          </div>
        </div>

        {/* Status / Error / Success Message Banner */}
        {statusMessage && (
          <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs font-medium animate-in fade-in duration-200 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold">{statusMessage.type === 'success' ? 'Status Update' : 'Verification Needed'}</p>
              <p>{statusMessage.text}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          
          {/* 1. Open Email App */}
          <button
            type="button"
            onClick={handleOpenEmailApp}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20 active:scale-[0.99]"
          >
            <ExternalLink size={18} />
            <span>Open Email Inbox</span>
          </button>

          {/* 2. I've verified my email */}
          <button
            type="button"
            disabled={checking || verifiedSuccess}
            onClick={() => checkVerificationState(false)}
            className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            {checking ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Checking Verification...</span>
              </>
            ) : verifiedSuccess ? (
              <>
                <CheckCircle2 size={18} className="text-emerald-400 dark:text-emerald-600" />
                <span>Email Verified!</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>I've Verified My Email</span>
              </>
            )}
          </button>

          {/* 3. Resend verification email */}
          <button
            type="button"
            disabled={resendCooldown > 0 || resending || checking}
            onClick={handleResendEmail}
            className="w-full bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {resending ? (
              <>
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span>Sending Verification Link...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} className="text-blue-600" />
                <span>
                  {resendCooldown > 0 ? `Resend Email (${resendCooldown}s)` : 'Resend Verification Email'}
                </span>
              </>
            )}
          </button>

        </div>

        {/* Footer Actions & Security Notice */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleSignOut}
            className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1.5 font-semibold transition-colors"
          >
            <LogOut size={14} />
            <span>Use different account</span>
          </button>

          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>Firebase Security</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmailVerificationScreen;
