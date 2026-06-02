
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, setDoc, collection, query, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with long polling to ensure connectivity in restricted environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import { getDocFromServer } from 'firebase/firestore';

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const getUserProfile = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const saveUserProfile = async (uid: string, profile: any) => {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const addHealthMetric = async (uid: string, metric: any) => {
  const path = `users/${uid}/history`;
  try {
    const historyRef = doc(db, 'users', uid, 'history', Date.now().toString());
    await setDoc(historyRef, {
      heartRate: Number(metric.heartRate) || 72,
      bloodPressure: String(metric.bloodPressure || metric.bp || "120/80"),
      stressLevel: String(metric.stressLevel || metric.stress || "Low"),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getHealthHistory = async (uid: string, limitCount = 10) => {
  const path = `users/${uid}/history`;
  try {
    const historyRef = collection(db, 'users', uid, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const saveChatSession = async (uid: string, chat: any) => {
  const path = `users/${uid}/chats/${chat.id}`;
  try {
    const chatRef = doc(db, 'users', uid, 'chats', chat.id);
    await setDoc(chatRef, {
      id: chat.id,
      title: chat.title || 'Conversation',
      assistantType: chat.assistantType,
      messages: chat.messages.map((m: any) => ({
        role: m.role,
        text: m.text,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp)
      })),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getChatSessions = async (uid: string) => {
  const path = `users/${uid}/chats`;
  try {
    const chatsRef = collection(db, 'users', uid, 'chats');
    const q = query(chatsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: data.id,
        title: data.title,
        assistantType: data.assistantType,
        messages: (data.messages || []).map((m: any) => ({
          role: m.role,
          text: m.text,
          timestamp: new Date(m.timestamp)
        })),
        updatedAt: new Date(data.updatedAt)
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const deleteChatSession = async (uid: string, chatId: string) => {
  const path = `users/${uid}/chats/${chatId}`;
  try {
    const chatRef = doc(db, 'users', uid, 'chats', chatId);
    await deleteDoc(chatRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};
