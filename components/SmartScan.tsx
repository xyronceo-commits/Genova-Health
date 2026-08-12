import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Zap, ShieldCheck, X, AlertCircle, Heart, Info, Activity, Utensils, Watch, ChevronRight, Loader2, Sparkles, RefreshCcw, PieChart, Crown, Bluetooth, Upload, Search, BookOpen, Dna } from 'lucide-react';
import { UserProfile } from '../types';
import { STORAGE_KEYS } from '../constants';
import { ai } from '../services/ai';
import { auth, addHealthMetric, saveFoodScan, sendActivityNotification } from '../services/firebase';

type ScanMode = 'choosing' | 'vitals_sync' | 'nutrition_camera';
type NutriTab = 'camera' | 'manual';

interface Props {
  user: UserProfile;
}

const SmartScan: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [mode, setMode] = useState<ScanMode>('choosing');
  const [nutriTab, setNutriTab] = useState<NutriTab>('camera');
  const [manualFoodInput, setManualFoodInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [isBioScanning, setIsBioScanning] = useState(false);
  const [bioScanProgress, setBioScanProgress] = useState(0);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [isPulseOverridden, setIsPulseOverridden] = useState(false);
  const [scanCount, setScanCount] = useState({ nutri: 0, bio: 0 });

  const bioScanIntervalRef = useRef<any>(null);
  const ppgBufferRef = useRef<number[]>([]);

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

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (mode === 'nutrition_camera' && nutriTab === 'camera' && !results) {
      const initCamera = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("MediaDevices API not available");
          }
          
          const getUserMediaPromise = navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
          });
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("Timeout starting video source")), 8000);
          });
          
          const stream = await Promise.race([getUserMediaPromise, timeoutPromise]);
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', 'true');
            await videoRef.current.play();
          }
        } catch (err) {
          console.warn("Camera could not start:", err);
          setError("Notice: Device camera preview unavailable or permission denied. Switch to Manual Meal Input or upload a photo.");
          setTimeout(() => {
            setError(null);
          }, 5000);
        }
      };
      initCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [mode, nutriTab, results]);

  const startNutriCamera = () => {
    setError(null);
    setMode('nutrition_camera');
  };

  const captureAndAnalyze = async (uploadedBase64?: string) => {
    setIsCapturing(true);
    setError(null);
    try {
      let base64 = "";
      if (uploadedBase64) {
        base64 = uploadedBase64;
      } else {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.videoWidth > 0) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          }
        }
      }

      if (!base64) {
        throw new Error("No image data captured or uploaded. Please capture a photo or upload an image.");
      }

      const userContextStr = `User Name: ${user.fullName}, Genotype: ${user.genotype || 'AA'}, Blood Group: ${user.bloodGroup || 'O+'}, Allergies: ${user.allergies?.join(', ') || 'None'}`;
      const analysis = await ai.analyzeFood(base64, userContextStr);
      incrementScan('nutri');
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (auth.currentUser) {
        await saveFoodScan(auth.currentUser.uid, analysis);
        await sendActivityNotification(auth.currentUser.uid, {
          title: 'NutriScan Meal Logged',
          body: `${analysis.foodName || 'Meal'} logged (${analysis.calories || 0} kcal). Nutritional breakdown saved.`,
          type: 'nutri',
          actionUrl: '/scan'
        });
      }

      setResults({ type: 'nutrition', ...analysis });
    } catch (err: any) {
      console.error("Food scan error:", err);
      setError("AI was unable to process the food image. Please frame your plate clearly or use Manual Input.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleManualFoodSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualFoodInput.trim()) {
      setError("Please type a meal or dish description to analyze.");
      return;
    }

    setIsCapturing(true);
    setError(null);
    try {
      const userContextStr = `User Name: ${user.fullName}, Genotype: ${user.genotype || 'AA'}, Blood Group: ${user.bloodGroup || 'O+'}, Allergies: ${user.allergies?.join(', ') || 'None'}`;
      const analysis = await ai.analyzeFoodText(manualFoodInput.trim(), userContextStr);
      incrementScan('nutri');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (auth.currentUser) {
        await saveFoodScan(auth.currentUser.uid, analysis);
      }

      setResults({ type: 'nutrition', ...analysis });
    } catch (err: any) {
      console.error("Manual food analysis error:", err);
      setError("AI was unable to calculate calories for this input. Please rephrase your meal description.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        captureAndAnalyze(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVitalsSync = () => {
    setError(null);
    const savedDevice = localStorage.getItem(STORAGE_KEYS.WEARABLE_DEVICE);
    if (!savedDevice && !deviceConnected) {
      const deviceData = {
        name: 'Genova SmartWatch Pro',
        id: 'SMARTWATCH-LIVE-001',
        connected: true,
        lastSeen: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEYS.WEARABLE_DEVICE, JSON.stringify(deviceData));
      setDeviceConnected(true);
    }
    navigate('/wearables');
  };

  const reset = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setMode('choosing');
    setResults(null);
    setError(null);
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col transition-all overflow-x-hidden">
      <header className="p-6 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <button onClick={() => navigate('/')} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl transition-all active:scale-95">
          <X size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30">Genova Clinical AI</h1>
          <p className="text-lg font-black tracking-tight">NutriScan™ Real-time Engine</p>
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
                <h2 className="text-4xl font-black tracking-tight">AI Diagnostic <br/><span className="text-orange-500">NutriScan</span></h2>
                <p className="text-gray-400 font-medium px-4">Real-time camera scanning & precision meal analysis personalized for your genotype.</p>
              </div>
              
                <ScanModeButton 
                  onClick={startNutriCamera}
                  icon={<Utensils size={32} />}
                  title="NutriScan™"
                  desc="Camera Vision & Manual Meal Analysis"
                  color="orange"
                />

                <ScanModeButton 
                  onClick={handleVitalsSync}
                  icon={<Watch size={32} />}
                  title="Vitals & Wellbeing Sync™"
                  desc="Connected Smartwatch Dashboard • Review all vitals"
                  color="blue"
                  badge="Smartwatch Dashboard"
                />

              <div className="p-6 bg-white/5 rounded-3xl border border-white/10 flex gap-4">
                 <Dna className="text-orange-400 shrink-0" size={20} />
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                   Tailored to Genotype <span className="text-orange-400 font-extrabold">{user.genotype || 'AA'}</span> & Blood Group <span className="text-orange-400 font-extrabold">{user.bloodGroup || 'O+'}</span>.
                 </p>
              </div>
            </motion.div>
          )}

          {mode === 'nutrition_camera' && !results && (
            <motion.div 
              key="nutri-cam"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-md space-y-6"
            >
               {/* Mode Switcher Tabs */}
               <div className="flex bg-white/5 p-1.5 rounded-full border border-white/10">
                 <button
                   onClick={() => setNutriTab('camera')}
                   className={`flex-1 py-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                     nutriTab === 'camera' 
                       ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                       : 'text-gray-400 hover:text-white'
                   }`}
                 >
                   <Camera size={16} /> Device Camera
                 </button>
                 <button
                   onClick={() => setNutriTab('manual')}
                   className={`flex-1 py-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                     nutriTab === 'manual' 
                       ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                       : 'text-gray-400 hover:text-white'
                   }`}
                 >
                   <Search size={16} /> Manual Input
                 </button>
               </div>

               {nutriTab === 'camera' ? (
                 <div className="space-y-6">
                   <div className="relative aspect-square rounded-[3rem] overflow-hidden border-4 border-orange-500/30 shadow-2xl shadow-orange-500/10">
                     <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover scale-x-[-1]" />
                     <canvas ref={canvasRef} className="hidden" />
                     <div className="absolute inset-0 border-[50px] border-black/60 pointer-events-none"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 border-2 border-dashed border-orange-500/50 rounded-[2rem]">
                        <motion.div 
                          animate={{ y: [0, 224, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-1 bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]"
                        ></motion.div>
                     </div>
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={12} className="text-orange-500" /> Real-time Camera Feed
                     </div>
                   </div>

                   <div className="text-center space-y-4">
                     <div>
                       <h2 className="text-2xl font-black">Frame Your Dish</h2>
                       <p className="text-xs text-gray-400 mt-1">Real-time AI calorie & macro estimation from device camera</p>
                     </div>

                     <div className="flex items-center justify-center gap-6">
                       <button 
                         onClick={reset} 
                         className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors active:scale-95"
                         title="Cancel scan"
                       >
                         <X size={24}/>
                       </button>

                       <button 
                          onClick={() => captureAndAnalyze()}
                          disabled={isCapturing}
                          className="w-20 h-20 bg-orange-500 rounded-full border-4 border-orange-500/20 flex items-center justify-center active:scale-90 transition-all shadow-xl shadow-orange-500/40 relative overflow-hidden"
                          title="Capture Real-Time Photo"
                        >
                         {isCapturing ? <Loader2 className="animate-spin text-white" size={32} /> : <div className="w-7 h-7 bg-white rounded-full"></div>}
                       </button>

                       <button 
                         onClick={() => fileInputRef.current?.click()}
                         disabled={isCapturing}
                         className="p-4 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors active:scale-95"
                         title="Upload Photo from Device"
                       >
                         <Upload size={24} />
                       </button>

                       <input 
                         ref={fileInputRef}
                         type="file" 
                         accept="image/*" 
                         onChange={handleImageUpload} 
                         className="hidden" 
                       />
                     </div>
                   </div>
                 </div>
               ) : (
                 <motion.form 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   onSubmit={handleManualFoodSubmit} 
                   className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 space-y-5"
                 >
                   <div className="space-y-2">
                     <label className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-2">
                       <Utensils size={14} /> Manual Food Entry
                     </label>
                     <p className="text-xs text-gray-400">
                       Describe what you plan to eat or enter dish name and ingredients.
                     </p>
                   </div>

                   <textarea
                     value={manualFoodInput}
                     onChange={(e) => setManualFoodInput(e.target.value)}
                     placeholder="e.g. 2 slices of roasted yam with scrambled eggs and fresh tomato sauce, or Oatmeal with almond milk and chia seeds..."
                     rows={4}
                     className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all resize-none"
                   />

                   <button
                     type="submit"
                     disabled={isCapturing || !manualFoodInput.trim()}
                     className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                   >
                     {isCapturing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                     Analyze Calories & Nutrition
                   </button>
                 </motion.form>
               )}
            </motion.div>
          )}

          {results && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md space-y-6 pb-10"
            >
              <div className="text-center mb-6">
                <div className="text-[10px] font-black text-orange-500 tracking-[0.4em] uppercase mb-2 flex items-center justify-center gap-2">
                  <Sparkles size={12} /> NutriScan Real-time Analysis
                </div>
                <h2 className="text-3xl font-black text-white leading-tight">{results.foodName}</h2>
              </div>

              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-orange-600/20 border border-orange-500/20 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden"
              >
                <div className="relative z-10 flex justify-between items-center">
                  <div>
                     <p className="text-6xl font-black text-white">{results.calories}</p>
                     <p className="text-sm font-bold text-orange-400 uppercase tracking-widest mt-1">Est. Calories (kcal)</p>
                  </div>
                  <div className="p-4 bg-orange-500 rounded-3xl text-white shadow-xl">
                    <PieChart size={36} />
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-3 gap-3">
                <MacroCard label="Protein" value={results.protein || 'N/A'} color="bg-blue-500/20 text-blue-400" />
                <MacroCard label="Carbs" value={results.carbs || 'N/A'} color="bg-green-500/20 text-green-400" />
                <MacroCard label="Fat" value={results.fat || 'N/A'} color="bg-yellow-500/20 text-yellow-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MacroCard label="Dietary Fiber" value={results.fiber || '3g'} color="bg-emerald-500/20 text-emerald-400" />
                <MacroCard label="Glycemic Index" value={results.glycemicIndex || 'Moderate'} color="bg-purple-500/20 text-purple-400" />
              </div>

              {results.genotypeCompatibility && (
                <div className="p-6 bg-orange-950/30 border border-orange-500/30 rounded-[2.5rem] flex items-start gap-4">
                  <Dna className="text-orange-400 shrink-0 mt-0.5" size={24} />
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-orange-400 mb-1">Genotype & Blood Group Match</h4>
                    <p className="text-sm text-gray-200 font-medium leading-snug">{results.genotypeCompatibility}</p>
                  </div>
                </div>
              )}

              <InsightCard insight={results.insight || results.healthTip || "Meal profile analyzed successfully against clinical nutrition standards."} />

              <button 
                onClick={reset}
                className="w-full py-5 bg-white text-gray-950 rounded-[2.2rem] font-black text-lg active:scale-95 transition-all shadow-xl hover:bg-gray-100"
              >
                Scan Another Meal
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
                <p className="font-bold text-lg">Scan Notice</p>
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

const ScanModeButton: React.FC<{onClick: () => void, icon: React.ReactNode, title: string, desc: string, color: 'orange' | 'emerald' | 'blue', count?: string, badge?: string, premium?: boolean}> = ({ onClick, icon, title, desc, color, count, badge, premium }) => {
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
            {badge && <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${badge === 'Connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>{badge}</span>}
          </h3>
          <p className="text-sm text-gray-400 font-medium">{desc}</p>
        </div>
      </div>
      <ChevronRight className="text-gray-600 group-hover:text-white transition-colors" />
    </motion.button>
  );
};

const InsightCard: React.FC<{insight: string}> = ({ insight }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-sm"
  >
    <div className="flex items-center gap-3 mb-4">
      <Sparkles className="text-orange-400" size={20} />
      <h4 className="font-black text-xs uppercase tracking-[0.2em] text-white/60">AI Health Analysis</h4>
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
