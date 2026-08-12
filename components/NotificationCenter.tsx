import React, { useState, useEffect } from 'react';
import { 
  Bell, Check, X, Sparkles, Heart, Utensils, MessageSquare, 
  ShieldAlert, Watch, CheckCheck, Send, Volume2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { 
  auth,
  ActivityNotification, 
  requestPushNotificationPermission, 
  sendActivityNotification, 
  subscribeToNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  listenToForegroundPushMessages
} from '../services/firebase';

interface Props {
  user: UserProfile;
}

export const NotificationCenter: React.FC<Props> = ({ user }) => {
  const currentUserId = auth.currentUser?.uid || 'guest_user';
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [activeTab, setActiveTab] = useState<'all' | 'vitals' | 'nutri' | 'ai' | 'emergency' | 'wearable'>('all');
  const [isSubmittingPermission, setIsSubmittingPermission] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check current browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus('unsupported');
    }
  }, []);

  // Real-time listener for user activity notifications from Firebase Firestore
  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToNotifications(currentUserId, (notifs) => {
      setNotifications(notifs);
    });
    return () => unsubscribe();
  }, [currentUserId]);

  // Listen for foreground FCM push messages
  useEffect(() => {
    let unlisten: any;
    listenToForegroundPushMessages((payload) => {
      showToast(payload.notification?.title || 'New Push Notification');
    }).then(unsub => {
      unlisten = unsub;
    });

    return () => {
      if (typeof unlisten === 'function') unlisten();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleEnablePush = async () => {
    setIsSubmittingPermission(true);
    const result = await requestPushNotificationPermission(currentUserId);
    setIsSubmittingPermission(false);

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }

    if (result.granted) {
      showToast('Push Notifications enabled successfully!');
      // Send welcome activity notification
      await sendActivityNotification(currentUserId, {
        title: 'Push Notifications Active',
        body: 'You will now receive instant push alerts for vital syncs, AI health advice, and emergencies.',
        type: 'system',
        actionUrl: '/'
      });
    } else {
      alert(result.error || 'Push notifications were not enabled.');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    return n.type === activeTab;
  });

  const getNotificationIcon = (type: ActivityNotification['type']) => {
    switch (type) {
      case 'vitals':
        return <Heart size={16} className="text-red-500" />;
      case 'nutri':
        return <Utensils size={16} className="text-orange-500" />;
      case 'ai':
        return <MessageSquare size={16} className="text-blue-500" />;
      case 'emergency':
        return <ShieldAlert size={16} className="text-red-600" />;
      case 'wearable':
        return <Watch size={16} className="text-purple-500" />;
      default:
        return <Bell size={16} className="text-emerald-500" />;
    }
  };

  const formatTimeAgo = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSecs = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSecs < 60) return 'Just now';
      if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
      if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-xl transition-all"
        title="Activity Notifications"
        aria-label="Open activity notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-extrabold text-white animate-pulse shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Toast Message */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gray-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-gray-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <Volume2 size={16} className="text-blue-400 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Slide-over Drawer Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-over Drawer Container */}
      <div 
        className={`fixed top-0 bottom-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-800 z-50 shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Activity Notifications</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Real-time Firebase push events</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllNotificationsAsRead(currentUserId, notifications)}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck size={14} /> Read all
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Push Notification Permission Card & Test Trigger */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700/80 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-900 dark:text-white">Firebase Web Push</span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                }`}>
                  {permissionStatus === 'granted' ? 'Enabled' : permissionStatus}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {permissionStatus === 'granted' 
                  ? 'Active! Receiving instant background alerts for vital syncs and AI recommendations.' 
                  : 'Enable browser permission to receive live push notifications when activities occur.'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isSubmittingPermission}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} /> Enable Push
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-gray-50/30 dark:bg-gray-800/30">
          {[
            { id: 'all', label: 'All' },
            { id: 'vitals', label: 'Vitals' },
            { id: 'nutri', label: 'NutriScan' },
            { id: 'ai', label: 'AI Advice' },
            { id: 'emergency', label: 'Emergency' },
            { id: 'wearable', label: 'Devices' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Stream List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id || notif.timestamp}
                onClick={() => {
                  if (notif.id) markNotificationAsRead(currentUserId, notif.id);
                  if (notif.actionUrl) {
                    setIsOpen(false);
                    navigate(notif.actionUrl);
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 relative group ${
                  notif.read
                    ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/60 opacity-80'
                    : 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50 shadow-2xs'
                }`}
              >
                {!notif.read && (
                  <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                )}

                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-xl shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0 pr-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">
                      {notif.title}
                    </h4>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
                    {notif.body}
                  </p>

                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 block pt-0.5">
                    {formatTimeAgo(notif.timestamp)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center space-y-3">
              <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-gray-400">
                <Bell size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">No Activity Notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto mt-1">
                  When health vitals, NutriScan meals, or wearable telemetry are recorded, live push alerts will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
