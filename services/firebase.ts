import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword as fbSignInWithEmail,
  createUserWithEmailAndPassword as fbCreateUserWithEmail,
  onAuthStateChanged as fbOnAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  deleteDoc,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported as isMessagingSupported,
  Messaging 
} from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';
import { STORAGE_KEYS } from '../constants';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific named database
export const db = initializeFirestore(
  app,
  {},
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Messaging Singleton
let messagingInstance: Messaging | null = null;
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isMessagingSupported();
    if (supported && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (err) {
    console.warn("Firebase Messaging not supported in this browser/frame environment:", err);
  }
  return null;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const onAuthStateChanged = (
  _authInstance: any,
  callback: (user: FirebaseUser | any) => void
) => {
  return fbOnAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.warn("Google sign in popup error/cancelled, using authenticated guest session:", err);
    throw err;
  }
};

export const signInWithEmailAndPassword = async (_authInstance: any, email: string, pass: string) => {
  return await fbSignInWithEmail(auth, email, pass);
};

export const createUserWithEmailAndPassword = async (_authInstance: any, email: string, pass: string) => {
  return await fbCreateUserWithEmail(auth, email, pass);
};

export const logout = async () => {
  await signOut(auth);
};

export async function testConnection() {
  try {
    const testRef = doc(db, 'test', 'connection');
    await getDoc(testRef);
    console.log("Firebase Firestore connected successfully!");
  } catch (err) {
    console.warn("Firestore test connection status:", err);
  }
}

// User Profile Firestore + Local Storage Sync
export const getUserProfile = async (uid: string) => {
  try {
    if (uid) {
      const userDocRef = doc(db, 'users', uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(data));
        return data;
      }
    }
  } catch (err) {
    console.warn("Firestore getUserProfile fallback to local:", err);
  }

  // Fallback to local storage
  try {
    const local = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    if (local) return JSON.parse(local);
  } catch (e) {
    // ignore
  }
  return null;
};

export const saveUserProfile = async (uid: string, profile: any) => {
  const profileWithTimestamp = {
    ...profile,
    updatedAt: new Date().toISOString()
  };

  // 1. Save to local storage
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profileWithTimestamp));
    localStorage.setItem(`genova_profile_${uid}`, JSON.stringify(profileWithTimestamp));
  } catch (e) {
    console.error("Local profile write error:", e);
  }

  // 2. Save to Firestore
  if (uid) {
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, profileWithTimestamp, { merge: true });
    } catch (err) {
      console.warn("Firestore saveUserProfile error (saved locally):", err);
    }
  }
};

// Health Metrics Firestore + Local Sync
export const addHealthMetric = async (uid: string, metric: any) => {
  const newMetric = {
    heartRate: Number(metric.heartRate) || 72,
    bloodPressure: String(metric.bloodPressure || metric.bp || "120/80"),
    stressLevel: String(metric.stressLevel || metric.stress || "Low"),
    timestamp: new Date().toISOString()
  };

  // Local storage save
  try {
    const localHist = localStorage.getItem(STORAGE_KEYS.HEALTH_HISTORY);
    const history = localHist ? JSON.parse(localHist) : [];
    history.push(newMetric);
    localStorage.setItem(STORAGE_KEYS.HEALTH_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error("Local metric write error:", e);
  }

  // Firestore save
  if (uid) {
    try {
      const historyCol = collection(db, 'users', uid, 'history');
      await addDoc(historyCol, newMetric);
    } catch (err) {
      console.warn("Firestore addHealthMetric error:", err);
    }
  }
};

export const getHealthHistory = async (uid: string, limitCount = 10) => {
  if (uid) {
    try {
      const historyCol = collection(db, 'users', uid, 'history');
      const q = query(historyCol, orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const metrics = snapshot.docs.map(d => d.data());
        localStorage.setItem(STORAGE_KEYS.HEALTH_HISTORY, JSON.stringify(metrics));
        return metrics;
      }
    } catch (err) {
      console.warn("Firestore getHealthHistory fallback to local:", err);
    }
  }

  // Fallback to local
  try {
    const localHist = localStorage.getItem(STORAGE_KEYS.HEALTH_HISTORY);
    if (!localHist) return [];
    const history = JSON.parse(localHist);
    if (!Array.isArray(history)) return [];
    return history.slice(-limitCount).reverse();
  } catch (e) {
    return [];
  }
};

// Chat Sessions Firestore + Local Sync
export const saveChatSession = async (uid: string, chat: any) => {
  const sessionData = {
    id: String(chat.id),
    title: String(chat.title || 'Conversation'),
    assistantType: String(chat.assistantType || 'general'),
    messages: (chat.messages || []).map((m: any) => ({
      role: String(m.role),
      text: String(m.text),
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp)
    })),
    updatedAt: new Date().toISOString()
  };

  // Save to local storage
  try {
    const key = `genova_chats_${uid}`;
    const raw = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    const chats = raw ? JSON.parse(raw) : [];
    const existingIndex = chats.findIndex((c: any) => c.id === chat.id);
    if (existingIndex >= 0) {
      chats[existingIndex] = sessionData;
    } else {
      chats.unshift(sessionData);
    }
    localStorage.setItem(key, JSON.stringify(chats));
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(chats));
  } catch (e) {
    console.error("Local chat save error:", e);
  }

  // Save to Firestore
  if (uid) {
    try {
      const chatDocRef = doc(db, 'users', uid, 'chats', sessionData.id);
      await setDoc(chatDocRef, sessionData, { merge: true });
    } catch (err) {
      console.warn("Firestore saveChatSession error:", err);
    }
  }
};

