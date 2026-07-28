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
  const [lastMotionIntensity, setLastMotionIntensity] = useState(0);
  const [syncedDevice, setSyncedDevice] = useState<any>(null);
  const [activeMetricTab, setActiveMetricTab] = useState<BiometricTab>('all');

  const [location, setLocation] = useState('Lagos, Nigeria');
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyHospitals, setNearbyHospitals] = useState<any[]>([]);
  const [isFindingHospitals, setIsFindingHospitals] = useState(false);

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
          const result = await ai.findHospitals(latitude, longitude, placeName);
          if (result && result.hospitals) {
            setNearbyHospitals(result.hospitals);
          }
        } catch (e) {
          console.error("Auto location search error:", e);
        }
      }, null, { timeout: 10000, enableHighAccuracy: true });
    }

    // High-Precision Pedometer & Device Motion Sensor Integration
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

        setLastMotionIntensity(Math.min(100, Math.round((filteredAcc / 22) * 100)));

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

  const requestMotionPermission = async () => {
    if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
      try {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === 'granted') {
          setSensorActive(true);
        } else {
          alert('Device motion sensor permission was denied.');
        }
      } catch (err) {
        console.error("Error requesting motion permission:", err);
      }
    } else {
      setSensorActive(true);
    }
  };

  const simulateWalkSteps = (delta: number = 50) => {
    setSteps(prev => {
      const next = prev + delta;
      localStorage.setItem('genova_daily_steps', next.toString());
      return next;
    });
    setSensorActive(true);
    setLastMotionIntensity(85);
    setTimeout(() => setLastMotionIntensity(10), 800);
  };

  const lastMetric = history.length > 0 ? history[history.length - 1] : null;
  const stepGoal = user.stepGoal || 10000;
  const stepProgress = Math.min(100, Math.round((steps / stepGoal) * 100));
  const isPremium = true;

  // Build last 7 days biometric trend data
  const chartData = generateBiometricTrendData(history);

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            Welcome, {user.fullName?.split(' ')[0] || 'User'} 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Genotype: <span className="text-blue-600 font-bold">{user.genotype}</span> • Blood Group: <span className="text-red-600 font-bold">{user.bloodGroup}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleDarkMode}
            className="md:hidden p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm text-gray-500 dark:text-gray-400"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 transition-colors">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg"><MapPin size={20}/></div>
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Live Location</p>
              <p className="text-sm font-bold dark:text-gray-100">{location}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Wearable Banner */}
      <div 
        onClick={() => navigate('/wearables')}
        className="cursor-pointer block bg-indigo-600 rounded-3xl p-6 text-white overflow-hidden relative group"
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Watch size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {syncedDevice?.connected ? `Connected: ${syncedDevice.name}` : 'Link Smartwatch'}
                {syncedDevice?.connected && <CheckCircle2 size={16} className="text-emerald-400" />}
              </h2>
              <p className="text-white/80 text-sm">
                {syncedDevice?.connected 
                  ? 'Active Bluetooth telemetry stream • Biometrics synced every 10 minutes.' 
                  : 'Sync biometric data automatically for live clinical trends.'}
              </p>
            </div>
          </div>
          <div className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold text-sm group-hover:scale-105 transition-transform text-center">
            {syncedDevice?.connected ? 'Manage Device' : 'Connect Now'}
          </div>
        </div>
        <Watch className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
      </div>

      {/* Metrics Grid including Sensor Step Counter */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Heart Rate" 
          value={lastMetric?.heartRate ? `${lastMetric.heartRate} BPM` : '--'} 
          sub={lastMetric ? "Resting Wearable Pulse" : "No readings logged"} 
          icon={<Heart className="text-red-500" />} 
          trend={lastMetric ? "+2%" : "Zero Start"} 
          color="bg-red-50 dark:bg-red-900/20" 
        />
        
        {/* Step Counter Card with Device Sensor Integration */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:scale-[1.02] relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="p-3 rounded-2xl bg-green-50 dark:bg-green-900/20 text-green-500">
              <Footprints size={24} />
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Radio size={10} className="animate-pulse" /> {sensorActive ? 'Sensor Live' : 'Pedometer Ready'}
              </span>
              <span className="text-[10px] font-bold text-gray-400">{stepProgress}% Goal</span>
            </div>
          </div>

          <div>
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
              Step Counter
            </h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-baseline gap-2">
              {steps.toLocaleString()}
              <span className="text-xs text-gray-400 font-medium">steps</span>
            </p>
            
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stepProgress}%` }}
              />
            </div>

            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Smartphone size={12} className="text-emerald-500" />
                {sensorActive ? 'Device Accelerometer' : 'Built-in Hardware'}
              </span>
            </div>
          </div>
        </div>

        <MetricCard 
          title="Stress Level" 
          value={lastMetric?.stressLevel || '--'} 
          sub={lastMetric ? "Biometric Scan" : "No readings logged"} 
          icon={<Zap className="text-yellow-500" />} 
          trend={lastMetric ? "Normal" : "Zero Start"} 
          color="bg-yellow-50 dark:bg-yellow-900/20" 
        />
        <MetricCard 
          title="Blood Pressure" 
          value={lastMetric?.bloodPressure || '--'} 
          sub={lastMetric ? "Latest check" : "No readings logged"} 
          icon={<Activity className="text-blue-500" />} 
          trend={lastMetric ? "Steady" : "Zero Start"} 
          color="bg-blue-50 dark:bg-blue-900/20" 
        />
      </div>

      {/* Emergency Care Finder */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/20 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl">
              <Navigation size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">Emergency Center Locator</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quickly locate the nearest medical facilities.</p>
            </div>
          </div>
          <button
            onClick={findHospitals}
            disabled={isFindingHospitals}
            className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isFindingHospitals ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            {isFindingHospitals ? "Finding..." : "Find Nearest"}
          </button>
        </div>

        {nearbyHospitals.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            {nearbyHospitals.map((hospital, i) => (
              <a 
                key={i}
                href={hospital.uri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hospital.name} ${hospital.address || ''}`)}`}
                target="_blank"
                rel="no-referrer"
                className="group p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">{hospital.name}</h3>
                  <ChevronRight size={14} className="text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{hospital.address}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {hospital.distance && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                      <Navigation size={10} className="rotate-45" /> {hospital.distance}
                    </span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600/80 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">Emergency</span>
                  {hospital.specialty && <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{hospital.specialty}</span>}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center bg-gray-50 dark:bg-gray-900/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400 mb-3">
              <Navigation size={20} />
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Click "Find Nearest" to scan your current area for hospitals.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Recharts Line Graph: Synced Wearables 7-Day Biometric Trends */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold dark:text-white">Synced Wearable Biometrics</h2>
                  <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Last 7 Days
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Continuous multi-metric biometric trends synced from your wearable sensor suite.
                </p>
              </div>

              {/* Metric filter buttons */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-2xl overflow-x-auto text-[11px] font-bold">
                <button
                  onClick={() => setActiveMetricTab('all')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${activeMetricTab === 'all' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  All Trends
                </button>
                <button
                  onClick={() => setActiveMetricTab('steps')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${activeMetricTab === 'steps' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-500 hover:text-emerald-500'}`}
                >
                  Steps
                </button>
                <button
                  onClick={() => setActiveMetricTab('bp')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${activeMetricTab === 'bp' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-blue-500'}`}
                >
                  BP
                </button>
                <button
                  onClick={() => setActiveMetricTab('stress')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${activeMetricTab === 'stress' ? 'bg-amber-500 text-white shadow-sm' : 'text-gray-500 hover:text-amber-500'}`}
                >
                  Stress
                </button>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#f3f4f6'} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af', fontSize: 12 }} 
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode ? '1px solid #374151' : '1px solid #f3f4f6',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                      color: isDarkMode ? '#ffffff' : '#111827'
                    }}
                    formatter={(value: any, name: any) => {
                      if (name === 'Heart Rate (BPM)') return [`${value} BPM`, name];
                      if (name === 'Steps') return [`${value.toLocaleString()} steps`, name];
                      if (name === 'Steps (k)') return [`${value}k steps`, name];
                      if (name === 'Systolic BP (mmHg)') return [`${value} mmHg`, name];
                      if (name === 'Stress Level (%)') return [`${value}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '15px', fontSize: '12px', fontWeight: 'bold' }}
                  />

                  {(activeMetricTab === 'all' || activeMetricTab === 'hr') && (
                    <Line 
                      type="monotone" 
                      dataKey="hr" 
                      name="Heart Rate (BPM)" 
                      stroke="#ef4444" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#ffffff' }} 
                      activeDot={{ r: 7 }} 
                    />
                  )}

                  {(activeMetricTab === 'all' || activeMetricTab === 'steps') && (
                    <Line 
                      type="monotone" 
                      dataKey={activeMetricTab === 'all' ? 'stepsScaled' : 'steps'} 
                      name={activeMetricTab === 'all' ? 'Steps (k)' : 'Steps'} 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} 
                      activeDot={{ r: 7 }} 
                    />
                  )}

                  {(activeMetricTab === 'all' || activeMetricTab === 'bp') && (
                    <Line 
                      type="monotone" 
                      dataKey="bp" 
                      name="Systolic BP (mmHg)" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }} 
                      activeDot={{ r: 7 }} 
                    />
                  )}

                  {(activeMetricTab === 'all' || activeMetricTab === 'stress') && (
                    <Line 
                      type="monotone" 
                      dataKey="stress" 
                      name="Stress Level (%)" 
                      stroke="#f59e0b" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }} 
                      activeDot={{ r: 7 }} 
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <CoachLink name="Symptom Checker" sub="Analyze how you feel" icon={<ClipboardList size={20}/>} to="/assistant/symptom" color="text-red-600" bg="bg-red-50 dark:bg-red-900/20"/>
             <CoachLink name="Prescription AI" sub="Drug usage & safety" icon={<Pill size={20}/>} to="/assistant/prescription" color="text-indigo-600" bg="bg-indigo-50 dark:bg-indigo-900/20"/>
             <CoachLink 
               name="Family Health" 
               sub="Baby & Pediatric care" 
               icon={<Baby size={20}/>} 
               to="/assistant/family" 
               color="text-pink-600" 
               bg="bg-pink-50 dark:bg-pink-900/20"
             />
             <CoachLink name="Wellness Guide" sub="Mental health support" icon={<Brain size={20}/>} to="/assistant/mental" color="text-purple-600" bg="bg-purple-50 dark:bg-purple-900/20"/>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold dark:text-white px-1">Genova AI Coaches</h2>
          <div className="grid grid-cols-1 gap-4">
             <CoachLink name="Nurse Genova" sub="General medical FAQ" icon={<Droplets size={20}/>} to="/assistant/nurse" color="text-blue-600" bg="bg-blue-50 dark:bg-blue-900/20"/>
             <CoachLink name="Nutritionist" sub="Genotype-specific diet" icon={<Utensils size={20}/>} to="/assistant/nutritionist" color="text-orange-600" bg="bg-orange-50 dark:bg-orange-900/20"/>
             <CoachLink name="Fitness Coach" sub="Tailored workout plans" icon={<Activity size={20}/>} to="/assistant/fitness" color="text-green-600" bg="bg-green-50 dark:bg-green-900/20"/>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{title: string, value: string, sub: string, icon: React.ReactNode, trend: string, color: string}> = ({ title, value, sub, icon, trend, color }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:scale-[1.02] cursor-pointer">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${color}`}>{icon}</div>
      <span className="text-[10px] font-bold text-gray-400 tracking-tighter">{trend}</span>
    </div>
    <div>
      <h3 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
    </div>
  </div>
);

const CoachLink: React.FC<{name: string, sub: string, icon: React.ReactNode, to: string, color: string, bg: string, locked?: boolean}> = ({ name, sub, icon, to, color, bg, locked }) => (
  <Link to={locked ? "/premium" : to} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all group overflow-hidden relative">
    <div className="flex items-center gap-4 relative z-10">
      <div className={`w-12 h-12 ${bg} ${color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${locked ? 'opacity-50 grayscale' : ''}`}>
        {icon}
      </div>
      <div>
        <h4 className={`font-bold text-sm flex items-center gap-2 ${locked ? 'text-gray-400' : 'text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors'}`}>
          {name}
          {locked && <Crown className="text-amber-500" size={12} />}
        </h4>
        <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
    </div>
    {locked ? <Lock size={16} className="text-gray-300 dark:text-gray-600" /> : <ChevronRight className="text-gray-300 dark:text-gray-600 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" size={18} />}
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
