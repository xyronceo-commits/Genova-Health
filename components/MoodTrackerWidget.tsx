import React, { useEffect, useState } from 'react';
import { Smile, Meh, Frown, Sparkles, Check, HeartPulse, Zap } from 'lucide-react';
import { addMoodLog, getMoodLogs, MoodLog } from '../services/firebase';

interface Props {
  uid: string;
  compact?: boolean;
}

const MOOD_OPTIONS = [
  { label: 'Great', emoji: '😃', score: 5, color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  { label: 'Good', emoji: '😊', score: 4, color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
  { label: 'Calm', emoji: '😌', score: 3, color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' },
  { label: 'Low', emoji: '😔', score: 2, color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  { label: 'Stressed', emoji: '😫', score: 1, color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
];

export const MoodTrackerWidget: React.FC<Props> = ({ uid, compact = false }) => {
  const [logs, setLogs] = useState<MoodLog[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const fetchedLogs = await getMoodLogs(uid);
      setLogs(fetchedLogs);
    } catch (e) {
      console.warn("Mood widget load error:", e);
    }
  };

  useEffect(() => {
    loadData();

    const handleQueueChange = () => {
      loadData();
    };
    window.addEventListener('genova_offline_queue_changed', handleQueueChange);
    return () => window.removeEventListener('genova_offline_queue_changed', handleQueueChange);
  }, [uid]);

  const latestLog = logs[0] || null;

  const handleSelectMood = async (option: typeof MOOD_OPTIONS[0]) => {
    if (isSubmitting) return;
    setSelectedMood(option.label);
    setIsSubmitting(true);
    try {
      const newEntry = await addMoodLog(uid, option.label, option.score, note);
      setLogs(prev => [newEntry, ...prev]);
      
      const msg = newEntry.synced ? `Mood "${option.label}" saved to Cloud Database!` : `Mood "${option.label}" logged!`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
      setNote('');
    } catch (err) {
      console.error("Error logging mood:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (compact) {
    return (
      <div className="bg-indigo-50/80 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Smile size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-indigo-950 dark:text-indigo-200 tracking-wider">Mood Check-In</h4>
              <p className="text-xs font-bold text-indigo-900 dark:text-indigo-100">
                {latestLog ? `Latest: ${latestLog.mood}` : 'How are you feeling today?'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 pt-1">
          {MOOD_OPTIONS.map(opt => (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleSelectMood(opt)}
              disabled={isSubmitting}
              className={`py-2 rounded-xl text-center border transition-all active:scale-95 ${opt.color} ${latestLog?.mood === opt.label ? 'ring-2 ring-indigo-500 font-extrabold' : ''}`}
            >
              <span className="text-base block">{opt.emoji}</span>
              <span className="text-[9px] font-bold block mt-0.5 truncate">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-xs space-y-4 relative overflow-hidden">
      {toastMessage && (
        <div className="absolute top-2 right-2 left-2 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center justify-between z-20 animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="flex items-center gap-1.5"><Check size={14} /> {toastMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Smile size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Mental Wellbeing & Mood</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Cloud database daily mood logs</p>
          </div>
        </div>

        {latestLog && (
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
            Logged {new Date(latestLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {MOOD_OPTIONS.map(opt => {
          const isSelected = latestLog?.mood === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleSelectMood(opt)}
              disabled={isSubmitting}
              className={`p-3 rounded-xl text-center border transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${opt.color} ${isSelected ? 'ring-2 ring-indigo-500 scale-105 shadow-sm font-black' : 'hover:opacity-90'}`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-[10px] font-bold truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mood History Log list */}
      {logs.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Mood Check-Ins</p>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
            {logs.slice(0, 3).map((log, idx) => {
              const opt = MOOD_OPTIONS.find(o => o.label === log.mood) || MOOD_OPTIONS[1];
              return (
                <div key={log.id || idx} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/40 px-3 py-1.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span>{opt.emoji}</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{log.mood}</span>
                    {log.note && <span className="text-[10px] text-gray-400 italic">"{log.note}"</span>}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodTrackerWidget;
