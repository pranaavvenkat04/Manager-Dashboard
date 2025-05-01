import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Home, Users, Map, Settings, Truck } from 'lucide-react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';

import { UserProfile } from '@/components/UserProfile';

export default function TabsLayout() {
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  
  const auth = getAuth();
  const db = getFirestore();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if the user is a manager
        const isUserManager = await checkIfUserIsManager(user.uid);
        setIsManager(isUserManager);
      } else {
        setIsManager(false);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Function to check if the user is a manager
  const checkIfUserIsManager = async (userId: string) => {
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
  
  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }
  
  // This should never be hit because of the root protection,
  // but it's a good safety check
  if (!auth.currentUser || !isManager) {
    // We'll just show loading rather than redirecting
    // The root layout will handle redirecting to login
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4361ee" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#4361ee',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopColor: '#E5E7EB',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: 'white',
          borderBottomColor: '#E5E7EB',
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#111827',
        },
        headerRight: () => <UserProfile compact={true} showLogout={false} />,
        headerRightContainerStyle: {
          paddingRight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          title: "Routes",
          tabBarIcon: ({ color }) => <Map size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: "Drivers",
          tabBarIcon: ({ color }) => <Truck size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color }) => <Users size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}