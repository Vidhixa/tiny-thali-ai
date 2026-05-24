
'use client';

import type { FirebaseApp } from 'firebase/app';
import { initializeApp, getApps } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  userId: string | null;
  loading: boolean; // Expose loading state
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  db: null,
  auth: null,
  userId: null,
  loading: true, // Start with loading true
});

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);

  useEffect(() => {
    console.log("FirebaseConfig (derived from .env variables) as used by FirebaseProvider:", firebaseConfig);
    setLoading(true); // Explicitly set loading to true at the start of effect

    if (
      !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY" ||
      !firebaseConfig.projectId || firebaseConfig.projectId === "YOUR_PROJECT_ID" ||
      !firebaseConfig.authDomain || firebaseConfig.authDomain === "YOUR_AUTH_DOMAIN" ||
      !firebaseConfig.storageBucket || firebaseConfig.storageBucket === "YOUR_STORAGE_BUCKET" ||
      !firebaseConfig.messagingSenderId || firebaseConfig.messagingSenderId === "YOUR_MESSAGING_SENDER_ID" ||
      !firebaseConfig.appId || firebaseConfig.appId === "YOUR_APP_ID" || firebaseConfig.appId === "TINY_THALI"
    ) {
      setInitializationError(
        "Firebase is not configured. Please update your <code>.env</code> file with your actual Firebase project credentials. You can find these in your Firebase project settings."
      );
      setLoading(false);
      return;
    }

    let firebaseApp: FirebaseApp;
    if (!getApps().length) {
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApps()[0];
    }
    
    const firestoreDb = getFirestore(firebaseApp);
    const firebaseAuth = getAuth(firebaseApp);

    setApp(firebaseApp);
    setDb(firestoreDb);
    setAuth(firebaseAuth);
    setInitializationError(null); 

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (user) {
        setUserId(user.uid);
        console.log("FirebaseProvider: User is signed in. User ID:", user.uid);
      } else {
        setUserId(null);
        console.log("FirebaseProvider: No user is signed in. Automatic anonymous sign-in is disabled.");
      }
      setLoading(false); 
    });

    return () => unsubscribe();
  }, []);

  if (initializationError && loading === false) { // Only show error if not actively loading something else
    const isWarning = initializationError.includes("Firebase is not configured");
    const configString = Object.entries(firebaseConfig)
      .map(([key, value]) => `  ${key}: "${value === undefined ? 'undefined' : value}"`)
      .join(',\n');
      
    return (
      <div style={{
        padding: '20px',
        textAlign: 'left',
        backgroundColor: isWarning ? '#fff3cd' : '#f8d7da',
        color: isWarning ? '#856404' : '#721c24',
        border: `1px solid ${isWarning ? '#ffeeba' : '#f5c6cb'}`,
        borderRadius: '4px',
        margin: '20px',
        fontFamily: 'sans-serif',
        lineHeight: '1.6'
      }}>
        <strong style={{ display: 'block', textAlign: 'center', marginBottom: '10px' }}>
          {isWarning ? 'Configuration Incomplete' : 'Firebase Initialization Error'}
        </strong>
        <p dangerouslySetInnerHTML={{ __html: initializationError }} />
        {isWarning && (
          <>
            <p><strong>Current configuration values being read:</strong></p>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-all', 
              backgroundColor: 'rgba(0,0,0,0.05)', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '0.9em'
            }}>
              {`{\n${configString}\n}`}
            </pre>
          </>
        )}
        <p style={{ marginTop: '10px' }}>Refer to the <code>.env</code> file in the project root to set up your Firebase credentials.</p>
      </div>
    );
  }
  
  // Do not show "Loading Firebase services..." if there's an error screen.
  // The loading state is now internal to the provider and exposed for consumers.
  // if (loading && !initializationError) {
  //   return <div className="flex items-center justify-center h-screen text-lg">Loading Firebase services...</div>;
  // }


  return (
    <FirebaseContext.Provider value={{ app, db, auth, userId, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
};
