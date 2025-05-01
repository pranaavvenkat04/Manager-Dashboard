// app/context/FirebaseAuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  deleteDoc 
} from 'firebase/firestore';
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase config - store this in environment variables in production
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

// Create the auth context
const FirebaseAuthContext = createContext();

// Export hook for using the context
export function useFirebaseAuth() {
  const context = useContext(FirebaseAuthContext);
  if (context === undefined) {
    throw new Error('useFirebaseAuth must be used within a FirebaseAuthProvider');
  }
  return context;
}

export function FirebaseAuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userMetadata, setUserMetadata] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Get additional user data from Firestore
        try {
          // First check if user is a manager 
          const managerData = await checkIfUserIsManager(user.uid);
          
          if (managerData) {
            // User is a manager
            console.log("Auth state: Found user as Manager");
            setUserRole("manager");
            setUserMetadata(managerData.data);
            setSchoolId(managerData.schoolId);
            
            // Save to AsyncStorage for offline access
            await saveUserToAsyncStorage(user.uid, "manager", managerData.data, managerData.schoolId);
          } else {
            console.error("Auth state: User not found or not a manager:", user.uid);
            setUserRole(null);
            setUserMetadata(null);
            setSchoolId(null);
            // Sign out non-managers automatically
            await firebaseSignOut(auth);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUserRole(null);
        setUserMetadata(null);
        setSchoolId(null);
        // Clear AsyncStorage when logged out
        try {
          await AsyncStorage.removeItem('userData');
        } catch (error) {
          console.error("Error clearing user data:", error);
        }
      }
      setLoading(false);
    });
  
    return unsubscribe;
  }, []);

  // Check if user is a manager
  const checkIfUserIsManager = async (userId) => {
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
          return { data: managerSnap.data(), schoolId };
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error checking if user is manager:", error);
      return null;
    }
  };

  // Save user data to AsyncStorage
  const saveUserToAsyncStorage = async (userId, role, userData, schoolId) => {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify({
        id: userId,
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        fullName: userData.fullName || `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
        email: userData.email,
        role: role,
        schoolId: schoolId,
        lastSignIn: userData.lastSignIn || new Date().toISOString()
      }));
    } catch (error) {
      console.error("Error saving user to AsyncStorage:", error);
    }
  };

  // Register a new manager (admin use only)
  const registerManager = async (firstName, lastName, email, password, schoolID) => {
    try {
      // Validate school ID
      if (!schoolID) {
        return { success: false, error: "School ID is required" };
      }

      // Verify if school exists
      const schoolRef = doc(db, "Schools", schoolID);
      const schoolSnap = await getDoc(schoolRef);
      
      if (!schoolSnap.exists()) {
        return { success: false, error: "Invalid School ID. Please check with your system administrator." };
      }
      
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Create manager document in Firestore (in the Managers subcollection under Schools)
      const managerDocRef = doc(db, `Schools/${schoolID}/Managers`, user.uid);
      const userData = {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        email,
        role: 'manager', 
        created_at: new Date().toISOString(),
        lastSignIn: new Date().toISOString(),
        schoolId: schoolID,
        permissions: {
          canManageDrivers: true,
          canManageRoutes: true,
          canManageStudents: true,
          canViewReports: true
        },
        soft_delete: false
      };
      
      await setDoc(managerDocRef, userData);
      
      return { success: true, user };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: error.message };
    }
  };

  // Sign in a user (manager)
  const signIn = async (email, password) => {
    try {
      // First authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log("Firebase Auth successful for:", user.uid);
      
      // Check if user is a manager
      const managerData = await checkIfUserIsManager(user.uid);
      
      // Handle user types based on what was found
      if (managerData) {
        // User is a manager
        setUserRole("manager");
        setUserMetadata(managerData.data);
        setSchoolId(managerData.schoolId);
        
        // Update last sign in
        const managerRef = doc(db, `Schools/${managerData.schoolId}/Managers`, user.uid);
        await updateDoc(managerRef, {
          lastSignIn: new Date().toISOString()
        });
        
        // Save to AsyncStorage
        await saveUserToAsyncStorage(user.uid, "manager", managerData.data, managerData.schoolId);
        
        console.log("Successfully logged in as manager");
        return { success: true, role: "manager" };
      } else {
        // User is not a manager
        console.log("User not found as manager");
        await firebaseSignOut(auth);
        return { 
          success: false, 
          error: `Access denied. This account does not have manager privileges.` 
        };
      }
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: error.message };
    }
  };

  // Sign out a user
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      await AsyncStorage.removeItem('userData');
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error: error.message };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Password reset error:", error);
      return { success: false, error: error.message };
    }
  };

  // Confirm password reset
  const confirmReset = async (code, newPassword) => {
    try {
      await confirmPasswordReset(auth, code, newPassword);
      return { success: true };
    } catch (error) {
      console.error("Confirm reset error:", error);
      return { success: false, error: error.message };
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error("No user is signed in");
      }
      
      // Special handling for school ID change
      if (updates.schoolId && updates.schoolId !== schoolId) {
        console.log(`Attempting to change school from ${schoolId} to ${updates.schoolId}`);
        
        // First, verify the new school exists
        const newSchoolRef = doc(db, "Schools", updates.schoolId);
        const newSchoolSnap = await getDoc(newSchoolRef);
        
        if (!newSchoolSnap.exists()) {
          return { success: false, error: "Invalid School ID. This school does not exist." };
        }
        
        // We need to copy the user data to the new school and delete from the old
        if (schoolId) { // Only if we have a previous school
          // Get current user data
          let userData = null;
          const managerRef = doc(db, `Schools/${schoolId}/Managers`, user.uid);
          const managerSnap = await getDoc(managerRef);
          
          if (managerSnap.exists()) {
            userData = managerSnap.data();
          }
          
          if (userData) {
            console.log(`Found user data in ${schoolId}, transferring to ${updates.schoolId}`);
            
            // Create user in new school with the same data
            await setDoc(doc(db, `Schools/${updates.schoolId}/Managers`, user.uid), {
              ...userData,
              schoolId: updates.schoolId,
              lastTransferred: new Date().toISOString()
            });
            
            // Delete from old school
            await deleteDoc(doc(db, `Schools/${schoolId}/Managers`, user.uid));
          }
        } else {
          console.log(`No previous school, adding to new school ${updates.schoolId}`);
          
          // No previous school, just add to new school
          const defaultData = {
            firstName: userMetadata?.firstName || "",
            lastName: userMetadata?.lastName || "",
            fullName: userMetadata?.fullName || "",
            email: user.email,
            role: "manager",
            created_at: new Date().toISOString(),
            lastSignIn: new Date().toISOString(),
            schoolId: updates.schoolId
          };
          
          await setDoc(doc(db, `Schools/${updates.schoolId}/Managers`, user.uid), defaultData);
        }
        
        // Update schoolId in context
        setSchoolId(updates.schoolId);
      } else if (schoolId) {
        // Regular update, no school change
        const managerDocRef = doc(db, `Schools/${schoolId}/Managers`, user.uid);
        await updateDoc(managerDocRef, { ...updates });
      } else {
        throw new Error("School ID not found and not being updated");
      }
      
      // Update Firebase Auth profile if display name is included
      if (updates.firstName || updates.lastName) {
        const newDisplayName = `${updates.firstName || userMetadata?.firstName || ""} ${updates.lastName || userMetadata?.lastName || ""}`.trim();
        await updateProfile(user, { displayName: newDisplayName });
      }
      
      // Update local state
      setUserMetadata(prev => ({ ...prev, ...updates }));
      
      // Update AsyncStorage
      const storedData = await AsyncStorage.getItem('userData');
      if (storedData) {
        const userData = JSON.parse(storedData);
        await AsyncStorage.setItem('userData', JSON.stringify({
          ...userData,
          ...updates,
          firstName: updates.firstName || userData.firstName,
          lastName: updates.lastName || userData.lastName,
          fullName: updates.firstName && updates.lastName ? 
            `${updates.firstName} ${updates.lastName}` : 
            userData.fullName,
          schoolId: updates.schoolId || userData.schoolId
        }));
      }
      
      return { success: true };
    } catch (error) {
      console.error("Update profile error:", error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    currentUser,
    userRole,
    userMetadata,
    schoolId,
    loading,
    registerManager,
    signIn,
    signOut,
    resetPassword,
    confirmReset,
    updateUserProfile
  };

  return (
    <FirebaseAuthContext.Provider value={value}>
      {!loading && children}
    </FirebaseAuthContext.Provider>
  );
}