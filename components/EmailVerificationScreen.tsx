import React, { useState, useEffect, useRef } from 'react';
import { GenovaLogo } from './GenovaLogo';
import { ShieldCheck, Mail, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Lock } from 'lucide-react';

interface Props {
  email: string;
  userId?: string;
  onVerificationComplete: () => void;
  onCancel?: () => void;
}

export const EmailVerificationScreen: React.FC<Props> = ({
  email,
  userId,
  onVerificationComplete,
  onCancel
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState<boolean>(false);
  const [sendingCode, setSendingCode] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [maskedEmail, setMaskedEmail] = useState<string>('');

  // 10-minute code expiry timer (600 seconds)
  const [expirySeconds, setExpirySeconds] = useState<number>(600);
  // 60-second resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState<number>(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Mask email for privacy (e.g. j***n@gmail.com)
  const maskEmailAddress = (rawEmail: string): string => {
    if (!rawEmail || !rawEmail.includes('@')) return rawEmail || '';
    const [name, domain] = rawEmail.split('@');
    if (name.length <= 2) {
      return `${name.charAt(0)}***@${domain}`;
    }
    const visibleStart = name.charAt(0);
    const visibleEnd = name.charAt(name.length - 1);
    return `${visibleStart}***${visibleEnd}@${domain}`;
  };

  // Initial code dispatch when screen mounts
  useEffect(() => {
    setMaskedEmail(maskEmailAddress(email));
    sendVerificationCode();
  }, [email]);

  // Countdown timers effect
  useEffect(() => {
    const timer = setInterval(() => {
      setExpirySeconds(prev => (prev > 0 ? prev - 1 : 0));
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Send or resend verification code
  const sendVerificationCode = async () => {
    setSendingCode(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send verification code.');
      }

      setMaskedEmail(data.emailMasked || maskEmailAddress(email));
      setExpirySeconds(600); // Reset to 10 minutes
      setResendCooldown(60); // Reset cooldown to 60 seconds
      setDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  // Handle individual box input change
  const handleDigitChange = (index: number, value: string) => {
    if (expirySeconds <= 0 || success) return;

    // Only allow digits
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Handle single digit entry or multi-digit paste
    if (cleanValue.length === 1) {
      const newDigits = [...digits];
      newDigits[index] = cleanValue;
      setDigits(newDigits);
      setError(null);

      // Focus next box
      if (index < 5 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto verify if last digit entered
      if (index === 5 || newDigits.every(d => d !== '')) {
        verifyCode(newDigits.join(''));
      }
    } else if (cleanValue.length === 6) {
      // Pasted full 6-digit code
      const newDigits = cleanValue.split('').slice(0, 6);
      setDigits(newDigits);
      setError(null);
      if (inputRefs.current[5]) {
        inputRefs.current[5]?.focus();
      }
      verifyCode(cleanValue);
    }
  };

  // Handle key navigation (Backspace & Left/Right Arrows)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').trim();
    if (pastedData.length === 6) {
      const newDigits = pastedData.split('');
      setDigits(newDigits);
      setError(null);
      if (inputRefs.current[5]) {
        inputRefs.current[5]?.focus();
      }
      verifyCode(pastedData);
    }
  };

  // Verify full 6-digit code with backend API
  const verifyCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6 || loading || success) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: codeToVerify })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please check the code.');
      }

      setSuccess(true);
      // Brief pause to display success checkmark before completing
      setTimeout(() => {
        onVerificationComplete();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
        
        {/* Top Header Controls */}
        <div className="flex items-center justify-between">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Back"
            >
              <ArrowLeft size={20} />
            </button>
          ) : <div />}

          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1.5 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <Lock size={14} />
            <span>2FA Security</span>
          </div>
        </div>

        {/* Brand & Heading */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 rounded-2xl shadow-sm">
            <GenovaLogo className="w-10 h-10" />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Verify Your Email
          </h2>

          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
            Enter the 6-digit security code sent to:
          </p>

          <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-900 dark:text-gray-100 font-mono">
            <Mail size={16} className="text-blue-600 shrink-0" />
            <span>{maskedEmail || email}</span>
          </div>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3 animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-lg font-extrabold text-emerald-900 dark:text-emerald-200">Email Verified!</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              Your email address has been authenticated securely. Redirecting to your dashboard...
            </p>
          </div>
        ) : (
          /* Verification Form */
          <div className="space-y-6">
            
            {/* 6-Digit OTP Box Grid */}
            <div className="space-y-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 text-center">
                Security Code
              </label>

              <div className="flex items-center justify-between gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => { if (el) inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    disabled={loading || expirySeconds <= 0}
                    onChange={e => handleDigitChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    className={`w-11 sm:w-13 h-13 sm:h-14 text-center text-xl font-extrabold rounded-2xl border transition-all outline-none font-mono ${
                      digit 
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-sm' 
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20'
                    } ${expirySeconds <= 0 ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800/40' : ''}`}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Error Message Display */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3 text-xs text-red-700 dark:text-red-400 font-medium animate-in fade-in duration-200">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-800 dark:text-red-300">Verification Error</p>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {/* Expiry & Resend Bar */}
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Code Expires:</span>
                <span className={`font-mono font-extrabold ${expirySeconds < 60 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'}`}>
                  {formatTime(expirySeconds)}
                </span>
              </div>

              <button
                type="button"
                onClick={sendVerificationCode}
                disabled={resendCooldown > 0 || sendingCode || loading}
                className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 disabled:text-gray-400 dark:disabled:text-gray-600 font-bold transition-colors"
              >
                {sendingCode ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                <span>
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
                </span>
              </button>
            </div>

            {/* Expired Prompt Notice */}
            {expirySeconds <= 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl text-center space-y-2">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  This verification code has expired.
                </p>
                <button
                  type="button"
                  onClick={sendVerificationCode}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  Request Fresh Code
                </button>
              </div>
            )}

            {/* Verification Manual Button */}
            <button
              type="button"
              disabled={digits.some(d => d === '') || loading || expirySeconds <= 0}
              onClick={() => verifyCode(digits.join(''))}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-2xl font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <span>Verify Account</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </div>
        )}

        {/* Security Footer Notice */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center gap-2 text-[10px] text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
          <ShieldCheck size={14} className="text-emerald-500 shrink-0" />
          <span>Protected by Genova Server Authentication Engine</span>
        </div>

      </div>
    </div>
  );
};

export default EmailVerificationScreen;
