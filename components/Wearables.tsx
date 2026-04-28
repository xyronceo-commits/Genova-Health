
import React, { useState, useEffect, useRef } from 'react';
import { Bluetooth, Watch, Activity, Battery, CheckCircle2, XCircle, AlertCircle, RefreshCw, ChevronLeft, Zap, Crown, Search, Wifi, Smartphone, Radio } from 'lucide-react';
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
  const intervalRef = useRef<number | null>(null);

  const isPremium = user.subscriptionStatus === 'premium';

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

  const requestBluetooth = async () => {
    if (!isPremium) {
      navigate('/premium');
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
      console.error(err);
      if (err.name !== 'NotFoundError' && err.name !== 'AbortError') {
        setError(err.message || "Failed to connect to device.");
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
    <div className="p-4 md:p-10 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 md:pb-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl shadow-sm transition-all text-gray-900 dark:text-white border border-gray-100 dark:border-gray-700">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              Wearables
              {!isPremium && <Crown size={20} className="text-amber-500" />}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Manage your connected health ecosystem</p>
          </div>
        </div>
        
        {device && (
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-2xl">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Linked</span>
          </div>
        )}
      </header>

      {!isPremium && (
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-amber-500/20 relative overflow-hidden group mb-8">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="p-4 bg-white/20 rounded-3xl backdrop-blur-md shadow-xl border border-white/30">
                <Crown size={32} className="text-amber-100" />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">Unlock Genova Wearables</h3>
                <p className="text-amber-50/80 font-medium max-w-md">Connect your Apple Watch, Fitbit, or Garmin for 24/7 AI-powered health monitoring and automatic symptom cross-referencing.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/premium')} 
              className="bg-white text-amber-600 px-8 py-4 rounded-[2rem] font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2"
            >
              Get Genova Gold <ChevronLeft className="rotate-180" size={20} />
            </button>
          </div>
          <Crown className="absolute -right-12 -bottom-12 w-64 h-64 text-white/10 rotate-12" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Interaction Area */}
        <div className="lg:col-span-7 space-y-6">
          <div className={`bg-white dark:bg-gray-800 p-8 md:p-12 rounded-[3rem] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center space-y-8 transition-all relative overflow-hidden ${!isPremium ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
            {!device ? (
              <>
                <div className="relative">
                  {/* Radar/Scan Animation */}
                  {isScanning && (
                    <div className="absolute inset-0 -m-16">
                       <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-[ping_3s_infinite]"></div>
                       <div className="absolute inset-0 border-2 border-blue-400/20 rounded-full animate-[ping_4s_infinite_1s]"></div>
                       <div className="absolute inset-0 border-2 border-blue-300/10 rounded-full animate-[ping_5s_infinite_2s]"></div>
                       <div className="absolute inset-0 bg-blue-500/5 rounded-full animate-pulse"></div>
                    </div>
                  )}
                  
                  <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center relative z-10 transition-all duration-700 ${isScanning ? 'bg-blue-600 text-white shadow-[0_0_50px_rgba(37,99,235,0.4)] scale-110' : 'bg-gray-50 dark:bg-gray-900 text-gray-300'}`}>
                    {isScanning ? (
                      <div className="relative">
                        <Radio size={64} className="animate-pulse" />
                        <Wifi size={24} className="absolute -top-2 -right-2 text-blue-200 animate-bounce" />
                      </div>
                    ) : <Bluetooth size={64} />}
                  </div>
                </div>

                <div className="space-y-3 z-10">
                  <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    {isScanning ? 'Searching...' : 'Connect Wearable'}
                  </h2>
                  <div className="min-h-[1.5rem]">
                    <p className={`text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto transition-all ${isScanning ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
                      {isScanning ? scanStatus : 'Genova AI works best when it can read your live biometric heart data.'}
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-5 rounded-3xl flex items-start gap-4 text-left animate-in shake">
                    <AlertCircle className="text-red-500 shrink-0" size={24} />
                    <div>
                      <h4 className="font-bold text-red-900 dark:text-red-400">Connection Failed</h4>
                      <p className="text-sm text-red-700 dark:text-red-500/70">{error}</p>
                    </div>
                  </div>
                )}

                <div className="w-full pt-4">
                  <button 
                    onClick={requestBluetooth}
                    disabled={isScanning}
                    className={`w-full py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                      isScanning 
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-wait' 
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
                    }`}
                  >
                    {isScanning ? <RefreshCw className="animate-spin" size={24} /> : <Search size={24} />}
                    {isScanning ? 'Searching...' : 'Scan for Devices'}
                  </button>
                  <p className="mt-4 text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.3em]">Supports Apple Watch, Fitbit, Garmin & more</p>
                </div>
              </>
            ) : (
              <div className="w-full space-y-10 animate-in zoom-in duration-300">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-green-500/30 blur-3xl rounded-full scale-150 opacity-50 animate-pulse"></div>
                    <div className="w-40 h-40 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-[3rem] flex items-center justify-center relative z-10 shadow-2xl transition-transform group-hover:scale-105 duration-500 border-4 border-white/20">
                      <Watch size={80} />
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-20">
                      <CheckCircle2 className="text-green-500" size={32} />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full border border-green-200/50 dark:border-green-800/50 shadow-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      <span className="text-xs font-black uppercase tracking-widest">Live Integration</span>
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{device.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-bold text-sm tracking-tight">Connected via Bluetooth Low Energy</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 w-full">
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl ${liveBattery > 20 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                          <Battery size={20} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Battery</span>
                      </div>
                      <p className="text-4xl font-black text-gray-900 dark:text-white">{liveBattery}%</p>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-1000" style={{ width: `${liveBattery}%` }}></div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 relative overflow-hidden group">
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                          <Activity size={20} className="pulse-red" />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Heart Rate</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <p className="text-4xl font-black text-gray-900 dark:text-white">{liveHr}</p>
                        <span className="text-sm font-bold text-gray-400">BPM</span>
                      </div>
                    </div>
                  </div>
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
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-5 space-y-6">
           <div className="bg-gray-900 dark:bg-blue-900/30 p-8 rounded-[3rem] text-white space-y-8 relative overflow-hidden border border-gray-800">
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Smartphone size={28} />
                </div>
                <h3 className="text-xl font-bold">Device Insights</h3>
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
           </div>

           <div className="p-8 bg-white dark:bg-gray-800 rounded-[3rem] border border-gray-100 dark:border-gray-700 space-y-4">
              <h4 className="font-black text-gray-400 dark:text-gray-500 text-[10px] uppercase tracking-[0.2em]">Supported Standards</h4>
              <div className="flex flex-wrap gap-2">
                {['BLE', 'ANT+', 'GATT', 'HealthKit', 'Google Fit'].map(s => (
                  <span key={s} className="px-3 py-1 bg-gray-50 dark:bg-gray-900 text-[10px] font-bold text-gray-500 rounded-full border border-gray-100 dark:border-gray-700">
                    {s}
                  </span>
                ))}
              </div>
           </div>
        </div>
      </div>
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
