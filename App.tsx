
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProfile } from './types';
import { STORAGE_KEYS } from './constants';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import SmartScan from './components/SmartScan';
import Assistant from './components/Assistant';
import Emergency from './components/Emergency';
import Profile from './components/Profile';
import Wearables from './components/Wearables';
import Navigation from './components/Navigation';
import Premium from './components/Premium';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('genova_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('genova_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('genova_theme', 'light');
    }
  }, [isDarkMode]);

  const handleOnboardingComplete = (profile: UserProfile) => {
    const profileWithSub = { ...profile, subscriptionStatus: 'free' as const };
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profileWithSub));
    setUser(profileWithSub);
  };

  const handleUpdateUser = (updated: UserProfile) => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    setUser(updated);
  };

  const handleDeleteAccount = () => {
    localStorage.clear();
    setUser(null);
    window.location.href = '/';
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-900 transition-colors">
      <div className="text-blue-600 font-bold text-2xl animate-pulse font-sans">Genova Health...</div>
    </div>
  );

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 pb-20 md:pb-0 md:pl-20 transition-colors font-sans">
        <Routes>
          {!user ? (
            <Route path="*" element={<Onboarding onComplete={handleOnboardingComplete} />} />
          ) : (
            <>
              <Route path="/" element={<Dashboard user={user} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
              <Route path="/scan" element={<SmartScan user={user} />} />
              <Route path="/assistant/:type" element={<Assistant user={user} />} />
              <Route path="/emergency" element={<Emergency />} />
              <Route path="/wearables" element={<Wearables user={user} />} />
              <Route path="/premium" element={<Premium user={user} onUpdate={handleUpdateUser} />} />
              <Route path="/profile" element={<Profile user={user} onUpdate={handleUpdateUser} onDelete={handleDeleteAccount} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
        {user && <Navigation isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} user={user} />}
      </div>
    </Router>
  );
};

export default App;
