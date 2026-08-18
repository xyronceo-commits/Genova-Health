import React, { useEffect, useState } from 'react';
import { Droplets, Plus, Check, RefreshCw } from 'lucide-react';
import { addWaterLog, getWaterLogs, WaterLog } from '../services/firebase';

interface Props {
  uid: string;
  goalMl?: number;
  compact?: boolean;
}

export const WaterIntakeWidget: React.FC<Props> = ({ uid, goalMl = 2500, compact = false }) => {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isToday = (dateString: string) => {
    const d = new Date(dateString);
    const today = new Date();
    return d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
  };

  const loadData = async () => {
    try {
      const fetchedLogs = await getWaterLogs(uid);
      setLogs(fetchedLogs);
    } catch (e) {
      console.warn("Water widget load error:", e);
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

  const todayLogs = logs.filter(l => isToday(l.timestamp));
  const todayTotalMl = todayLogs.reduce((acc, l) => acc + (l.amountMl || 0), 0);
  const currentGoalMl = todayLogs[0]?.goalMl || goalMl;
  const progressPercent = Math.min(100, Math.round((todayTotalMl / currentGoalMl) * 100));

  const handleLogWater = async (amount: number) => {
    if (amount <= 0 || isAdding) return;
    setIsAdding(true);
    try {
      const newEntry = await addWaterLog(uid, amount, currentGoalMl);
      setLogs(prev => [newEntry, ...prev]);
      
      const msg = newEntry.synced ? `+${amount}ml saved to Cloud Database!` : `+${amount}ml logged!`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 3000);
      setShowCustomInput(false);
      setCustomAmount('');
    } catch (err) {
      console.error("Error logging water:", err);
    } finally {
      setIsAdding(false);
    }
  };

  if (compact) {
    return (
      <div className="bg-blue-50/80 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
              <Droplets size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-blue-950 dark:text-blue-200 tracking-wider">Daily Water Goal</h4>
              <p className="text-sm font-black text-blue-900 dark:text-blue-100">
                {todayTotalMl.toLocaleString()} / {currentGoalMl.toLocaleString()} ml
              </p>
            </div>
          </div>
          <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full">
            {progressPercent}%
          </span>
        </div>

        <div className="w-full bg-blue-200/60 dark:bg-blue-900/60 h-2 rounded-full overflow-hidden">
          <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="flex gap-2 pt-1">
          {[250, 500].map(amt => (
            <button
              key={amt}
              type="button"
              onClick={() => handleLogWater(amt)}
              disabled={isAdding}
              className="flex-1 py-1.5 bg-white dark:bg-gray-800 hover:bg-blue-600 hover:text-white text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition-all flex items-center justify-center gap-1 active:scale-95"
            >
              <Plus size={12} /> {amt} ml
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-xs space-y-4 relative overflow-hidden">
      {toastMessage && (
        <div className="absolute top-2 right-2 left-2 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center justify-between z-20 animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="flex items-center gap-1.5"><Check size={14} /> {toastMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Droplets size={22} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Hydration Tracker</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Cloud database hydration logs</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg">
            {progressPercent}% Goal
          </span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <span className="text-2xl font-black text-gray-900 dark:text-white">
            {todayTotalMl.toLocaleString()} <span className="text-xs font-bold text-gray-400">ml</span>
          </span>
          <span className="text-xs font-semibold text-gray-400">Target: {currentGoalMl.toLocaleString()} ml</span>
        </div>

        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Action Logging Buttons */}
      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleLogWater(250)}
            disabled={isAdding}
            className="py-2.5 px-3 bg-blue-50 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-100 dark:border-blue-900/60 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Plus size={14} /> 250 ml
          </button>
          <button
            type="button"
            onClick={() => handleLogWater(500)}
            disabled={isAdding}
            className="py-2.5 px-3 bg-blue-50 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-100 dark:border-blue-900/60 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Plus size={14} /> 500 ml
          </button>
          <button
            type="button"
            onClick={() => handleLogWater(750)}
            disabled={isAdding}
            className="py-2.5 px-3 bg-blue-50 hover:bg-blue-600 hover:text-white dark:bg-blue-950/40 dark:hover:bg-blue-600 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl border border-blue-100 dark:border-blue-900/60 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Plus size={14} /> 750 ml
          </button>
        </div>

        {!showCustomInput ? (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="w-full text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1"
          >
            + Custom Amount
          </button>
        ) : (
          <div className="flex gap-2 pt-1">
            <input
              type="number"
              placeholder="e.g. 350 ml"
              value={customAmount}
              onChange={e => setCustomAmount(e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-1.5 text-xs font-bold outline-none text-gray-900 dark:text-white"
            />
            <button
              type="button"
              onClick={() => handleLogWater(parseInt(customAmount, 10))}
              disabled={!customAmount || parseInt(customAmount, 10) <= 0 || isAdding}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowCustomInput(false)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-xl text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Recent Log Items */}
      {todayLogs.length > 0 && (
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Today's Intake History</p>
          <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
            {todayLogs.slice(0, 4).map((log, idx) => (
              <div key={log.id || idx} className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700/40 px-3 py-1.5 rounded-lg">
                <span className="font-bold text-gray-700 dark:text-gray-200">+{log.amountMl} ml</span>
                <span className="text-[10px] text-gray-400">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterIntakeWidget;
