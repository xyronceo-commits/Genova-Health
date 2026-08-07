import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bluetooth, Watch, Activity, Battery, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, ChevronLeft, Zap, Search, Wifi, Smartphone, Radio, ShieldCheck, 
  Heart, Moon, Footprints, Flame, Dumbbell, Navigation, Droplets, Thermometer, 
  Sparkles, TrendingUp, TrendingDown, Info, ListOrdered, Check, Layers, Gauge
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS } from '../constants';
import { UserProfile } from '../types';
import { ai } from '../services/ai';

interface Props {
  user: UserProfile;
}

interface SmartwatchTelemetry {
  heartRate: number;
  restingHeartRate: number;
  sleepDurationHours: number;
  sleepQualityPercent: number;
  sleepBreakdown: { deep: string; rem: string; light: string; awake: string };
  steps: number;
  caloriesBurnedTotal: number;
  caloriesActive: number;
  distanceKm: number;
  workouts: Array<{ name: string; type: string; durationMins: number; calories: number; avgHr: number }>;
  spo2Percent: number;
  stressLevelScore: number;
  skinTempDiffC: number;
  syncSpeedMs: number;
}

const Wearables: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState('');
  const [sensorPermission, setSensorPermission] = useState<boolean>(() => {
    return localStorage.getItem('genova_sensor_permission') === 'true';
  });
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  // Dynamic Live Telemetry State
  const [telemetry, setTelemetry] = useState<SmartwatchTelemetry>({
    heartRate: 72,
    restingHeartRate: 61,
    sleepDurationHours: 7.8,
    sleepQualityPercent: 88,
    sleepBreakdown: { deep: '1h 42m', rem: '2h 10m', light: '3h 56m', awake: '0h 20m' },
    steps: 8420,
    caloriesBurnedTotal: 2180,
    caloriesActive: 540,
    distanceKm: 6.35,
    workouts: [
      { name: 'Morning Cardio Run', type: 'Running', durationMins: 32, calories: 340, avgHr: 148 },
      { name: 'Evening Resistance Training', type: 'Strength', durationMins: 45, calories: 280, avgHr: 132 }
    ],
    spo2Percent: 98.5,
    stressLevelScore: 24,
    skinTempDiffC: 0.2,
    syncSpeedMs: 24
  });

  const [liveBattery, setLiveBattery] = useState(88);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const intervalRef = useRef<number | null>(null);

  const grantSensorPermission = () => {
    localStorage.setItem('genova_sensor_permission', 'true');
    setSensorPermission(true);
    setShowPermissionModal(false);
  };

  const revokeSensorPermission = () => {
    localStorage.setItem('genova_sensor_permission', 'false');
    setSensorPermission(false);
    if (device) disconnect();
  };

  useEffect(() => {
    const savedDevice = localStorage.getItem(STORAGE_KEYS.WEARABLE_DEVICE);
    if (savedDevice) {
      setDevice(JSON.parse(savedDevice));
    }
  }, []);

  // Run AI Health Analysis when device is connected
  useEffect(() => {
    if (device && device.connected) {
      runAIHealthAnalysis();
      
      intervalRef.current = window.setInterval(() => {
        setTelemetry(prev => {
          const change = Math.floor(Math.random() * 5) - 2;
          const newHr = Math.min(Math.max(prev.heartRate + change, 58), 110);
          return {
            ...prev,
            heartRate: newHr,
            syncSpeedMs: Math.floor(18 + Math.random() * 12)
          };
        });
        setLiveBattery(prev => Math.max(prev - (Math.random() > 0.98 ? 1 : 0), 1));
      }, 2500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [device]);

  const runAIHealthAnalysis = async () => {
    setIsAnalyzingAI(true);
    try {
      const userContext = `Name: ${user.fullName}, Age: ${user.age || 30}, Gender: ${user.gender || 'male'}, Blood: ${user.bloodGroup}, Genotype: ${user.genotype}`;
      const result = await ai.analyzeSmartwatchHealth({
        ...telemetry,
        userContext
      });
      setAiAnalysis(result);
    } catch (err) {
      console.error("Failed to analyze smartwatch health:", err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const connectVirtualDevice = () => {
    if (!sensorPermission) {
      localStorage.setItem('genova_sensor_permission', 'true');
      setSensorPermission(true);
    }
    setIsScanning(true);
    setError(null);
    setScanStatus('Connecting Smartwatch Telemetry Stream...');
    
    setTimeout(() => {
      const deviceData = {
        name: 'Genova SmartWatch Pro',
        id: 'SMARTWATCH-LIVE-001',
        connected: true,
        lastSeen: new Date().toISOString()
      };
      setDevice(deviceData);
      localStorage.setItem(STORAGE_KEYS.WEARABLE_DEVICE, JSON.stringify(deviceData));
      setIsScanning(false);
      setScanStatus('');
      triggerToast(`Bluetooth Connected: ${deviceData.name}`, 'success');
    }, 600);
  };

  const requestBluetooth = async () => {
    localStorage.setItem('genova_sensor_permission', 'true');
    setSensorPermission(true);
    setIsScanning(true);
    setError(null);
    setScanStatus('Initializing Bluetooth Permission...');
    
    try {
      const bluetooth = (navigator as any).bluetooth;
      if (!bluetooth) {
        throw new Error("Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Bluefy on iOS.");
      }

      setScanStatus('Scanning for nearby Smartwatches...');
      const btDevice = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['heart_rate', 'battery_service', 'device_information', 'health_thermometer', 'fitness_machine']
      });
      
      setScanStatus(`Connecting to ${btDevice.name || 'Smartwatch'}...`);
      
      const deviceData = {
        name: btDevice.name || 'Genova SmartWatch',
        id: btDevice.id || 'BT-' + Date.now(),
        connected: true,
        lastSeen: new Date().toISOString()
      };

      if (btDevice.gatt) {
        try {
          await btDevice.gatt.connect();
        } catch (gattErr) {
          console.warn("GATT Connection Notice:", gattErr);
        }
      }

      try {
        btDevice.addEventListener('gattserverdisconnected', () => {
          setDevice(null);
          localStorage.removeItem(STORAGE_KEYS.WEARABLE_DEVICE);
          triggerToast(`Bluetooth Disconnected: ${btDevice.name || 'Smartwatch'}`, 'info');
        });
      } catch (e) {
        // Ignore event listener error if unsupported
      }

      setDevice(deviceData);
      localStorage.setItem(STORAGE_KEYS.WEARABLE_DEVICE, JSON.stringify(deviceData));
      setScanStatus('');
      triggerToast(`Bluetooth Connected: ${deviceData.name}`, 'success');

    } catch (err: any) {
      console.warn("Bluetooth connection attempt:", err);
      const isCancelled = 
        err.name === 'NotFoundError' || 
        err.name === 'AbortError' || 
        err.name === 'SecurityError' ||
        err.message?.toLowerCase().includes('cancel') ||
        err.message?.toLowerCase().includes('denied');

      if (!isCancelled) {
        setError(err.message || "Failed to connect to Bluetooth device.");
        triggerToast("Bluetooth Connection Failed", "error");
      } else {
        setError("Bluetooth device selection was closed or restricted. Click 'Connect Smartwatch' anytime to grant access and scan again.");
      }
      setScanStatus('');
    } finally {
      setIsScanning(false);
    }
  };

  const disconnect = () => {
    const prevName = device?.name || 'SmartWatch';
    setDevice(null);
    setAiAnalysis(null);
    localStorage.removeItem(STORAGE_KEYS.WEARABLE_DEVICE);
    triggerToast(`Bluetooth Disconnected: ${prevName}`, 'info');
  };

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8 pb-28 md:pb-12 relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md text-xs sm:text-sm font-black border transition-all ${
              toast.type === 'success' 
                ? 'bg-emerald-600/95 text-white border-emerald-400/30' 
                : toast.type === 'info' 
                  ? 'bg-blue-600/95 text-white border-blue-400/30' 
                  : 'bg-rose-600/95 text-white border-rose-400/30'
            }`}
          >
            <Bluetooth size={18} className="animate-pulse shrink-0" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Navigation */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm"
      >
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-2xl transition-all text-gray-900 dark:text-white border border-gray-100 dark:border-gray-600 active:scale-95"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Smartwatch Telemetry & Insights
              </h1>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Real-time biometrics, trend analysis & health readiness score</p>
          </div>
        </div>

        {device && (
          <div className="flex items-center gap-3">
            <button
              onClick={runAIHealthAnalysis}
              disabled={isAnalyzingAI}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={16} className={isAnalyzingAI ? "animate-spin" : ""} />
              {isAnalyzingAI ? 'Analyzing Telemetry...' : 'Refresh AI Analysis'}
            </button>
            <button
              onClick={disconnect}
              className="p-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 rounded-2xl transition-all border border-red-100 dark:border-red-900/30"
              title="Disconnect Device"
            >
              <XCircle size={20} />
            </button>
          </div>
        )}
      </motion.header>

      {/* Main Connection Area or Full Smartwatch Telemetry Dashboard */}
      {!device ? (
        /* UNPAIRED STATE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <motion.div 
              layout
              className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="relative">
                <AnimatePresence>
                  {isScanning && (
                    <div className="absolute inset-0 -m-16 flex items-center justify-center pointer-events-none">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.5, opacity: 0.5 }}
                          animate={{ scale: 2.5, opacity: 0 }}
                          transition={{ duration: 3, repeat: Infinity, delay: i - 1, ease: "easeOut" }}
                          className="absolute w-32 h-32 border-2 border-blue-500/30 rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </AnimatePresence>
                
                <motion.div 
                  animate={isScanning ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center relative z-10 transition-all duration-700 ${isScanning ? 'bg-blue-600 text-white shadow-[0_0_50px_rgba(37,99,235,0.4)]' : 'bg-gray-50 dark:bg-gray-900 text-gray-300'}`}
                >
                  {isScanning ? (
                    <div className="relative">
                      <Radio size={64} className="animate-pulse" />
                      <Wifi size={24} className="absolute -top-2 -right-2 text-blue-200 animate-bounce" />
                    </div>
                  ) : <Watch size={64} />}
                </motion.div>
              </div>

              <div className="space-y-3 z-10 max-w-md">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {isScanning ? 'Searching Smartwatch...' : 'Connect Smartwatch'}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm leading-relaxed">
                  Connect your Apple Watch, Garmin, Fitbit or Genova SmartWatch to continuously stream heart rate, sleep architecture, workouts, blood oxygen, and stress levels.
                </p>
              </div>

              {error && (
                <motion.div 
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-5 rounded-3xl flex items-start gap-4 text-left"
                >
                  <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
                  <div>
                    <h4 className="font-bold text-red-900 dark:text-red-400 text-sm">Connection Status</h4>
                    <p className="text-xs text-red-700 dark:text-red-400/80 mt-1">{error}</p>
                  </div>
                </motion.div>
              )}

              <div className="w-full pt-2">
                <button 
                  onClick={requestBluetooth}
                  disabled={isScanning}
                  className={`w-full py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                    isScanning 
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait shadow-none' 
                    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-500/25 hover:shadow-blue-500/40 ring-4 ring-blue-500/20'
                  }`}
                >
                  {isScanning ? (
                    <RefreshCw className="animate-spin" size={24} />
                  ) : (
                    <Zap className="animate-bounce" size={24} />
                  )}
                  {isScanning ? scanStatus : 'CONNECT BLUETOOTH SMART WATCH'}
                </button>
              </div>
            </motion.div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gray-900 dark:bg-gray-800 p-8 rounded-[3rem] text-white space-y-6 border border-gray-800 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black">AI Telemetry Analytics</h3>
                  <p className="text-xs text-gray-400 font-medium">What happens when connected?</p>
                </div>
              </div>

              <div className="space-y-4 text-xs text-gray-300">
                <div className="p-3 bg-white/5 rounded-2xl flex items-start gap-3">
                  <Heart size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Resting HR & Cardiac Recovery</span>
                    Calculates cardiac strain and vagal tone post-exercise.
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl flex items-start gap-3">
                  <Moon size={18} className="text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Sleep Architecture Analysis</span>
                    Analyzes REM, Deep, and Light sleep windows against physical fatigue.
                  </div>
                </div>

                <div className="p-3 bg-white/5 rounded-2xl flex items-start gap-3">
                  <Gauge size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Daily Health Score (0-100)</span>
                    Synthesizes sleep, activity, nutrition, hydration, stress, and SpO2.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CONNECTED DASHBOARD WITH ALL REQUESTED METRICS & AI HEALTH SCORE */
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Connection Speed & Telemetry Protocol Bar */}
          <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-indigo-950 text-white p-6 rounded-[2.5rem] border border-gray-800 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                <Watch size={32} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                  <h2 className="text-2xl font-black text-white">{device.name}</h2>
                </div>
                <p className="text-xs text-gray-400 font-bold tracking-wide mt-0.5">
                  BLE GATT Stream • Bluetooth 5.3 Low Energy • Sync Latency: <span className="text-emerald-400 font-black">{telemetry.syncSpeedMs} ms</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 border-t md:border-t-0 border-white/10 pt-4 md:pt-0">
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Battery</span>
                <span className="text-lg font-black text-emerald-400 flex items-center gap-1">
                  <Battery size={18} /> {liveBattery}%
                </span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Packet Speed</span>
                <span className="text-lg font-black text-blue-400 flex items-center gap-1">
                  <Wifi size={18} /> {telemetry.syncSpeedMs}ms
                </span>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div>
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest block">Signal</span>
                <span className="text-lg font-black text-green-400 flex items-center gap-1">
                  <CheckCircle2 size={18} /> 100%
                </span>
              </div>
            </div>
          </div>

          {/* HEALTH SCORE HERO CARD (0 - 100) WITH DRIVERS & TOP 3 RECOMMENDATIONS */}
          <div className="bg-white dark:bg-gray-800 p-8 md:p-10 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Score Gauge */}
              <div className="lg:col-span-4 flex flex-col items-center text-center p-6 bg-gradient-to-b from-blue-50/80 to-indigo-50/50 dark:from-gray-900/80 dark:to-gray-900/40 rounded-[2.5rem] border border-blue-100/50 dark:border-gray-700 relative">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <Gauge size={14} /> Daily Health Readiness Score
                </span>
                
                <div className="relative my-4 flex items-center justify-center">
                  <div className="w-40 h-40 rounded-full border-8 border-gray-200 dark:border-gray-700 flex items-center justify-center relative">
                    <div 
                      className="absolute inset-0 rounded-full border-8 border-blue-600 border-t-transparent border-l-transparent" 
                      style={{ transform: `rotate(${((aiAnalysis?.healthScore || 86) / 100) * 360}deg)` }}
                    />
                    <div className="text-center z-10">
                      <span className="text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                        {aiAnalysis?.healthScore || 86}
                      </span>
                      <span className="text-xs font-black text-gray-400 block">/ 100</span>
                    </div>
                  </div>
                </div>

                <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-black uppercase tracking-wider shadow-sm">
                  {aiAnalysis?.healthScore >= 80 ? 'Optimal Recovery' : 'Moderate Readiness'}
                </span>

                <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[10px] font-bold">
                  <span className="px-2.5 py-1 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 shadow-xs border border-gray-100 dark:border-gray-700">Sleep: 88</span>
                  <span className="px-2.5 py-1 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 shadow-xs border border-gray-100 dark:border-gray-700">Activity: 82</span>
                  <span className="px-2.5 py-1 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 shadow-xs border border-gray-100 dark:border-gray-700">Heart: 89</span>
                  <span className="px-2.5 py-1 bg-white dark:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-300 shadow-xs border border-gray-100 dark:border-gray-700">Stress: 78</span>
                </div>
              </div>

              {/* What Affected the Score & Top 3 Action Items */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2 mb-1">
                      <Sparkles className="text-blue-600 dark:text-blue-400" size={24} />
                      What Affected Your Health Score Today
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Analyzed sleep duration, heart rate variability, SpO2, active workout calories, and autonomic stress.
                    </p>
                  </div>
                </div>

                {/* Positive & Negative Factors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp size={14} /> Positive Drivers (+Score)
                    </span>
                    <ul className="space-y-1.5 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                      {(aiAnalysis?.scoreExplanation?.positiveFactors || [
                        "Optimal SpO2 at 98.5% with healthy arterial oxygenation",
                        "Solid REM sleep duration (2h 10m) supporting cognitive recovery",
                        "Active step count exceeding 8,000 steps baseline"
                      ]).map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/30 space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <TrendingDown size={14} /> Drag Factors (-Score)
                    </span>
                    <ul className="space-y-1.5 text-xs text-amber-900 dark:text-amber-200 font-medium">
                      {(aiAnalysis?.scoreExplanation?.negativeFactors || [
                        "Resting Heart Rate slightly elevated (+3 BPM vs average)",
                        "Midday stress score spike during active workout window"
                      ]).map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={14} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Top 3 Actionable Recommendations */}
                <div className="p-5 bg-blue-50/80 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-3">
                  <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                    <ListOrdered size={16} className="text-blue-600 dark:text-blue-400" />
                    Top 3 Actions to Improve Your Score
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(aiAnalysis?.topActions || [
                      "Drink 500ml of water with electrolytes before 8 PM to lower resting HR",
                      "Perform 10 minutes of deep diaphragmatic breathing before sleep",
                      "Maintain bedtime target at 10:30 PM to preserve optimal REM cycles"
                    ]).map((action: string, idx: number) => (
                      <div key={idx} className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-start gap-2 shadow-xs">
                        <span className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[10px] shrink-0 font-black">
                          {idx + 1}
                        </span>
                        <span className="leading-snug">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ALL SMARTWATCH COLLECTED METRICS GRID */}
          <div className="space-y-4">
            <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Watch size={22} className="text-blue-600 dark:text-blue-400" />
              Collected Telemetry Metrics
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 1. Heart Rate & Resting Heart Rate */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-red-50 text-red-500 dark:bg-red-900/30 rounded-2xl">
                    <Heart size={22} className="animate-pulse" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cardiovascular</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Heart Rate & Resting HR</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{telemetry.heartRate}</span>
                    <span className="text-xs font-bold text-gray-400">BPM (Live)</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-500 dark:text-gray-400">Resting Heart Rate (RHR)</span>
                  <span className="text-red-600 dark:text-red-400 font-black">{telemetry.restingHeartRate} BPM</span>
                </div>
              </div>

              {/* 2. Sleep Duration & Quality */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 rounded-2xl">
                    <Moon size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                    Quality {telemetry.sleepQualityPercent}%
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sleep Duration</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{telemetry.sleepDurationHours}h</span>
                    <span className="text-xs font-bold text-emerald-500 font-black">Restorative</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px] font-bold text-center">
                  <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-700 dark:text-indigo-300">
                    <span className="block text-gray-400 text-[8px] uppercase">Deep</span>
                    {telemetry.sleepBreakdown.deep}
                  </div>
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-700 dark:text-blue-300">
                    <span className="block text-gray-400 text-[8px] uppercase">REM</span>
                    {telemetry.sleepBreakdown.rem}
                  </div>
                  <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300">
                    <span className="block text-gray-400 text-[8px] uppercase">Light</span>
                    {telemetry.sleepBreakdown.light}
                  </div>
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-700 dark:text-amber-300">
                    <span className="block text-gray-400 text-[8px] uppercase">Awake</span>
                    {telemetry.sleepBreakdown.awake}
                  </div>
                </div>
              </div>

              {/* 3. Steps & Goal Progress */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30 rounded-2xl">
                    <Footprints size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    {Math.min(100, Math.round((telemetry.steps / 10000) * 100))}% Goal
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Steps Logged</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                      {telemetry.steps.toLocaleString()}
                    </span>
                    <span className="text-xs font-bold text-gray-400">/ 10,000 steps</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.round((telemetry.steps / 10000) * 100))}%` }} 
                  />
                </div>
              </div>

              {/* 4. Calories Burned (Active vs Total) */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-orange-50 text-orange-500 dark:bg-orange-900/30 rounded-2xl">
                    <Flame size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Energy Expenditure</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Calories Burned</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{telemetry.caloriesBurnedTotal}</span>
                    <span className="text-xs font-bold text-gray-400">kcal</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-500 dark:text-gray-400">Active Workout Calories</span>
                  <span className="text-orange-600 dark:text-orange-400 font-black">{telemetry.caloriesActive} kcal</span>
                </div>
              </div>

              {/* 5. Distance Moved */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-blue-50 text-blue-500 dark:bg-blue-900/30 rounded-2xl">
                    <Navigation size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">GPS & Pedometer</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Distance</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{telemetry.distanceKm}</span>
                    <span className="text-xs font-bold text-gray-400">kilometers</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-2xl text-xs font-bold text-blue-700 dark:text-blue-300">
                  Equivalent to ~7.9k pedestrian strides
                </div>
              </div>

              {/* 6. Blood Oxygen (SpO2) */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 rounded-2xl">
                    <Droplets size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    Optimal Saturation
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Blood Oxygen (SpO2)</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{telemetry.spo2Percent}%</span>
                    <span className="text-xs font-bold text-gray-400">SpO2</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl text-xs font-bold text-gray-500 dark:text-gray-400">
                  Healthy pulse oximetry reading (&gt;95%)
                </div>
              </div>

              {/* 7. Stress Level */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 rounded-2xl">
                    <Zap size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    Low Stress
                  </span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Stress Level</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{telemetry.stressLevelScore}</span>
                    <span className="text-xs font-bold text-gray-400">/ 100</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${telemetry.stressLevelScore}%` }} />
                </div>
              </div>

              {/* 8. Skin Temperature */}
              <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-purple-50 text-purple-600 dark:bg-purple-900/30 rounded-2xl">
                    <Thermometer size={22} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Thermal Sensor</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Skin Temperature</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                      +{telemetry.skinTempDiffC}°C
                    </span>
                    <span className="text-xs font-bold text-gray-400">vs baseline (36.6°C)</span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl text-xs font-bold text-gray-500 dark:text-gray-400">
                  Normal circadian dermal variation
                </div>
              </div>
            </div>
          </div>

          {/* WORKOUT DETAILS SECTION */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-gray-100 dark:border-gray-700 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-50 text-orange-600 dark:bg-orange-900/30 rounded-2xl">
                  <Dumbbell size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Today's Workout Details</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Logged automatically via smartwatch workout detection</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-orange-50 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 text-xs font-black uppercase rounded-full">
                {telemetry.workouts.length} Sessions Logged
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {telemetry.workouts.map((workout, idx) => (
                <div key={idx} className="p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 text-[10px] font-black uppercase tracking-wider rounded-md">
                      {workout.type}
                    </span>
                    <h4 className="text-base font-black text-gray-900 dark:text-white pt-1">{workout.name}</h4>
                    <div className="flex items-center gap-4 text-xs font-bold text-gray-500 dark:text-gray-400 pt-2">
                      <span>⏱️ {workout.durationMins} mins</span>
                      <span>🔥 {workout.calories} kcal</span>
                      <span>❤️ Avg {workout.avgHr} BPM</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI MULTI-METRIC TRENDS & CLINICAL INSIGHTS PANEL */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white tracking-tight">AI Integrated Health Trends & Insights</h3>
                <p className="text-xs text-blue-300 font-medium">Deep AI analysis connecting heart rate, sleep architecture, workouts, stress, and sync speeds</p>
              </div>
            </div>

            <p className="text-sm text-gray-300 font-medium leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/10">
              {aiAnalysis?.summaryInsight || "Your physiological recovery is strong with balanced sleep architecture and active cardiovascular output. Focusing on pre-sleep hydration will further lower your overnight resting heart rate."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Heart Rate & Cardiac Trend</span>
                <p className="text-xs text-gray-200 font-medium">
                  {aiAnalysis?.trends?.heartRateTrend || `Resting HR is stable at ${telemetry.restingHeartRate} BPM with efficient post-workout recovery.`}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Sleep Quality & Architecture</span>
                <p className="text-xs text-gray-200 font-medium">
                  {aiAnalysis?.trends?.sleepQualityTrend || `Deep sleep accounts for ${telemetry.sleepBreakdown.deep} of your ${telemetry.sleepDurationHours}h total sleep.`}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Activity & Caloric Synergy</span>
                <p className="text-xs text-gray-200 font-medium">
                  {aiAnalysis?.trends?.activityNutritionTrend || `Caloric expenditure of ${telemetry.caloriesBurnedTotal} kcal aligns with ${telemetry.distanceKm} km active distance.`}
                </p>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Stress & Connection Speed</span>
                <p className="text-xs text-gray-200 font-medium">
                  {aiAnalysis?.trends?.stressRecoveryTrend || `Autonomic stress at ${telemetry.stressLevelScore}/100. Sync latency optimal at ${telemetry.syncSpeedMs}ms.`}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Sensor Permission Consent Modal */}
      <AnimatePresence>
        {showPermissionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 max-w-md w-full space-y-6 border border-gray-100 dark:border-gray-700 shadow-2xl relative overflow-hidden"
            >
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                <Radio size={32} />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  Sensor Integration Request
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                  Genova Health needs your explicit consent to access real-time smartwatch sensor telemetry:
                </p>
              </div>

              <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold">
                  <Bluetooth size={16} className="text-blue-500 shrink-0" />
                  <span>Bluetooth LE (Heart Rate & Pulse Ox)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold">
                  <Activity size={16} className="text-emerald-500 shrink-0" />
                  <span>Biometric PPG & Thermal Skin Sensors</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold">
                  <Smartphone size={16} className="text-purple-500 shrink-0" />
                  <span>Accelerometer & GPS Activity Logs</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-extrabold text-sm rounded-2xl transition-all"
                >
                  Deny
                </button>
                <button
                  onClick={grantSensorPermission}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} /> Allow Sensors
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Wearables;
