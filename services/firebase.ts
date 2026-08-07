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
  deleteDoc 
} from 'firebase/firestore';
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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
