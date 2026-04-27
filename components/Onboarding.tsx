
import React, { useState } from 'react';
import { UserProfile, BloodGroup, Genotype } from '../types';
import { User, ShieldCheck, ArrowRight, Dna, Sparkles, Activity, Heart, ArrowLeft, Target, Shield, Camera, Mic, MapPin, Bluetooth, Bot, Utensils, Phone } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    fullName: '',
    age: 25,
    gender: 'male',
    bloodGroup: BloodGroup.O_POS,
    genotype: Genotype.AA,
    height: 170,
    weight: 70,
    allergies: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
    stepGoal: 10000 
  });

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(profile as UserProfile);
  };

  const stepsCount = 5;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col transition-colors overflow-hidden font-sans">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-800 z-50">
        <div 
          className="bg-blue-600 h-full transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
          style={{ width: `${(step / stepsCount) * 100}%` }} 
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-xl">
          
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* STEP 1: WELCOME & VISION */}
            {step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 text-center">
                <div className="inline-flex p-6 bg-blue-500/10 text-blue-600 rounded-[2.5rem] mb-4">
                  <Sparkles size={48} strokeWidth={1.5} />
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                    Intelligence for <br/><span className="text-blue-600">your health.</span>
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium max-w-sm mx-auto">
                    Genova is your personalized companion for clinical advice, diet planning, and vital tracking.
                  </p>
                </div>
                <div className="pt-8">
                  <button 
                    type="button" 
                    onClick={next}
                    className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-2xl shadow-blue-500/30 group"
                  >
                    Get Started
                    <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: BIO-CORE IDENTITY */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={back} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">Biological Core</span>
                </div>
                
                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                  The Foundation.
                </h2>

                <div className="space-y-6">
                  <InputGroup label="Full Name">
                    <input 
                      required
                      autoFocus
                      type="text" 
                      value={profile.fullName} 
                      onChange={e => setProfile({...profile, fullName: e.target.value})}
                      placeholder="e.g. Chinedu Okafor"
                      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-5 px-6 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-xl font-bold dark:text-white placeholder:text-gray-300"
                    />
                  </InputGroup>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Genotype">
                      <select 
                        value={profile.genotype} 
                        onChange={e => setProfile({...profile, genotype: e.target.value as Genotype})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-5 px-6 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg font-black dark:text-white appearance-none"
                      >
                        {Object.values(Genotype).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </InputGroup>
                    <InputGroup label="Blood Group">
                      <select 
                        value={profile.bloodGroup} 
                        onChange={e => setProfile({...profile, bloodGroup: e.target.value as BloodGroup})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-5 px-6 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg font-black dark:text-white appearance-none"
                      >
                        {Object.values(BloodGroup).map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </InputGroup>
                  </div>
                </div>

                <button 
                  type="button" 
                  disabled={!profile.fullName}
                  onClick={next}
                  className="w-full bg-blue-600 disabled:opacity-30 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 transition-all shadow-xl"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 3: FEATURE REVEAL */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={back} className="p-2 text-gray-400 transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">Experience</span>
                </div>

                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                  Smart Features.
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-[2.5rem] border border-orange-100 dark:border-orange-800 flex items-center gap-6">
                    <div className="w-16 h-16 bg-orange-500 text-white rounded-3xl flex items-center justify-center shadow-lg">
                      <Utensils size={32} />
                    </div>
                    <div>
                      <h4 className="font-black text-orange-950 dark:text-orange-200">NutriScan™</h4>
                      <p className="text-sm text-orange-700 dark:text-orange-400/80">Scan your meals for instant AI calorie and macro analysis tailored to your bio-profile.</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-[2.5rem] border border-blue-100 dark:border-blue-800 flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center shadow-lg">
                      <Bot size={32} />
                    </div>
                    <div>
                      <h4 className="font-black text-blue-950 dark:text-blue-200">AI Coaches</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400/80">Specialized assistants for clinical advice, fitness planning, and pediatric support.</p>
                    </div>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={next}
                  className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl transition-all"
                >
                  That's Amazing
                </button>
              </div>
            )}

            {/* STEP 4: PERMISSIONS */}
            {step === 4 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={back} className="p-2 text-gray-400 transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">Access</span>
                </div>

                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                  Enable Precision.
                </h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium -mt-4">Genova needs these to provide the best health experience.</p>

                <div className="space-y-3">
                  <PermissionRow icon={<Camera size={20}/>} title="Camera" desc="For NutriScan™ meal analysis." />
                  <PermissionRow icon={<Mic size={20}/>} title="Microphone" desc="For voice-based AI triage." />
                  <PermissionRow icon={<MapPin size={20}/>} title="Location" desc="To find nearby emergency hospitals." />
                  <PermissionRow icon={<Bluetooth size={20}/>} title="Bluetooth" desc="To sync with your smartwatch." />
                </div>

                <button 
                  type="button" 
                  onClick={next}
                  className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl transition-all shadow-xl"
                >
                  I Understand
                </button>
              </div>
            )}

            {/* STEP 5: METRICS & LAUNCH */}
            {step === 5 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={back} className="p-2 text-gray-400 transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">Finalize</span>
                </div>

                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                  Personal Body <br/>Snapshot.
                </h2>

                <div className="space-y-6 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Weight (kg)">
                      <input 
                        type="number" 
                        value={profile.weight} 
                        onChange={e => setProfile({...profile, weight: parseInt(e.target.value)})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-4 focus:ring-blue-500/20 outline-none text-xl font-black dark:text-white"
                      />
                    </InputGroup>
                    <InputGroup label="Height (cm)">
                      <input 
                        type="number" 
                        value={profile.height} 
                        onChange={e => setProfile({...profile, height: parseInt(e.target.value)})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-4 focus:ring-blue-500/20 outline-none text-xl font-black dark:text-white"
                      />
                    </InputGroup>
                  </div>

                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <Shield className="text-blue-600" size={16} />
                       <h3 className="text-xs font-black uppercase tracking-widest text-blue-900 dark:text-blue-300">Emergency Contact</h3>
                    </div>
                    <InputGroup label="Contact Name">
                      <input 
                        required
                        type="text" 
                        value={profile.emergencyContactName} 
                        onChange={e => setProfile({...profile, emergencyContactName: e.target.value})}
                        placeholder="Next of Kin Name"
                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-4 focus:ring-blue-500/20 outline-none text-lg font-bold dark:text-white placeholder:text-gray-300"
                      />
                    </InputGroup>
                    <InputGroup label="Phone Number">
                      <input 
                        required
                        type="tel" 
                        value={profile.emergencyContactPhone} 
                        onChange={e => setProfile({...profile, emergencyContactPhone: e.target.value})}
                        placeholder="+234..."
                        className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 px-6 focus:ring-4 focus:ring-blue-500/20 outline-none text-lg font-bold dark:text-white placeholder:text-gray-300"
                      />
                    </InputGroup>
                  </div>

                  <InputGroup label="Daily Step Goal">
                    <div className="flex gap-2">
                      {[5000, 10000, 15000].map(goal => (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => setProfile({...profile, stepGoal: goal})}
                          className={`flex-1 py-4 rounded-2xl font-black text-sm transition-all ${
                            profile.stepGoal === goal 
                            ? 'bg-blue-600 text-white shadow-lg' 
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                          }`}
                        >
                          {goal.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </InputGroup>
                </div>

                <div className="bg-gray-900 dark:bg-blue-900/30 p-6 rounded-[2rem] flex items-center gap-4 border border-gray-800">
                  <ShieldCheck className="text-blue-500" size={24} />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                    Data is stored locally on your device for maximum privacy.
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={!profile.emergencyContactName || !profile.emergencyContactPhone}
                  className="w-full bg-blue-600 disabled:opacity-50 text-white py-6 rounded-3xl font-black text-2xl shadow-2xl active:scale-[0.98] transition-all"
                >
                  Launch Genova AI
                </button>
              </div>
            )}

          </form>
        </div>
      </div>

      {/* Decorative Gradient Elements */}
      <div className="fixed -bottom-32 -left-32 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -top-32 -right-32 w-96 h-96 bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
};

const InputGroup: React.FC<{label: string, children: React.ReactNode}> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] ml-2">
      {label}
    </label>
    {children}
  </div>
);

const PermissionRow: React.FC<{icon: React.ReactNode, title: string, desc: string}> = ({ icon, title, desc }) => (
  <div className="flex items-center gap-5 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
    <div className="w-10 h-10 bg-white dark:bg-gray-700 text-blue-600 rounded-xl flex items-center justify-center shadow-sm">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{title}</h4>
      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{desc}</p>
    </div>
  </div>
);

export default Onboarding;
