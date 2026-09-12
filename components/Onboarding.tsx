import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, BloodGroup, Genotype, EmergencyContact } from '../types';
import { STORAGE_KEYS } from '../constants';
import { 
  ArrowRight, ArrowLeft, Shield, Camera, Mic, MapPin, Bluetooth, Mail, Lock, 
  Loader2, Users, UserPlus, Trash2, Check, ShieldCheck
} from 'lucide-react';
import { signInWithGoogle, auth, saveUserProfile, getUserProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendFirebaseEmailVerification } from '../services/firebase';
import { OptixiaLogo } from './OptixiaLogo';
import { EmailVerificationScreen } from './EmailVerificationScreen';
import { WaterIntakeWidget } from './WaterIntakeWidget';
import { MoodTrackerWidget } from './MoodTrackerWidget';
import { 
  HealthTrackingIllustration, 
  AIGuidanceIllustration, 
  ConnectedHealthIllustration 
} from './OptixiaIllustrations';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const InputGroup: React.FC<{label: string, children: React.ReactNode}> = ({ label, children }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
      {label}
    </label>
    {children}
  </div>
);

const PermissionRow: React.FC<{icon: React.ReactNode, title: string, desc: string}> = ({ icon, title, desc }) => (
  <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
    <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{title}</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{desc}</p>
    </div>
  </div>
);