export const getChatSessions = async (uid: string) => {
  if (uid) {
    try {
      const chatsCol = collection(db, 'users', uid, 'chats');
      const q = query(chatsCol, orderBy('updatedAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const remoteSessions = snapshot.docs.map(docSnap => {
          const c = docSnap.data();
          return {
            id: c.id,
            title: c.title,
            assistantType: c.assistantType,
            messages: (c.messages || []).map((m: any) => ({
              role: m.role,
              text: m.text,
              timestamp: new Date(m.timestamp)
            })),
            updatedAt: new Date(c.updatedAt)
          };
        });
        return remoteSessions;
      }
    } catch (err) {
      console.warn("Firestore getChatSessions fallback to local:", err);
    }
  }

  // Local fallback
  try {
    const key = `genova_chats_${uid}`;
    const raw = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (!raw) return [];
    const chats = JSON.parse(raw);
    if (!Array.isArray(chats)) return [];
    return chats.map((c: any) => ({
      id: c.id,
      title: c.title,
      assistantType: c.assistantType,
      messages: (c.messages || []).map((m: any) => ({
        role: m.role,
        text: m.text,
        timestamp: new Date(m.timestamp)
      })),
      updatedAt: new Date(c.updatedAt)
    }));
  } catch (e) {
    return [];
  }
};

export const deleteChatSession = async (uid: string, chatId: string) => {
  // Local storage delete
  try {
    const key = `genova_chats_${uid}`;
    const raw = localStorage.getItem(key) || localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (raw) {
      const chats = JSON.parse(raw);
      if (Array.isArray(chats)) {
        const filtered = chats.filter((c: any) => c.id !== chatId);
        localStorage.setItem(key, JSON.stringify(filtered));
        localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(filtered));
      }
    }
  } catch (e) {
    console.error("Local delete error:", e);
  }

  // Firestore delete
  if (uid) {
    try {
      const chatDocRef = doc(db, 'users', uid, 'chats', chatId);
      await deleteDoc(chatDocRef);
    } catch (err) {
      console.warn("Firestore deleteChatSession error:", err);
    }
  }
};

// Food Scans / Meal Logs Firestore + Local Sync
export const saveFoodScan = async (uid: string, scanData: any) => {
  const logData = {
    foodName: String(scanData.foodName || 'Scanned Meal'),
    calories: Number(scanData.calories) || 0,
    protein: String(scanData.protein || ''),
    carbs: String(scanData.carbs || ''),
    fat: String(scanData.fat || ''),
    insight: String(scanData.insight || scanData.healthTip || ''),
    timestamp: new Date().toISOString()
  };

  if (uid) {
    try {
      const foodCol = collection(db, 'users', uid, 'foodLogs');
      await addDoc(foodCol, logData);
    } catch (err) {
      console.warn("Firestore saveFoodScan error:", err);
    }
  }
};

