import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawerContent from '@/components/CustomDrawerContent';

export default function RootLayout() {
  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#192549',
          width: 230,
        },
        drawerActiveBackgroundColor: '#304878',
        drawerActiveTintColor: '#FFFFFF',
        drawerInactiveTintColor: '#94A3B8',
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {/* Route to the tabs/index.tsx file for Dashboard */}
      <Drawer.Screen
        name="(tabs)/index"
        options={{
          drawerLabel: 'Dashboard',
          title: 'Dashboard',
          drawerIcon: ({ size, color }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* Routes to other files within the (tabs) folder */}
      <Drawer.Screen
        name="(tabs)/drivers"
        options={{
          drawerLabel: 'Drivers',
          title: 'Drivers',
          drawerIcon: ({ size, color }) => (
            <Ionicons name="car-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="(tabs)/routes"
        options={{
          drawerLabel: 'Routes',
          title: 'Routes',
          drawerIcon: ({ size, color }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="(tabs)/users"
        options={{
          drawerLabel: 'Students/Parents',
          title: 'Students/Parents',
          drawerIcon: ({ size, color }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      
      <Drawer.Screen
        name="(tabs)/settings"
        options={{
          drawerLabel: 'Settings',
          title: 'Settings',
          drawerIcon: ({ size, color }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}