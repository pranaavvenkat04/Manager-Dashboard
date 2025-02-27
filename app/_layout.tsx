import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { SchoolProvider } from '@/components/SchoolProvider';

export default function RootLayout() {
  return (
    <SchoolProvider>
      <Drawer
        screenOptions={{
          headerShown: false,
          drawerStyle: {
            width: 230, // Will be animated by our custom drawer content
          },
          drawerType: 'slide',
          overlayColor: 'rgba(0,0,0,0.5)',
          drawerActiveTintColor: '#FFFFFF',
          drawerInactiveTintColor: '#94A3B8',
          drawerActiveBackgroundColor: '#304878',
          swipeEdgeWidth: 80,
        }}
        drawerContent={(props) => <CustomDrawerContent {...props} />}
      >
        {/* Dashboard Route */}
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: 'Dashboard',
            title: 'Dashboard',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        
        {/* Drivers Route */}
        <Drawer.Screen
          name="drivers"
          options={{
            drawerLabel: 'Drivers',
            title: 'Drivers',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="car-outline" size={size} color={color} />
            ),
          }}
        />
        
        {/* Routes Management */}
        <Drawer.Screen
          name="routes"
          options={{
            drawerLabel: 'Routes',
            title: 'Routes',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="map-outline" size={size} color={color} />
            ),
          }}
        />
        
        {/* Students/Parents */}
        <Drawer.Screen
          name="users"
          options={{
            drawerLabel: 'Students/Parents',
            title: 'Students/Parents',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        
        {/* Settings */}
        <Drawer.Screen
          name="settings"
          options={{
            drawerLabel: 'Settings',
            title: 'Settings',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </SchoolProvider>
  );
}