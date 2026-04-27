
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
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
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection Test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firestore is offline. Check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export const getUserProfile = async (uid: string) => {
  const path = `users/${uid}`;
  try {
    const docRef = doc(db, 'users', uid);
    // Use getDocFromServer to ensure we get fresh data or a clear network error
    const docSnap = await getDocFromServer(docRef);
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
      ...metric,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getHealthHistory = async (uid: string, limitCount = 10) => {
  const path = `users/${uid}/history`;
  try {
    const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
    const historyRef = collection(db, 'users', uid, 'history');
    const q = query(historyRef, orderBy('timestamp', 'desc'), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};
