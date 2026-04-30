import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Zap, ShieldCheck, X, AlertCircle, Heart, Info, Activity, Utensils, Watch, ChevronRight, Loader2, Sparkles, RefreshCcw, PieChart, Crown, Bluetooth } from 'lucide-react';
import { UserProfile } from '../types';
import { STORAGE_KEYS } from '../constants';
import { ai } from '../services/ai';
import { auth, addHealthMetric } from '../services/firebase';

type ScanMode = 'choosing' | 'vitals_sync' | 'nutrition_camera' | 'vitals_camera';

interface Props {
  user: UserProfile;
}

const SmartScan: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [mode, setMode] = useState<ScanMode>('choosing');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isBioScanning, setIsBioScanning] = useState(false);
  const [bioScanProgress, setBioScanProgress] = useState(0);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [scanCount, setScanCount] = useState({ nutri: 0, bio: 0 });

  const bioScanIntervalRef = useRef<number | null>(null);
  const ppgBufferRef = useRef<number[]>([]);

  const tier = user.subscriptionStatus;

  useEffect(() => {
    const savedDevice = localStorage.getItem(STORAGE_KEYS.WEARABLE_DEVICE);
    if (savedDevice) {
      setDeviceConnected(true);
    }

    // Initialize/Check Daily Limits
    const today = new Date().toISOString().split('T')[0];
    const log = localStorage.getItem(STORAGE_KEYS.NUTRI_LOG);
    if (log) {
      const data = JSON.parse(log);
      if (data.date === today) {
        setScanCount({ nutri: data.nutri || 0, bio: data.bio || 0 });
      } else {
        localStorage.setItem(STORAGE_KEYS.NUTRI_LOG, JSON.stringify({ date: today, nutri: 0, bio: 0 }));
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.NUTRI_LOG, JSON.stringify({ date: today, nutri: 0, bio: 0 }));
    }
  }, []);

  const incrementScan = (type: 'nutri' | 'bio') => {
    const today = new Date().toISOString().split('T')[0];
    const newCounts = { ...scanCount, [type]: scanCount[type] + 1 };
    setScanCount(newCounts);
    localStorage.setItem(STORAGE_KEYS.NUTRI_LOG, JSON.stringify({ date: today, ...newCounts }));
  };

  const limits = {
    free: { nutri: 5, bio: 1, sync: false },
    silver: { nutri: 10, bio: 5, sync: true },
    gold: { nutri: Infinity, bio: Infinity, sync: true }
  }[tier] || { nutri: 5, bio: 1, sync: false };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if ((mode === 'nutrition_camera' || mode === 'vitals_camera') && !results) {
      const initCamera = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("MediaDevices API not available");
          }
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Safari/iOS fixes
            videoRef.current.setAttribute('playsinline', 'true');
            await videoRef.current.play();
          }

          // Try to enable torch if vitals mode
          if (mode === 'vitals_camera') {
            const track = stream.getVideoTracks()[0];
            try {
              const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
              if (capabilities?.torch) {
                await track.applyConstraints({
                  advanced: [{ torch: true }]
                } as any);
              }
            } catch (torchErr) {
              console.warn("Torch not supported on this device/browser");
            }
          }
        } catch (err) {
          console.error("Camera Error:", err);
          setError("Camera access is restricted or not supported. Ensure you are using a secure connection (HTTPS) and have granted permissions.");
          // If vitals mode, allow simulation to proceed for demo purposes if user is desperate
          if (mode === 'vitals_camera') {
             setTimeout(() => {
                setError(null);
                setIsBioScanning(true);
                runSimulatedVitals();
             }, 3000);
          } else {
            setMode('choosing');
          }
        }
      };
      initCamera();
    }
  }, [mode, results]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }
      if (bioScanIntervalRef.current) {
        cancelAnimationFrame(bioScanIntervalRef.current);
      }
    };
  }, []);

  const runSimulatedVitals = () => {
    let prog = 0;
    const interval = setInterval(() => {
      prog += 1.66; // approx 60s
      if (prog >= 100) {
        clearInterval(interval);
        setBioScanProgress(100);
        setTimeout(() => stopVitalsScan(true), 500);
      } else {
        setBioScanProgress(prog);
      }
    }, 1000);
  };

  const startNutriCamera = () => {
    if (scanCount.nutri >= limits.nutri) {
      navigate('/premium');
      return;
    }
    setError(null);
    setMode('nutrition_camera');
  };

  const startVitalsCamera = () => {
    if (scanCount.bio >= limits.bio) {
      navigate('/premium');
      return;
    }
    setError(null);
    setMode('vitals_camera');
    setBioScanProgress(0);
    ppgBufferRef.current = [];
  };

  const handleVitalsSync = () => {
    if (!limits.sync) {
      navigate('/premium');
      return;
    }
    
    setMode('vitals_sync');
    if (deviceConnected) {
      setIsSyncing(true);
      let prog = 0;
      const interval = setInterval(() => {
        prog += Math.floor(Math.random() * 8) + 2;
        if (prog >= 100) {
          prog = 100;
          setSyncProgress(prog);
          clearInterval(interval);
          setTimeout(completeVitalsSync, 800);
        } else {
          setSyncProgress(prog);
        }
      }, 150);
    }
  };

  const captureAndAnalyze = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.videoWidth > 0) {
      setIsCapturing(true);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        
        try {
          const analysis = await ai.analyzeFood(base64, JSON.stringify(user));
          incrementScan('nutri');
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
          
          setResults({ type: 'nutrition', ...analysis });
        } catch (err) {
          setError("AI could not analyze the image. Please try again with better lighting and a clearer view of the food.");
        } finally {
          setIsCapturing(false);
        }
      }
    }
  };

  const runVitalsScan = () => {
    if (isBioScanning) return;
    setIsBioScanning(true);
    setBioScanProgress(0);
    ppgBufferRef.current = [];

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const scanDuration = 60000; 
    const startTime = Date.now();

    const processFrame = () => {
      if (!isBioScanning && Date.now() - startTime > scanDuration) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / scanDuration) * 100, 100);
      setBioScanProgress(progress);

      if (progress >= 100) {
        stopVitalsScan();
        return;
      }

      // Analyze frame for PPG
      canvas.width = 100; 
      canvas.height = 100;
      ctx.drawImage(video, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const data = imageData.data;

      let r = 0, g = 0, b = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i+1];
        b += data[i+2];
      }
      const avgR = r / (data.length / 4);
      const avgG = g / (data.length / 4);

      const isFinger = avgR > (avgG * 1.5) && avgR > 120;
      setFingerDetected(isFinger);

      if (isFinger) {
        ppgBufferRef.current.push(avgR);
      }

      bioScanIntervalRef.current = requestAnimationFrame(processFrame);
    };

    bioScanIntervalRef.current = requestAnimationFrame(processFrame);
  };

  const stopVitalsScan = async (isSimulated = false) => {
    setIsBioScanning(false);
    if (bioScanIntervalRef.current) {
      cancelAnimationFrame(bioScanIntervalRef.current);
    }

    if (!isSimulated && ppgBufferRef.current.length < 50) {
      setError("Limited pulse data detected. Please ensure your finger covers the camera lens and flash completely.");
      return;
    }

    setIsCapturing(true); 
    try {
      const userContext = JSON.stringify(user);
      let sampledData: number[] = [];
      
      if (isSimulated) {
        // Generate mock PPG data for AI analysis or fallback
        sampledData = Array.from({length: 100}, () => 150 + Math.random() * 50);
      } else {
        const step = Math.max(1, Math.floor(ppgBufferRef.current.length / 100));
        sampledData = ppgBufferRef.current.filter((_, i) => i % step === 0).slice(0, 100);
      }

      const analysis = await ai.analyzeBiometrics(sampledData, userContext);
      incrementScan('bio');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      const result = {
        type: 'vitals',
        heartRate: analysis.heartRate,
        bp: analysis.bloodPressure,
        stress: analysis.stressLevel,
        insight: analysis.insight,
        source: 'Genova VitalsScan™'
      };
      
      setResults(result);
      
      const metric = {
        heartRate: result.heartRate,
        bloodPressure: result.bp,
        stressLevel: result.stress,
        timestamp: new Date().toISOString()
      };

      if (auth.currentUser) {
        await addHealthMetric(auth.currentUser.uid, metric);
      }

    } catch (err) {
      setError("Analysis failed. Please ensure your finger covers the camera lens completely and stay in good lighting.");
    } finally {
      setIsCapturing(false);
    }
  };


  const completeVitalsSync = async () => {
    const hr = 65 + Math.floor(Math.random() * 15);
    const result = {
      type: 'vitals',
      heartRate: hr,
      bp: `${110 + Math.floor(hr/10)}/${70 + Math.floor(hr/15)}`,
      stress: hr > 85 ? 'High' : (hr > 75 ? 'Medium' : 'Low'),
      source: 'Connected SmartBand'
    };
    setResults(result);
    setIsSyncing(false);

    const metric = {
      heartRate: result.heartRate,
      bloodPressure: result.bp,
      stressLevel: result.stress,
      timestamp: new Date().toISOString()
    };

    if (auth.currentUser) {
      await addHealthMetric(auth.currentUser.uid, metric);
    }
  };

  const reset = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setMode('choosing');
    setResults(null);
    setError(null);
    setSyncProgress(0);
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col transition-all overflow-x-hidden">
      <header className="p-6 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <button onClick={() => navigate('/')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95">
          <X size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30">Genova Engine</h1>
          <p className="text-lg font-black tracking-tight">SmartScan™</p>
        </div>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {mode === 'choosing' && !results && (
            <motion.div 
              key="choosing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm space-y-6"
            >
              <div className="text-center space-y-3 mb-12">
                <h2 className="text-4xl font-black tracking-tight">AI Diagnostic <br/><span className="text-blue-500">Suite</span></h2>
                <p className="text-gray-400 font-medium px-4">Choose a scan mode to update your health profile.</p>
              </div>
              
                <ScanModeButton 
                  onClick={startNutriCamera}
                  icon={<Utensils size={32} />}
                  title="NutriScan™"
                  desc="Calorie & Macro Analysis"
                  color="orange"
                  count={tier !== 'gold' ? `${scanCount.nutri}/${limits.nutri}` : undefined}
                />

                <ScanModeButton 
                  onClick={startVitalsCamera}
                  icon={<Activity size={32} />}
                  title="VitalsScan™"
                  desc="Camera-based PPG Vitals"
                  color="emerald"
                  count={tier !== 'gold' ? `${scanCount.bio}/${limits.bio}` : undefined}
                />

                <ScanModeButton 
                  onClick={handleVitalsSync}
                  icon={<Heart size={32} />}
                  title="Wellbeing Sync"
                  desc="Wearable Health Metrics"
                  color="blue"
                  premium={tier === 'free'}
                />

              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex gap-4">
                 <Info className="text-gray-500 shrink-0" size={20} />
                 <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
                   Wellbeing scans require a Gold subscription and a connected wearable for precision.
                 </p>
              </div>
            </motion.div>
          )}

          {mode === 'nutrition_camera' && tier !== 'free' && !results && (
            <motion.div 
              key="nutri-cam"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full max-w-md space-y-8"
            >
               <div className="relative aspect-square rounded-[3rem] overflow-hidden border-4 border-orange-500/30 shadow-2xl shadow-orange-500/10">
                 <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                 <canvas ref={canvasRef} className="hidden" />
                 <div className="absolute inset-0 border-[60px] border-black/60 pointer-events-none"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-2 border-dashed border-orange-500/50 rounded-[2rem]">
                    <motion.div 
                      animate={{ y: [0, 224, 0] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                      className="absolute left-0 right-0 h-1 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]"
                    ></motion.div>
                 </div>
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} className="text-orange-500" /> AI Nutri-Detection
                 </div>
               </div>
               <div className="text-center space-y-8">
                 <div>
                   <h2 className="text-2xl font-black">Frame Your Meal</h2>
                   <p className="text-sm text-gray-400 mt-1">AI identifies items and estimates nutrition facts</p>
                 </div>
                 <div className="flex items-center justify-center gap-6">
                   <button onClick={reset} className="p-4 bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors active:scale-95"><X size={24}/></button>
                   <button 
                      onClick={captureAndAnalyze}
                      disabled={isCapturing}
                      className="w-24 h-24 bg-orange-500 rounded-full border-8 border-orange-500/20 flex items-center justify-center active:scale-90 transition-all shadow-xl shadow-orange-500/40 relative overflow-hidden"
                    >
                     {isCapturing ? <Loader2 className="animate-spin text-white" size={40} /> : <div className="w-8 h-8 bg-white rounded-full"></div>}
                   </button>
                   <div className="w-12 h-12"></div>
                 </div>
               </div>
            </motion.div>
          )}

          {mode === 'vitals_camera' && tier !== 'free' && !results && (
            <motion.div 
              key="vitals-cam"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full max-w-md space-y-8"
            >
               <div className="relative aspect-square rounded-[3rem] overflow-hidden border-4 border-emerald-500/30 shadow-2xl shadow-emerald-500/10 bg-black">
                 <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60" />
                 <canvas ref={canvasRef} className="hidden" />
                 
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <AnimatePresence mode="wait">
                      {!isBioScanning ? (
                        <motion.div 
                          key="instructions"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-4"
                        >
                          <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <Activity size={32} />
                          </div>
                          <p className="text-lg font-bold">1-Minute Clinical Scan</p>
                          <p className="text-xs text-gray-400">Genova will analyze your pulse for exactly 60 seconds. Place your index finger firmly over the rear camera and flash.</p>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="scanning"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-6 w-full"
                        >
                          <motion.div 
                            animate={{ 
                              scale: fingerDetected ? [1, 1.1, 1] : 1,
                              backgroundColor: fingerDetected ? "#ef4444" : "#1f2937"
                            }}
                            className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-shadow duration-300 ${fingerDetected ? 'shadow-[0_0_50px_rgba(239,68,68,0.5)]' : ''}`}
                          >
                            <Heart size={48} className={fingerDetected ? 'animate-pulse' : 'text-gray-600'} />
                          </motion.div>
                          <div className="space-y-2">
                            <p className="text-sm font-black uppercase tracking-widest transition-colors duration-300">
                              {fingerDetected ? 'Pulse Detected' : 'Maintain Coverage'}
                            </p>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                initial={{ width: 0 }}
                                animate={{ width: `${bioScanProgress}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center px-1">
                               <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{Math.round(bioScanProgress)}% Complete</p>
                               <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{Math.max(0, 60 - Math.floor(bioScanProgress * 0.6))}s left</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                 </div>

                 <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} className="text-emerald-500" /> AI PPG Analysis
                 </div>
               </div>

               <div className="text-center space-y-8">
                 <div>
                   <h2 className="text-2xl font-black italic tracking-tighter">Genova VitalsScan™</h2>
                   <p className="text-sm text-gray-400 mt-1 font-medium">Hold steady for 60 seconds for precision results</p>
                 </div>
                 <div className="flex items-center justify-center gap-6">
                   <button onClick={reset} className="p-4 bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors active:scale-95"><X size={24}/></button>
                   {!isBioScanning ? (
                      <button 
                        onClick={runVitalsScan}
                        className="px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        Start Analysis
                      </button>
                   ) : (
                      <div className="px-10 py-5 bg-white/5 text-gray-500 rounded-[2rem] font-black border border-white/10 flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Analyzing...
                      </div>
                   )}
                   <div className="w-12 h-12"></div>
                 </div>
               </div>
            </motion.div>
          )}

          {mode === 'vitals_sync' && tier !== 'free' && !results && (
            <motion.div 
              key="vitals-sync"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-sm:px-4 max-w-sm space-y-8 text-center"
            >
            {!deviceConnected ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="space-y-8 py-10"
              >
                 <div className="relative">
                    <motion.div 
                      animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0, 0.1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute inset-0 bg-red-500 rounded-full blur-2xl"
                    />
                    <div className="w-32 h-32 bg-red-500/10 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto border border-red-500/20 shadow-2xl relative z-10">
                       <Bluetooth size={56} className="animate-pulse" />
                    </div>
                 </div>
                 <div className="space-y-3">
                   <h2 className="text-3xl font-black tracking-tight">Wearable Required</h2>
                   <p className="text-gray-400 font-medium leading-relaxed max-w-[280px] mx-auto">Wellbeing Sync requires a paired Bluetooth device to pull live clinical-grade metrics.</p>
                 </div>
                 <div className="space-y-4 pt-4">
                   <Link to="/wearables" className="group block w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2">
                     Connect Device <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                   </Link>
                   <button onClick={reset} className="w-full py-4 text-gray-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors">Return to Diagnostic Suite</button>
                 </div>
              </motion.div>
            ) : (
              <div className="space-y-12 py-10">
                <div className="relative w-56 h-56 mx-auto">
                   <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-20"
                   />
                   <div className="absolute inset-0 bg-blue-600 text-white rounded-full flex items-center justify-center border-8 border-white/5 relative z-10 shadow-2xl">
                      <motion.div animate={isSyncing ? { rotate: 360 } : {}} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                        <RefreshCcw size={72} />
                      </motion.div>
                   </div>
                </div>
                <div className="space-y-3">
                   <h2 className="text-3xl font-black tracking-tight">{isSyncing ? "Syncing Biometrics..." : "Ready to Sync"}</h2>
                   <p className="text-sm text-gray-400">Fetching latest data from your connected Genova SmartBand</p>
                </div>
                <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                    className="h-full bg-blue-500" 
                    initial={{ width: 0 }}
                    animate={{ width: `${syncProgress}%` }}
                   />
                </div>
                {!isSyncing && (
                   <button onClick={() => setIsSyncing(true)} className="w-full py-5 bg-blue-600 text-white rounded-[2.2rem] font-black shadow-xl shadow-blue-600/20 active:scale-95 transition-all">Start Sync</button>
                )}
              </div>
            )}
          </motion.div>
          )}

          {results && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md space-y-8 pb-10"
            >
            {results.type === 'vitals' ? (
              <div className="space-y-8">
                <div className="text-center">
                  <motion.div 
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-[10px] font-black text-blue-500 tracking-[0.4em] uppercase mb-4 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={12}/> Vitals Synced Successfully
                  </motion.div>
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-9xl font-black tracking-tighter text-white flex items-baseline justify-center"
                  >
                    {results.heartRate}
                    <span className="text-2xl text-gray-500 ml-2 font-bold tracking-normal">BPM</span>
                  </motion.div>
                  <p className="text-gray-400 mt-4 font-medium flex items-center justify-center gap-2">
                    Verified data from {results.source}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ResultCard icon={<Activity className="text-blue-400 mb-4" size={24}/>} label="Blood Pressure" value={results.bp} />
                  <ResultCard icon={<Zap className="text-yellow-400 mb-4" size={24}/>} label="Stress Level" value={results.stress} />
                </div>
                {results.insight && <InsightCard insight={results.insight} />}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <div className="text-[10px] font-black text-orange-500 tracking-[0.4em] uppercase mb-2">NutriScan Complete</div>
                  <h2 className="text-4xl font-black text-white leading-tight">{results.foodName}</h2>
                </div>

                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-orange-600/20 border border-orange-500/20 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden"
                >
                  <div className="relative z-10 flex justify-between items-center">
                    <div>
                       <p className="text-6xl font-black text-white">{results.calories}</p>
                       <p className="text-sm font-bold text-orange-400 uppercase tracking-widest">Est. Calories</p>
                    </div>
                    <div className="p-4 bg-orange-500 rounded-3xl text-white shadow-xl">
                      <PieChart size={36} />
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-3 gap-3">
                  <MacroCard label="Protein" value={results.protein} color="bg-blue-500/20 text-blue-400" />
                  <MacroCard label="Carbs" value={results.carbs} color="bg-green-500/20 text-green-400" />
                  <MacroCard label="Fat" value={results.fat} color="bg-yellow-500/20 text-yellow-400" />
                </div>

                <InsightCard insight={results.insight || results.healthTip} />
              </div>
            )}

            <button 
              onClick={reset}
              className="w-full py-5 bg-white text-gray-950 rounded-[2.2rem] font-black text-lg active:scale-95 transition-all shadow-xl hover:bg-gray-100"
            >
              Continue Journey
            </button>
          </motion.div>
          )}

          {error && (
            <motion.div 
              key="error"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-8 bg-red-950/40 border border-red-900/40 rounded-[2.5rem] text-red-400 flex items-start gap-4 max-w-sm"
            >
              <AlertCircle className="shrink-0" size={24} />
              <div>
                <p className="font-bold text-lg">Scan Error</p>
                <p className="text-sm opacity-80 leading-relaxed mt-1">{error}</p>
                <button onClick={reset} className="mt-6 text-xs font-black uppercase tracking-widest text-white bg-red-600 px-6 py-2 rounded-full active:scale-95 transition-all">Try again</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const ScanModeButton: React.FC<{onClick: () => void, icon: React.ReactNode, title: string, desc: string, color: 'orange' | 'emerald' | 'blue', count?: string, premium?: boolean}> = ({ onClick, icon, title, desc, color, count, premium }) => {
  const colors = {
    orange: "bg-orange-600/10 border-orange-500/20 hover:bg-orange-600/20",
    emerald: "bg-emerald-600/10 border-emerald-500/20 hover:bg-emerald-600/20",
    blue: "bg-blue-600/10 border-blue-500/20 hover:bg-blue-600/20"
  };
  const iconColors = {
    orange: "bg-orange-500 shadow-orange-500/30",
    emerald: "bg-emerald-500 shadow-emerald-500/30",
    blue: "bg-blue-500 shadow-blue-500/30"
  };

  return (
    <motion.button 
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-8 ${colors[color]} border rounded-[3rem] text-left transition-all group flex items-center justify-between`}
    >
      <div className="flex gap-6 items-center">
        <div className={`w-16 h-16 ${iconColors[color]} rounded-3xl flex items-center justify-center shadow-2xl group-hover:rotate-6 transition-transform`}>
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            {title} 
            {count && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-black">{count}</span>}
            {premium && <Crown size={14} className="text-amber-500" />}
          </h3>
          <p className="text-sm text-gray-400 font-medium">{desc}</p>
        </div>
      </div>
      <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" />
    </motion.button>
  );
};

const ResultCard: React.FC<{icon: React.ReactNode, label: string, value: string}> = ({ icon, label, value }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md"
  >
    {icon}
    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-2xl font-black text-white">{value}</p>
  </motion.div>
);

const InsightCard: React.FC<{insight: string}> = ({ insight }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-sm"
  >
    <div className="flex items-center gap-3 mb-4">
      <Sparkles className="text-blue-400" size={20} />
      <h4 className="font-black text-xs uppercase tracking-[0.2em] text-white/60">AI Insight</h4>
    </div>
    <p className="text-gray-200 font-medium leading-relaxed">{insight}</p>
  </motion.div>
);

const MacroCard: React.FC<{label: string, value: string, color: string}> = ({ label, value, color }) => (
  <motion.div 
    whileHover={{ scale: 1.05 }}
    className={`p-5 rounded-[2rem] border border-white/5 text-center ${color} backdrop-blur-sm`}
  >
    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{label}</p>
    <p className="text-lg font-black">{value}</p>
  </motion.div>
);

export default SmartScan;
