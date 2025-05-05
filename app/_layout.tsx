import React, { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, SplashScreen } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppLayout from '@/components/AppLayout';
import { auth, initializeAppWithUser, signOut } from '../utils/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/Colors';

// Keep the app on splash screen until ready
SplashScreen.preventAutoHideAsync();

// Define the auth context type
interface AuthContextType {
  user: User | null;
  schoolData: any;
  isLoading: boolean;
}

// Auth context to manage user state
export const AuthContext = React.createContext<AuthContextType>({
  user: null,
  schoolData: null,
  isLoading: true,
});

// Function to determine if a route requires authentication
const requiresAuth = (segments: string[]) => {
  // The first segment is typically the stack group
  // For example: (tabs), login, forgot-password
  const firstSegment = segments[0];
  
  // Routes that don't require authentication
  const publicRoutes = ['login', 'forgot-password'];
  
  // If the first segment is in our public routes, no auth required
  if (publicRoutes.includes(firstSegment)) {
    return false;
  }
  
  // All other routes require authentication
  return true;
};

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Use a separate function for navigation to avoid premature navigation
  const navigateBasedOnAuth = () => {
    if (!authInitialized) return;
    
    const authRequired = requiresAuth(segments as string[]);
    const isLoginPage = segments[0] === 'login';

    if (authRequired && !user) {
      // If auth is required but user isn't logged in, redirect to login
      router.replace('/login');
    } else if (user && schoolData && isLoginPage) {
      // If user is logged in and on login screen, redirect to tabs
      router.replace('/(tabs)');
    }
  };

  // Handle routing based on authentication state
  useEffect(() => {
    if (authInitialized) {
      navigateBasedOnAuth();
    }
  }, [user, schoolData, segments, authInitialized]);

  // Check if the user is authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (authUser) {
          setUser(authUser);
          
          // Get the user's school data
          const userData = await initializeAppWithUser();
          if (userData) {
            setSchoolData(userData);
          } else {
            // If we couldn't get school data, sign out
            await signOut();
            setUser(null);
            setSchoolData(null);
          }
        } else {
          setUser(null);
          setSchoolData(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
        setSchoolData(null);
      } finally {
        setIsLoading(false);
        setAuthInitialized(true);
        // Hide splash screen after auth is checked
        SplashScreen.hideAsync();
      }
    });

    return unsubscribe;
  }, []);

  // Render loading state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, schoolData, isLoading }}>
      <SafeAreaProvider>
        <AppLayout>
          <Stack
            screenOptions={{
              headerShown: false, // Hide default header as we'll have our own in the sidebar
              contentStyle: { backgroundColor: '#F8FAFC' },
              animation: 'fade',
              animationDuration: 150,
              presentation: 'transparentModal',
              animationTypeForReplace: 'push',
            }}
          />
        </AppLayout>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}