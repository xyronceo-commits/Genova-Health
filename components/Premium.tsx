import React from 'react';
import { Sparkles, Check, Zap, Shield, ChevronLeft, ArrowRight, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
  onUpdate: (updated: UserProfile) => void;
}

const Premium: React.FC<Props> = ({ user, onUpdate }) => {
  const navigate = useNavigate();

  const unlockedFeatures = [
    { title: 'NutriScan™ Pro', desc: 'Unlimited AI camera food & calorie analysis.', icon: <Zap className="text-amber-500" /> },
    { title: 'All Genova AI Coaches', desc: 'Unlimited conversations with Nurse, Nutritionist, Fitness, Symptom, Family & Mental health coaches.', icon: <Shield className="text-blue-500" /> },
    { title: 'Live Bluetooth Wearables', desc: 'Connect smartwatches and fitness bands for live biometrics.', icon: <Sparkles className="text-pink-500" /> },
    { title: 'Family & Pediatric Care', desc: 'Pediatric care AI advice and family health guidance.', icon: <Check className="text-green-500" /> },
    { title: 'Camera Bio-Scan', desc: 'Real-time PPG finger pulse & oxygen camera analysis.', icon: <Heart className="text-red-500" /> },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-12 transition-colors">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-30 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-700 dark:text-gray-200">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2 text-gray-900 dark:text-white">
          <Sparkles className="text-blue-500" size={20} />
          Genova Features
        </h1>
        <div className="w-9" />
      </header>

      <div className="max-w-xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-4 pt-6">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/20">
            <Check size={40} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">100% Free & Unlocked</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-md mx-auto text-balance">
            All Genova Health features, AI coaches, camera scans, and wearable sync options are completely free for all users.
          </p>
        </div>

        {/* Features List */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
           <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Included Full Features</h3>
           <ul className="space-y-6">
              {unlockedFeatures.map((f, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl shrink-0">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white tracking-tight">{f.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
           </ul>
        </div>

        <div>
          <button 
            onClick={() => navigate('/')}
            className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-500/20"
          >
            Go to Dashboard <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Premium;
