
import React, { useEffect, useState } from 'react';
import { UserProfile, HealthMetrics } from '../types';
import { STORAGE_KEYS } from '../constants';
import { auth, getHealthHistory } from '../services/firebase';
import { Activity, Footprints, Heart, Droplets, Utensils, Zap, ChevronRight, MapPin, ClipboardList, Pill, Brain, Watch, Baby, Sun, Moon, Crown, Lock, Play } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Link, useNavigate } from 'react-router-dom';

interface Props { 
  user: UserProfile; 
  isDarkMode: boolean; 
  toggleDarkMode: () => void; 
}

const Dashboard: React.FC<Props> = ({ user, isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HealthMetrics[]>([]);
  const [steps, setSteps] = useState(0);
  const [location, setLocation] = useState('Lagos, Nigeria');

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
          // Fallback to local storage
          const storedHistory = localStorage.getItem(STORAGE_KEYS.HEALTH_HISTORY);
          if (storedHistory) setHistory(JSON.parse(storedHistory));
        }
      } else {
        const storedHistory = localStorage.getItem(STORAGE_KEYS.HEALTH_HISTORY);
        if (storedHistory) setHistory(JSON.parse(storedHistory));
      }
    };

    fetchHistory();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation(`${pos.coords.latitude.toFixed(2)}°N, ${pos.coords.longitude.toFixed(2)}°E`);
      });
    }

    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (acc?.x && acc?.y && acc?.z) {
        const totalAcc = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2);
        if (totalAcc > 12) setSteps(prev => prev + 1);
      }
    };
    window.addEventListener('devicemotion', handleMotion);
    return () => window.removeEventListener('devicemotion', handleMotion);
  }, []);

  const lastMetric = history[history.length - 1] || { heartRate: 72, bloodPressure: '120/80', stressLevel: 'Low' };
  const stepGoal = user.stepGoal || 10000;
  const stepProgress = Math.min(100, Math.round((steps / stepGoal) * 100));

  const isPremium = user.subscriptionStatus === 'premium';

  return (
    <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            Welcome, {user.fullName.split(' ')[0]} 👋
            {isPremium && <Crown className="text-amber-500" size={24} />}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Genotype: <span className="text-blue-600 font-bold">{user.genotype}</span> • Blood Group: <span className="text-red-600 font-bold">{user.bloodGroup}</span></p>
          <button 
            onClick={() => navigate('/showcase')}
            className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full border border-blue-100 dark:border-blue-800"
          >
            <Play size={14} className="fill-current" /> Watch Intro Showreel
          </button>
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

      {/* Premium Upgrade Banner */}
      {!isPremium && (
        <Link to="/premium" className="block bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 text-white overflow-hidden relative group">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Crown size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Genova Gold Upgrade</h2>
                <p className="text-white/80 text-sm">Unlock NutriScan, Wearables & Family features.</p>
              </div>
            </div>
            <div className="bg-white text-amber-600 px-6 py-2 rounded-xl font-bold text-sm group-hover:scale-105 transition-transform text-center flex items-center gap-2">
              Upgrade Now <ChevronRight size={14} />
            </div>
          </div>
          <Crown className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
        </Link>
      )}

      {/* Wearable Banner (Locked for Free) */}
      <div 
        onClick={() => !isPremium ? navigate('/premium') : navigate('/wearables')}
        className={`cursor-pointer block ${isPremium ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'} rounded-3xl p-6 text-white overflow-hidden relative group`}
      >
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 ${isPremium ? 'bg-white/20' : 'bg-black/20'} rounded-2xl flex items-center justify-center backdrop-blur-md`}>
              <Watch size={24} className={!isPremium ? 'text-gray-500' : 'text-white'} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${!isPremium ? 'text-gray-600 dark:text-gray-400' : 'text-white'}`}>
                Link Smartwatch
                {!isPremium && <span className="ml-2 text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full">GOLD</span>}
              </h2>
              <p className={isPremium ? 'text-white/80 text-sm' : 'text-gray-400 text-sm'}>
                {isPremium ? 'Sync biometric data automatically for better insights.' : 'Premium feature. Connect your fitness device.'}
              </p>
            </div>
          </div>
          <div className={`${isPremium ? 'bg-white text-indigo-600' : 'bg-gray-300 dark:bg-gray-700 text-gray-500'} px-6 py-2 rounded-xl font-bold text-sm group-hover:scale-105 transition-transform text-center`}>
            {isPremium ? 'Connect Now' : 'Upgrade to Unlock'}
          </div>
        </div>
        <Watch className={`absolute -right-8 -bottom-8 w-48 h-48 ${isPremium ? 'text-white/5' : 'text-gray-500/5'} rotate-12`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Heart Rate" value={`${lastMetric.heartRate} BPM`} sub="Resting" icon={<Heart className="text-red-500" />} trend="+2%" color="bg-red-50 dark:bg-red-900/20" />
        <MetricCard title="Steps" value={steps.toLocaleString()} sub={`Goal: ${stepGoal.toLocaleString()}`} icon={<Footprints className="text-green-500" />} trend={`${stepProgress}%`} color="bg-green-50 dark:bg-green-900/20" />
        <MetricCard title="Stress Level" value={lastMetric.stressLevel} sub="Based on scan" icon={<Zap className="text-yellow-500" />} trend="Normal" color="bg-yellow-50 dark:bg-yellow-900/20" />
        <MetricCard title="Blood Pressure" value={lastMetric.bloodPressure} sub="Latest check" icon={<Activity className="text-blue-500" />} trend="Steady" color="bg-blue-50 dark:bg-blue-900/20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <h2 className="text-xl font-bold mb-6 dark:text-white">Weekly Activity</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="hr" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" />
                </AreaChart>
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
               locked={!isPremium}
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

const chartData = [
  { name: 'Mon', hr: 65 }, { name: 'Tue', hr: 72 }, { name: 'Wed', hr: 68 },
  { name: 'Thu', hr: 85 }, { name: 'Fri', hr: 77 }, { name: 'Sat', hr: 64 }, { name: 'Sun', hr: 70 },
];

export default Dashboard;
