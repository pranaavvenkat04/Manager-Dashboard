import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { bottom } = useSafeAreaInsets();
  const [userName] = useState('Jane Doe');
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = () => {
    alert('Logging out...');
    // In a real app, implement your logout logic here
  };

  return (
    <View style={styles.container}>
      {/* Logo/Brand Header */}
      <View style={styles.header}>
        <ThemedText style={styles.logoText}>BusTrak</ThemedText>
      </View>

      {/* Main Drawer Items */}
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={styles.scrollContent}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Profile and Logout Section */}
      <View style={[styles.profileContainer, { marginBottom: bottom || 20 }]}>
        <TouchableOpacity 
          style={styles.profileSection} 
          onPress={() => setShowLogout(!showLogout)}
        >
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </View>
          <ThemedText style={styles.profileName}>{userName}</ThemedText>
        </TouchableOpacity>
        
        {showLogout && (
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={16} color="#EF4444" style={styles.logoutIcon} />
            <ThemedText style={styles.logoutText}>Logout</ThemedText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#192549', // Dark blue background
  },
  header: {
    height: 70,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollContent: {
    paddingTop: 8,
  },
  profileContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#304878',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  logoutIcon: {
    marginRight: 12,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '500',
  }
});