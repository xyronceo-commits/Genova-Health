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
    <div className="relative inline-block">
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
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

      {/* Conditionally rendered popup overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />

          {/* MOBILE: Bottom Sheet Overlay (<= 640px) */}
          <div className="sm:hidden fixed bottom-0 inset-x-0 z-50 w-full max-h-[80vh] bg-white dark:bg-gray-800 rounded-t-3xl border-t border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
            {/* Sheet Handle */}
            <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Header */}
            <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Bell size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead(currentUserId, notifications)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={14} /> Read all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Compact Enable Push Banner */}
            {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
              <div className="px-4 py-2.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-200 font-medium truncate">Get live background push alerts</span>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={isSubmittingPermission}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs shrink-0 transition-all"
                >
                  {isSubmittingPermission ? 'Connecting...' : 'Enable'}
                </button>
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All' },
                { id: 'vitals', label: 'Vitals' },
                { id: 'nutri', label: 'Nutri' },
                { id: 'ai', label: 'AI Advice' },
                { id: 'emergency', label: 'Emergency' },
                { id: 'wearable', label: 'Devices' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notifications Stream List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[50vh]">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id || notif.timestamp}
                    onClick={() => {
                      if (notif.id) markNotificationAsRead(currentUserId, notif.id);
                      setIsOpen(false);
                      if (notif.actionUrl) {
                        navigate(notif.actionUrl);
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 relative ${
                      notif.read
                        ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/60 opacity-80'
                        : 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50 shadow-2xs'
                    }`}
                  >
                    {!notif.read && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}

                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl shrink-0 mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-2 space-y-0.5">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
                        {notif.body}
                      </p>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 block">
                        {formatTimeAgo(notif.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center space-y-2">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-full w-10 h-10 mx-auto flex items-center justify-center text-gray-400">
                    <Bell size={20} />
                  </div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">No notifications yet</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Activity updates will appear here in real time.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP: Compact Popover Dropdown (> 640px) */}
          <div className="hidden sm:flex fixed top-14 right-4 z-50 w-80 sm:w-96 max-h-[500px] bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-3.5 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
                  <Bell size={16} />
                </div>
                <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead(currentUserId, notifications)}
                    className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck size={14} /> Read all
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Compact Enable Push Opt-in Banner */}
            {permissionStatus !== 'granted' && permissionStatus !== 'unsupported' && (
              <div className="px-3.5 py-2 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-xs text-gray-700 dark:text-gray-200 font-medium truncate">Get background push alerts</span>
                </div>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={isSubmittingPermission}
                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs shrink-0 transition-all"
                >
                  {isSubmittingPermission ? 'Connecting...' : 'Enable'}
                </button>
              </div>
            )}

            {/* Category Filter Pills */}
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All' },
                { id: 'vitals', label: 'Vitals' },
                { id: 'nutri', label: 'Nutri' },
                { id: 'ai', label: 'AI Advice' },
                { id: 'emergency', label: 'Emergency' },
                { id: 'wearable', label: 'Devices' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notifications Stream List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[360px]">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => (
                  <div
                    key={notif.id || notif.timestamp}
                    onClick={() => {
                      if (notif.id) markNotificationAsRead(currentUserId, notif.id);
                      setIsOpen(false);
                      if (notif.actionUrl) {
                        navigate(notif.actionUrl);
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-2.5 relative ${
                      notif.read
                        ? 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/60 opacity-80'
                        : 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50 shadow-2xs'
                    }`}
                  >
                    {!notif.read && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    )}

                    <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl shrink-0 mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0 pr-2 space-y-0.5">
                      <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
                        {notif.body}
                      </p>
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 block">
                        {formatTimeAgo(notif.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center space-y-2">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700/50 rounded-full w-10 h-10 mx-auto flex items-center justify-center text-gray-400">
                    <Bell size={20} />
                  </div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">No notifications yet</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Activity updates will appear here in real time.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
