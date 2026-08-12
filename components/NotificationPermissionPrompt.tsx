import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, X, ShieldCheck, AlertTriangle } from 'lucide-react';
import { requestPushNotificationPermission, setNotificationPromptDismissed, getNotificationPromptDismissed } from '../services/firebase';

interface Props {
  userId?: string;
  onPermissionComplete?: (granted: boolean) => void;
}

export const NotificationPermissionPrompt: React.FC<Props> = ({ userId, onPermissionComplete }) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blockedState, setBlockedState] = useState(false);

  useEffect(() => {
    // Only show if supported and user hasn't selected "Not now"
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (getNotificationPromptDismissed()) return;

    if (Notification.permission === 'denied') {
      // If blocked, we don't pop up immediately on page load, but can be triggered if invoked
      return;
    }

    if (Notification.permission === 'default') {
      // Gentle 3-second delay on page load after user enters portal
      const timer = setTimeout(() => {
        setVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    setLoading(true);
    const res = await requestPushNotificationPermission(userId);
    setLoading(false);

    if (res.granted) {
      setVisible(false);
      if (onPermissionComplete) {
        onPermissionComplete(true);
      }
    } else if (res.permissionState === 'denied' || res.reasonCode === 'PERMISSION_DENIED') {
      setBlockedState(true);
    } else {
      setVisible(false);
      if (onPermissionComplete) {
        onPermissionComplete(false);
      }
    }
  };

  const handleDismiss = () => {
    setNotificationPromptDismissed(true);
    setVisible(false);
    if (onPermissionComplete) {
      onPermissionComplete(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl shrink-0 ${blockedState ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'}`}>
              {blockedState ? <AlertTriangle size={22} /> : <Bell size={22} className="animate-pulse" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Genova Health</span>
                <ShieldCheck size={14} className="text-emerald-500" />
              </div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white leading-snug">
                {blockedState ? 'Notifications Blocked' : 'Stay on top of your health'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {blockedState ? (
          <div className="space-y-3">
            <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">
              Notifications are currently blocked by your browser settings. To enable notifications for Genova Health:
            </p>
            <ol className="list-decimal list-inside text-xs text-gray-700 dark:text-gray-200 space-y-1 font-medium pl-1">
              <li>Click the <strong>Lock icon</strong> in your browser address bar.</li>
              <li>Change <strong>Notifications</strong> to <strong>Allow</strong>.</li>
              <li>Refresh the page.</li>
            </ol>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-2xl transition-all mt-2"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
              Get helpful reminders and updates from Genova Health.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                {loading ? 'Connecting...' : 'Enable notifications'}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="py-2.5 px-4 bg-gray-100 dark:bg-gray-700/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-2xl transition-all"
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
