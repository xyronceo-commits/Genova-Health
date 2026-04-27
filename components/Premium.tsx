
import React, { useState } from 'react';
import { Crown, Check, Zap, Shield, Sparkles, CreditCard, Apple, Wallet, ChevronLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
  onUpdate: (updated: UserProfile) => void;
}

const Premium: React.FC<Props> = ({ user, onUpdate }) => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
  const [loading, setLoading] = useState(false);

  const monthlyPrice = 99.99;
  const annualPrice = 1099.99;
  const savings = (monthlyPrice * 12 - annualPrice).toFixed(2);

  const handleUpgrade = () => {
    setLoading(true);
    // Simulate payment processing
    setTimeout(() => {
      onUpdate({ ...user, subscriptionStatus: 'premium' });
      setLoading(false);
      navigate('/');
    }, 2000);
  };

  const features = [
    { title: 'NutriScan™ Pro', desc: 'Unlimited AI food and calorie analysis via camera.', icon: <Zap className="text-amber-500" /> },
    { title: 'Wearable Sync', desc: 'Real-time biometric tracking from your smart devices.', icon: <Shield className="text-blue-500" /> },
    { title: 'Family Health', desc: 'Manage medical profiles for your children and spouse.', icon: <Sparkles className="text-pink-500" /> },
    { title: 'Priority Nurse', desc: 'Faster AI response times and deeper clinical insights.', icon: <Check className="text-green-500" /> },
    { title: 'Export Data', desc: 'Generate PDF health reports for your physical doctor.', icon: <Check className="text-indigo-500" /> },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 transition-colors md:pl-20">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-30 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-2xl">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
          <Crown className="text-amber-500" size={20} />
          Genova Gold
        </h1>
        <div className="w-10"></div>
      </header>

      <div className="max-w-xl mx-auto p-6 space-y-12">
        <div className="text-center space-y-4 pt-10">
          <div className="w-20 h-20 bg-amber-500 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/20">
            <Crown size={40} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Upgrade Your Health</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Unlock the full potential of your intelligent companion.</p>
        </div>

        {/* Billing Switcher */}
        <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl flex items-center relative transition-colors">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-blue-600 bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('annually')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all relative z-10 ${billingCycle === 'annually' ? 'text-blue-600 bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400'}`}
          >
            Annually
            <span className="absolute -top-3 -right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full border-2 border-white dark:border-gray-800">SAVE ${savings}</span>
          </button>
        </div>

        {/* Pricing Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 space-y-6">
            <div>
              <p className="text-blue-100 font-bold uppercase tracking-widest text-[10px] mb-2">Genova Gold Plan</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold tracking-tight">${billingCycle === 'monthly' ? monthlyPrice : annualPrice}</span>
                <span className="text-blue-200 font-medium">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </div>
            </div>
            
            <div className="h-px bg-white/10" />
            
            <ul className="space-y-4">
              {features.map((f, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <div className="bg-white/20 p-1 rounded-lg text-white">
                    <Check size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{f.title}</p>
                    <p className="text-[10px] text-blue-100/70">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <Crown className="absolute -right-12 -top-12 w-64 h-64 text-white/5 rotate-12" />
        </div>

        {/* Payment Methods */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Secure Checkout</h3>
          <div className="grid grid-cols-1 gap-3">
             <button 
               disabled={loading}
               onClick={handleUpgrade}
               className="w-full bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
             >
               {loading ? <div className="w-6 h-6 border-4 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin" /> : (
                 <>
                   <Apple size={24} /> Pay with Apple Pay
                 </>
               )}
             </button>
             <button 
               disabled={loading}
               onClick={handleUpgrade}
               className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
             >
               {loading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : (
                 <>
                   <CreditCard size={24} /> Credit or Debit Card
                 </>
               )}
             </button>
             <div className="flex justify-center gap-6 mt-4 opacity-30">
               <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                 <Shield size={12} /> Encrypted
               </div>
               <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                 <Wallet size={12} /> Google Pay
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
