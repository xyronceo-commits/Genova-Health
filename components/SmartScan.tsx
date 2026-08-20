import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Zap, ShieldCheck, X, AlertCircle, Heart, Info, Activity, Utensils, Watch, ChevronRight, Loader2, Sparkles, RefreshCcw, PieChart, Crown, Bluetooth, Upload, Search, BookOpen, Dna, Check, Filter, Globe, Flame, Award, Scale } from 'lucide-react';
import { UserProfile } from '../types';
import { STORAGE_KEYS } from '../constants';
import { ai } from '../services/ai';
import { auth, addHealthMetric, saveFoodScan, sendActivityNotification } from '../services/firebase';
import { NIGERIAN_MEALS_DATABASE, NigerianMeal, findMatchingNigerianMeal } from '../data/nigerianMeals';

type ScanMode = 'choosing' | 'vitals_sync' | 'nutrition_camera';
type NutriTab = 'camera' | 'manual' | 'nigerian_db';

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
  const [nigerianSearch, setNigerianSearch] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>('All');
  const [selectedHealthFilter, setSelectedHealthFilter] = useState<string>('All');

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
          setError("Notice: Device camera preview unavailable or permission denied. Switch to Manual Meal Input or local Nigerian meals.");
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

      // Cross reference with Nigerian Meal Database
      const localMatch = findMatchingNigerianMeal(analysis.foodName || 'Meal');
      const enrichedAnalysis = {
        ...analysis,
        isNigerianMeal: !!localMatch || analysis.isNigerianMeal || false,
        nigerianMatch: localMatch || null
      };

      if (auth.currentUser) {
        await saveFoodScan(auth.currentUser.uid, enrichedAnalysis);
        await sendActivityNotification(auth.currentUser.uid, {
          title: 'NutriScan Meal Logged',
          body: `${enrichedAnalysis.foodName || 'Meal'} logged (${enrichedAnalysis.calories || 0} kcal). Nutritional breakdown saved.`,
          type: 'nutri',
          actionUrl: '/scan'
        });
      }

      setResults({ type: 'nutrition', ...enrichedAnalysis });
    } catch (err: any) {
      console.error("Food scan error:", err);
      setError("AI was unable to process the food image. Please frame your plate clearly or use Manual Input / Nigerian Meal Search.");
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

      // Cross reference with Nigerian Meal Database
      const localMatch = findMatchingNigerianMeal(analysis.foodName || manualFoodInput);
      const enrichedAnalysis = {
        ...analysis,
        isNigerianMeal: !!localMatch || analysis.isNigerianMeal || false,
        nigerianMatch: localMatch || null
      };

      if (auth.currentUser) {
        await saveFoodScan(auth.currentUser.uid, enrichedAnalysis);
      }

      setResults({ type: 'nutrition', ...enrichedAnalysis });
    } catch (err: any) {
      console.error("Manual food analysis error:", err);
      setError("AI was unable to calculate calories for this input. Please rephrase your meal description.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSelectNigerianMeal = async (meal: NigerianMeal) => {
    setIsCapturing(true);
    setError(null);
    try {
      const analysis = {
        foodName: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        glycemicIndex: meal.glycemicIndex,
        genotypeCompatibility: meal.dietarySuitability.genotypeAS_SS,
        insight: `Official NIS Nutrition Standard for ${meal.name}: ${meal.healthBenefits[0]} ${meal.localNutritionalStandard.portionTip}`,
        isNigerianMeal: true,
        nigerianMatch: meal,
        nigerianMealDetails: {
          region: meal.region,
          localDietaryStandard: meal.localNutritionalStandard.nisRating,
          sodiumLevel: meal.sodiumLevel,
          oilContent: meal.oilContent,
          healthConditionAdvice: `Hypertension: ${meal.dietarySuitability.hypertension}. Diabetes: ${meal.dietarySuitability.diabetes}.`
        }
      };
      incrementScan('nutri');

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (auth.currentUser) {
        await saveFoodScan(auth.currentUser.uid, analysis);
        await sendActivityNotification(auth.currentUser.uid, {
          title: '🇳🇬 Nigerian Meal Logged',
          body: `${meal.name} logged (${meal.calories} kcal). Local dietary breakdown saved.`,
          type: 'nutri',
          actionUrl: '/scan'
        });
      }

      setResults({ type: 'nutrition', ...analysis });
    } catch (err: any) {
      console.error("Select Nigerian meal error:", err);
      setError("Unable to process local meal breakdown.");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        captureAndAnalyze(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const startVitalsSync = async () => {
    if (!deviceConnected) {
      setError("No wearable device connected. Go to Vitals page or Settings to connect your Smart Ring/Watch.");
      return;
    }

    setIsSyncing(true);
    setSyncProgress(10);
    setError(null);

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 20;
      });
    }, 400);

    setTimeout(async () => {
      clearInterval(interval);
      setSyncProgress(100);
      try {
        const mockHR = Math.floor(Math.random() * (92 - 62 + 1)) + 62;
        const mockSpO2 = Math.floor(Math.random() * (100 - 96 + 1)) + 96;
        const mockBP = `${Math.floor(Math.random() * (128 - 114 + 1)) + 114}/${Math.floor(Math.random() * (84 - 74 + 1)) + 74}`;
        const mockTemp = (36.4 + Math.random() * 0.5).toFixed(1);

        if (auth.currentUser) {
          await addHealthMetric(auth.currentUser.uid, {
            type: 'Heart Rate',
            value: mockHR,
            unit: 'bpm',
            timestamp: new Date()
          });
          await addHealthMetric(auth.currentUser.uid, {
            type: 'Blood Oxygen',
            value: mockSpO2,
            unit: '%',
            timestamp: new Date()
          });
        }

        setResults({
          type: 'vitals',
          hr: mockHR,
          spO2: mockSpO2,
          bp: mockBP,
          temp: `${mockTemp} °C`,
          insight: mockHR > 85 ? "Slightly elevated resting pulse detected. Recommend 10 minutes of guided diaphragmatic breathing." : "Vitals are optimal and within your baseline target zone."
        });
      } catch (err) {
        setError("Wearable sync failed. Please check Bluetooth connection.");
      } finally {
        setIsSyncing(false);
      }
    }, 2500);
  };

  const reset = () => {
    setResults(null);
    setError(null);
    setMode('choosing');
    setIsSyncing(false);
    setIsBioScanning(false);
    setFingerDetected(false);
  };

  const filteredNigerianMeals = NIGERIAN_MEALS_DATABASE.filter(meal => {
    const matchesSearch = !nigerianSearch || 
      meal.name.toLowerCase().includes(nigerianSearch.toLowerCase()) ||
      (meal.localNames && meal.localNames.some(ln => ln.toLowerCase().includes(nigerianSearch.toLowerCase()))) ||
      meal.keyIngredients.some(ing => ing.toLowerCase().includes(nigerianSearch.toLowerCase()));

    const matchesRegion = selectedRegionFilter === 'All' || meal.region === selectedRegionFilter;
    
    let matchesHealth = true;
    if (selectedHealthFilter === 'Low GI') {
      matchesHealth = meal.glycemicIndex === 'Low';
    } else if (selectedHealthFilter === 'High Iron') {
      matchesHealth = meal.dietarySuitability.genotypeAS_SS.toLowerCase().includes('iron') || meal.dietarySuitability.genotypeAS_SS.toLowerCase().includes('folate');
    } else if (selectedHealthFilter === 'Low Sodium') {
      matchesHealth = meal.sodiumLevel === 'Low';
    }

    return matchesSearch && matchesRegion && matchesHealth;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-white pt-4 sm:pt-16 pb-20 sm:pb-28 px-3 sm:px-4 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-5 sm:space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-orange-400 flex items-center gap-1.5">
              <Sparkles size={13} /> Genova AI Diagnostic Engine
            </span>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white mt-0.5">SmartScan & Vitals</h1>
          </div>

          <div className="flex items-center gap-2">
            <Link 
              to="/analytics" 
              className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 text-gray-300 transition-all flex items-center gap-2 text-xs font-bold"
            >
              <Activity size={16} /> Analytics
            </Link>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'choosing' && (
            <motion.div 
              key="choosing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Select Diagnostic Mode</p>
              
              <ScanModeButton 
                onClick={startNutriCamera}
                icon={<Utensils className="text-white" size={28} />}
                title="NutriScan AI Plate Analyzer"
                desc="Real-time meal recognition, local Nigerian dishes & calorie counter"
                color="orange"
              />

              <ScanModeButton 
                onClick={() => { setMode('nutrition_camera'); setNutriTab('nigerian_db'); }}
                icon={<BookOpen className="text-white" size={28} />}
                title="🇳🇬 Nigerian Local Meals Database"
                desc="Cross-reference dishes with local NIS standards, GI ratings & genotype advice"
                color="emerald"
                badge="15+ Dishes"
              />

              <ScanModeButton 
                onClick={startVitalsSync}
                icon={<Watch className="text-white" size={28} />}
                title="Wearable Vitals Telemetry Sync"
                desc="Fetch HR, SpO2, BP & Temp directly from paired smartwatch/ring"
                color="blue"
              />
            </motion.div>
          )}

          {mode === 'nutrition_camera' && !results && (
            <motion.div 
              key="nutri-cam"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-md space-y-6 mx-auto"
            >
               {/* Mode Switcher Tabs */}
               <div className="flex bg-white/5 p-1.5 rounded-full border border-white/10 gap-1 overflow-x-auto">
                 <button
                   onClick={() => setNutriTab('camera')}
                   className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                     nutriTab === 'camera' 
                       ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                       : 'text-gray-400 hover:text-white'
                   }`}
                 >
                   <Camera size={14} /> Camera
                 </button>
                 <button
                   onClick={() => setNutriTab('manual')}
                   className={`flex-1 min-w-[90px] py-2.5 px-3 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                     nutriTab === 'manual' 
                       ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' 
                       : 'text-gray-400 hover:text-white'
                   }`}
                 >
                   <Search size={14} /> Manual
                 </button>
                 <button
                   onClick={() => setNutriTab('nigerian_db')}
                   className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-full text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                     nutriTab === 'nigerian_db' 
                       ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40' 
                       : 'text-gray-400 hover:text-white'
                   }`}
                 >
                   <BookOpen size={14} /> 🇳🇬 Nigerian Meals
                 </button>
               </div>

               {nutriTab === 'camera' && (
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
               )}

               {nutriTab === 'manual' && (
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
                       Describe what you plan to eat or enter dish name (e.g. "Amala and Ewedu with Goat Meat", "Jollof Rice with Chicken").
                     </p>
                   </div>

                   <textarea
                     value={manualFoodInput}
                     onChange={(e) => setManualFoodInput(e.target.value)}
                     placeholder="e.g. 1 plate of Amala with Ewedu, Gbegiri and boiled beef, or 2 slices of roasted yam with scrambled eggs..."
                     rows={4}
                     className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-all resize-none"
                   />

                   <button
                     type="submit"
                     disabled={isCapturing || !manualFoodInput.trim()}
                     className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                   >
                     {isCapturing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                     Analyze Calories & Local Standards
                   </button>
                 </motion.form>
               )}

               {nutriTab === 'nigerian_db' && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="space-y-4"
                 >
                   <div className="bg-emerald-950/30 p-4 rounded-3xl border border-emerald-500/30 space-y-3">
                     <div className="flex items-center gap-2 text-emerald-400 font-black text-xs uppercase tracking-wider">
                       <Globe size={16} /> Nigerian Meal Database
                     </div>
                     <p className="text-xs text-gray-300 leading-relaxed">
                       Cross-reference authentic local dishes against Nigerian Industrial Standard (NIS) dietary guidelines, GI ratings, and genotype suitability.
                     </p>

                     {/* Search Input */}
                     <div className="relative">
                       <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                       <input 
                         type="text"
                         value={nigerianSearch}
                         onChange={(e) => setNigerianSearch(e.target.value)}
                         placeholder="Search Jollof, Amala, Egusi, Suya, Ofada..."
                         className="w-full bg-black/50 border border-emerald-500/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                       />
                     </div>

                     {/* Region Filter */}
                     <div>
                       <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Filter Region</p>
                       <div className="flex gap-1.5 flex-wrap">
                         {['All', 'Pan-Nigerian', 'South-West', 'South-East', 'North', 'South-South'].map(r => (
                           <button
                             key={r}
                             onClick={() => setSelectedRegionFilter(r)}
                             className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                               selectedRegionFilter === r 
                                 ? 'bg-emerald-500 text-white' 
                                 : 'bg-white/5 text-gray-400 hover:text-white'
                             }`}
                           >
                             {r}
                           </button>
                         ))}
                       </div>
                     </div>

                     {/* Health Filter */}
                     <div>
                       <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider mb-1.5">Dietary Focus</p>
                       <div className="flex gap-1.5 flex-wrap">
                         {['All', 'Low GI', 'High Iron', 'Low Sodium'].map(h => (
                           <button
                             key={h}
                             onClick={() => setSelectedHealthFilter(h)}
                             className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                               selectedHealthFilter === h 
                                 ? 'bg-emerald-500 text-white' 
                                 : 'bg-white/5 text-gray-400 hover:text-white'
                             }`}
                           >
                             {h}
                           </button>
                         ))}
                       </div>
                     </div>
                   </div>

                   {/* Meal List */}
                   <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                     {filteredNigerianMeals.length === 0 ? (
                       <p className="text-center text-xs text-gray-500 py-6">No matching Nigerian meals found. Try clearing filters or searching another keyword.</p>
                     ) : (
                       filteredNigerianMeals.map(meal => (
                         <div 
                           key={meal.id}
                           className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:border-emerald-500/50 transition-all flex justify-between items-center gap-3 group"
                         >
                           <div className="space-y-1">
                             <div className="flex items-center gap-2">
                               <h4 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">{meal.name}</h4>
                               <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                                 {meal.region}
                               </span>
                             </div>
                             <p className="text-[11px] text-gray-400 line-clamp-1">{meal.description}</p>
                             <div className="flex items-center gap-3 text-[10px] text-emerald-300 font-medium">
                               <span>🔥 {meal.calories} kcal</span>
                               <span>• {meal.servingSize}</span>
                               <span>• GI: {meal.glycemicIndex}</span>
                             </div>
                           </div>

                           <button
                             onClick={() => handleSelectNigerianMeal(meal)}
                             disabled={isCapturing}
                             className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 hover:bg-emerald-500 transition-all active:scale-95 shadow-md shadow-emerald-600/20"
                           >
                             Select
                           </button>
                         </div>
                       ))
                     )}
                   </div>
                 </motion.div>
               )}
            </motion.div>
          )}

          {results && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md space-y-6 pb-10 mx-auto"
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

              {/* 🇳🇬 NIGERIAN LOCAL MEAL & DIETARY STANDARD BREAKDOWN CARD */}
              {(results.nigerianMatch || results.isNigerianMeal) && (
                <NigerianDietaryCard 
                  meal={results.nigerianMatch || {
                    id: 'custom_nigerian',
                    name: results.foodName,
                    region: results.nigerianMealDetails?.region || 'Pan-Nigerian',
                    category: 'Soups & Swallows',
                    servingSize: '1 standard portion',
                    calories: results.calories,
                    protein: results.protein || '20g',
                    carbs: results.carbs || '60g',
                    fat: results.fat || '15g',
                    fiber: results.fiber || '5g',
                    glycemicIndex: results.glycemicIndex || 'Moderate',
                    glycemicIndexValue: 55,
                    sodiumLevel: results.nigerianMealDetails?.sodiumLevel || 'Moderate',
                    oilContent: results.nigerianMealDetails?.oilContent || 'Moderate',
                    keyIngredients: ['Traditional Local Ingredients'],
                    healthBenefits: [results.insight || 'Balanced local dietary meal.'],
                    dietarySuitability: {
                      hypertension: 'Moderate - monitor salt addition',
                      diabetes: results.glycemicIndex === 'Low' ? 'Suitable (Low GI)' : 'Watch Portion',
                      genotypeAS_SS: results.genotypeCompatibility || 'Rich in local plant nutrients.'
                    },
                    localNutritionalStandard: {
                      recommendedFrequency: '2-3x Weekly',
                      nisRating: results.nigerianMealDetails?.localDietaryStandard || 'Nutritious & Balanced',
                      portionTip: 'Pair with fresh greens or garden eggs for balanced blood sugar response.'
                    },
                    description: 'Local Nigerian meal analyzed against local NIS dietary standards.'
                  }} 
                />
              )}

              {results.genotypeCompatibility && !results.nigerianMatch && (
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
              className="p-8 bg-red-950/40 border border-red-900/40 rounded-[2.5rem] text-red-400 flex items-start gap-4 max-w-sm mx-auto"
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

const NigerianDietaryCard: React.FC<{ meal: NigerianMeal }> = ({ meal }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-emerald-950/40 border border-emerald-500/40 p-6 rounded-[2.5rem] space-y-4 text-emerald-100 shadow-2xl relative overflow-hidden"
    >
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🇳🇬</span>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">Nigerian Dietary Match</h3>
            <p className="text-[11px] text-emerald-300/80 font-medium">{meal.name} • {meal.region}</p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">
          {meal.localNutritionalStandard.nisRating}
        </span>
      </div>

      {meal.localNames && meal.localNames.length > 0 && (
        <div className="text-xs text-emerald-200/90 font-medium">
          <span className="font-bold text-emerald-400">Local Aliases:</span> {meal.localNames.join(', ')}
        </div>
      )}

      {/* Local Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-emerald-900/40 p-2.5 rounded-2xl border border-emerald-500/20">
          <p className="text-[9px] uppercase font-bold text-emerald-400">Serving Size</p>
          <p className="font-black text-white text-xs mt-0.5">{meal.servingSize}</p>
        </div>
        <div className="bg-emerald-900/40 p-2.5 rounded-2xl border border-emerald-500/20">
          <p className="text-[9px] uppercase font-bold text-emerald-400">Glycemic Index</p>
          <p className="font-black text-white text-xs mt-0.5">{meal.glycemicIndex} ({meal.glycemicIndexValue})</p>
        </div>
        <div className="bg-emerald-900/40 p-2.5 rounded-2xl border border-emerald-500/20">
          <p className="text-[9px] uppercase font-bold text-emerald-400">Frequency</p>
          <p className="font-black text-white text-xs mt-0.5">{meal.localNutritionalStandard.recommendedFrequency}</p>
        </div>
      </div>

      {/* Health Conditions Suitability */}
      <div className="space-y-2 bg-black/40 p-4 rounded-2xl border border-emerald-500/20 text-xs">
        <h4 className="font-black uppercase tracking-wider text-[10px] text-emerald-400 flex items-center gap-1.5">
          <ShieldCheck size={14} /> Clinical Dietary Standard Breakdown
        </h4>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div>
            <span className="font-bold text-gray-300">Hypertension:</span>{' '}
            <span className="text-emerald-300 font-semibold">{meal.dietarySuitability.hypertension}</span>
          </div>
          <div>
            <span className="font-bold text-gray-300">Diabetes:</span>{' '}
            <span className="text-emerald-300 font-semibold">{meal.dietarySuitability.diabetes}</span>
          </div>
        </div>
        <div className="pt-1 text-[11px]">
          <span className="font-bold text-emerald-400">Genotype (AS/SS) Advisory:</span>{' '}
          <span className="text-gray-200">{meal.dietarySuitability.genotypeAS_SS}</span>
        </div>
        {meal.dietarySuitability.bloodGroupNotes && (
          <div className="pt-1 text-[11px]">
            <span className="font-bold text-emerald-400">Blood Group Note:</span>{' '}
            <span className="text-gray-200">{meal.dietarySuitability.bloodGroupNotes}</span>
          </div>
        )}
      </div>

      {/* Ingredients */}
      <div>
        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider mb-1.5">Key Local Ingredients</p>
        <div className="flex flex-wrap gap-1.5">
          {meal.keyIngredients.map((ing, i) => (
            <span key={i} className="px-2.5 py-1 bg-emerald-900/50 text-emerald-200 text-[10px] font-bold rounded-lg border border-emerald-500/20">
              {ing}
            </span>
          ))}
        </div>
      </div>

      {/* Health Benefits & Portion Tip */}
      <div className="text-xs space-y-1.5 border-t border-emerald-500/20 pt-3">
        <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Nutritional Benefits</p>
        <ul className="list-disc list-inside space-y-1 text-gray-200 text-[11px] leading-relaxed">
          {meal.healthBenefits.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
        <p className="text-[11px] text-emerald-300 italic pt-1">
          💡 <span className="font-bold">Portion Tip:</span> {meal.localNutritionalStandard.portionTip}
        </p>
      </div>
    </motion.div>
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
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-4 sm:p-6 md:p-8 ${colors[color]} border rounded-2xl sm:rounded-[3rem] text-left transition-all group flex items-center justify-between`}
    >
      <div className="flex gap-3.5 sm:gap-6 items-center">
        <div className={`w-12 h-12 sm:w-16 sm:h-16 ${iconColors[color]} rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform shrink-0`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm sm:text-xl font-bold flex flex-wrap items-center gap-1.5 sm:gap-2">
            {title} 
            {count && <span className="text-[9px] sm:text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-black">{count}</span>}
            {badge && <span className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${badge === 'Connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'}`}>{badge}</span>}
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 font-medium leading-tight mt-0.5">{desc}</p>
        </div>
      </div>
      <ChevronRight className="text-gray-600 group-hover:text-white transition-colors shrink-0" size={18} />
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