export const getFoodScans = async (uid: string, limitCount = 10) => {
  if (uid) {
    try {
      const foodCol = collection(db, 'users', uid, 'foodLogs');
      const q = query(foodCol, orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map(d => d.data());
      }
    } catch (err) {
      console.warn("Firestore getFoodScans error:", err);
    }
  }
  return [];
};

// ==========================================
// FIREBASE PUSH NOTIFICATIONS & ACTIVITY LOGS
// ==========================================

export interface ActivityNotification {
  id?: string;
  title: string;
  body: string;
  type: 'vitals' | 'nutri' | 'ai' | 'emergency' | 'wearable' | 'system' | 'reminders' | 'hydration' | 'sleep' | 'wellness' | 'product_updates';
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

export interface NotificationPreferences {
  globalEnabled: boolean;
  reminders: boolean;       // Health reminders
  hydration: boolean;       // Hydration updates
  sleep: boolean;           // Sleep check-ins
  wellness: boolean;        // Wellness check-ins
  product_updates: boolean; // Product announcements
}

export interface NotificationToken {
  token: string;
  platform: string;
  deviceInfo: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  globalEnabled: true,
  reminders: true,
  hydration: true,
  sleep: true,
  wellness: true,
  product_updates: true,
};

// Helper to store/read prompt dismissal
export const getNotificationPromptDismissed = (): boolean => {
  try {
    return localStorage.getItem('genova_notif_prompt_dismissed') === 'true';
  } catch (e) {
    return false;
  }
};

export const setNotificationPromptDismissed = (dismissed: boolean) => {
  try {
    localStorage.setItem('genova_notif_prompt_dismissed', dismissed ? 'true' : 'false');
  } catch (e) {
    // ignore
  }
};

// Helper to get platform summary
const getDeviceInfo = (): { platform: string; deviceInfo: string } => {
  if (typeof window === 'undefined') return { platform: 'web', deviceInfo: 'Server Environment' };
  const ua = navigator.userAgent;
  let platform = 'web';
  if (/android/i.test(ua)) platform = 'android';
  else if (/iPad|iPhone|iPod/.test(ua)) platform = 'ios';

  let browser = 'Browser';
  if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Firefox')) browser = 'Firefox';

  return {
    platform,
    deviceInfo: `${browser} on ${navigator.platform || 'Web'}`
  };
};

// Get Notification Preferences
export const getNotificationPreferences = async (uid: string): Promise<NotificationPreferences> => {
  if (!uid) return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const prefRef = doc(db, 'users', uid, 'notificationPreferences', 'settings');
    const snap = await getDoc(prefRef);
    if (snap.exists()) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...snap.data() } as NotificationPreferences;
    }
  } catch (err) {
    console.warn("Firestore getNotificationPreferences error:", err);
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
};

// Save Notification Preferences
export const saveNotificationPreferences = async (uid: string, prefs: NotificationPreferences): Promise<boolean> => {
  if (!uid) return false;
  try {
    const prefRef = doc(db, 'users', uid, 'notificationPreferences', 'settings');
    await setDoc(prefRef, prefs, { merge: true });
    return true;
  } catch (err) {
    console.warn("Firestore saveNotificationPreferences error:", err);
    return false;
  }
};

// Register FCM Token with Metadata
export const registerFcmToken = async (uid: string, token: string): Promise<boolean> => {
  if (!uid || !token) return false;
  try {
    const tokenHash = token.substring(0, 32);
    const { platform, deviceInfo } = getDeviceInfo();
    const now = new Date().toISOString();

    const tokenDocRef = doc(db, 'users', uid, 'notificationTokens', tokenHash);
    const existingSnap = await getDoc(tokenDocRef);

    const tokenData: NotificationToken = {
      token,
      platform,
      deviceInfo,
      createdAt: existingSnap.exists() ? (existingSnap.data().createdAt || now) : now,
      updatedAt: now,
      enabled: true
    };

    await setDoc(tokenDocRef, tokenData, { merge: true });

    // Also support backward compatibility with fcmTokens subcollection
    const legacyDocRef = doc(db, 'users', uid, 'fcmTokens', tokenHash);
    await setDoc(legacyDocRef, {
      token,
      deviceInfo,
      updatedAt: now
    }, { merge: true });

    return true;
  } catch (err) {
    console.warn("Firestore registerFcmToken error:", err);
    return false;
  }
};

