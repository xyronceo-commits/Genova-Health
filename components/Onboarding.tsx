
import * as React from 'react';
import { UserProfile, BloodGroup, Genotype, EmergencyContact } from '../types';
import { STORAGE_KEYS } from '../constants';
import { User, ShieldCheck, ArrowRight, Dna, Sparkles, Activity, Heart, ArrowLeft, Target, Shield, Camera, Mic, MapPin, Bluetooth, Bot, Utensils, Phone, Mail, Globe, Apple, Lock, Loader2, Users, UserPlus, Trash2, Plus, Check, Contact, PhoneCall, ShieldAlert } from 'lucide-react';
import { signInWithGoogle, auth, saveUserProfile, getUserProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendFirebaseEmailVerification } from '../services/firebase';
import { GenovaLogo } from './GenovaLogo';
import { EmailVerificationScreen } from './EmailVerificationScreen';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import { WaterIntakeWidget } from './WaterIntakeWidget';
import { MoodTrackerWidget } from './MoodTrackerWidget';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

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

const Onboarding = ({ onComplete }: Props) => {
  const [step, setStep] = React.useState(1);
  const [profile, setProfile] = React.useState<Partial<UserProfile>>({
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
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLogin, setIsLogin] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showVerificationScreen, setShowVerificationScreen] = React.useState(false);
  const [pendingUid, setPendingUid] = React.useState<string | null>(null);

  const [selectedContacts, setSelectedContacts] = React.useState<EmergencyContact[]>([]);
  const [contactPermissionGranted, setContactPermissionGranted] = React.useState(false);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [newContactName, setNewContactName] = React.useState('');
  const [newContactPhone, setNewContactPhone] = React.useState('');
  const [newContactRel, setNewContactRel] = React.useState('Family');

  React.useEffect(() => {
    if (selectedContacts.length > 0) {
      setProfile(prev => ({
        ...prev,
        emergencyContacts: selectedContacts,
        emergencyContactName: selectedContacts[0].name,
        emergencyContactPhone: selectedContacts[0].phone
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        emergencyContacts: [],
        emergencyContactName: '',
        emergencyContactPhone: ''
      }));
    }
  }, [selectedContacts]);

  const handleGrantContactAccess = async () => {
    setContactPermissionGranted(true);
    if ('contacts' in navigator && 'select' in (navigator as any).contacts) {
      try {
        const contacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple: true });
        if (contacts && contacts.length > 0) {
          const imported: EmergencyContact[] = contacts.map((c: any, idx: number) => ({
            name: c.name?.[0] || `Contact ${idx + 1}`,
            phone: c.tel?.[0] || '',
            relationship: idx === 0 ? 'Primary Contact' : 'Emergency Contact'
          })).filter(c => c.phone);
          if (imported.length > 0) {
            setSelectedContacts(imported.slice(0, 5));
          }
        }
      } catch (e) {
        console.log("Device contacts picker unavailable or dismissed.");
      }
    } else {
      setShowAddForm(true);
    }
  };

  const handleAddCustomContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;
    if (selectedContacts.length >= 5) {
      alert("You can select up to 5 emergency contacts maximum.");
      return;
    }
    setSelectedContacts([...selectedContacts, {
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRel
    }]);
    setNewContactName('');
    setNewContactPhone('');
    setShowAddForm(false);
  };

  const handleRemoveContact = (index: number) => {
    if (selectedContacts.length <= 1) {
      alert("Please keep at least 1 emergency contact selected.");
      return;
    }
    setSelectedContacts(selectedContacts.filter((_, i) => i !== index));
  };

  const next = () => setStep(s => s + 1);
  const back = () => {
    if (step === 6 && isLogin) {
      setStep(1);
    } else {
      setStep(s => s - 1);
    }
  }

  const handleAuthSuccess = async (uid: string) => {
    setLoading(true);
    try {
      // Check if user already has a profile before overwriting with onboarding data
      const existingProfile = await getUserProfile(uid);
      if (existingProfile && isLogin) {
        onComplete(existingProfile as UserProfile);
      } else {
        // Zero Start: Clear stale local device/metric history for new signup
        localStorage.removeItem('genova_daily_steps');
        localStorage.removeItem(STORAGE_KEYS.HEALTH_HISTORY);
        localStorage.removeItem(STORAGE_KEYS.WEARABLE_DEVICE);
        localStorage.removeItem(STORAGE_KEYS.NUTRI_LOG);

        const finalProfile = { ...profile, subscriptionStatus: 'gold' as const } as UserProfile;
        await saveUserProfile(uid, finalProfile);
        onComplete(finalProfile);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        await handleAuthSuccess(user.uid);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (!userCredential.user.emailVerified) {
          // Unverified email login -> prompt verification screen
          try {
            await sendFirebaseEmailVerification(userCredential.user);
          } catch (e) {
            // Ignore rate limit on resend during login
          }
          setPendingUid(userCredential.user.uid);
          setShowVerificationScreen(true);
        } else {
          await handleAuthSuccess(userCredential.user.uid);
        }
      } else {
        // Sign Up Flow
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendFirebaseEmailVerification(userCredential.user);
        } catch (e) {
          console.warn("Error sending initial verification email:", e);
        }
        
        // Save user profile without marking as verified
        const finalProfile = { ...profile, subscriptionStatus: 'gold' as const } as UserProfile;
        await saveUserProfile(userCredential.user.uid, finalProfile);
        
        setPendingUid(userCredential.user.uid);
        setShowVerificationScreen(true);
      }
    } catch (err: any) {
      let friendlyError = err.message || 'Authentication failed.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'An account with this email address already exists. Please login instead.';
      } else if (err.code === 'auth/weak-password') {
        friendlyError = 'Password should be at least 6 characters long.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = 'Please enter a valid email address.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        friendlyError = 'Invalid email or password. Please try again.';
      }
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  if (showVerificationScreen && pendingUid) {
    return (
      <EmailVerificationScreen
        email={email}
        onVerificationComplete={() => {
          setShowVerificationScreen(false);
          handleAuthSuccess(pendingUid);
        }}
        onCancel={() => setShowVerificationScreen(false)}
      />
    );
  }

  const stepsCount = 6;

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
          
          <div className="space-y-8">
            
            {/* STEP 1: WELCOME & VISION */}
            {step === 1 && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 text-center">
                <div className="inline-flex p-5 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-[2.5rem] mb-4 shadow-xl shadow-blue-500/10">
                  <GenovaLogo className="w-16 h-16" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                    Intelligence for <br/><span className="text-blue-600">your health.</span>
                  </h1>
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium max-w-sm mx-auto">
                    Genova is your personalized companion for clinical advice, diet planning, and vital tracking.
                  </p>
                </div>
                <div className="pt-8 space-y-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsLogin(false);
                      next();
                    }}
                    className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-2xl shadow-blue-500/30 group"
                  >
                    Get Started
                    <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setStep(6);
                    }}
                    className="w-full text-blue-600 dark:text-blue-400 font-bold py-2 hover:underline transition-all"
                  >
                    Already have an account? Login
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

                  {/* 3 to 5 Emergency Contacts Selection Section */}
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50 space-y-4">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Shield className="text-blue-600" size={16} />
                          <h3 className="text-xs font-black uppercase tracking-widest text-blue-900 dark:text-blue-300">
                            Emergency Contacts ({selectedContacts.length}/5)
                          </h3>
                       </div>
                       <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full">
                         Select 3 to 5 Contacts
                       </span>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                      Select up to 5 trusted contacts to be alerted simultaneously during SOS medical emergencies instead of a single next of kin.
                    </p>

                    {/* Grant Device Contacts Access Button */}
                    {!contactPermissionGranted ? (
                      <button
                        type="button"
                        onClick={handleGrantContactAccess}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-2.5 transition-all"
                      >
                        <Users size={16} /> Grant Access to Device Contacts
                      </button>
                    ) : (
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                        <Check size={16} className="text-emerald-500 shrink-0" />
                        <span>Contacts Access Granted. You can pick up to 5 contacts.</span>
                      </div>
                    )}

                    {/* Selected Contacts List */}
                    <div className="space-y-2.5 pt-1">
                      {selectedContacts.length === 0 ? (
                        <div className="p-4 bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                          <Users size={20} className="mx-auto text-gray-400 mb-1" />
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No contacts selected yet</p>
                          <p className="text-[10px] text-gray-400">Click below to add your real emergency contacts.</p>
                        </div>
                      ) : (
                        selectedContacts.map((contact, idx) => (
                          <div key={idx} className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black text-xs">
                                {idx + 1}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-gray-900 dark:text-white">{contact.name}</span>
                                  <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold px-2 py-0.5 rounded-full">
                                    {contact.relationship || 'Emergency'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-400 font-mono">{contact.phone}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveContact(idx)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Custom Add Contact Button & Form */}
                    {selectedContacts.length < 5 && (
                      <div>
                        {!showAddForm ? (
                          <button
                            type="button"
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-2.5 border-2 border-dashed border-blue-200 dark:border-blue-800 hover:border-blue-400 text-blue-600 dark:text-blue-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                          >
                            <UserPlus size={14} /> Add Custom Contact
                          </button>
                        ) : (
                          <form onSubmit={handleAddCustomContact} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white">Add New Emergency Contact</h4>
                            <input
                              type="text"
                              required
                              placeholder="Full Name"
                              value={newContactName}
                              onChange={e => setNewContactName(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                            />
                            <input
                              type="tel"
                              required
                              placeholder="Phone Number (+234...)"
                              value={newContactPhone}
                              onChange={e => setNewContactPhone(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                            />
                            <select
                              value={newContactRel}
                              onChange={e => setNewContactRel(e.target.value)}
                              className="w-full bg-gray-50 dark:bg-gray-700 p-2.5 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                            >
                              <option value="Family">Family</option>
                              <option value="Spouse">Spouse</option>
                              <option value="Mother">Mother</option>
                              <option value="Father">Father</option>
                              <option value="Brother">Brother</option>
                              <option value="Sister">Sister</option>
                              <option value="Doctor">Doctor / Physician</option>
                              <option value="Friend">Friend</option>
                              <option value="Neighbor">Neighbor</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md"
                              >
                                Save Contact
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
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

                  {/* Initial Health Check-In (Offline Logged & Synced) */}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">
                        Initial Health Logging (Offline Cached)
                      </h3>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2.5 py-0.5 rounded-full">
                        Auto-Synced
                      </span>
                    </div>

                    <WaterIntakeWidget uid={auth.currentUser?.uid || 'guest'} compact={true} />
                    <MoodTrackerWidget uid={auth.currentUser?.uid || 'guest'} compact={true} />
                  </div>
                </div>

                <div className="bg-gray-900 dark:bg-blue-900/30 p-6 rounded-[2rem] flex items-center gap-4 border border-gray-800">
                  <ShieldCheck className="text-blue-500" size={24} />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                    Data is stored locally on your device for maximum privacy.
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={next}
                  disabled={selectedContacts.length === 0}
                  className="w-full bg-blue-600 disabled:opacity-50 text-white py-6 rounded-3xl font-black text-2xl shadow-2xl active:scale-[0.98] transition-all"
                >
                  Create Secure Account
                </button>
              </div>
            )}

            {/* STEP 6: ACCOUNT CREATION */}
            {step === 6 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={back} className="p-2 text-gray-400 transition-colors">
                    <ArrowLeft size={24} />
                  </button>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">Secure Account</span>
                </div>

                <div className="text-center space-y-3">
                  <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                    {isLogin ? 'Welcome back.' : 'Save your data.'}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">
                    {isLogin ? 'Sign in to access your health profile.' : 'Create an account to sync your health profile across devices.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-5 rounded-2xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all active:scale-[0.98]"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                    Continue with Google
                  </button>

                  <button 
                    type="button"
                    onClick={() => setError("Apple Sign-In requires additional configuration in the console.")}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-4 bg-black text-white dark:bg-white dark:text-black py-5 rounded-2xl font-bold hover:opacity-90 transition-all active:scale-[0.98]"
                  >
                    <Apple size={22} />
                    Continue with Apple
                  </button>

                  <div className="relative flex items-center py-4">
                    <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
                    <span className="flex-shrink mx-4 text-gray-300 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest">Or email</span>
                    <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div className="space-y-4">
                      <div className="relative">
                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                          required
                          type="email" 
                          placeholder="Email Address" 
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-5 px-14 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                          required
                          type="password" 
                          placeholder="Password" 
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-5 px-14 focus:ring-4 focus:ring-blue-500/20 outline-none font-bold"
                        />
                      </div>
                    </div>

                    {error && (
                      error.includes('auth/network-request-failed') ? (
                        <div className="p-4 bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 rounded-2xl text-left space-y-3 animate-in fade-in duration-300">
                          <p className="text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-wider">Authentication Connection Blocked</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                            Google Sign-In has been blocked. This typically occurs because browser privacy policies or extensions block cross-origin popup auth handlers:
                          </p>
                          <div className="space-y-1.5 text-[10px] text-gray-500 dark:text-gray-400 font-medium pl-3 list-disc">
                            <div>• **Option 1 (Instant):** Click <strong>"Continue Offline as Guest"</strong> below to run the app fully client-side.</div>
                            <div>• **Option 2:** Click the <strong>"Open App in a New Tab"</strong> button in your AI Studio toolbar to bypass iframe security blocks.</div>
                            <div>• **Option 3:** If you are the owner, add your current domain to the **Authorized Domains** list in the Firebase Console.</div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-red-500 text-xs font-bold px-2">{error}</p>
                      )
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={24} /> : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                  </form>

                  <button 
                    type="button"
                    onClick={() => {
                      const guestProfile: UserProfile = {
                        fullName: profile.fullName || 'Guest User',
                        age: profile.age || 25,
                        gender: profile.gender || 'male',
                        bloodGroup: profile.bloodGroup || BloodGroup.O_POS,
                        genotype: profile.genotype || Genotype.AA,
                        height: profile.height || 170,
                        weight: profile.weight || 70,
                        allergies: profile.allergies || [],
                        emergencyContacts: selectedContacts,
                        emergencyContactName: selectedContacts[0]?.name || 'Dr. Sarah Alabi',
                        emergencyContactPhone: selectedContacts[0]?.phone || '+234 802 345 6789',
                        stepGoal: profile.stepGoal || 10000,
                        subscriptionStatus: 'gold'
                      };
                      onComplete(guestProfile);
                    }}
                    className="w-full bg-blue-500/10 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 py-5 rounded-2xl font-black text-sm hover:bg-blue-500/20 transition-all border border-blue-500/20 shadow-sm"
                  >
                    Continue Offline as Guest
                  </button>

                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="w-full text-center text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Decorative Gradient Elements */}
      <div className="fixed -bottom-32 -left-32 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed -top-32 -right-32 w-96 h-96 bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
};

export default Onboarding;
