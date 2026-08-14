import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { getOfflineQueue, syncOfflineQueue, auth } from '../services/firebase';

interface Props {
  className?: string;
  compact?: boolean;
}

export const OfflineSyncBadge: React.FC<Props> = ({ className = '', compact = false }) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [queueCount, setQueueCount] = useState<number>(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [justSynced, setJustSynced] = useState<boolean>(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) {
        handleSync();
      }
    };

    const handleQueueChange = () => {
      setQueueCount(getOfflineQueue().length);
    };

    const handleSyncCompleted = () => {
      setQueueCount(getOfflineQueue().length);
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    window.addEventListener('genova_offline_queue_changed', handleQueueChange);
    window.addEventListener('genova_sync_completed', handleSyncCompleted);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('genova_offline_queue_changed', handleQueueChange);
      window.removeEventListener('genova_sync_completed', handleSyncCompleted);
    };
  }, []);

  const handleSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const uid = auth.currentUser?.uid;
      const result = await syncOfflineQueue(uid);
      setQueueCount(result.remaining);
      if (result.synced > 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 4000);
      }
    } catch (e) {
      console.warn("Manual sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && queueCount === 0 && !justSynced) {
    if (compact) return null;
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-emerald-700 dark:text-emerald-400 text-xs font-semibold shadow-2xs ${className}`}>
        <CheckCircle2 size={13} className="text-emerald-500" />
        <span>Cloud Synced</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-300 text-xs font-bold shadow-xs ${className}`}>
        <WifiOff size={14} className="text-amber-600 dark:text-amber-400 animate-pulse shrink-0" />
        <span>
          Offline Mode {queueCount > 0 ? `• ${queueCount} ${queueCount === 1 ? 'entry' : 'entries'} cached locally` : '• Saved to localStorage'}
        </span>
      </div>
    );
  }

  if (justSynced) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-bold shadow-sm animate-in fade-in zoom-in-95 duration-300 ${className}`}>
        <CheckCircle2 size={14} />
        <span>Synced with Firestore</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-2xl text-blue-900 dark:text-blue-300 text-xs font-bold shadow-xs ${className}`}>
      <Wifi size={14} className="text-blue-600 shrink-0" />
      <span>{queueCount} cached {queueCount === 1 ? 'entry' : 'entries'} pending sync</span>
      <button
        onClick={handleSync}
        disabled={isSyncing}
        className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg text-blue-600 dark:text-blue-400 transition-colors disabled:opacity-50"
        title="Sync pending entries now"
      >
        <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
      </button>
    </div>
  );
};

export default OfflineSyncBadge;
