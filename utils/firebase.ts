// Firebase configuration for connecting to the actual Firebase database
// Import the functions you need from the SDKs you need
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps, getApp, deleteApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  Timestamp 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword as createUser,
  sendPasswordResetEmail as sendReset,
  signOut as firebaseSignOut,
  AuthErrorCodes,
  connectAuthEmulator
} from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
  
  

// Initialize Firebase if it hasn't been already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Error message mapping for auth errors
const authErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'Invalid email format.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Invalid login credentials.',
  'auth/too-many-requests': 'Too many attempts. Try again later.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/email-already-in-use': 'Email already in use.'
};

// Authentication functions
export const signIn = async (email: string, password: string) => {
  try {
    console.log('Attempting to sign in with:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    console.log('Sign in successful:', uid);
    
    // Get the school associated with this manager
    const schoolInfo = await getManagerSchool(uid);
    
    if (!schoolInfo) {
      throw new Error('User is not linked to any school. Please contact administrator.');
    }
    
    // Store the current school ID for use throughout the app
    await AsyncStorage.setItem('currentSchoolId', schoolInfo.schoolId);
    
    // Get school name and data from school document
    const schoolData = schoolInfo.schoolData as SchoolData;
    const schoolName = schoolData.name || 'Unknown School';
    const schoolCode = schoolData.schoolCode || '';
    const schoolAddress = schoolData.address || '';
    
    // Get the manager's details from the Managers subcollection
    const managerRef = doc(db, schoolInfo.schoolRef.path, 'Managers', uid);
    const managerDoc = await getDoc(managerRef);
    
    let firstName = '';
    let lastName = '';
    let fullName = 'Unknown Manager';
    let managerEmail = email;
    
    if (managerDoc.exists()) {
      const managerData = managerDoc.data();
      firstName = managerData.first_name || '';
      lastName = managerData.last_name || '';
      fullName = firstName && lastName ? `${firstName} ${lastName}` : managerData.fullName || 'Unknown Manager';
      managerEmail = managerData.email || email;
    }
    
    // Load all the school data
    const fullSchoolData = await loadSchoolDataFromRef(schoolInfo.schoolRef);
    
    // Return comprehensive data required for the dashboard
    return {
      user: {
        uid: userCredential.user.uid,
        email: managerEmail,
        firstName: firstName,
        lastName: lastName,
        name: fullName
      },
      school: {
        id: schoolInfo.schoolId,
        name: schoolName,
        code: schoolCode,
        address: schoolAddress,
        ref: schoolInfo.schoolRef
      },
      schoolData: fullSchoolData,
      counts: {
        routes: fullSchoolData.routes.length,
        users: fullSchoolData.users.length,
        drivers: fullSchoolData.drivers.length,
        vehicles: fullSchoolData.vehicles.length,
        activeTrips: fullSchoolData.activeTrips.length,
        completedTrips: fullSchoolData.completedTrips.length
      }
    };
  } catch (error: any) {
    console.error('Authentication error details:', error.code, error.message);
    
    // Get the error message based on the error code
    const errorMessage = error.code && authErrorMessages[error.code] 
      ? authErrorMessages[error.code] 
      : `Authentication failed: ${error.message}`;
    
    throw new Error(errorMessage);
  }
};

// Function to create a test user for debugging purposes
export const createTestUser = async (email: string, password: string, schoolId?: string) => {
  try {
    console.log('Creating test user:', email);
    const userCredential = await createUser(auth, email, password);
    
    // Create a manager record in Firestore
    const managerId = userCredential.user.uid;
    
    if (schoolId) {
      // Add user to Managers collection
      await setDoc(doc(db, 'Schools', schoolId, 'Managers', managerId), {
        fullName: 'Test Manager',
        email: email,
        role: 'manager',
        created_at: Timestamp.now()
      });

      // Create reference to school in Manager-School collection
      const schoolRef = doc(db, 'Schools', schoolId);
      await setDoc(doc(db, 'Manager-School', managerId), {
        'school-collection': schoolRef,
        created_at: Timestamp.now()
      });
    }
    
    console.log('Test user created successfully:', managerId);
    return managerId;
  } catch (error: any) {
    console.error('Error creating test user:', error.code, error.message);
    
    // Get the error message based on the error code
    const errorMessage = error.code && authErrorMessages[error.code] 
      ? authErrorMessages[error.code] 
      : `User creation failed: ${error.message}`;
    
    throw new Error(errorMessage);
  }
};

export const createUserWithEmailAndPassword = async (email: string, password: string) => {
  try {
    // Store the current user authentication state
    const currentUser = auth.currentUser;
    
    // Store the current school ID for restoration
    const currentSchoolId = await AsyncStorage.getItem('currentSchoolId');
    
    // Create the new user
    const userCredential = await createUser(auth, email, password);
    const newUserId = userCredential.user.uid;
    
    // Sign out the newly created user (this happens automatically when a new user is created)
    await firebaseSignOut(auth);
    
    // If we had a previous user (the manager), restore their session
    if (currentUser) {
      // Force the auth state to be refreshed
      await auth.updateCurrentUser(currentUser);
      
      // Restore the current school ID if needed
      if (currentSchoolId) {
        await AsyncStorage.setItem('currentSchoolId', currentSchoolId);
      }
    }
    
    return newUserId;
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(`User creation failed: ${error.message}`);
  }
};

// Create a new user without signing in as them (admin-like functionality)
export const createUserWithoutSignIn = async (email: string, password: string) => {
  try {
    // Store the current user information before creating a new user
    const currentUser = auth.currentUser;
    
    // If we don't have a current user, this is an error case
    if (!currentUser) {
      throw new Error('No authenticated user found to perform this operation');
    }
    
    // Store credentials for manager user restoration
    const currentUid = currentUser.uid;
    const currentIdToken = await currentUser.getIdToken();
    const currentSchoolId = await AsyncStorage.getItem('currentSchoolId');
    
    console.log('Creating new user without affecting manager session...');
    
    // Create a new Firebase Auth instance specifically for user creation
    // This isolates the auth operations from the main auth instance used for the manager
    const secondaryApp = initializeApp(firebaseConfig, 'secondaryApp');
    const secondaryAuth = getAuth(secondaryApp);
    
    try {
      // Create the user with the secondary auth instance
      const userCredential = await createUser(secondaryAuth, email, password);
      const newUserId = userCredential.user.uid;
      console.log('Created new user with ID:', newUserId);
      
      // Immediately trigger password reset
      try {
        await sendReset(secondaryAuth, email);
        console.log('Password reset email sent to new user:', email);
      } catch (resetError) {
        console.error('Error sending initial password reset:', resetError);
        // We'll continue even if reset email fails
      }
      
      // Sign out from the secondary app and delete it to clean up
      await firebaseSignOut(secondaryAuth);
      await deleteApp(secondaryApp);
      
      return newUserId;
    } catch (error) {
      // Clean up secondary app in case of error
      if (secondaryApp) {
        try {
          await deleteApp(secondaryApp);
        } catch (e) {
          console.error('Error cleaning up secondary app:', e);
        }
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error in createUserWithoutSignIn:', error);
    throw new Error(`User creation failed: ${error.message}`);
  }
};

export const sendPasswordResetEmail = async (email: string) => {
  try {
    console.log(`Attempting to send password reset email to: ${email}`);
    await sendReset(auth, email);
    console.log(`Password reset email sent successfully to: ${email}`);
    return true;
  } catch (error: any) {
    console.error('Password reset error details:', error.code, error.message);
    
    // Get a more specific error message based on Firebase error codes
    let errorMessage = 'Password reset failed';
    
    if (error.code) {
      switch(error.code) {
        case 'auth/invalid-email':
          errorMessage = 'The email address is not valid.';
          break;
        case 'auth/user-not-found':
          errorMessage = 'There is no user account with this email address.';
          break;
        case 'auth/missing-android-pkg-name':
        case 'auth/missing-continue-uri':
        case 'auth/missing-ios-bundle-id':
        case 'auth/invalid-continue-uri':
        case 'auth/unauthorized-continue-uri':
          errorMessage = 'There is a configuration issue with the reset email. Please contact support.';
          break;
        default:
          errorMessage = `Password reset failed: ${error.message}`;
      }
    }
    
    throw new Error(errorMessage);
  }
};

export const signOut = async () => {
  try {
    // Clear any stored data
    await AsyncStorage.removeItem('currentSchoolId');
    
    // Additional cleanup if needed
    // Add any other AsyncStorage keys that need to be cleared
    
    // Sign out from Firebase
    await firebaseSignOut(auth);
    
    console.log('User signed out successfully');
    return true;
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error(`Sign out failed: ${error.message}`);
  }
};

// Firestore methods
export const getSchool = async (schoolId: string) => {
  try {
    const schoolRef = doc(db, 'Schools', schoolId);
    const schoolDoc = await getDoc(schoolRef);
    
    if (schoolDoc.exists()) {
      return { id: schoolDoc.id, ...schoolDoc.data() };
    } else {
      throw new Error('School not found');
    }
  } catch (error: any) {
    throw new Error(`Error getting school: ${error.message}`);
  }
};

// Get data from a collection within a school
export const getSchoolCollection = async (schoolId: string, collectionName: string) => {
  try {
    const collectionRef = collection(db, 'Schools', schoolId, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error: any) {
    throw new Error(`Error getting ${collectionName}: ${error.message}`);
  }
};

// Add data to a collection within a school
export const addToSchoolCollection = async (schoolId: string, collectionName: string, data: any) => {
  try {
    const collectionRef = collection(db, 'Schools', schoolId, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      created_at: Timestamp.now()
    });
    
    return docRef.id;
  } catch (error: any) {
    throw new Error(`Error adding to ${collectionName}: ${error.message}`);
  }
};

// Update data in a collection within a school
export const updateInSchoolCollection = async (schoolId: string, collectionName: string, documentId: string, data: any) => {
  try {
    const docRef = doc(db, 'Schools', schoolId, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updated_at: Timestamp.now()
    });
  } catch (error: any) {
    throw new Error(`Error updating in ${collectionName}: ${error.message}`);
  }
};

// Delete data from a collection within a school
export const deleteFromSchoolCollection = async (schoolId: string, collectionName: string, documentId: string) => {
  try {
    const docRef = doc(db, 'Schools', schoolId, collectionName, documentId);
    await deleteDoc(docRef);
  } catch (error: any) {
    throw new Error(`Error deleting from ${collectionName}: ${error.message}`);
  }
};

// Store current school ID in AsyncStorage for app-wide access
export const setCurrentSchool = async (schoolId: string) => {
  try {
    await AsyncStorage.setItem('currentSchoolId', schoolId);
  } catch (error: any) {
    throw new Error(`Error storing school ID: ${error.message}`);
  }
};

export const getCurrentSchool = async () => {
  try {
    return await AsyncStorage.getItem('currentSchoolId');
  } catch (error: any) {
    throw new Error(`Error retrieving school ID: ${error.message}`);
  }
};

// Update school assignment for a manager - ADMIN ONLY FUNCTIONALITY
export const assignManagerToSchool = async (uid: string, schoolId: string) => {
  try {
    // Create a reference to the Schools collection
    const schoolRef = doc(db, 'Schools', schoolId);
    
    // Verify the school exists
    const schoolDoc = await getDoc(schoolRef);
    if (!schoolDoc.exists()) {
      throw new Error('School does not exist');
    }
    
    // Create or update the Manager-School document with the UID as the document ID
    await setDoc(doc(db, 'Manager-School', uid), {
      'school-collection': schoolRef,
      updated_at: Timestamp.now()
    });
    
    console.log(`Manager ${uid} linked to school ${schoolId}`);
    return true;
  } catch (error: any) {
    console.error('Error assigning manager to school:', error);
    throw new Error(`Failed to assign manager to school: ${error.message}`);
  }
};

// Define interfaces for data types
interface Stop {
  id: string;
  name: string;
  eta: number;
  latitude: number;
  longitude: number;
  order: number;
  status: boolean;
  created_at: any;
  created_by: string;
  deleted_at?: any;
  deleted_by?: string;
  soft_delete?: boolean;
}

interface Route {
  id: string;
  code: string;
  title: string;
  description: string;
  interval: number;
  stops_count: number;
  active: boolean;
  created_at: any;
  created_by: string;
  deleted_at?: any;
  deleted_by?: string;
  soft_delete?: boolean;
  stops?: Stop[];
}

// Define interface for school data
interface SchoolData {
  name: string;
  [key: string]: any;
}

// Get school data for a manager by their UID
export const getManagerSchool = async (uid: string) => {
  try {
    // Get the document from Manager-School collection where document ID = UID
    const managerSchoolRef = doc(db, 'Manager-School', uid);
    const managerSchoolDoc = await getDoc(managerSchoolRef);
    
    if (!managerSchoolDoc.exists()) {
      console.log(`No school mapping found for manager ${uid}`);
      return null;
    }
    
    // Get the reference to the school document
    const schoolRef = managerSchoolDoc.data()['school-collection'];
    
    // Get the actual school document using the reference
    const schoolDoc = await getDoc(schoolRef);
    
    if (!schoolDoc.exists()) {
      throw new Error('Referenced school document does not exist');
    }
    
    return {
      schoolId: schoolDoc.id,
      schoolRef: schoolRef,
      schoolData: schoolDoc.data()
    };
  } catch (error: any) {
    console.error('Error getting manager school:', error);
    throw new Error(`Failed to get manager school: ${error.message}`);
  }
};

// Load all school data from a school reference
export const loadSchoolDataFromRef = async (schoolRef: any) => {
  try {
    const schoolId = schoolRef.id;
    
    // Get the base school data
    const schoolDoc = await getDoc(schoolRef);
    if (!schoolDoc.exists()) {
      throw new Error('School document does not exist');
    }
    const schoolDocData = schoolDoc.data() || {};
    const schoolData = { id: schoolId, ...schoolDocData };
    
    // Get routes and their stops
    const routesRef = collection(db, schoolRef.path, 'Routes');
    const routesSnapshot = await getDocs(routesRef);
    const routes = routesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Route[];
    
    // Get stops for each route
    const routesWithStops = await Promise.all(
      routes.map(async (route) => {
        const stopsRef = collection(db, schoolRef.path, 'Routes', route.id, 'Stops');
        const stopsSnapshot = await getDocs(stopsRef);
        const stops = stopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Stop[];
        
        return {
          ...route,
          stops: stops.sort((a, b) => a.order - b.order)
        };
      })
    );
    
    // Get managers
    const managersRef = collection(db, schoolRef.path, 'Managers');
    const managersSnapshot = await getDocs(managersRef);
    const managers = managersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get users
    const usersRef = collection(db, schoolRef.path, 'Users');
    const usersSnapshot = await getDocs(usersRef);
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get drivers
    const driversRef = collection(db, schoolRef.path, 'Drivers');
    const driversSnapshot = await getDocs(driversRef);
    const drivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get vehicles
    const vehiclesRef = collection(db, schoolRef.path, 'Vehicles');
    const vehiclesSnapshot = await getDocs(vehiclesRef);
    const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get active trips
    const activeTripsRef = collection(db, schoolRef.path, 'ActiveTrips');
    const activeTripsSnapshot = await getDocs(activeTripsRef);
    const activeTrips = activeTripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get completed trips
    const completedTripsRef = collection(db, schoolRef.path, 'CompletedTrips');
    const completedTripsSnapshot = await getDocs(completedTripsRef);
    const completedTrips = completedTripsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    return {
      school: schoolData,
      routes: routesWithStops,
      managers,
      users,
      drivers,
      vehicles,
      activeTrips,
      completedTrips
    };
  } catch (error: any) {
    console.error('Error loading school data:', error);
    throw new Error(`Failed to load school data: ${error.message}`);
  }
};

// Export for access throughout the app
export { db, auth, Timestamp };

// Utility function to initialize app with current user if available
export const initializeAppWithUser = async () => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.log('No user logged in, redirecting to login');
      return null;
    }
    
    console.log('User already logged in, loading data');
    
    // First check if the current user is a manager by looking in the Manager-School collection
    const managerSchoolRef = doc(db, 'Manager-School', currentUser.uid);
    const managerSchoolDoc = await getDoc(managerSchoolRef);
    
    if (!managerSchoolDoc.exists()) {
      console.log(`This user (${currentUser.uid}) is not a manager. Signing out.`);
      // This is not a manager user, so sign them out - they shouldn't be using this app
      await signOut();
      return null;
    }
    
    // Only if they are a manager, get their school data
    const userData = await getCurrentUserSchoolData();
    
    return userData;
  } catch (error: any) {
    console.error('Error initializing app with user:', error);
    
    // If there's an error loading user data, sign out to reset state
    try {
      await signOut();
    } catch (signOutError) {
      console.error('Error signing out after failed initialization:', signOutError);
    }
    
    return null;
  }
};

