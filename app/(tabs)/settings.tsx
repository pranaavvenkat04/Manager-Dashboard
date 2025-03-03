import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { User, Bell, Shield, Moon, HelpCircle, RefreshCw } from 'lucide-react';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';

export default function SettingsScreen() {
  const { schoolName } = useSchoolContext();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);

  // Setting toggle handlers
  const toggleNotifications = () => setNotifications(!notifications);
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleLocationTracking = () => setLocationTracking(!locationTracking);

  // Reset and logout handlers
  const handleResetApp = () => {
    Alert.alert(
      'Reset App',
      'Are you sure you want to reset all app data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            // Reset app logic here
            Alert.alert('Success', 'App has been reset');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => {
            // Logout logic here
            Alert.alert('Success', 'You have been logged out');
          }
        }
      ]
    );
  };

  // Render a setting item
  const renderSettingItem = (
    icon: React.ReactNode, 
    title: string, 
    description: string,
    control: React.ReactNode
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIconContainer}>
        {icon}
      </View>
      <View style={styles.settingContent}>
        <ThemedText style={styles.settingTitle}>{title}</ThemedText>
        <ThemedText style={styles.settingDescription}>{description}</ThemedText>
      </View>
      <View style={styles.settingControl}>
        {control}
      </View>
    </View>
  );

  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Settings</ThemedText>
        {schoolName && <ThemedText style={styles.schoolName}>{schoolName}</ThemedText>}
      </View>
      
      {/* Settings content */}
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>App Preferences</ThemedText>
          
          {renderSettingItem(
            <Bell size={22} color="#4361ee" />,
            "Notifications",
            "Receive push notifications about bus status",
            <Switch 
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={notifications ? '#4361ee' : '#f4f4f5'}
            />
          )}
          
          {renderSettingItem(
            <Moon size={22} color="#4361ee" />,
            "Dark Mode",
            "Switch between light and dark themes",
            <Switch 
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={darkMode ? '#4361ee' : '#f4f4f5'}
            />
          )}
          
          {renderSettingItem(
            <Shield size={22} color="#4361ee" />,
            "Location Tracking",
            "Allow the app to track bus location",
            <Switch 
              value={locationTracking}
              onValueChange={toggleLocationTracking}
              trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
              thumbColor={locationTracking ? '#4361ee' : '#f4f4f5'}
            />
          )}
        </View>
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Account</ThemedText>
          
          {renderSettingItem(
            <User size={22} color="#4361ee" />,
            "School Information",
            schoolName || "Manage your school details",
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          )}
          
          {renderSettingItem(
            <HelpCircle size={22} color="#4361ee" />,
            "Help & Support",
            "Get support or send feedback",
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          )}
        </View>
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>System</ThemedText>
          
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleResetApp}
          >
            <RefreshCw size={18} color="#FFFFFF" />
            <ThemedText style={styles.dangerButtonText}>Reset App</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
            <ThemedText style={styles.logoutButtonText}>Logout</ThemedText>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <ThemedText style={styles.versionText}>BusTrak v1.0.0</ThemedText>
          <ThemedText style={styles.copyrightText}>© 2025 BusTrak Team</ThemedText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
  },
  pageHeader: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  schoolName: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingControl: {
    marginLeft: 8,
  },
  dangerButton: {
    flexDirection: 'row',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  dangerButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#4361ee',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});