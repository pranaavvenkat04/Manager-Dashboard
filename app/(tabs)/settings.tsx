import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { User, Bell, Shield, Moon, HelpCircle, RefreshCw } from 'lucide-react';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import { useAuth, useClerk } from '@clerk/clerk-expo';
import { router } from 'expo-router';

import { Platform } from 'react-native';

export default function SettingsScreen() {
  const { schoolName } = useSchoolContext();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationTracking, setLocationTracking] = useState(true);
  const { signOut, isSignedIn } = useAuth();
  const clerk = useClerk();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Setting toggle handlers
  const toggleNotifications = () => setNotifications(!notifications);
  const toggleDarkMode = () => setDarkMode(!darkMode);
  const toggleLocationTracking = () => setLocationTracking(!locationTracking);
  
  useEffect(() => {
    console.log("[Settings] Auth state:", { signOut: !!signOut, isSignedIn });
  }, [signOut, isSignedIn]);

  // Reset app handler
  const handleResetApp = () => {
    console.log("[Settings] Reset App button clicked");
    
    // Check if we're on web platform
    if (Platform.OS === 'web') {
      // Web browser confirmation
      if (window.confirm("Are you sure you want to reset all app data? This action cannot be undone.")) {
        // Reset app logic here
        console.log("[Settings] Resetting app data");
        // Show success message with browser alert
        window.alert("Success: App has been reset");
      } else {
        console.log("[Settings] Reset cancelled");
      }
    } else {
      // Mobile Alert
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
              console.log("[Settings] Resetting app data");
              Alert.alert('Success', 'App has been reset');
            }
          }
        ]
      );
    }
  };

  // Safer logout logic for web browsers
  const safeWebLogout = () => {
    try {
      console.log("[Settings] Starting safe web logout");
      
      // Set the logging out flag to prevent multiple clicks
      setIsLoggingOut(true);
      
      // For web browsers, the most reliable approach is to navigate to
      // login page via direct URL change
      if (typeof window !== 'undefined') {
        // Store logout intent in session storage
        window.sessionStorage.setItem('loggingOut', 'true');
        
        // Wait a moment and then change location directly
        // This is more reliable than router.replace for auth state changes
        setTimeout(() => {
          window.location.href = '/login';
          
          // Perform the signOut in the next cycle after navigation starts
          setTimeout(() => {
            try {
              if (clerk) {
                clerk.signOut();
              }
            } catch (err) {
              console.error("[Settings] Error in delayed signOut:", err);
            }
          }, 100);
        }, 10);
      }
    } catch (error) {
      console.error("[Settings] Error in safeWebLogout:", error);
      setIsLoggingOut(false);
      
      // Show error message
      if (Platform.OS === 'web') {
        alert("Logout failed. Please try again.");
      }
    }
  };

  // Mobile-specific logout function
  const safeMobileLogout = async () => {
    try {
      console.log("[Settings] Starting safe mobile logout");
      
      // Set the logging out flag
      setIsLoggingOut(true);
      
      // For mobile, we can use a more straightforward approach
      // First navigate to login
      router.replace('/login');
      
      // Then sign out after a short delay
      setTimeout(async () => {
        try {
          if (signOut) {
            await signOut();
          }
          console.log("[Settings] Mobile signOut completed");
        } catch (signOutErr) {
          console.error("[Settings] Error in delayed mobile signOut:", signOutErr);
        }
      }, 300);
    } catch (error) {
      console.error("[Settings] Error in safeMobileLogout:", error);
      setIsLoggingOut(false);
      
      // Show error message
      Alert.alert("Error", "Logout failed. Please try again.");
    }
  };

  // Main logout handler with confirmation
  const handleLogout = async () => {
    // Prevent multiple clicks
    if (isLoggingOut) {
      console.log("[Settings] Logout already in progress, ignoring click");
      return;
    }
    
    console.log("[Settings] Logout button clicked");
    
    // Create confirmation function
    const confirmLogout = () => {
      if (Platform.OS === 'web') {
        safeWebLogout();
      } else {
        safeMobileLogout();
      }
    };
  
    // Show confirmation dialog
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to logout?")) {
        confirmLogout();
      } else {
        console.log("[Settings] Logout cancelled");
      }
    } else {
      Alert.alert(
        "Confirm Logout",
        "Are you sure you want to logout?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => console.log("[Settings] Logout cancelled")
          },
          {
            text: "Logout",
            onPress: confirmLogout
          }
        ]
      );
    }
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
            disabled={isLoggingOut}
          >
            <RefreshCw size={18} color="#FFFFFF" />
            <ThemedText style={styles.dangerButtonText}>Reset App</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.logoutButton,
              isLoggingOut && styles.logoutButtonDisabled
            ]}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#FFFFFF" />
            <ThemedText style={styles.logoutButtonText}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </ThemedText>
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
  logoutButtonDisabled: {
    backgroundColor: '#93c5fd',
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