// Define interfaces for the processed data
interface ProcessedUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  [key: string]: any;
}

interface ProcessedDriver {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  [key: string]: any;
}

interface ProcessedRoute {
  id: string;
  name: string;
  [key: string]: any;
}

// Updated getCurrentUserSchoolData to match the signIn return structure
export const getCurrentUserSchoolData = async () => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('No user is currently logged in');
    }
    
    // Get the school associated with this manager
    const schoolInfo = await getManagerSchool(currentUser.uid);
    
    if (!schoolInfo) {
      throw new Error('User is not linked to any school');
    }
    
    // Get school name and data from school document
    const schoolData = schoolInfo.schoolData as SchoolData;
    const schoolName = schoolData.name || 'Unknown School';
    const schoolCode = schoolData.schoolCode || '';
    const schoolAddress = schoolData.address || '';
    
    // Get the manager's details from the Managers subcollection
    const managerRef = doc(db, schoolInfo.schoolRef.path, 'Managers', currentUser.uid);
    const managerDoc = await getDoc(managerRef);
    
    let firstName = '';
    let lastName = '';
    let fullName = 'Unknown Manager';
    let managerEmail = currentUser.email || '';
    
    if (managerDoc.exists()) {
      const managerData = managerDoc.data();
      firstName = managerData.first_name || '';
      lastName = managerData.last_name || '';
      
      // Try different field combinations for the manager's name
      if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
      } else if (managerData.firstName && managerData.lastName) {
        firstName = managerData.firstName;
        lastName = managerData.lastName;
        fullName = `${managerData.firstName} ${managerData.lastName}`;
      } else if (managerData.fullName) {
        fullName = managerData.fullName;
      }
      
      managerEmail = managerData.email || managerEmail;
    }
    
    // Load all the school data
    const fullSchoolData = await loadSchoolDataFromRef(schoolInfo.schoolRef);
    
    // Ensure proper field mappings for all entities
    const processedData = {
      // Process Routes - ensure name field is used
      routes: fullSchoolData.routes.map(route => {
        const routeData = route as any;
        const processedRoute: ProcessedRoute = {
          ...routeData,
          id: routeData.id,
          name: routeData.name || routeData.title || 'Unnamed Route'
        };
        return processedRoute;
      }),
      
      // Process Users - ensure firstName, lastName fields are used
      users: fullSchoolData.users.map(user => {
        const userData = user as any;
        const processedUser: ProcessedUser = {
          ...userData,
          id: userData.id,
          firstName: userData.firstName || userData.first_name || '',
          lastName: userData.lastName || userData.last_name || '',
          fullName: userData.fullName || 
                   (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : '') ||
                   (userData.first_name && userData.last_name ? `${userData.first_name} ${userData.last_name}` : 'Unnamed User')
        };
        return processedUser;
      }),
      
      // Process Drivers - ensure firstName, lastName fields are used
      drivers: fullSchoolData.drivers.map(driver => {
        const driverData = driver as any;
        const processedDriver: ProcessedDriver = {
          ...driverData,
          id: driverData.id,
          firstName: driverData.firstName || driverData.first_name || '',
          lastName: driverData.lastName || driverData.last_name || '',
          fullName: driverData.fullName || 
                   (driverData.firstName && driverData.lastName ? `${driverData.firstName} ${driverData.lastName}` : '') ||
                   (driverData.first_name && driverData.last_name ? `${driverData.first_name} ${driverData.last_name}` : 'Unnamed Driver')
        };
        return processedDriver;
      }),
      
      // Include other collections as is
      managers: fullSchoolData.managers,
      vehicles: fullSchoolData.vehicles,
      activeTrips: fullSchoolData.activeTrips,
      completedTrips: fullSchoolData.completedTrips,
      school: fullSchoolData.school
    };
    
    return {
      user: {
        uid: currentUser.uid,
        email: managerEmail,
        firstName: firstName,
        lastName: lastName,
        name: fullName
      },
      school: {
        id: schoolInfo.schoolId,
        name: schoolName,
        code: schoolCode,
        address: schoolAddress,
        ref: schoolInfo.schoolRef
      },
      schoolData: processedData,
      counts: {
        routes: processedData.routes.length,
        users: processedData.users.length,
        drivers: processedData.drivers.length,
        vehicles: processedData.vehicles.length,
        activeTrips: processedData.activeTrips.length,
        completedTrips: processedData.completedTrips.length
      }
    };
  } catch (error: any) {
    console.error('Error getting current user school data:', error);
    throw new Error(`Failed to get school data: ${error.message}`);
  }
};

