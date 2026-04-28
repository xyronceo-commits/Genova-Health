
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProfile } from './types';
import { STORAGE_KEYS } from './constants';
import { auth, getUserProfile, logout, saveUserProfile, testConnection } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
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
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setUser(profile as UserProfile);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth process error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
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
    setUser(profile);
  };

  const handleUpdateUser = async (updated: UserProfile) => {
    setUser(updated);
    if (auth.currentUser) {
      saveUserProfile(auth.currentUser.uid, updated);
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
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
              <Route path="/emergency" element={<Emergency user={user} />} />
              <Route path="/wearables" element={<Wearables user={user} />} />
              <Route path="/premium" element={<Premium user={user} onUpdate={handleUpdateUser} />} />
              <Route path="/profile" element={<Profile user={user} onUpdate={handleUpdateUser} onLogout={handleLogout} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </>
          )}
        </Routes>
        {user && <Navigation isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} user={user} onLogout={handleLogout} />}
      </div>
    </Router>
  );
};

export default App;
