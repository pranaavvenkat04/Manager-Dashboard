import React, { useState, useEffect } from 'react';
import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import CustomDrawerContent from '@/components/CustomDrawerContent';
import { SchoolProvider } from '@/components/SchoolProvider';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key for sidebar state
const SIDEBAR_STATE_KEY = 'bustrak_sidebar_open';

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
  const [drawerWidth, setDrawerWidth] = useState(230);

  // Load saved sidebar state on component mount
  useEffect(() => {
    const loadSidebarState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(SIDEBAR_STATE_KEY);
        if (savedState !== null) {
          const isOpen = JSON.parse(savedState);
          setDrawerWidth(isOpen ? 230 : 70);
        }
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      }
    };
    
    loadSidebarState();
  }, []);

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
            width: drawerWidth,
          },
          drawerType: 'front',
          overlayColor: 'rgba(0,0,0,0.5)',
          drawerActiveTintColor: '#FFFFFF',
          drawerInactiveTintColor: '#94A3B8',
          drawerActiveBackgroundColor: '#304878',
          swipeEdgeWidth: 80,
        }}
        drawerContent={(props) => (
          <CustomDrawerContent 
            {...props} 
            setDrawerWidth={setDrawerWidth}
          />
        )}
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