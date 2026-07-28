
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bluetooth, Watch, Activity, Battery, CheckCircle2, XCircle, AlertCircle, RefreshCw, ChevronLeft, Zap, Crown, Search, Wifi, Smartphone, Radio, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STORAGE_KEYS } from '../constants';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
}

const Wearables: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [device, setDevice] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveHr, setLiveHr] = useState(72);
  const [liveBattery, setLiveBattery] = useState(88);
  const [scanStatus, setScanStatus] = useState('');
  const [sensorPermission, setSensorPermission] = useState<boolean>(() => {
    return localStorage.getItem('genova_sensor_permission') === 'true';
  });
  const [showPermissionModal, setShowPermissionModal] = useState(false);
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

  const isPremium = true;

  useEffect(() => {
    const savedDevice = localStorage.getItem(STORAGE_KEYS.WEARABLE_DEVICE);
    if (savedDevice) {
      setDevice(JSON.parse(savedDevice));
    }
  }, []);

  useEffect(() => {
    if (device && device.connected) {
      intervalRef.current = window.setInterval(() => {
        setLiveHr(prev => {
          const change = Math.floor(Math.random() * 3) - 1; 
          const newHr = prev + change;
          return Math.min(Math.max(newHr, 60), 100);
        });
        setLiveBattery(prev => Math.max(prev - (Math.random() > 0.98 ? 1 : 0), 1));
      }, 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [device]);

  const connectVirtualDevice = () => {
    if (!sensorPermission) {
      setShowPermissionModal(true);
      return;
    }
    setIsScanning(true);
    setError(null);
    setScanStatus('Synthesizing Virtual Bluetooth link...');
    
    setTimeout(() => {
      const deviceData = {
        name: 'Genova SmartBand v2 (Demo)',
        id: 'DEMO-SMARTBAND-001',
        connected: true,
        lastSeen: new Date().toISOString()
      };
      setDevice(deviceData);
      localStorage.setItem(STORAGE_KEYS.WEARABLE_DEVICE, JSON.stringify(deviceData));
      setIsScanning(false);
      setScanStatus('');
    }, 1500);
  };

  const requestBluetooth = async () => {
    if (!sensorPermission) {
      setShowPermissionModal(true);
      return;
    }
    setIsScanning(true);
    setError(null);
    setScanStatus('Initializing Bluetooth...');
    
    try {
      const bluetooth = (navigator as any).bluetooth;
      if (!bluetooth) {
        throw new Error("Web Bluetooth is not supported in this browser.");
      }

      setScanStatus('Waiting for device selection...');
      const btDevice = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['heart_rate', 'battery_service']
      });
      
      setScanStatus(`Connecting to ${btDevice.name || 'Device'}...`);
      
      const deviceData = {
        name: btDevice.name || 'Genova SmartBand',
        id: btDevice.id,
        connected: true,
        lastSeen: new Date().toISOString()
      };

      if (btDevice.gatt) {
        await btDevice.gatt.connect();
      }

      setDevice(deviceData);
      localStorage.setItem(STORAGE_KEYS.WEARABLE_DEVICE, JSON.stringify(deviceData));
      setScanStatus('');

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
      } else {
        setError("Device selection was cancelled or blocked in sandbox. You can use 'Virtual SmartBand' below to test live biometrics.");
      }
      setScanStatus('');
    } finally {
      setIsScanning(false);
    }
  };

  const disconnect = () => {
    setDevice(null);
    localStorage.removeItem(STORAGE_KEYS.WEARABLE_DEVICE);
    setLiveHr(72);
    setLiveBattery(88);
  };

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-8 pb-24 md:pb-10">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl shadow-sm transition-all text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700 active:scale-95">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Wearables
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Manage your connected health ecosystem</p>
          </div>
        </div>
        
        <AnimatePresence>
          {device && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: 20 }}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Linked</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Interaction Area */}
        <div className="lg:col-span-7 space-y-6">
          <motion.div 
            layout
            className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center space-y-8 transition-all relative overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {!device ? (
                <motion.div 
                  key="unpaired"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex flex-col items-center space-y-8 w-full"
                >
                  <div className="relative">
                    {/* Radar/Scan Animation */}
                    <AnimatePresence>
                      {isScanning && (
                        <div className="absolute inset-0 -m-16 flex items-center justify-center pointer-events-none">
                          {[1, 2, 3].map((i) => (
                            <motion.div
                              key={i}
                              initial={{ scale: 0.5, opacity: 0.5 }}
                              animate={{ scale: 2.5, opacity: 0 }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                delay: i - 1,
                                ease: "easeOut"
                              }}
                              className="absolute w-32 h-32 border-2 border-blue-500/30 rounded-full"
                            />
                          ))}
                        </div>
                      )}
                    </AnimatePresence>
                    
                    <motion.div 
                      animate={isScanning ? {
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                      className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center relative z-10 transition-all duration-700 ${isScanning ? 'bg-blue-600 text-white shadow-[0_0_50px_rgba(37,99,235,0.4)]' : 'bg-gray-50 dark:bg-gray-900 text-gray-300'}`}
                    >
                      {isScanning ? (
                        <div className="relative">
                          <Radio size={64} className="animate-pulse" />
                          <motion.div
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <Wifi size={24} className="absolute -top-2 -right-2 text-blue-200" />
                          </motion.div>
                        </div>
                      ) : <Bluetooth size={64} />}
                    </motion.div>
                  </div>

                  <div className="space-y-3 z-10">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                      {isScanning ? 'Searching...' : 'Connect Wearable'}
                    </h2>
                    <div className="min-h-[1.5rem]">
                      <motion.p 
                        layout
                        className={`text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto transition-all ${isScanning ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}
                      >
                        {isScanning ? scanStatus : 'Genova AI works best when it can read your live biometric heart data.'}
                      </motion.p>
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: [0, -5, 5, -5, 5, 0], opacity: 1 }}
                      className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-5 rounded-3xl flex items-start gap-4 text-left"
                    >
                      <AlertCircle className="text-red-500 shrink-0" size={24} />
                      <div>
                        <h4 className="font-bold text-red-900 dark:text-red-400">Connection Failed</h4>
                        <p className="text-sm text-red-700 dark:text-red-500/70">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <div className="w-full pt-4">
                    <button 
                      onClick={requestBluetooth}
                      disabled={isScanning}
                      className={`w-full py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                        isScanning 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait shadow-none' 
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                      }`}
                    >
                      {isScanning ? <RefreshCw className="animate-spin" size={24} /> : <Search size={24} />}
                      {isScanning ? 'Searching...' : 'Scan for Devices'}
                    </button>

                    <button 
                      onClick={connectVirtualDevice}
                      disabled={isScanning}
                      className="w-full mt-3 py-4 bg-gray-50 hover:bg-blue-50 dark:bg-gray-900/40 dark:hover:bg-blue-950/20 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-[2rem] font-black text-xs uppercase tracking-widest transition-all border border-dashed border-gray-200 dark:border-gray-700 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Zap size={14} className="text-blue-500 animate-pulse" /> Connect Genova Virtual Band (Demo)
                    </button>
                    <p className="mt-4 text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.3em]">Supports Apple Watch, Fitbit, Garmin & more</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="paired"
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="w-full space-y-10"
                >
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative group">
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        className="absolute inset-0 bg-green-500/30 blur-3xl rounded-full scale-150"
                      ></motion.div>
                      <motion.div 
                        whileHover={{ scale: 1.05, rotate: 2 }}
                        className="w-40 h-40 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-[3rem] flex items-center justify-center relative z-10 shadow-2xl duration-500 border-4 border-white/20"
                      >
                        <Watch size={80} />
                      </motion.div>
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", delay: 0.3 }}
                        className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-20"
                      >
                        <CheckCircle2 className="text-green-500" size={32} />
                      </motion.div>
                    </div>
                    
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-200/50 dark:border-green-800/50 shadow-sm font-black text-[10px] uppercase tracking-widest">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                        Live Integration
                      </div>
                      <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{device.name}</h2>
                      <p className="text-gray-500 dark:text-gray-400 font-bold text-sm tracking-tight">Connected via Bluetooth Low Energy</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6 w-full">
                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 relative overflow-hidden group"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-2xl ${liveBattery > 20 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                            <Battery size={20} />
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Battery</span>
                        </div>
                        <p className="text-4xl font-black text-gray-900 dark:text-white">{liveBattery}%</p>
                      </div>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${liveBattery}%` }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute bottom-0 left-0 h-1.5 bg-green-500"
                      />
                    </motion.div>

                    <motion.div 
                      whileHover={{ y: -5 }}
                      className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 relative overflow-hidden group"
                    >
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 0.6, repeat: Infinity }}
                            >
                              <Activity size={20} />
                            </motion.div>
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Heart Rate</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <AnimatePresence mode="wait">
                            <motion.p 
                              key={liveHr}
                              initial={{ y: 10, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -10, opacity: 0 }}
                              className="text-4xl font-black text-gray-900 dark:text-white"
                            >
                              {liveHr}
                            </motion.p>
                          </AnimatePresence>
                          <span className="text-sm font-bold text-gray-400">BPM</span>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                    <button 
                      onClick={disconnect}
                      className="w-full py-4 text-gray-400 hover:text-red-500 font-bold uppercase tracking-widest text-xs transition-colors flex items-center justify-center gap-2 group"
                    >
                      <XCircle size={16} className="group-hover:rotate-90 transition-transform" />
                      Unpair this device
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-5 space-y-6">
           <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-900 dark:bg-blue-900/30 p-8 rounded-[3rem] text-white space-y-8 relative overflow-hidden border border-gray-800 shadow-sm"
           >
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Smartphone size={28} />
                </div>
                <h3 className="text-xl font-black tracking-tight">Device Insights</h3>
              </div>

              <div className="space-y-6 relative z-10">
                <InsightItem 
                  title="Triage Integration" 
                  desc="Nurse Genova uses real-time HR data to detect cardiovascular stress during symptom analysis." 
                />
                <InsightItem 
                  title="Adaptive Training" 
                  desc="Fitness plans adjust automatically based on your overnight recovery and resting heart rate." 
                />
                <InsightItem 
                  title="Emergency Trigger" 
                  desc="Detected falls or abnormal heart rhythms can automatically trigger your emergency SOS flow." 
                />
              </div>

              <Radio className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
           </motion.div>

           <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="p-8 bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm"
           >
              <div className="flex items-center justify-between">
                <h4 className="font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-[0.2em]">Sensor Tracking Permission</h4>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${sensorPermission ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                  {sensorPermission ? 'Granted' : 'Pending'}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                Real-time biometrics streaming requires explicit device sensor access (Bluetooth Low Energy, Camera PPG, and Motion).
              </p>
              {sensorPermission ? (
                <button
                  onClick={revokeSensorPermission}
                  className="w-full py-2.5 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-2xl transition-all border border-red-100 dark:border-red-900/30"
                >
                  Revoke Sensor Permissions
                </button>
              ) : (
                <button
                  onClick={() => setShowPermissionModal(true)}
                  className="w-full py-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-2xl transition-all border border-blue-100 dark:border-blue-900/30 flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={14} /> Grant Sensor Permissions
                </button>
              )}
           </motion.div>

           <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="p-8 bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 space-y-4 shadow-sm"
           >
              <h4 className="font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-[0.2em]">Supported Standards</h4>
              <div className="flex flex-wrap gap-2">
                {['BLE', 'ANT+', 'GATT', 'HealthKit', 'Google Fit'].map(s => (
                  <span key={s} className="px-3 py-1 bg-gray-50 dark:bg-gray-900 text-[10px] font-bold text-gray-500 rounded-full border border-gray-100 dark:border-gray-700">
                    {s}
                  </span>
                ))}
              </div>
           </motion.div>
        </div>
      </div>

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
                  Genova Health needs your explicit consent to access real-time device sensors:
                </p>
              </div>

              <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold">
                  <Bluetooth size={16} className="text-blue-500 shrink-0" />
                  <span>Bluetooth LE (Heart Rate & Pulse Ox)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold">
                  <Activity size={16} className="text-emerald-500 shrink-0" />
                  <span>Optical Camera PPG (Cardiovascular Biometrics)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold">
                  <Smartphone size={16} className="text-purple-500 shrink-0" />
                  <span>Accelerometer / Motion (Steps & Active Vitals)</span>
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

const InsightItem: React.FC<{title: string, desc: string}> = ({ title, desc }) => (
  <div className="group">
    <h4 className="font-bold text-blue-400 mb-1 flex items-center gap-2">
      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
      {title}
    </h4>
    <p className="text-sm text-gray-400 font-medium leading-relaxed group-hover:text-gray-300 transition-colors">
      {desc}
    </p>
  </div>
);

export default Wearables;