const Onboarding = ({ onComplete }: Props) => {
  const navigate = useNavigate();
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
      setStep(3);
    } else {
      setStep(s => s - 1);
    }
  };

  const skipToProfile = () => {
    setStep(4);
  };

  const handleAuthSuccess = async (uid: string) => {
    setLoading(true);
    try {
      const existingProfile = await getUserProfile(uid);
      if (existingProfile && isLogin) {
        onComplete(existingProfile as UserProfile);
      } else {
        localStorage.removeItem('optixia_daily_steps');
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
          try {
            await sendFirebaseEmailVerification(userCredential.user);
          } catch (e) {
            // Rate limit resend ignored
          }
          setPendingUid(userCredential.user.uid);
          setShowVerificationScreen(true);
        } else {
          await handleAuthSuccess(userCredential.user.uid);
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendFirebaseEmailVerification(userCredential.user);
        } catch (e) {
          console.warn("Error sending initial verification email:", e);
        }
        
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
    <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col transition-colors overflow-hidden font-sans">
      {/* Top Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-100 dark:bg-gray-800 z-50">
        <div 
          className="bg-blue-600 h-full transition-all duration-500 ease-in-out" 
          style={{ width: `${(step / stepsCount) * 100}%` }} 
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-lg">
          
          <div className="space-y-6">
            
            {/* ONBOARDING SLIDE 1: UNDERSTAND YOUR HEALTH */}
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500 text-center">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <OptixiaLogo className="w-6 h-6" />
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">Optixia</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/admin')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl text-xs font-bold border border-blue-200 dark:border-blue-800 transition-all shadow-xs"
                      title="Admin Portal"
                    >
                      <ShieldCheck size={16} />
                      <span>Admin</span>
                    </button>
                    <button 
                      type="button"
                      onClick={skipToProfile}
                      className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      Skip
                    </button>
                  </div>
                </div>

                <div className="py-4 flex justify-center">
                  <HealthTrackingIllustration className="w-56 h-56" />
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Understand your health.
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-xs mx-auto">
                    Track the health signals that matter to you.
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 pt-2">
                  <span className="w-8 h-2 bg-blue-600 rounded-full" />
                  <span className="w-2 h-2 bg-slate-200 dark:bg-gray-700 rounded-full" />
                  <span className="w-2 h-2 bg-slate-200 dark:bg-gray-700 rounded-full" />
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    type="button" 
                    onClick={next}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
                  >
                    Next
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* ONBOARDING SLIDE 2: PERSONALISED GUIDANCE */}
            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-6 duration-500 text-center">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={back} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={22} />
                  </button>
                  <button 
                    type="button"
                    onClick={skipToProfile}
                    className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    Skip
                  </button>
                </div>

                <div className="py-4 flex justify-center">
                  <AIGuidanceIllustration className="w-56 h-56" />
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Personalised health guidance.
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-xs mx-auto">
                    Get insights based on your health profile and activity.
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 pt-2">
                  <span className="w-2 h-2 bg-slate-200 dark:bg-gray-700 rounded-full" />
                  <span className="w-8 h-2 bg-blue-600 rounded-full" />
                  <span className="w-2 h-2 bg-slate-200 dark:bg-gray-700 rounded-full" />
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    type="button" 
                    onClick={next}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
                  >
                    Next
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* ONBOARDING SLIDE 3: YOUR HEALTH IN ONE PLACE */}
            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-6 duration-500 text-center">
                <div className="flex items-center justify-between">
                  <button type="button" onClick={back} className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={22} />
                  </button>
                </div>

                <div className="py-4 flex justify-center">
                  <ConnectedHealthIllustration className="w-56 h-56" />
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Your health, in one place.
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-base font-medium max-w-xs mx-auto">
                    Connect your devices, scan, track and understand your health.
                  </p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-center gap-2 pt-2">
                  <span className="w-2 h-2 bg-slate-200 dark:bg-gray-700 rounded-full" />
                  <span className="w-2 h-2 bg-slate-200 dark:bg-gray-700 rounded-full" />
                  <span className="w-8 h-2 bg-blue-600 rounded-full" />
                </div>

                <div className="pt-4 space-y-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setIsLogin(false);
                      next();
                    }}
                    className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-md shadow-blue-500/20"
                  >
                    Get Started
                    <ArrowRight size={20} />
                  </button>

                  <button 
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setStep(6);
                    }}
                    className="w-full text-blue-600 dark:text-blue-400 font-bold py-2 text-sm hover:underline transition-all"
                  >
                    Already have an account? Sign In
                  </button>

                  <div className="pt-2 border-t border-slate-100 dark:border-gray-800 text-center">
                    <button 
                      type="button"
                      onClick={() => navigate('/admin')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-gray-700"
                    >
                      <ShieldCheck size={16} className="text-blue-600" />
                      <span>Admin Portal</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: BIOLOGICAL CORE PROFILE */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={back} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft size={22} />
                  </button>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full">Biological Profile</span>
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Your Health Profile.
                </h2>

                <div className="space-y-5">
                  <InputGroup label="Full Name">
                    <input 
                      required
                      autoFocus
                      type="text" 
                      value={profile.fullName} 
                      onChange={e => setProfile({...profile, fullName: e.target.value})}
                      placeholder="e.g. Alex Johnson"
                      className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-blue-500/20 outline-none text-lg font-bold dark:text-white placeholder:text-slate-300"
                    />
                  </InputGroup>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Genotype">
                      <select 
                        value={profile.genotype} 
                        onChange={e => setProfile({...profile, genotype: e.target.value as Genotype})}
                        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-blue-500/20 outline-none text-base font-extrabold dark:text-white"
                      >
                        {Object.values(Genotype).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </InputGroup>
                    <InputGroup label="Blood Group">
                      <select 
                        value={profile.bloodGroup} 
                        onChange={e => setProfile({...profile, bloodGroup: e.target.value as BloodGroup})}
                        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl py-4 px-5 focus:ring-4 focus:ring-blue-500/20 outline-none text-base font-extrabold dark:text-white"
                      >
                        {Object.values(BloodGroup).map(bg => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </InputGroup>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <PermissionRow icon={<Camera size={18}/>} title="Camera Access" desc="For PPG health & nutrition scanning." />
                  <PermissionRow icon={<Bluetooth size={18}/>} title="Smartwatch Bluetooth" desc="For real-time biometric telemetry." />
                </div>

                <button 
                  type="button" 
                  disabled={!profile.fullName}
                  onClick={next}
                  className="w-full bg-blue-600 disabled:opacity-30 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                >
                  Continue
                </button>
              </div>
            )}

            {/* STEP 5: EMERGENCY CONTACTS & METRICS */}
            {step === 5 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={back} className="p-2 text-slate-400 transition-colors">
                    <ArrowLeft size={22} />
                  </button>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full">Emergency & Goals</span>
                </div>

                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Body & SOS Metrics.
                </h2>

                <div className="space-y-5 overflow-y-auto max-h-[50vh] pr-1 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <InputGroup label="Weight (kg)">
                      <input 
                        type="number" 
                        value={profile.weight} 
                        onChange={e => setProfile({...profile, weight: parseInt(e.target.value) || 70})}
                        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl py-3.5 px-5 outline-none text-lg font-extrabold dark:text-white"
                      />
                    </InputGroup>
                    <InputGroup label="Height (cm)">
                      <input 
                        type="number" 
                        value={profile.height} 
                        onChange={e => setProfile({...profile, height: parseInt(e.target.value) || 170})}
                        className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl py-3.5 px-5 outline-none text-lg font-extrabold dark:text-white"
                      />
                    </InputGroup>
                  </div>

                  {/* Emergency Contacts Selection */}
                  <div className="bg-blue-50/50 dark:bg-gray-800/60 p-5 rounded-2xl border border-blue-100 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <Shield className="text-blue-600" size={16} />
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                            Emergency Contacts ({selectedContacts.length}/5)
                          </h3>
                       </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Select trusted contacts to be notified during SOS emergencies.
                    </p>

                    {!contactPermissionGranted ? (
                      <button
                        type="button"
                        onClick={handleGrantContactAccess}
                        className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
                      >
                        <Users size={16} /> Grant Access to Device Contacts
                      </button>
                    ) : (
                      <div className="p-3 bg-blue-100/60 dark:bg-blue-900/40 rounded-xl flex items-center gap-2 text-xs text-blue-800 dark:text-blue-200 font-bold">
                        <Check size={16} className="text-blue-600 shrink-0" />
                        <span>Device Contacts Access Granted.</span>
                      </div>
                    )}

                    <div className="space-y-2 pt-1">
                      {selectedContacts.map((contact, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-slate-100 dark:border-gray-700 flex items-center justify-between shadow-2xs">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center font-black text-xs">
                              {idx + 1}
                            </div>
                            <div>
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{contact.name}</span>
                              <p className="text-[11px] text-slate-400 font-mono">{contact.phone}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveContact(idx)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {selectedContacts.length < 5 && (
                      <div>
                        {!showAddForm ? (
                          <button
                            type="button"
                            onClick={() => setShowAddForm(true)}
                            className="w-full py-2.5 border border-dashed border-blue-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                          >
                            <UserPlus size={14} /> Add Custom Emergency Contact
                          </button>
                        ) : (
                          <form onSubmit={handleAddCustomContact} className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-blue-200 dark:border-gray-700 space-y-2.5">
                            <input
                              type="text"
                              required
                              placeholder="Full Name"
                              value={newContactName}
                              onChange={e => setNewContactName(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-gray-700 p-2.5 rounded-lg text-xs font-medium outline-none text-slate-900 dark:text-white border border-slate-200 dark:border-gray-600"
                            />
                            <input
                              type="tel"
                              required
                              placeholder="Phone Number (+1...)"
                              value={newContactPhone}
                              onChange={e => setNewContactPhone(e.target.value)}
                              className="w-full bg-slate-50 dark:bg-gray-700 p-2.5 rounded-lg text-xs font-medium outline-none text-slate-900 dark:text-white border border-slate-200 dark:border-gray-600"
                            />
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="flex-1 py-2 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs"
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
                          className={`flex-1 py-3.5 rounded-xl font-black text-xs transition-all ${
                            profile.stepGoal === goal 
                            ? 'bg-blue-600 text-white shadow-sm' 
                            : 'bg-slate-50 dark:bg-gray-800 text-slate-400 border border-slate-200 dark:border-gray-700'
                          }`}
                        >
                          {goal.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </InputGroup>
                </div>

                <div className="bg-slate-50 dark:bg-gray-800/50 p-4 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-gray-700">
                  <ShieldCheck className="text-blue-600" size={20} />
                  <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    Your health information is encrypted and stored securely.
                  </p>
                </div>

                <button 
                  type="button"
                  onClick={next}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  Create Optixia Profile
                </button>
              </div>
            )}

            {/* STEP 6: ACCOUNT CREATION / AUTH */}
            {step === 6 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-6 duration-500">
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={back} className="p-2 text-slate-400 transition-colors">
                    <ArrowLeft size={22} />
                  </button>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full">Secure Sign In</span>
                </div>

                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                    {isLogin ? 'Welcome back to Optixia.' : 'Save your health profile.'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    {isLogin ? 'Sign in to access your health data.' : 'Create an account to sync your profile across devices.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <button 
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 py-4 rounded-2xl font-bold text-sm text-slate-800 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-all active:scale-[0.98]"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                    Continue with Google
                  </button>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-100 dark:border-gray-800"></div>
                    <span className="flex-shrink mx-4 text-slate-300 dark:text-gray-600 text-[10px] font-black uppercase tracking-widest">Or email</span>
                    <div className="flex-grow border-t border-slate-100 dark:border-gray-800"></div>
                  </div>

                  <form onSubmit={handleEmailAuth} className="space-y-3">
                    <div className="space-y-3">
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="email" 
                          placeholder="Email Address" 
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl py-3.5 px-12 focus:ring-4 focus:ring-blue-500/20 outline-none text-sm font-bold dark:text-white"
                        />
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          required
                          type="password" 
                          placeholder="Password" 
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-2xl py-3.5 px-12 focus:ring-4 focus:ring-blue-500/20 outline-none text-sm font-bold dark:text-white"
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-red-600 dark:text-red-400 text-xs font-bold px-2 pt-1">{error}</p>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-base shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : (isLogin ? 'Sign In' : 'Create Account')}
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
                        emergencyContactName: selectedContacts[0]?.name || 'Primary Emergency Contact',
                        emergencyContactPhone: selectedContacts[0]?.phone || '+1 800 555 0199',
                        stepGoal: profile.stepGoal || 10000,
                        subscriptionStatus: 'gold'
                      };
                      onComplete(guestProfile);
                    }}
                    className="w-full bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-300 py-3.5 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-gray-700 transition-all border border-slate-200 dark:border-gray-700"
                  >
                    Continue Offline as Guest
                  </button>

                  <button 
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="w-full text-center text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
                  >
                    {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
