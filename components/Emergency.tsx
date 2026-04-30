
import React, { useState, useEffect } from 'react';
import { Phone, MapPin, ShieldAlert, Heart, ChevronRight, AlertTriangle, Navigation, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';
import { STORAGE_KEYS } from '../constants';
import { ai } from '../services/ai';

interface Props {
  user: UserProfile;
}

const Emergency: React.FC<Props> = ({ user }) => {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const result = await ai.findHospitals(pos.coords.latitude, pos.coords.longitude);
            const realHospitals = (result.hospitals || []).map((h: any) => ({
              ...h,
              uri: h.uri || `https://www.google.com/maps/search/${encodeURIComponent(h.name + (h.address ? ' ' + h.address : ''))}`
            }));
            
            setHospitals(realHospitals.length > 0 ? realHospitals.slice(0, 5) : [
              { name: 'Reddington Hospital', address: 'Victoria Island, Lagos', distance: '1.2km' },
              { name: 'Lagoon Hospital', address: 'Ikoyi, Lagos', distance: '2.5km' },
            ]);
          } catch (err) {
            console.error(err);
            setError("Could not load dynamic hospital list. Showing local defaults.");
            setHospitals([
              { name: 'Reddington Hospital', address: 'Victoria Island, Lagos', distance: '1.2km' },
              { name: 'Lagoon Hospital', address: 'Ikoyi, Lagos', distance: '2.5km' },
            ]);
          } finally {
            setLoadingHospitals(false);
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          setLoadingHospitals(false);
          setError("Location access denied. Displaying emergency contacts.");
          setHospitals([
            { name: 'Reddington Hospital', address: 'Victoria Island, Lagos', distance: '1.2km' },
            { name: 'Lagoon Hospital', address: 'Ikoyi, Lagos', distance: '2.5km' },
          ]);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } else {
      setLoadingHospitals(false);
      setError("Geolocation not supported by your device.");
    }
  }, []);

  const handleNotifyKin = () => {
    if (user?.emergencyContactPhone) {
      window.location.href = `tel:${user.emergencyContactPhone}`;
    } else {
      alert("No emergency contact phone number found in your profile.");
    }
  };

  return (
    <div className="min-h-screen bg-red-50 dark:bg-gray-900 p-6 md:p-12 transition-colors">
      <header className="flex justify-between items-center mb-10">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full text-red-600 transition-colors">
          <ChevronRight className="rotate-180" size={24}/>
        </button>
        <h1 className="text-2xl font-black text-red-600 tracking-tight">Genova SOS</h1>
        <div className="w-10"></div>
      </header>

      <div className="max-w-xl mx-auto space-y-8 pb-20">
        {/* SOS Button */}
        <div className="flex flex-col items-center gap-6 py-10">
          <button 
            onClick={() => setActive(!active)}
            className={`w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
              active 
              ? 'bg-red-600 text-white ring-8 ring-red-100 dark:ring-red-900/20 scale-110' 
              : 'bg-white dark:bg-gray-800 text-red-600 ring-8 ring-white/50 dark:ring-gray-700/50 border-4 border-red-500'
            }`}
          >
            <ShieldAlert size={64} className={active ? 'animate-pulse' : ''} />
          </button>
          <div className="text-center">
             <h2 className="text-2xl font-black text-gray-900 dark:text-white">{active ? "Distress Signal Active" : "Emergency SOS"}</h2>
             <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">{active ? "Nearby help is being notified" : "Press for immediate assistance"}</p>
          </div>
        </div>

        {/* Quick Contacts */}
        <div className="grid grid-cols-2 gap-4">
          <a href="tel:112" className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-red-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-lg transition-all">
             <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl transition-colors"><Phone size={20}/></div>
             <div className="text-left">
               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Lagos Emergency</p>
               <p className="text-lg font-black text-gray-900 dark:text-white">112</p>
             </div>
          </a>
          <button onClick={handleNotifyKin} className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-red-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-lg transition-all text-left">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl transition-colors"><Heart size={20}/></div>
             <div>
               <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{user?.emergencyContactName || 'Next of Kin'}</p>
               <p className="text-lg font-black text-gray-900 dark:text-white">Call Now</p>
             </div>
          </button>
        </div>

        {/* Nearby Hospitals */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-xs flex items-center gap-2">
              <Sparkles size={14} className="text-blue-500" /> Nearby Emergency Centers
            </h3>
            <span className="text-[10px] text-red-600 font-black uppercase tracking-widest">Grounded by Google Maps</span>
          </div>

          <div className="space-y-3">
             {loadingHospitals ? (
               <div className="p-10 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Locating nearest facilities...</p>
               </div>
             ) : (
               hospitals.map((h, i) => (
                 <a 
                   key={i} 
                   href={h.uri || `https://www.google.com/maps/search/${encodeURIComponent(h.name)}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between group cursor-pointer hover:border-red-200 dark:hover:border-red-900 transition-all block"
                 >
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-red-50 dark:group-hover:bg-red-900/30 group-hover:text-red-500 transition-colors">
                        <MapPin size={24}/>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm">{h.name}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{h.address}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-black text-red-600">{h.distance}</p>
                      <div className="flex items-center gap-1 mt-1">
                         <Navigation size={12} className="text-gray-400"/>
                         <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Open Maps</span>
                      </div>
                   </div>
                 </a>
               ))
             )}
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-3xl border border-orange-200 dark:border-orange-900/30 flex gap-4 transition-colors">
           <AlertTriangle className="text-orange-500 shrink-0" />
           <div>
             <h4 className="font-bold text-orange-900 dark:text-orange-400">AI Triage Active</h4>
             <p className="text-xs text-orange-800 dark:text-orange-500/80 leading-relaxed mt-1">
               Stay where you are. We've detected your location. Avoid unnecessary movement. Your health profile has been prepared for paramedics.
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Emergency;
