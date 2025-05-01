// _layout.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import PersistentSidebar from '@/components/PersistentSidebar';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  collection, 
  getDocs 
} from 'firebase/firestore';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAP17kMsBQ1IQA_kmSX96qGF1wh8uENk_4",
  authDomain: "bus-trak-d9cec.firebaseapp.com",
  databaseURL: "https://bus-trak-d9cec-default-rtdb.firebaseio.com",
  projectId: "bus-trak-d9cec",
  storageBucket: "bus-trak-d9cec.firebasestorage.app",
  messagingSenderId: "804485729710",
  appId: "1:804485729710:web:ec78f450350767336b4c3f",
  measurementId: "G-JFQ116D0PL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Define a simplified Firebase Auth Context
type UserRole = 'manager' | 'driver' | 'student' | null;

interface FirebaseAuthContextType {
  currentUser: User | null;
  userRole: UserRole;
  loading: boolean;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType>({
  currentUser: null,
  userRole: null,
  loading: true
});

// Simplified Auth Provider
function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          // Check if user is a manager
          const isManager = await checkIfUserIsManager(user.uid);
          if (isManager) {
            console.log("Auth state: Found user as Manager");
            setUserRole("manager");
          } else {
            console.log("Auth state: User not found as manager");
            setUserRole(null);
            // Optional: Sign out non-managers
            // await firebaseSignOut(auth);
          }
        } catch (error) {
          console.error("Error checking user role:", error);
          setUserRole(null);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });
  
    return unsubscribe;
  }, []);

  // Check if user is a manager
  const checkIfUserIsManager = async (userId: string): Promise<boolean> => {
    try {
      // Get all schools
      const schoolsRef = collection(db, "Schools");
      const schoolsSnapshot = await getDocs(schoolsRef);
      
      // Check each school for the manager
      for (const schoolDoc of schoolsSnapshot.docs) {
        const schoolId = schoolDoc.id;
        const managerRef = doc(db, `Schools/${schoolId}/Managers`, userId);
        const managerSnap = await getDoc(managerRef);
        
        if (managerSnap.exists()) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking if user is manager:", error);
      return false;
    }
  };

  return (
    <FirebaseAuthContext.Provider value={{ currentUser, userRole, loading }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

// Custom hook to use the auth context
function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}

// Root layout with authentication logic
export default function RootLayout() {
  return (
    <FirebaseAuthProvider>
      <AuthProtection />
    </FirebaseAuthProvider>
  );
}

function AuthProtection() {
  // We'll consider the login and signup routes as public
  const isPublicRoute = (segments: string[]) => {
    return segments[0] === 'login' || 
           segments[0] === 'signup' || 
           segments[0] === 'forgot-password';
  };

  const segments = useSegments();
  const router = useRouter();
  const { currentUser, userRole, loading } = useFirebaseAuth();
  const isSignedIn = !!currentUser && userRole === 'manager';

  // Add debug output
  useEffect(() => {
    console.log("[Root] Auth state check:", { 
      isLoaded: !loading, 
      isSignedIn, 
      currentRoute: segments.join('/')
    });
  }, [loading, isSignedIn, segments]);

  // Handle routing based on auth state
  useEffect(() => {
    // Wait for Firebase Auth to load
    if (loading) {
      console.log("[Root] Auth state still loading...");
      return;
    }

    const isOnPublicRoute = isPublicRoute(segments);

    // Debug current state
    console.log("[Root] Route analysis:", { 
      isSignedIn, 
      isOnPublicRoute,
      segments
    });

    // Now handle the routing logic
    if (isSignedIn) {
      // User is signed in as a manager
      if (isOnPublicRoute) {
        // If on a public route like login, redirect to main app
        console.log("[Root] Signed in user on public route, redirecting to main");
        router.replace('/');
      }
    } else {
      // User is NOT signed in or not a manager
      if (!isOnPublicRoute) {
        // If trying to access a protected route, redirect to login
        console.log("[Root] Unsigned user on protected route, redirecting to login");
        router.replace('/login');
      }
    }
  }, [loading, isSignedIn, segments, router]);

  // Show loading indicator while Firebase Auth is loading
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4361ee" />
        <Text style={{ marginTop: 10, color: '#4B5563' }}>
          Loading authentication...
        </Text>
      </View>
    );
  }

  // If we're on a public route, don't wrap with the sidebar
  if (isPublicRoute(segments)) {
    return <Slot />;
  }

  // If authenticated and not on a public route, wrap with the sidebar
  return (
    <PersistentSidebar>
      <Slot />
    </PersistentSidebar>
  );
}