// Add a utility function to refresh auth state after operations that might disrupt it
export const refreshAuthState = async () => {
  try {
    // Get current user
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      console.warn('No current user found when trying to refresh auth state');
      return false;
    }
    
    // Ensure the current school ID is set in AsyncStorage
    const currentSchoolId = await AsyncStorage.getItem('currentSchoolId');
    
    if (!currentSchoolId) {
      // Try to fetch the school ID for the current user
      const schoolInfo = await getManagerSchool(currentUser.uid);
      
      if (schoolInfo) {
        // Store the school ID
        await AsyncStorage.setItem('currentSchoolId', schoolInfo.schoolId);
      } else {
        console.warn('Could not find a school for the current user during auth refresh');
        return false;
      }
    }
    
    // Force a refresh of the auth token
    await currentUser.getIdToken(true);
    
    // Update the current user in auth to trigger a state refresh
    await auth.updateCurrentUser(currentUser);
    
    return true;
  } catch (error) {
    console.error('Error refreshing auth state:', error);
    return false;
  }
};

// Add a function to delete a user from Firebase Authentication
export const deleteUserFromAuth = async (uid: string) => {
  try {
    // Create a secondary app instance to handle deletion
    const secondaryApp = initializeApp(firebaseConfig, 'secondaryForDeletion');
    const secondaryAuth = getAuth(secondaryApp);
    
    // We need to be signed in as the user to delete them
    // This would typically require the user's credentials, which we don't have
    // In a production environment, this should be done via a secure Cloud Function
    
    console.log('Attempting to delete user from Firebase Auth:', uid);
    
    try {
      // For this client-side implementation, we'll use a workaround
      // WARNING: This approach has limitations and should ideally be replaced with a Cloud Function
      
      // Sign in the user with a dummy email and password to obtain their credentials
      // This is a placeholder and will not work in production
      // const credential = await signInWithCustomToken(secondaryAuth, token);
      
      // Instead of actually deleting the user, we can disable their account
      // This approach respects Firebase security rules but requires Admin SDK access
      // or a Cloud Function in a production environment
      
      console.log('Unable to delete user from client side. A server-side function would be required.');
      console.log('For now, we\'ll just keep the user soft-deleted in Firestore.');
      
      // Properly clean up secondary app
      await deleteApp(secondaryApp);
      
      return { success: false, message: 'Client-side deletion not supported. User is soft-deleted in Firestore.' };
    } catch (error) {
      // Clean up secondary app in case of error
      await deleteApp(secondaryApp);
      throw error;
    }
  } catch (error: any) {
    console.error('Error in deleteUserFromAuth:', error);
    throw new Error(`Failed to delete user from authentication: ${error.message}`);
  }
}; 