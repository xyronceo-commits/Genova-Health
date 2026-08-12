import React, { useState, useEffect } from 'react';
import { Bell, Check, Sparkles, Droplets, Moon, Heart, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import { auth, getNotificationPreferences, saveNotificationPreferences, NotificationPreferences, requestPushNotificationPermission } from '../services/firebase';

export const NotificationPreferencesCard: React.FC = () => {
  const userId = auth.currentUser?.uid || '';
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    globalEnabled: true,
    reminders: true,
    hydration: true,
    sleep: true,
    wellness: true,
    product_updates: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    } else {
      setBrowserPermission('unsupported');
    }

    if (userId) {
      getNotificationPreferences(userId).then(res => {
        setPrefs(res);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [userId]);

  const handleToggleCategory = async (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    if (userId) {
      setSaving(true);
      await saveNotificationPreferences(userId, updated);
      setSaving(false);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    }
  };

  const handleEnablePush = async () => {
    const res = await requestPushNotificationPermission(userId);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
    if (res.granted && userId) {
      const updated = { ...prefs, globalEnabled: true };
      setPrefs(updated);
      await saveNotificationPreferences(userId, updated);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
        <div className="h-10 w-full bg-gray-100 dark:bg-gray-700/50 rounded-xl"></div>
      </div>
    );
  }

  const categories = [
    {
      key: 'reminders' as const,
      label: 'Health Reminders',
      description: 'Check-in reminders, vital check prompts, and medical checkups.',
      icon: Heart,
      iconColor: 'text-red-500 bg-red-50 dark:bg-red-950/40'
    },
    {
      key: 'hydration' as const,
      label: 'Hydration Updates',
      description: 'Daily water goal reminders and hydration tracking updates.',
      icon: Droplets,
      iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40'
    },
    {
      key: 'sleep' as const,
      label: 'Sleep Check-ins',
      description: 'Morning sleep quality logs and bedtime relaxation prompts.',
      icon: Moon,
      iconColor: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
    },
    {
      key: 'wellness' as const,
      label: 'Wellness & Mood',
      description: 'Daily stress assessment and holistic wellness prompts.',
      icon: Sparkles,
      iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
    },
    {
      key: 'product_updates' as const,
      label: 'Product Updates',
      description: 'New feature announcements and Genova Health platform news.',
      icon: Info,
      iconColor: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40'
    }
  ];

  return (
    <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Bell size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-900 dark:text-white">Push Notification Preferences</h2>
              <ShieldCheck size={16} className="text-emerald-500" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Manage device alerts & category permissions</p>
          </div>
        </div>

        {savedMsg && (
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-xl animate-in fade-in">
            Preferences Saved
          </span>
        )}
      </div>

      {/* Browser Permission Banner */}
      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-gray-900 dark:text-white">Browser Permission:</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
              browserPermission === 'granted'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                : browserPermission === 'denied'
                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
            }`}>
              {browserPermission === 'granted' ? 'Granted' : browserPermission === 'denied' ? 'Blocked (Denied)' : browserPermission}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {browserPermission === 'granted'
              ? 'FCM Push active for this browser device.'
              : browserPermission === 'denied'
              ? 'Browser has blocked notification prompts for this origin.'
              : 'Permission is required to receive background push alerts on this device.'}
          </p>
        </div>

        {browserPermission === 'default' && (
          <button
            type="button"
            onClick={handleEnablePush}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
          >
            Enable Device
          </button>
        )}
      </div>

      {/* Denied / Blocked Instructions Callout */}
      {browserPermission === 'denied' && (
        <div className="p-4 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-extrabold text-xs">
            <AlertTriangle size={16} className="shrink-0 text-red-500" />
            <span>Notifications Blocked in Browser Settings</span>
          </div>
          <p className="text-xs text-red-700 dark:text-red-300 font-medium leading-relaxed">
            Your browser currently blocks push notifications for this site. To allow notifications:
          </p>
          <ol className="list-decimal list-inside text-xs text-red-800 dark:text-red-200 space-y-1.5 font-medium pl-1">
            <li>Click the <strong>Lock / Settings icon</strong> next to the web address (URL) in your browser bar.</li>
            <li>Locate <strong>Notifications</strong> and change the dropdown from <strong>Block</strong> to <strong>Allow</strong>.</li>
            <li>Refresh this page to activate FCM push notifications for your account.</li>
          </ol>
        </div>
      )}

      {/* Master Global Toggle */}
      <div className="flex items-center justify-between p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
        <div>
          <span className="text-xs font-black text-gray-900 dark:text-white block">All Notifications</span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400">Global master switch for FCM push delivery</span>
        </div>

        <button
          type="button"
          onClick={() => handleToggleCategory('globalEnabled')}
          className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
            prefs.globalEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
              prefs.globalEnabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Category List */}
      <div className={`space-y-3 transition-opacity ${prefs.globalEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider ml-1">Notification Categories</p>

        {categories.map((cat) => {
          const IconComp = cat.icon;
          const isEnabled = prefs[cat.key];

          return (
            <div
              key={cat.key}
              className="flex items-center justify-between p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/30 dark:bg-gray-900/30 hover:border-blue-200 dark:hover:border-blue-900 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${cat.iconColor}`}>
                  <IconComp size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">{cat.label}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{cat.description}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleCategory(cat.key)}
                className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none shrink-0 ${
                  isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 left-1 ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
