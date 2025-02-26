import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  
  return (
    <View style={styles.container}>
      {/* Main content with tabs (we're removing the second sidebar) */}
      <View style={styles.mainContent}>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            headerShown: false,
            tabBarStyle: { display: 'none' }, // Hide the default tab bar
          }}>
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="drivers"
            options={{
              title: 'Drivers',
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="routes"
            options={{
              title: 'Routes',
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="users"
            options={{
              title: 'Users',
              headerShown: false,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              headerShown: false,
            }}
          />
          {/* Add more tab screens as needed */}
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  mainContent: {
    flex: 1,
  },
});