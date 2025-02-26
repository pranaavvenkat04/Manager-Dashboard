import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, Animated, TouchableOpacity} from 'react-native';
import { User, Home, Settings } from 'lucide-react';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [showProfileTooltip, setShowProfileTooltip] = useState(false);
  const [highlightPosition] = useState(new Animated.Value(0));

  // Update highlight position when tab changes
  const handleTabPress = (index: number) => {
    Animated.timing(highlightPosition, {
      toValue: index,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Animation for the highlight position
  const translateY = highlightPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60] // Distance between tabs
  });

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        {/* Profile and navigation icons vertically centered */}
        <View style={styles.sidebarNav}>
          {/* Animated highlight background that moves between icons */}
          <Animated.View 
            style={[
              styles.highlightBackground,
              {
                transform: [{ translateY }]
              }
            ]}
          />
        
          {/* Profile icon with tooltip */}
          <View style={styles.profileContainer}>
            <TouchableOpacity 
              style={styles.profileIcon}
              onPress={() => setShowProfileTooltip(!showProfileTooltip)}
            >
              <User size={24} color="white" />
            </TouchableOpacity>
            
            {showProfileTooltip && (
              <View style={styles.tooltip}>
                <ThemedText style={styles.tooltipText}>Logged in as: Admin</ThemedText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Main content with tabs */}
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
              tabBarIcon: ({ color }) => <Home size={24} color={color} />,
            }}
            listeners={{
              tabPress: () => handleTabPress(0),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
            }}
            listeners={{
              tabPress: () => handleTabPress(1),
            }}
          />
          {/* Add more tab screens here as needed */}
        </Tabs>
      </View>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 70,
    backgroundColor: '#242759', // Dark blue matching screenshot
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center', // Center everything vertically
  },
  sidebarNav: {
    alignItems: 'center',
    position: 'relative', // For positioning the highlight
  },
  highlightBackground: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4361ee',
    zIndex: -1, // Behind the icons
  },
  profileContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileIcon: {
    backgroundColor: '#4361ee', // Blue
    width: 44,
    height: 44, 
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute',
    left: 52,
    top: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 4,
    zIndex: 1000,
    minWidth: 130,
  },
  tooltipText: {
    color: 'white',
    fontSize: 12,
  },
  mainContent: {
    flex: 1,
  },
});