// Deactivate FCM Token on Logout for current device only
export const deactivateFcmTokenOnLogout = async (uid: string): Promise<void> => {
  if (!uid) return;
  try {
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      const currentToken = await getToken(messaging).catch(() => null);
      if (currentToken) {
        const tokenHash = currentToken.substring(0, 32);
        const tokenDocRef = doc(db, 'users', uid, 'notificationTokens', tokenHash);
        await updateDoc(tokenDocRef, { enabled: false, updatedAt: new Date().toISOString() }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn("deactivateFcmTokenOnLogout error:", err);
  }
};

// Request Permission and Register Device FCM Token
export const requestPushNotificationPermission = async (uid?: string): Promise<{ granted: boolean; permissionState: NotificationPermission | 'unsupported'; token?: string; error?: string; reasonCode?: string }> => {
  console.log("[FCM Audit] Initiating Push Notification setup...");

  // 1. Check Browser API Support
  const hasWindow = typeof window !== 'undefined';
  const hasNotification = hasWindow && 'Notification' in window;
  const hasServiceWorker = hasWindow && 'serviceWorker' in navigator;

  console.log(`[FCM Audit] Environment Checks -> Notification API: ${hasNotification ? 'SUPPORTED' : 'UNSUPPORTED'}, ServiceWorker API: ${hasServiceWorker ? 'SUPPORTED' : 'UNSUPPORTED'}`);

  if (!hasNotification || !hasServiceWorker) {
    const errorMsg = 'Unsupported Browser: Notification API or Service Worker is not available in this browser environment.';
    console.warn(`[FCM Audit Error - Unsupported Browser] ${errorMsg}`);
    return { granted: false, permissionState: 'unsupported', error: errorMsg, reasonCode: 'UNSUPPORTED_BROWSER' };
  }

  // 2. HTTPS Check
  const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  console.log(`[FCM Audit] Security Origin Check -> Protocol: ${window.location.protocol}, Hostname: ${window.location.hostname}, Secure Origin: ${isHttps ? 'YES' : 'NO'}`);
  if (!isHttps) {
    console.warn("[FCM Audit Error - Security Origin] Web Push Notifications require an HTTPS origin or localhost.");
  }

  // 3. Browser Permission State Detection
  const currentPermission = Notification.permission;
  console.log(`[FCM Audit] Current Browser Notification Permission State: "${currentPermission}"`);

  if (currentPermission === 'denied') {
    const deniedMsg = 'Browser Notification Permission is DENIED. Notifications are blocked in browser site settings.';
    console.warn(`[FCM Audit Error - Browser Permission] ${deniedMsg}`);
    return {
      granted: false,
      permissionState: 'denied',
      error: deniedMsg,
      reasonCode: 'PERMISSION_DENIED'
    };
  }

  try {
    let permission: NotificationPermission = currentPermission;

    // Only request permission if current state is 'default'
    if (permission === 'default') {
      console.log("[FCM Audit] Requesting browser notification permission from user prompt...");
      permission = await Notification.requestPermission();
      console.log(`[FCM Audit] User responded to browser prompt: "${permission}"`);
    }

    if (permission !== 'granted') {
      const errorMsg = permission === 'denied'
        ? 'User blocked notifications in browser prompt.'
        : 'User dismissed the notification permission prompt.';
      console.warn(`[FCM Audit Error - Browser Permission] ${errorMsg}`);
      return {
        granted: false,
        permissionState: permission,
        error: errorMsg,
        reasonCode: permission === 'denied' ? 'PERMISSION_DENIED' : 'PERMISSION_DISMISSED'
      };
    }

    // 4. Validate Firebase Configuration
    const cfg = firebaseConfig as any;
    if (!cfg.messagingSenderId || !cfg.projectId || !cfg.appId) {
      const cfgError = 'Invalid Firebase Configuration: missing messagingSenderId, projectId, or appId.';
      console.error(`[FCM Audit Error - Firebase Configuration] ${cfgError}`);
      return { granted: false, permissionState: 'granted', error: cfgError, reasonCode: 'INVALID_FIREBASE_CONFIG' };
    }
    console.log(`[FCM Audit] Firebase Config Verified -> Project ID: "${cfg.projectId}", Sender ID: "${cfg.messagingSenderId}"`);

    // 5. Initialize Firebase Messaging
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      const msgError = 'Firebase Messaging instance could not be initialized.';
      console.error(`[FCM Audit Error - Firebase Configuration] ${msgError}`);
      return { granted: false, permissionState: 'granted', error: msgError, reasonCode: 'MESSAGING_INIT_FAILED' };
    }

    // 6. Register Service Worker
    let swRegistration: ServiceWorkerRegistration | undefined = undefined;
    try {
      console.log("[FCM Audit] Registering Service Worker at /firebase-messaging-sw.js with root scope...");
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      console.log("[FCM Audit] Service Worker successfully registered & ready -> Active Scope:", swRegistration.scope);
    } catch (swErr: any) {
      console.error("[FCM Audit Error - Service Worker Registration] Failed to register /firebase-messaging-sw.js:", swErr?.message || swErr);
    }

    // 7. Check VAPID Key
    const vapidKey = cfg.vapidKey || cfg.webPushVapidKey || (typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_FIREBASE_VAPID_KEY : undefined);
    console.log(`[FCM Audit] VAPID Key Configuration -> ${vapidKey ? 'Custom Web Push VAPID Key supplied' : 'Using Firebase Default VAPID Key'}`);

    // 8. Generate FCM Token
    let token: string | undefined = undefined;
    try {
      console.log("[FCM Audit] Requesting FCM registration token from Firebase Messaging service...");
      token = await getToken(messaging, {
        serviceWorkerRegistration: swRegistration,
        ...(vapidKey ? { vapidKey } : {})
      });

      if (!token) {
        console.warn("[FCM Audit Error - FCM Token Generation] getToken returned an empty token.");
        return { granted: true, permissionState: 'granted', error: 'FCM returned empty token.', reasonCode: 'EMPTY_TOKEN' };
      }

      console.log(`[FCM Audit] FCM Token successfully generated -> ${token.substring(0, 16)}...`);
    } catch (tokenErr: any) {
      console.error("[FCM Audit Error - FCM Token Generation] Failed to generate FCM registration token:", tokenErr?.message || tokenErr);
      return { granted: true, permissionState: 'granted', error: tokenErr?.message || 'FCM Token Generation Failed', reasonCode: 'TOKEN_GEN_FAILED' };
    }

    // 9. Store Token in Firestore for Currently Authenticated User
    if (token && uid) {
      console.log(`[FCM Audit] Saving FCM token to Firestore for user UID: "${uid}"...`);
      const success = await registerFcmToken(uid, token);
      if (success) {
        console.log("[FCM Audit] Token successfully registered in Firestore under user subcollections (notificationTokens & fcmTokens).");
      } else {
        console.error("[FCM Audit Error - Firestore Permission] Failed to write FCM token to Firestore. Check Firestore security rules or user auth session.");
      }

      // Initialize default notification preferences if not present
      await getNotificationPreferences(uid).then(async (current) => {
        await saveNotificationPreferences(uid, current);
      });
    } else if (token && !uid) {
      console.warn("[FCM Audit Warning - Authenticated User Association] Token generated, but no authenticated UID was provided to associate the token in Firestore.");
    }

    return { granted: true, permissionState: 'granted', token };
  } catch (err: any) {
    console.error("[FCM Audit Error - General Failure] Unexpected error during notification permission setup:", err);
    return { granted: false, permissionState: Notification.permission || 'default', error: err?.message || 'Failed to request notification permission.', reasonCode: 'GENERAL_ERROR' };
  }
};

// Send an Activity Push Notification (Stores in Firestore + triggers native Browser Notification)
export const sendActivityNotification = async (
  uid: string,
  notification: { title: string; body: string; type: ActivityNotification['type']; actionUrl?: string }
) => {
  const newNotif: ActivityNotification = {
    title: String(notification.title),
    body: String(notification.body),
    type: notification.type,
    read: false,
    timestamp: new Date().toISOString(),
    actionUrl: notification.actionUrl || '/'
  };

  // 1. Trigger Native Web Browser Push Notification immediately if permission is granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(newNotif.title, {
            body: newNotif.body,
            icon: '/logo.svg',
            badge: '/favicon.svg',
            tag: `genova-act-${Date.now()}`,
            data: { actionUrl: newNotif.actionUrl }
          });
        }).catch(() => {
          new Notification(newNotif.title, {
            body: newNotif.body,
            icon: '/logo.svg'
          });
        });
      } else {
        new Notification(newNotif.title, {
          body: newNotif.body,
          icon: '/logo.svg'
        });
      }
    } catch (e) {
      console.warn("Native Notification trigger error:", e);
    }
  }

  // 2. Persist to Firestore activity stream
  if (uid) {
    try {
      const notifCol = collection(db, 'users', uid, 'notifications');
      await addDoc(notifCol, newNotif);
    } catch (err) {
      console.warn("Firestore sendActivityNotification error:", err);
    }
  }

  // 3. Fallback to Local Storage activity history
  try {
    const key = `genova_notifications_${uid}`;
    const raw = localStorage.getItem(key);
    const existing: ActivityNotification[] = raw ? JSON.parse(raw) : [];
    existing.unshift({ ...newNotif, id: `local_${Date.now()}` });
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  } catch (e) {
    // ignore
  }
};

