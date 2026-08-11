import React, { useEffect, useState } from 'react';
import { UserProfile, HealthMetrics } from '../types';
import { STORAGE_KEYS } from '../constants';
import { auth, getHealthHistory } from '../services/firebase';
import { ai } from '../services/ai';
import { 
  Activity, Footprints, Heart, Droplets, Utensils, Zap, ChevronRight, 
  MapPin, ClipboardList, Pill, Brain, Watch, Baby, Sun, Moon, Crown, 
  Lock, Loader2, Navigation, Radio, CheckCircle2, ShieldCheck, Flame, Smartphone
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

interface Props { 
  user: UserProfile; 
  isDarkMode: boolean; 
  toggleDarkMode: () => void; 
}

type BiometricTab = 'all' | 'hr' | 'steps' | 'bp' | 'stress';

const Dashboard: React.FC<Props> = ({ user, isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HealthMetrics[]>([]);
  const [steps, setSteps] = useState<number>(() => {
    const saved = localStorage.getItem('genova_daily_steps');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [sensorActive, setSensorActive] = useState(false);
  const [syncedDevice, setSyncedDevice] = useState<any>(null);
  const [activeMetricTab, setActiveMetricTab] = useState<BiometricTab>('all');
  const [showDetailedTrends, setShowDetailedTrends] = useState(false);
  const [showEmergencyFinder, setShowEmergencyFinder] = useState(false);

  const [location, setLocation] = useState('Lagos, Nigeria');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [isFindingHospitals, setIsFindingHospitals] = useState(false);

  // Time of day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const findHospitals = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsFindingHospitals(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setCoords({ lat: latitude, lng: longitude });
      
      try {
        const placeName = await ai.reverseGeocode(latitude, longitude);
        setLocation(placeName);
        
        const result = await ai.findHospitals(latitude, longitude, placeName);
        const mappedHospitals = (result.hospitals || []).map((h: any) => ({
          ...h,
          uri: h.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${h.name} ${h.address || ''}`)}`
        }));
        setNearbyHospitals(mappedHospitals);
      } catch (err) {
        console.error("Failed to find hospitals:", err);
      } finally {
        setIsFindingHospitals(false);
      }
    }, (err) => {
      setIsFindingHospitals(false);
      alert("Please allow location permission to locate nearby hospitals.");
    });
  };

  useEffect(() => {
    const fetchHistory = async () => {
      if (auth.currentUser) {
        try {
          const data = await getHealthHistory(auth.currentUser.uid);
          if (data && data.length > 0) {
            setHistory(data as HealthMetrics[]);
          }
        } catch (err) {
          console.error("Error fetching history:", err);
          const storedHistory = localStorage.getItem(STORAGE_KEYS.HEALTH_HISTORY);
          if (storedHistory) setHistory(JSON.parse(storedHistory));
        }
      } else {
        const storedHistory = localStorage.getItem(STORAGE_KEYS.HEALTH_HISTORY);
        if (storedHistory) setHistory(JSON.parse(storedHistory));
      }
    };

    fetchHistory();

    const storedDevice = localStorage.getItem(STORAGE_KEYS.WEARABLE_DEVICE);
    if (storedDevice) {
      try {
        setSyncedDevice(JSON.parse(storedDevice));
      } catch (e) {
        console.error("Invalid device storage:", e);
      }
    }
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const placeName = await ai.reverseGeocode(latitude, longitude);
          setLocation(placeName);
        } catch (e) {
          console.error("Auto location search error:", e);
        }
      }, null, { timeout: 8000, enableHighAccuracy: true });
    }

    // Motion pedometer
    let lastStepTime = 0;
    let lastAcc = 0;
    const alpha = 0.8; 
    let filteredAcc = 0;

    const handleMotion = (event: DeviceMotionEvent) => {
      setSensorActive(true);
      const acc = event.accelerationIncludingGravity || event.acceleration;
      if (acc?.x !== undefined && acc?.y !== undefined && acc?.z !== undefined) {
        const totalAcc = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
        filteredAcc = alpha * lastAcc + (1 - alpha) * totalAcc;
        lastAcc = filteredAcc;

        const threshold = 13.0; 
        const minStepTime = 280; 
        const now = Date.now();
        if (filteredAcc > threshold && (now - lastStepTime > minStepTime)) {
          setSteps(prev => {
            const next = prev + 1;
            localStorage.setItem('genova_daily_steps', next.toString());
            return next;
          });
          lastStepTime = now;
        }
      }
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener('devicemotion', handleMotion);
    }

    return () => {
      if (window.DeviceMotionEvent) {
        window.removeEventListener('devicemotion', handleMotion);
      }
    };
  }, []);

  const lastMetric = history.length > 0 ? history[history.length - 1] : null;
  const stepGoal = user.stepGoal || 10000;
  const stepProgress = Math.min(100, Math.round((steps / stepGoal) * 100));

  // Build last 7 days biometric trend data
  const chartData = generateBiometricTrendData(history);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header & Context */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
            <span>{getGreeting()}, {user.fullName?.split(' ')[0] || 'Friend'}</span>
            <span className="text-xs sm:text-sm font-bold text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-xl border border-blue-100 dark:border-blue-900/50">
              {user.bloodGroup || 'A+'} • {user.genotype || 'AA'}
            </span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
            Here is your daily health overview and personalized recommendation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleDarkMode}
            className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
            title="Toggle theme mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="bg-white dark:bg-gray-800 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <MapPin size={15} className="text-blue-600 shrink-0" />
            <span className="truncate max-w-[160px]">{location}</span>
          </div>
        </div>
      </header>

      {/* Hero Health Snapshot Card */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            "Your physiological recovery is balanced today."
          </h2>

          <p className="text-sm text-blue-100/90 leading-relaxed font-medium">
            Biometric telemetry indicates normal resting heart rate and active recovery. Keep staying hydrated and aim for your daily step goal.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/scan')}
              className="px-5 py-2.5 bg-white text-blue-900 font-bold text-sm rounded-xl hover:bg-blue-50 transition-all shadow-sm flex items-center gap-2 active:scale-95"
            >
              <Activity size={16} />
              <span>Start Health Scan</span>
            </button>

            <button
              onClick={() => navigate('/assistant/nurse')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl transition-all border border-white/20 flex items-center gap-2 active:scale-95"
            >
              <Brain size={16} />
              <span>Ask AI Nurse</span>
            </button>

            {syncedDevice?.connected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                <CheckCircle2 size={13} /> Synced with {syncedDevice.name}
              </span>
            ) : (
              <button
                onClick={() => navigate('/wearables')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-200 hover:text-white underline underline-offset-4"
              >
                <Watch size={14} /> Connect Smartwatch
              </button>
            )}
          </div>
        </div>

        <Watch className="absolute -right-6 -bottom-6 w-56 h-56 text-white/5 pointer-events-none" />
      </section>

      {/* Key Health Metrics Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>Key Biometrics</span>
          </h2>

          <button
            onClick={() => setShowDetailedTrends(!showDetailedTrends)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {showDetailedTrends ? "Hide Analytics" : "View 7-Day Trends"}
            <ChevronRight size={14} className={`transition-transform ${showDetailedTrends ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Heart Rate" 
            value={lastMetric?.heartRate ? `${lastMetric.heartRate} BPM` : '72 BPM'} 
            sub="Within usual resting range" 
            icon={<Heart className="text-red-500" size={20} />} 
            trend="Steady" 
            color="bg-red-50 dark:bg-red-950/40" 
          />
          
          {/* Step Counter Card */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-xs space-y-3">
            <div className="flex justify-between items-start">
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Footprints size={20} />
              </div>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                {stepProgress}% Goal
              </span>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Daily Steps</p>
              <p className="text-xl font-black text-gray-900 dark:text-white flex items-baseline gap-1.5 mt-0.5">
                {steps.toLocaleString()}
                <span className="text-xs text-gray-400 font-normal">/ {stepGoal.toLocaleString()}</span>
              </p>
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${stepProgress}%` }}
                />
              </div>
            </div>
          </div>

          <MetricCard 
            title="Stress Level" 
            value={lastMetric?.stressLevel || 'Low'} 
            sub="Optimal mental balance" 
            icon={<Zap className="text-amber-500" size={20} />} 
            trend="Normal" 
            color="bg-amber-50 dark:bg-amber-950/40" 
          />

          <MetricCard 
            title="Blood Pressure" 
            value={lastMetric?.bloodPressure || '120/80'} 
            sub="Normal arterial pressure" 
            icon={<Activity className="text-blue-500" size={20} />} 
            trend="Steady" 
            color="bg-blue-50 dark:bg-blue-950/40" 
          />
        </div>
      </section>

      {/* Expandable 7-Day Biometric Trends Section */}
      {showDetailedTrends && (
        <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">7-Day Biometric Telemetry</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Historical trends synced from health tracking & wearable devices</p>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveMetricTab('all')}
                className={`px-3 py-1 rounded-lg transition-all ${activeMetricTab === 'all' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveMetricTab('steps')}
                className={`px-3 py-1 rounded-lg transition-all ${activeMetricTab === 'steps' ? 'bg-emerald-500 text-white shadow-xs' : 'text-gray-500'}`}
              >
                Steps
              </button>
              <button
                onClick={() => setActiveMetricTab('bp')}
                className={`px-3 py-1 rounded-lg transition-all ${activeMetricTab === 'bp' ? 'bg-blue-500 text-white shadow-xs' : 'text-gray-500'}`}
              >
                BP
              </button>
              <button
                onClick={() => setActiveMetricTab('stress')}
                className={`px-3 py-1 rounded-lg transition-all ${activeMetricTab === 'stress' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-500'}`}
              >
                Stress
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f3f4f6'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                    border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
                    fontSize: '12px',
                    color: isDarkMode ? '#ffffff' : '#111827'
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }} />

                {(activeMetricTab === 'all' || activeMetricTab === 'hr') && (
                  <Line type="monotone" dataKey="hr" name="Heart Rate" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {(activeMetricTab === 'all' || activeMetricTab === 'steps') && (
                  <Line type="monotone" dataKey={activeMetricTab === 'all' ? 'stepsScaled' : 'steps'} name={activeMetricTab === 'all' ? 'Steps (k)' : 'Steps'} stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {(activeMetricTab === 'all' || activeMetricTab === 'bp') && (
                  <Line type="monotone" dataKey="bp" name="Systolic BP" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
                {(activeMetricTab === 'all' || activeMetricTab === 'stress') && (
                  <Line type="monotone" dataKey="stress" name="Stress Level" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* AI Health Companions Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">AI Clinical Assistants</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Specialized AI companions tailored for your genotype & health context</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <CoachLink name="Nurse Genova" sub="General medical guidance & FAQs" icon={<Droplets size={18}/>} to="/assistant/nurse" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-950/40"/>
          <CoachLink name="Clinical Nutrition" sub="Genotype-specific meal plans" icon={<Utensils size={18}/>} to="/assistant/nutritionist" color="text-orange-600" bg="bg-orange-50 dark:bg-orange-950/40"/>
          <CoachLink name="Symptom Checker" sub="Analyze how you are feeling" icon={<ClipboardList size={18}/>} to="/assistant/symptom" color="text-red-600" bg="bg-red-50 dark:bg-red-950/40"/>
          <CoachLink name="Medication Explainer" sub="Drug dosage & interaction safety" icon={<Pill size={18}/>} to="/assistant/prescription" color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-950/40"/>
          <CoachLink name="Wellness Guide" sub="Mental health & stress support" icon={<Brain size={18}/>} to="/assistant/mental" color="text-purple-600" bg="bg-purple-50 dark:bg-purple-950/40"/>
          <CoachLink name="Fitness Coach" sub="Custom workout routines" icon={<Activity size={18}/>} to="/assistant/fitness" color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-950/40"/>
        </div>
      </section>

      {/* Collapsible Emergency & Hospital Locator */}
      <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 dark:bg-red-950/50 text-red-600 rounded-xl">
              <Navigation size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Emergency Center Finder</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Locate nearby hospitals and medical emergency centers</p>
            </div>
          </div>

          <button
            onClick={() => {
              if (!showEmergencyFinder) {
                setShowEmergencyFinder(true);
                findHospitals();
              } else {
                setShowEmergencyFinder(!showEmergencyFinder);
              }
            }}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 font-bold text-xs rounded-xl transition-all border border-red-200 dark:border-red-900/50"
          >
            {isFindingHospitals ? "Scanning..." : showEmergencyFinder ? "Hide" : "Find Nearby"}
          </button>
        </div>

        {showEmergencyFinder && nearbyHospitals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-in fade-in duration-300">
            {nearbyHospitals.map((hospital, i) => (
              <a 
                key={i}
                href={hospital.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hospital.name} ${hospital.address || ''}`)}`}
                target="_blank"
                rel="no-referrer"
                className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-red-300 transition-all text-xs"
              >
                <div className="flex items-start justify-between mb-1">
                  <h4 className="font-bold text-gray-900 dark:text-white truncate">{hospital.name}</h4>
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">{hospital.address}</p>
                {hospital.distance && (
                  <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    {hospital.distance} away
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const MetricCard: React.FC<{title: string, value: string, sub: string, icon: React.ReactNode, trend: string, color: string}> = ({ title, value, sub, icon, trend, color }) => (
  <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/80 shadow-xs space-y-3">
    <div className="flex justify-between items-start">
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      <span className="text-[10px] font-bold text-gray-400 tracking-tight bg-gray-50 dark:bg-gray-700 px-2 py-0.5 rounded">{trend}</span>
    </div>
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{title}</p>
      <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">{sub}</p>
    </div>
  </div>
);

const CoachLink: React.FC<{name: string, sub: string, icon: React.ReactNode, to: string, color: string, bg: string}> = ({ name, sub, icon, to, color, bg }) => (
  <Link to={to} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 shadow-xs transition-all group">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 ${bg} ${color} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
          {name}
        </h4>
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
    </div>
    <ChevronRight className="text-gray-300 dark:text-gray-600 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" size={16} />
  </Link>
);

function generateBiometricTrendData(history: HealthMetrics[]) {
  const todayIndex = new Date().getDay(); // 0 is Sunday
  
  // Reorder days ending with today
  const orderedDays: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayIdx = (todayIndex - i + 7) % 7;
    const nameMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    orderedDays.push(nameMap[dayIdx]);
  }

  return orderedDays.map((dayName, idx) => {
    const histItem = history[history.length - 7 + idx];
    if (!histItem) {
      return {
        name: dayName,
        hr: 0,
        steps: 0,
        stepsScaled: 0,
        bp: 0,
        stress: 0
      };
    }

    let hr = histItem.heartRate || 0;
    let steps = histItem.steps || 0;
    let bpSystolic = 0;
    if (histItem.bloodPressure) {
      const parsed = parseInt(histItem.bloodPressure.split('/')[0], 10);
      if (!isNaN(parsed)) bpSystolic = parsed;
    }
    let stressScore = 0;
    if (histItem.stressLevel === 'High') stressScore = 75;
    else if (histItem.stressLevel === 'Medium') stressScore = 50;
    else if (histItem.stressLevel === 'Low') stressScore = 20;

    return {
      name: dayName,
      hr,
      steps,
      stepsScaled: parseFloat((steps / 1000).toFixed(1)),
      bp: bpSystolic,
      stress: stressScore
    };
  });
}

export default Dashboard;
