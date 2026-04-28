import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, Shield, Sparkles, CreditCard, Apple, Wallet, ChevronLeft, ArrowRight, Loader2, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';

interface Props {
  user: UserProfile;
  onUpdate: (updated: UserProfile) => void;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number;
}

const Premium: React.FC<Props> = ({ user, onUpdate }) => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');
  const [tier, setTier] = useState<'silver' | 'gold'>('gold');
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState<CurrencyInfo>({ code: 'USD', symbol: '$', rate: 1 });
  const [detectingCurrency, setDetectingCurrency] = useState(true);

  const silverMonthly = 25;
  const goldMonthly = 50;

  useEffect(() => {
    const detectCurrency = async () => {
      try {
        // Try to get region based on IP for currency detection
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        const detectedCurrency = data.currency || 'USD';
        
        // Fetch exchange rates
        const rateRes = await fetch(`https://open.er-api.com/v6/latest/USD`);
        const rateData = await rateRes.json();
        
        const rate = rateData.rates[detectedCurrency] || 1;
        const symbol = new Intl.NumberFormat('en-US', { style: 'currency', currency: detectedCurrency }).format(0).replace(/0.00/g, '').trim();
        
        setCurrency({
          code: detectedCurrency,
          symbol,
          rate
        });
      } catch (err) {
        console.error("Currency detection failed:", err);
      } finally {
        setDetectingCurrency(false);
      }
    };
    detectCurrency();
  }, []);

  const calculatePrice = (base: number) => {
    const monthly = base * currency.rate;
    if (billingCycle === 'annually') {
      // 20% off annual total
      const annualTotal = monthly * 12 * 0.8;
      return annualTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return monthly.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handleUpgrade = () => {
    setLoading(true);
    setTimeout(() => {
      onUpdate({ ...user, subscriptionStatus: tier });
      setLoading(false);
      navigate('/');
    }, 2000);
  };

  const features = {
    silver: [
      { title: 'NutriScan™ Basic', desc: 'Up to 10 AI food analyses per day.', icon: <Zap className="text-amber-500" /> },
      { title: 'Standard Assistant', desc: 'Access to Nurse and Fitness coaches.', icon: <Shield className="text-blue-500" /> },
      { title: 'Biometric Sync', desc: 'Sync data from 1 connected device.', icon: <Check className="text-green-500" /> },
    ],
    gold: [
      { title: 'NutriScan™ Pro', desc: 'Unlimited AI food and calorie analysis.', icon: <Zap className="text-amber-500" /> },
      { title: 'All Genova Coaches', desc: 'Unlimited access to all 6 specialist AI assistants.', icon: <Shield className="text-blue-500" /> },
      { title: 'Wearable Fleet', desc: 'Sync data from unlimited devices simultaneously.', icon: <Sparkles className="text-pink-500" /> },
      { title: 'Family Health', desc: 'Manage up to 5 family medical profiles.', icon: <Check className="text-green-500" /> },
      { title: 'PDF Exporter', desc: 'Clinical health reports for your real-world doctor.', icon: <Check className="text-indigo-500" /> },
    ]
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20 transition-colors md:pl-20">
      <header className="p-6 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md z-30 border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-2xl">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
          <Crown className="text-amber-500" size={20} />
          Genova Premium
        </h1>
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-[10px] font-bold">
          <Globe size={12} /> {currency.code}
        </div>
      </header>

      <div className="max-w-xl mx-auto p-6 space-y-10">
        <div className="text-center space-y-4 pt-10">
          <div className="w-20 h-20 bg-amber-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/20">
            <Crown size={40} />
          </div>
          <h2 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Genova Premium</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto text-balance">Precision health monitoring and specialist AI guidance tailored to your genotype.</p>
        </div>

        {/* Tier Switcher */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setTier('silver')}
            className={`p-6 rounded-[2rem] border-2 text-left transition-all relative ${tier === 'silver' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-800'}`}
          >
            <p className={`font-black text-sm uppercase tracking-widest ${tier === 'silver' ? 'text-blue-600' : 'text-gray-400'}`}>Silver</p>
            <p className="text-2xl font-black mt-1">{currency.symbol}{calculatePrice(silverMonthly)}</p>
          </button>
          <button 
            onClick={() => setTier('gold')}
            className={`p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden ${tier === 'gold' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-100 dark:border-gray-800'}`}
          >
            <div className="absolute top-0 right-0 bg-amber-500 text-white text-[8px] font-black uppercase px-3 py-1 rounded-bl-xl">Popular</div>
            <p className={`font-black text-sm uppercase tracking-widest ${tier === 'gold' ? 'text-amber-600' : 'text-gray-400'}`}>Gold</p>
            <p className="text-2xl font-black mt-1">{currency.symbol}{calculatePrice(goldMonthly)}</p>
          </button>
        </div>

        {/* Billing Switcher */}
        <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-2xl flex items-center relative transition-colors">
          <button 
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-blue-600 bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setBillingCycle('annually')}
            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all relative z-10 ${billingCycle === 'annually' ? 'text-blue-600 bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-400'}`}
          >
            Annually
            <span className="ml-2 bg-green-500 text-white text-[8px] px-2 py-0.5 rounded-full uppercase italic">20% OFF</span>
          </button>
        </div>

        {/* Features List */}
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-700">
           <ul className="space-y-6">
              {features[tier].map((f, i) => (
                <li key={i} className="flex gap-5 items-start">
                  <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                    {f.icon}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white tracking-tight">{f.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
           </ul>
        </div>

        {/* Checkout Button */}
        <div className="space-y-4">
          <button 
            disabled={loading}
            onClick={handleUpgrade}
            className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 transition-all active:scale-95 shadow-2xl shadow-blue-500/30 disabled:opacity-50 group"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              <>
                Unlock {tier === 'gold' ? 'Gold' : 'Silver'} <ArrowRight className="group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </button>
          <div className="flex justify-center gap-6 opacity-30">
            <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Shield size={12} /> Secure
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Apple size={12} /> Apple Pay
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={12} /> Cards
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Premium;
