import React, { useEffect, useState } from 'react';
import { UserProfile, HealthMetrics } from '../types';
import { STORAGE_KEYS } from '../constants';
import { auth, getHealthHistory } from '../services/firebase';
import { ai } from '../services/ai';
import { 
  Activity, Footprints, Heart, Droplets, Utensils, Zap, ChevronRight, 
  MapPin, ClipboardList, Pill, Brain, Watch, Sun, Moon, 
  CheckCircle2, Navigation, Sparkles, ScanLine
} from 'lucide-react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend
} from 'recharts';
import { Link, useNavigate } from 'react-router-dom';
import { WaterIntakeWidget } from './WaterIntakeWidget';
import { MoodTrackerWidget } from './MoodTrackerWidget';
import { 
  DashboardHeroIllustration, 
  VitalsTelemetryIllustration, 
  HealthScanIllustration, 
  EmptyStateIllustration, 
  SOSIllustration 
} from './OptixiaIllustrations';

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
    const saved = localStorage.getItem('optixia_daily_steps') || localStorage.getItem('genova_daily_steps');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [syncedDevice, setSyncedDevice] = useState<any>(null);
  const [activeMetricTab, setActiveMetricTab] = useState<BiometricTab>('all');
  const [showDetailedTrends, setShowDetailedTrends] = useState(false);
  const [showEmergencyFinder, setShowEmergencyFinder] = useState(false);

  const [location, setLocation] = useState('Location Enabled');
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
            localStorage.setItem('optixia_daily_steps', next.toString());
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

  const chartData = generateBiometricTrendData(history);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* Greeting Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-gray-800">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{getGreeting()}, {user.fullName?.split(' ')[0] || 'Friend'}</span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/50">
              {user.bloodGroup || 'A+'} • {user.genotype || 'AA'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            How are you feeling today? Here is your Optixia health overview.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="bg-slate-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <MapPin size={14} className="text-blue-600 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[160px]">{location}</span>
          </div>
        </div>
      </header>

      {/* Hero Health Overview Card */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-5 sm:p-7 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold text-white">
              <Sparkles size={14} />
              <span>Optixia Health Status: Optimal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
              "Your physiological recovery is balanced today."
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed font-medium">
              Resting heart rate and biometric signals are steady. Maintain your hydration and daily movement goals.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                onClick={() => navigate('/scan')}
                className="px-4 py-2.5 bg-white text-blue-600 font-extrabold text-xs rounded-xl hover:bg-blue-50 transition-all shadow-xs flex items-center gap-2 active:scale-95"
              >
                <ScanLine size={16} />
                <span>Start Health Scan</span>
              </button>

              <button
                onClick={() => navigate('/assistant/nurse')}
                className="px-4 py-2.5 bg-blue-800/80 hover:bg-blue-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 active:scale-95 border border-white/10"
              >
                <Brain size={16} />
                <span>Ask AI Nurse</span>
              </button>
            </div>
          </div>

          <div className="hidden sm:flex shrink-0 justify-center">
            <DashboardHeroIllustration className="w-44 h-44 drop-shadow-md" />
          </div>
        </div>
      </section>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Key Health Metrics Grid */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Key Biometrics
              </h2>

              <button
                onClick={() => setShowDetailedTrends(!showDetailedTrends)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 py-1"
              >
                {showDetailedTrends ? "Hide Trends" : "View 7-Day Trends"}
                <ChevronRight size={14} className={`transition-transform ${showDetailedTrends ? 'rotate-90' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard 
                title="Heart Rate" 
                value={lastMetric?.heartRate ? `${lastMetric.heartRate} BPM` : '72 BPM'} 
                sub="Normal resting rate" 
                icon={<Heart className="text-blue-600" size={18} />} 
              />
              
              <MetricCard 
                title="Daily Steps" 
                value={steps.toLocaleString()} 
                sub={`Goal: ${stepGoal.toLocaleString()}`} 
                icon={<Footprints className="text-blue-600" size={18} />} 
              />

              <MetricCard 
                title="Stress Level" 
                value={lastMetric?.stressLevel || 'Low'} 
                sub="Optimal balance" 
                icon={<Zap className="text-blue-600" size={18} />} 
              />

              <MetricCard 
                title="Blood Pressure" 
                value={lastMetric?.bloodPressure || '120/80'} 
                sub="Normal arterial" 
                icon={<Activity className="text-blue-600" size={18} />} 
              />
            </div>
          </section>

          {/* Expandable 7-Day Biometric Trends Section */}
          {showDetailedTrends && (
            <section className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-xs space-y-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <VitalsTelemetryIllustration className="w-12 h-12 shrink-0 hidden sm:block" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">7-Day Biometric Telemetry</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Historical trends synced from health tracking & wearable devices</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-700 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setActiveMetricTab('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeMetricTab === 'all' ? 'bg-white dark:bg-gray-800 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveMetricTab('steps')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeMetricTab === 'steps' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    Steps
                  </button>
                  <button
                    onClick={() => setActiveMetricTab('bp')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${activeMetricTab === 'bp' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
                  >
                    BP
                  </button>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f1f5f9'} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                        border: isDarkMode ? '1px solid #374151' : '1px solid #e2e8f0',
                        fontSize: '12px',
                        color: isDarkMode ? '#ffffff' : '#0f172a'
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontWeight: 'bold' }} />

                    {(activeMetricTab === 'all' || activeMetricTab === 'hr') && (
                      <Line type="monotone" dataKey="hr" name="Heart Rate" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                    )}
                    {(activeMetricTab === 'all' || activeMetricTab === 'steps') && (
                      <Line type="monotone" dataKey={activeMetricTab === 'all' ? 'stepsScaled' : 'steps'} name="Steps" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                    )}
                    {(activeMetricTab === 'all' || activeMetricTab === 'bp') && (
                      <Line type="monotone" dataKey="bp" name="Systolic BP" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 3 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}



        </div>

        {/* Right Column (4/12) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Daily Trackers */}
          <div className="space-y-4">
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white px-1">
              Daily Hydration & Mood
            </h2>

            <WaterIntakeWidget uid={auth.currentUser?.uid || user.fullName || 'guest'} />
            <MoodTrackerWidget uid={auth.currentUser?.uid || user.fullName || 'guest'} />
          </div>

          {/* Emergency Locator */}
          <section className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                  <Navigation size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Emergency Locator</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Find nearest ERs</p>
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
                className="px-3 py-1.5 bg-blue-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
              >
                {isFindingHospitals ? "Locating..." : showEmergencyFinder ? "Hide" : "Find Nearby"}
              </button>
            </div>

            {showEmergencyFinder && nearbyHospitals.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-gray-700 max-h-56 overflow-y-auto custom-scrollbar">
                {nearbyHospitals.map((hospital, i) => (
                  <a 
                    key={i}
                    href={hospital.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hospital.name} ${hospital.address || ''}`)}`}
                    target="_blank"
                    rel="no-referrer"
                    className="p-2.5 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-100 dark:border-gray-700 hover:border-blue-300 transition-all text-xs block"
                  >
                    <div className="flex items-start justify-between mb-0.5">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate">{hospital.name}</h4>
                      <ChevronRight size={13} className="text-slate-400 shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{hospital.address}</p>
                  </a>
                ))}
              </div>
            )}
          </section>

        </div>

      </div>
    </div>
  );
};

const MetricCard: React.FC<{title: string, value: string, sub: string, icon: React.ReactNode}> = ({ title, value, sub, icon }) => (
  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-slate-100 dark:border-gray-700 shadow-2xs space-y-2">
    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 w-fit">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-lg font-black text-slate-900 dark:text-white mt-0.5 truncate">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">{sub}</p>
    </div>
  </div>
);

const CoachLink: React.FC<{name: string, sub: string, icon: React.ReactNode, to: string}> = ({ name, sub, icon, to }) => (
  <Link to={to} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-gray-700 hover:border-blue-300 transition-all group shadow-2xs">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
          {name}
        </h4>
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">{sub}</p>
      </div>
    </div>
    <ChevronRight className="text-slate-300 dark:text-gray-600 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5 shrink-0" size={16} />
  </Link>
);

function generateBiometricTrendData(history: HealthMetrics[]) {
  const todayIndex = new Date().getDay();
  const orderedDays: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayIdx = (todayIndex - i + 7) % 7;
    const nameMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    orderedDays.push(nameMap[dayIdx]);
  }

  return orderedDays.map((dayName, idx) => {
    const histItem = history[history.length - 7 + idx];
    if (!histItem) {
      return { name: dayName, hr: 70, steps: 5000, stepsScaled: 5, bp: 120 };
    }

    let hr = histItem.heartRate || 72;
    let steps = histItem.steps || 6000;
    let bpSystolic = 120;
    if (histItem.bloodPressure) {
      const parsed = parseInt(histItem.bloodPressure.split('/')[0], 10);
      if (!isNaN(parsed)) bpSystolic = parsed;
    }

    return {
      name: dayName,
      hr,
      steps,
      stepsScaled: parseFloat((steps / 1000).toFixed(1)),
      bp: bpSystolic
    };
  });
}

export default Dashboard;
