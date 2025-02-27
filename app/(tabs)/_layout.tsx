import React from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { SchoolProvider } from '@/components/SchoolProvider';
import { useNavigation } from '@react-navigation/native';

// Custom header left button component
function HeaderLeftButton() {
  const navigation = useNavigation();
  
  return (
    <TouchableOpacity
      style={{ marginLeft: 16 }}
      onPress={() => {
        // @ts-ignore - toggleDrawer exists on the drawer navigation
        navigation.toggleDrawer();
      }}
    >
      <Ionicons 
        name="menu" 
        size={24} 
        color="#1f2937"
      />
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
    <SchoolProvider>
      <Drawer
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: 'white',
            height: 70,
            borderBottomWidth: 1,
            borderBottomColor: '#E5E7EB',
          },
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 20,
            color: '#000000',
          },
          // Use our custom header left component
          headerLeft: () => <HeaderLeftButton />,
          drawerStyle: {
            width: 230,
          },
          drawerType: 'front',
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
            title: 'NYIT Dashboard',
            drawerLabel: 'Dashboard',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        
        {/* Drivers Route */}
        <Drawer.Screen
          name="drivers"
          options={{
            title: 'Drivers',
            drawerLabel: 'Drivers',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="car-outline" size={size} color={color} />
            ),
          }}
        />
        
        {/* Routes Management */}
        <Drawer.Screen
          name="routes"
          options={{
            title: 'Routes',
            drawerLabel: 'Routes',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="map-outline" size={size} color={color} />
            ),
          }}
        />
        
        {/* Students/Parents */}
        <Drawer.Screen
          name="users"
          options={{
            title: 'Students/Parents',
            drawerLabel: 'Students/Parents',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        
        {/* Settings */}
        <Drawer.Screen
          name="settings"
          options={{
            title: 'Settings',
            drawerLabel: 'Settings',
            drawerIcon: ({ size, color }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Drawer>
    </SchoolProvider>
  );
}