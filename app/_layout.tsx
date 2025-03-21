// _layout.tsx
import React, { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator, Text } from 'react-native';
import PersistentSidebar from '@/components/PersistentSidebar';

// Your Clerk publishable key
const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || 'your_publishable_key_here';

// SecureStore token cache implementation for Clerk
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Root layout with authentication logic
export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <AuthProtection />
    </ClerkProvider>
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
  const { isLoaded, isSignedIn } = useAuth();

  // Add debug output
  useEffect(() => {
    console.log("[Root] Auth state check:", { 
      isLoaded, 
      isSignedIn, 
      currentRoute: segments.join('/')
    });
  }, [isLoaded, isSignedIn, segments]);

  // Handle routing based on auth state
  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) {
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
      // User is signed in
      if (isOnPublicRoute) {
        // If on a public route like login, redirect to main app
        console.log("[Root] Signed in user on public route, redirecting to main");
        router.replace('/');
      }
    } else {
      // User is NOT signed in
      if (!isOnPublicRoute) {
        // If trying to access a protected route, redirect to login
        console.log("[Root] Unsigned user on protected route, redirecting to login");
        router.replace('/login');
      }
    }
  }, [isLoaded, isSignedIn, segments, router]);

  // Show loading indicator while Clerk is loading
  if (!isLoaded) {
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