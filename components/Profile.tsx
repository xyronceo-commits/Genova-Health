
import React, { useState } from 'react';
import { UserProfile, BloodGroup, Genotype } from '../types';
import { User, Settings, Trash2, Save, ChevronLeft, Moon, Sun, Info, Shield, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  user: UserProfile;
  onUpdate: (updated: UserProfile) => void;
  onDelete: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const Profile: React.FC<Props> = ({ user, onUpdate, onDelete, isDarkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserProfile>(user);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const confirmLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      onDelete();
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

        {/* Emergency Contact */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-red-600" size={20}/>
            <h2 className="font-bold text-gray-900 dark:text-white">Emergency Contact</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Contact Name</label>
              <input 
                className="w-full bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 dark:text-gray-100"
                value={formData.emergencyContactName}
                onChange={e => setFormData({...formData, emergencyContactName: e.target.value})}
                placeholder="Next of Kin Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase ml-1">Phone Number</label>
              <input 
                type="tel"
                className="w-full bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 dark:text-gray-100"
                value={formData.emergencyContactPhone}
                onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})}
                placeholder="+234..."
              />
            </div>
          </div>
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
               <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl"><Info size={24}/></div>
               <div>
                 <h4 className="font-bold text-red-900 dark:text-red-400">Clear All Health Data</h4>
                 <p className="text-xs text-red-700 dark:text-red-500/80 mt-1">Permanently remove your profile and history from this device.</p>
               </div>
             </div>
             <button 
              type="button"
              onClick={confirmLogout}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
             >
                <LogOut size={18}/>
                Log Out
              </button>
           </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
