
import * as React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { UserProfile } from './types';
import { STORAGE_KEYS } from './constants';
import { auth, getUserProfile, logout, saveUserProfile, testConnection, onAuthStateChanged, listenToForegroundPushMessages, deactivateFcmTokenOnLogout, reloadFirebaseUser } from './services/firebase';
import Dashboard from './components/Dashboard';
import Onboarding from './components/Onboarding';
import SmartScan from './components/SmartScan';
import Assistant from './components/Assistant';
import Emergency from './components/Emergency';
import Profile from './components/Profile';
import Wearables from './components/Wearables';
import Navigation from './components/Navigation';
import Premium from './components/Premium';
import About from './components/About';
import Legal from './components/Legal';
import { SecureAccessModal } from './components/SecureAccessModal';
import { AdminDashboard } from './components/AdminDashboard';
import { GenovaLogo } from './components/GenovaLogo';
import { NotificationPermissionPrompt } from './components/NotificationPermissionPrompt';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';

const App = () => {
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isSecureAccessOpen, setIsSecureAccessOpen] = React.useState(false);
  const [adminToken, setAdminToken] = React.useState<string | null>(null);
  const [foregroundToast, setForegroundToast] = React.useState<{ title: string; body: string; route?: string } | null>(null);

  // Listen to incoming foreground FCM push notifications
  React.useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    listenToForegroundPushMessages((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Genova Activity Alert';
      const body = payload.notification?.body || payload.data?.body || 'New activity recorded.';
      const route = payload.data?.route || payload.data?.actionUrl || '/scan';
      
      setForegroundToast({ title, body, route });
      setTimeout(() => setForegroundToast(null), 6000);
    }).then(unsub => {
      unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Check if admin session cookie exists on server
  React.useEffect(() => {
    fetch('/api/admin/verify')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not logged in');
      })
      .then(data => {
        if (data.valid) setAdminToken('cookie_session_active');
      })
      .catch(() => {
        // session not active
      });
  }, []);

  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    setIsSecureAccessOpen(false);
    window.location.hash = '#/admin';
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    window.location.hash = '#/';
  };

  // Theme mode: 'light' | 'dark' | 'system' (device settings)
  const [themeMode, setThemeMode] = React.useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('genova_theme_mode');
    if (saved === 'dark' || saved === 'light' || saved === 'system') return saved;
    const legacy = localStorage.getItem('genova_theme');
    if (legacy === 'dark' || legacy === 'light') return legacy;
    return 'system';
  });

  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(() => {
    if (themeMode === 'dark') return true;
    if (themeMode === 'light') return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Sync SEO metadata & Open Graph attributes dynamically with host origin
  React.useEffect(() => {
    document.title = "Genova Health";
    if (typeof window !== 'undefined' && window.location) {
      const origin = window.location.origin;
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', origin + '/');
      
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) canonical.setAttribute('href', origin + '/');

      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && !ogImage.getAttribute('content')?.startsWith('http')) {
        ogImage.setAttribute('content', `${origin}/og-image.png`);
      }
      const ogImageSecure = document.querySelector('meta[property="og:image:secure_url"]');
      if (ogImageSecure && !ogImageSecure.getAttribute('content')?.startsWith('http')) {
        ogImageSecure.setAttribute('content', `${origin}/og-image.png`);
      }
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage && !twitterImage.getAttribute('content')?.startsWith('http')) {
        twitterImage.setAttribute('content', `${origin}/og-image.png`);
      }
    }
  }, []);

  // Sync with device OS settings & apply dark/light classes dynamically
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateTheme = () => {
      let dark = false;
      if (themeMode === 'dark') {
        dark = true;
      } else if (themeMode === 'light') {
        dark = false;
      } else {
        // System / Device mode
        dark = mediaQuery.matches;
      }

      setIsDarkMode(dark);
      if (dark) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
      localStorage.setItem('genova_theme_mode', themeMode);
      localStorage.setItem('genova_theme', dark ? 'dark' : 'light');
    };

    updateTheme();

    const handleDeviceThemeChange = (e: MediaQueryListEvent) => {
      if (themeMode === 'system') {
        const dark = e.matches;
        setIsDarkMode(dark);
        if (dark) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDeviceThemeChange);
    } else {
      mediaQuery.addListener(handleDeviceThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDeviceThemeChange);
      } else {
        mediaQuery.removeListener(handleDeviceThemeChange);
      }
    };
  }, [themeMode]);

  React.useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            setUser(profile as UserProfile);
            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
          } else {
            // Minimal profile fallback for signed-in user
            const fallbackProfile: UserProfile = {
              fullName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Member',
              age: 25,
              gender: 'male',
              bloodGroup: 'O+' as any,
              genotype: 'AA' as any,
              height: 170,
              weight: 70,
              allergies: [],
              emergencyContactName: '',
              emergencyContactPhone: '',
              stepGoal: 10000,
              subscriptionStatus: 'gold'
            };
            setUser(fallbackProfile);
            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(fallbackProfile));
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Auth process error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleOnboardingComplete = (profile: UserProfile) => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    setUser(profile);
  };

  const handleUpdateUser = async (updated: UserProfile) => {
    setUser(updated);
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    if (auth.currentUser) {
      try {
        await saveUserProfile(auth.currentUser.uid, updated);
      } catch (err) {
        console.error("Failed to sync updated profile to Cloud Firestore:", err);
      }
    }
  };

  const handleLogout = () => {
    if (auth.currentUser) {
      deactivateFcmTokenOnLogout(auth.currentUser.uid).catch(() => {});
    }
    logout().catch(err => console.error("Sign-out error:", err));
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    localStorage.removeItem('genova_daily_steps');
    localStorage.removeItem('genova_sensor_permission');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith('genova_') && key !== 'genova_theme' && key !== 'genova_theme_mode') {
        localStorage.removeItem(key);
      }
    }
    setUser(null);
  };

  // Toggling dark mode switches between dark and light explicitly
  const toggleDarkMode = () => {
    setThemeMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-blue-50 dark:bg-gray-900 transition-colors gap-4">
      <GenovaLogo className="w-16 h-16 animate-pulse" />
      <div className="text-blue-900 dark:text-blue-400 font-extrabold text-xl tracking-tight">Genova Health</div>
    </div>
  );

  // Require Firebase Authentication email verification for password authenticated accounts
  if (user && auth.currentUser && !auth.currentUser.emailVerified) {
    return (
      <EmailVerificationScreen
        email={auth.currentUser.email || ''}
        onVerificationComplete={async () => {
          if (auth.currentUser) {
            const profile = await getUserProfile(auth.currentUser.uid);
            if (profile) setUser(profile as UserProfile);
          }
        }}
        onCancel={handleLogout}
      />
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors font-sans">
        {user && (
          <Navigation 
            isDarkMode={isDarkMode} 
            toggleDarkMode={toggleDarkMode} 
            user={user} 
            onLogout={handleLogout} 
            onOpenSecureAccess={() => setIsSecureAccessOpen(true)}
          />
        )}
        <div className="md:pl-16">
          <Routes>
            {/* Public / Guest Legal Routes */}
            <Route path="/legal" element={<Legal />} />
            <Route path="/legal/:docId" element={<Legal />} />
            <Route path="/terms" element={<Navigate to="/legal/terms" replace />} />
            <Route path="/privacy" element={<Navigate to="/legal/privacy" replace />} />
            <Route path="/cookies" element={<Navigate to="/legal/cookies" replace />} />
            <Route path="/acceptable-use" element={<Navigate to="/legal/acceptable-use" replace />} />
            <Route path="/disclaimer" element={<Navigate to="/legal/disclaimer" replace />} />
            <Route path="/intellectual-property" element={<Navigate to="/legal/intellectual-property" replace />} />
            <Route path="/copyright" element={<Navigate to="/legal/copyright" replace />} />
            <Route path="/community-guidelines" element={<Navigate to="/legal/community-guidelines" replace />} />
            <Route path="/trust-and-safety" element={<Navigate to="/legal/trust-and-safety" replace />} />

            {/* Secure Admin Route */}
            <Route 
              path="/admin" 
              element={
                adminToken ? (
                  <AdminDashboard adminToken={adminToken} onLogout={handleAdminLogout} isDarkMode={isDarkMode} />
                ) : (
                  <Navigate to="/" replace />
                )
              } 
            />

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
                <Route path="/about" element={<About onOpenSecureAccess={() => setIsSecureAccessOpen(true)} />} />
                <Route path="*" element={<Navigate to="/" />} />
              </>
            )}
          </Routes>
        </div>
        <SecureAccessModal 
          isOpen={isSecureAccessOpen} 
          onClose={() => setIsSecureAccessOpen(false)} 
          onSuccess={handleAdminLoginSuccess} 
        />

        {/* Non-aggressive Notification Opt-in Prompt */}
        {user && <NotificationPermissionPrompt userId={auth.currentUser?.uid} />}

        {/* Foreground Push Notification Toast */}
        {foregroundToast && (
          <div className="fixed top-5 right-5 z-50 bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900 shadow-2xl rounded-2xl p-4 max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">Activity Notification</span>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{foregroundToast.title}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{foregroundToast.body}</p>
              </div>
              <button
                type="button"
                onClick={() => setForegroundToast(null)}
                className="text-gray-400 hover:text-gray-600 text-xs p-1"
              >
                ✕
              </button>
            </div>
            {foregroundToast.route && (
              <a
                href={`#${foregroundToast.route}`}
                onClick={() => setForegroundToast(null)}
                className="mt-3 block text-center py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all"
              >
                View Activity Details
              </a>
            )}
          </div>
        )}
      </div>
    </Router>
  );
};

export default App;
