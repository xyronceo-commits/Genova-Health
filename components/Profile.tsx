
import React, { useState } from 'react';
import { UserProfile, BloodGroup, Genotype, EmergencyContact } from '../types';
import { User, Settings, Trash2, Save, ChevronLeft, Moon, Sun, Info, Shield, LogOut, Users, Plus, UserPlus, Check, Monitor, ShieldCheck } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../services/firebase';

interface Props {
  user: UserProfile;
  onUpdate: (updated: UserProfile) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Profile: React.FC<Props> = ({ user, onUpdate, onLogout, isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserProfile>(user);
  const [saved, setSaved] = useState(false);

  const [contacts, setContacts] = useState<EmergencyContact[]>(() => {
    if (user.emergencyContacts && user.emergencyContacts.length > 0) {
      return user.emergencyContacts;
    }
    if (user.emergencyContactName && user.emergencyContactPhone) {
      return [{ name: user.emergencyContactName, phone: user.emergencyContactPhone, relationship: 'Primary Contact' }];
    }
    return [];
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRel, setNewRel] = useState('Family');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...formData,
      emergencyContacts: contacts,
      emergencyContactName: contacts[0]?.name || '',
      emergencyContactPhone: contacts[0]?.phone || ''
    };
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePickDeviceContact = async () => {
    try {
      if ('contacts' in navigator && 'select' in window) {
        const props = ['name', 'tel'];
        const selected = await (navigator as any).contacts.select(props, { multiple: false });
        if (selected && selected.length > 0) {
          const contact = selected[0];
          const name = contact.name?.[0] || '';
          const phone = contact.tel?.[0] || '';
          if (name) setNewName(name);
          if (phone) setNewPhone(phone);
          setShowAddForm(true);
          return;
        }
      }
    } catch (e) {
      console.warn("Device contacts picker closed or not supported:", e);
    }
    setShowAddForm(true);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;
    if (contacts.length >= 5) {
      alert("You can add up to 5 emergency contacts maximum.");
      return;
    }
    const updated = [...contacts, { name: newName.trim(), phone: newPhone.trim(), relationship: newRel }];
    setContacts(updated);
    setNewName('');
    setNewPhone('');
    setShowAddForm(false);
  };

  const handleRemoveContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const confirmResetAndLogout = () => {
    if (window.confirm("Are you sure you want to completely clear all app data and start fresh? This will delete all recorded history and start a new session.")) {
      onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-10 max-w-3xl mx-auto space-y-8 pb-32 transition-colors">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-900 dark:text-white">
            <ChevronLeft size={24}/>
          </button>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Health Profile</h1>
        </div>
        <div className="flex items-center gap-4">
          {saved && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
              Settings Saved!
            </div>
          )}
          <button 
            onClick={toggleDarkMode}
            className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Firebase Authentication & Cloud Sync Status */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/40 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">Firebase Authentication & Cloud Sync</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Real-time user authentication & Firestore storage</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Firebase Active
            </span>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Account Identity</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {auth.currentUser?.email || (auth.currentUser ? `User UID: ${auth.currentUser.uid.slice(0, 10)}...` : 'Guest Local Profile')}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-gray-800 px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700 self-start sm:self-auto">
                {auth.currentUser?.providerData[0]?.providerId === 'google.com' ? 'Google Auth' : (auth.currentUser?.email ? 'Email/Password Auth' : 'Offline / Guest Mode')}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600/50">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {auth.currentUser ? 'Your health profile, chats & metrics are securely synced to Cloud Firestore.' : 'Sign in via Google or Email/Password to enable multi-device sync.'}
              </p>
              <button
                type="button"
                onClick={onLogout}
                className="px-4 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <User className="text-blue-600" size={20}/>
            <h2 className="font-bold text-gray-900 dark:text-white">Personal Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Full Name</label>
              <input 
                className="w-full bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 dark:text-gray-100"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Gender</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 dark:text-gray-100"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value as 'male' | 'female'})}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Age</label>
              <input 
                type="number"
                className="w-full bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 dark:text-gray-100"
                value={formData.age}
                onChange={e => setFormData({...formData, age: parseInt(e.target.value)})}
              />
            </div>
          </div>
        </section>

        {/* Medical Setup */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-blue-600" size={20}/>
            <h2 className="font-bold text-gray-900 dark:text-white">Medical Configuration</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Blood Group</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 dark:text-gray-100"
                value={formData.bloodGroup}
                onChange={e => setFormData({...formData, bloodGroup: e.target.value as BloodGroup})}
              >
                {Object.values(BloodGroup).map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Genotype</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 dark:text-gray-100"
                value={formData.genotype}
                onChange={e => setFormData({...formData, genotype: e.target.value as Genotype})}
              >
                {Object.values(Genotype).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Emergency Contacts (Up to 5) */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Shield className="text-red-600" size={20}/>
              <h2 className="font-bold text-gray-900 dark:text-white">Emergency Contacts ({contacts.length}/5)</h2>
            </div>
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 font-bold px-2.5 py-0.5 rounded-full">
              Alert Broadcast Group
            </span>
          </div>
          
          <div className="space-y-3">
            {contacts.length === 0 ? (
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                <Users size={24} className="mx-auto text-gray-400 mb-1" />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">No emergency contacts added yet.</p>
                <p className="text-[10px] text-gray-400">Add your real contacts below to be notified during SOS alerts.</p>
              </div>
            ) : (
              contacts.map((contact, idx) => (
                <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 text-red-600 font-black rounded-xl flex items-center justify-center text-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{contact.name}</span>
                        <span className="text-[9px] bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold px-2 py-0.5 rounded-full">
                          {contact.relationship}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono">{contact.phone}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveContact(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {contacts.length < 5 && (
            <div>
              {!showAddForm ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="flex-1 py-3 border-2 border-dashed border-red-200 dark:border-red-900/50 hover:border-red-400 text-red-600 dark:text-red-400 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <UserPlus size={16} /> Add Real Emergency Contact ({5 - contacts.length} remaining)
                  </button>
                  <button
                    type="button"
                    onClick={handlePickDeviceContact}
                    className="py-3 px-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-red-200 dark:border-red-900/40"
                  >
                    <Users size={16} /> Pick Device Contact
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl border border-red-200 dark:border-red-800 space-y-3">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Add Emergency Contact</h4>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 p-2.5 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (+234...)"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 p-2.5 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
                  />
                  <select
                    value={newRel}
                    onChange={e => setNewRel(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 p-2.5 rounded-xl text-xs font-medium outline-none text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600"
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
                      className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddContact}
                      className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      Save Contact
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Fitness Goals */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="text-green-600" size={20}/>
            <h2 className="font-bold text-gray-900 dark:text-white">Fitness Goals</h2>
          </div>
          
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Daily Step Goal</label>
            <input 
              type="number"
              step="500"
              className="w-full bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-black text-xl text-blue-600 dark:text-blue-400"
              value={formData.stepGoal}
              onChange={e => setFormData({...formData, stepGoal: parseInt(e.target.value)})}
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">Recommended: 10,000 steps for optimal heart health.</p>
          </div>
        </section>

        {/* App Info, Theme & Legal Directory */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center gap-3">
            <Settings className="text-blue-600" size={20}/>
            <h2 className="font-bold text-gray-900 dark:text-white">Appearance & Device System Integration</h2>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm">Theme Mode</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sync dark or light mode dynamically with your physical device settings.</p>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
                {isDarkMode ? 'Dark Active' : 'Light Active'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (isDarkMode) toggleDarkMode();
                  localStorage.setItem('genova_theme_mode', 'light');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  !isDarkMode 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Sun size={14} /> Light
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!isDarkMode) toggleDarkMode();
                  localStorage.setItem('genova_theme_mode', 'dark');
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  isDarkMode 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Moon size={14} /> Dark
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.setItem('genova_theme_mode', 'system');
                  const isDeviceDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (isDarkMode !== isDeviceDark) {
                    toggleDarkMode();
                  }
                }}
                className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Monitor size={14} /> Device Sync
              </button>
            </div>
          </div>

          {/* Legal Pages Directory */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" />
                Legal & Policy Center
              </h3>
              <Link to="/legal" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                View Legal Hub →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <Link to="/legal/terms" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                Terms & Conditions
              </Link>
              <Link to="/legal/privacy" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                Privacy Policy
              </Link>
              <Link to="/legal/cookies" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                Cookie Policy
              </Link>
              <Link to="/legal/acceptable-use" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                Acceptable Use
              </Link>
              <Link to="/legal/disclaimer" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                Disclaimer
              </Link>
              <Link to="/legal/intellectual-property" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                IP Policy
              </Link>
              <Link to="/legal/copyright" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                Copyright Policy
              </Link>
              <Link to="/legal/community-guidelines" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                Community Guidelines
              </Link>
              <Link to="/legal/trust-and-safety" className="p-2.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold border border-gray-100 dark:border-gray-700 text-center transition-all truncate">
                Trust & Safety
              </Link>
            </div>
          </div>
        </section>

        <button 
          type="submit"
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-200 dark:shadow-none"
        >
          <Save size={20}/>
          Update Health Profile
        </button>

        <hr className="border-gray-200 dark:border-gray-700 transition-colors"/>

        <div className="space-y-4">
           <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Danger Zone</h3>
           <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100 dark:border-red-900/30 flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
             <div className="flex items-start gap-4 text-center md:text-left">
               <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl"><Trash2 size={24}/></div>
               <div>
                 <h4 className="font-bold text-red-900 dark:text-red-400">Start Fresh (Clear All Recorded Data)</h4>
                 <p className="text-xs text-red-700 dark:text-red-500/80 mt-1">Permanently remove all logs, metrics, chats, and profiles from this app to begin completely new.</p>
               </div>
             </div>
             <button 
              type="button"
              onClick={confirmResetAndLogout}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none shrink-0"
             >
                <Trash2 size={18}/>
                Start Fresh / Reset
              </button>
           </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
