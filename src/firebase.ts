import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc, getDocs, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase with safety checks
let app;
let auth: any;
let db: any;
let googleProvider: any;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId === '(default)' ? undefined : firebaseConfig.firestoreDatabaseId);
  googleProvider = new GoogleAuthProvider();
} catch (e) {
  console.error("Firebase Initialization Failed:", e);
  // We'll throw a more descriptive error that main.tsx can catch
  throw new Error("Falha ao conectar com o servidor central do Seabra Pro. Verifique sua conexão.");
}

export { auth, db, googleProvider };

// Auth Helpers
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithEmail = (e: string, p: string) => signInWithEmailAndPassword(auth, e, p);
export const signUpWithEmail = (e: string, p: string) => createUserWithEmailAndPassword(auth, e, p);
export const resetPassword = (e: string) => sendPasswordResetEmail(auth, e);
export const logout = () => signOut(auth);

// Error Handling Helper
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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  let message = error instanceof Error ? error.message : String(error);
  
  // Handle specific Firebase error codes
  if (error?.code === 'unavailable' || message.includes('the client is offline')) {
    message = "O banco de dados está iniciando ou temporariamente indisponível. Aguarde alguns segundos e tente novamente.";
  } else if (error?.code === 'permission-denied') {
    message = "Acesso negado. Você não tem permissão para realizar esta ação.";
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  if (error?.code !== 'unavailable') {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
  } else {
    console.warn('Firestore temporarily unavailable (starting up).');
  }

  throw new Error(message);
}

// Connection Test with slight retry logic
export async function testConnection(retries = 3) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established successfully.");
  } catch (error: any) {
    if ((error?.message?.includes('the client is offline') || error?.code === 'unavailable') && retries > 0) {
      console.warn(`Firebase is starting up. Retrying in 2 seconds... (${retries} retries left)`);
      setTimeout(() => testConnection(retries - 1), 2000);
    } else if (error?.code !== 'unavailable' && !error?.message?.includes('the client is offline')) {
      console.error("Firebase connection error:", error);
    }
  }
}

testConnection();