// Real-time Firestore Notification Listener
export const subscribeToNotifications = (
  uid: string,
  callback: (notifications: ActivityNotification[]) => void
) => {
  if (!uid) {
    callback([]);
    return () => {};
  }

  try {
    const notifCol = collection(db, 'users', uid, 'notifications');
    const q = query(notifCol, orderBy('timestamp', 'desc'), limit(30));

    return onSnapshot(q, (snapshot) => {
      const remoteNotifs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as ActivityNotification[];
      callback(remoteNotifs);
    }, (error) => {
      console.warn("Firestore notification snapshot error, falling back to local:", error);
      try {
        const key = `genova_notifications_${uid}`;
        const raw = localStorage.getItem(key);
        callback(raw ? JSON.parse(raw) : []);
      } catch (e) {
        callback([]);
      }
    });
  } catch (err) {
    console.warn("subscribeToNotifications error:", err);
    return () => {};
  }
};

// Mark Single Notification as Read
export const markNotificationAsRead = async (uid: string, notificationId: string) => {
  if (uid && !notificationId.startsWith('local_')) {
    try {
      const notifRef = doc(db, 'users', uid, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.warn("Firestore markNotificationAsRead error:", err);
    }
  }

  // Local storage sync
  try {
    const key = `genova_notifications_${uid}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const list: ActivityNotification[] = JSON.parse(raw);
      const updated = list.map(n => n.id === notificationId ? { ...n, read: true } : n);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  } catch (e) {
    // ignore
  }
};

// Mark All Notifications as Read
export const markAllNotificationsAsRead = async (uid: string, notifications: ActivityNotification[]) => {
  const unreadList = notifications.filter(n => !n.read);
  for (const notif of unreadList) {
    if (notif.id) {
      await markNotificationAsRead(uid, notif.id);
    }
  }
};

// Listen for Foreground FCM Push Messages
export const listenToForegroundPushMessages = async (onMessageCallback: (payload: any) => void) => {
  try {
    const messaging = await getFirebaseMessaging();
    if (messaging) {
      return onMessage(messaging, (payload) => {
        console.log("Received foreground FCM Push Message:", payload);
        onMessageCallback(payload);
      });
    }
  } catch (err) {
    console.warn("Foreground FCM push listener error:", err);
  }
  return () => {};
};

