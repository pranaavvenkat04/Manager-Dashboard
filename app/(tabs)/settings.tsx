import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, TouchableOpacity, Switch, ScrollView, Alert, Modal, Platform } from 'react-native';
import { User, Bell, Shield, Moon, HelpCircle, RefreshCw, X, Building2 } from 'lucide-react';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '../../utils/firebase';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import { Theme } from '@/constants/Colors';
import { AuthContext } from '@/app/_layout';

// School Info Modal Component
interface SchoolInfoModalProps {
  isVisible: boolean;
  onClose: () => void;
  schoolData: {
    name?: string;
    id?: string;
    code?: string;
    address?: string;
  } | null;
}

const SchoolInfoModal = ({ isVisible, onClose, schoolData }: SchoolInfoModalProps) => {
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>School Information</ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>School Name</ThemedText>
                <ThemedText style={styles.infoValue}>{schoolData?.name || "Not Available"}</ThemedText>
              </View>
              
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>School ID</ThemedText>
                <ThemedText style={styles.infoValue}>{schoolData?.id || "Not Available"}</ThemedText>
              </View>
              
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>School Code</ThemedText>
                <ThemedText style={styles.infoValue}>{schoolData?.code || "Not Available"}</ThemedText>
              </View>
              
              <View style={styles.infoItem}>
                <ThemedText style={styles.infoLabel}>Address</ThemedText>
                <ThemedText style={styles.infoValue}>{schoolData?.address || "Not Available"}</ThemedText>
              </View>
            </View>
          </ScrollView>
          
          <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
            <ThemedText style={styles.closeModalButtonText}>Close</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function SettingsScreen() {
  const { schoolName } = useSchoolContext();
  const { schoolData } = useContext(AuthContext);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [isSchoolInfoModalVisible, setIsSchoolInfoModalVisible] = useState(false);
  const router = useRouter();
  
  // Create a local schoolData object for the modal
  const [localSchoolData, setLocalSchoolData] = useState<{
    name?: string;
    id?: string;
    code?: string;
    address?: string;
  }>({
    name: schoolName || '',
    id: '',
    code: '',
    address: ''
  });
  
  // Update localSchoolData when Firebase data changes
  useEffect(() => {
    console.log('Settings screen - schoolData updated:', schoolData);
    
    if (schoolData) {
      let schoolInfo = null;
      
      // Try to find school info at different possible paths
      if (schoolData.school) {
        console.log('Found school data at schoolData.school:', schoolData.school);
        schoolInfo = schoolData.school;
      } else if (schoolData.schoolData && schoolData.schoolData.school) {
        console.log('Found school data at schoolData.schoolData.school:', schoolData.schoolData.school);
        schoolInfo = schoolData.schoolData.school;
      }
      
      if (schoolInfo) {
        console.log('Setting local school data from Firebase:', schoolInfo);
        
        // More detailed debugging for school code
        console.log('Checking all possible school code paths:');
        console.log('- schoolInfo.schoolCode:', schoolInfo.schoolCode);
        console.log('- schoolInfo.code:', schoolInfo.code);
        console.log('- schoolData.school.code:', schoolData.school?.code);
        
        // Determine school code from various possible sources
        const foundSchoolCode = schoolInfo.schoolCode || schoolInfo.code || schoolData.school?.code || '';
        console.log('Final determined school code:', foundSchoolCode);
        
        setLocalSchoolData({
          name: schoolInfo.name || schoolName || '',
          id: schoolInfo.id || '',
          code: foundSchoolCode,
          address: schoolInfo.address || ''
        });
      }
    }
  }, [schoolData, schoolName]);

  // Setting toggle handlers
  const toggleNotifications = () => setNotifications(!notifications);
  const toggleDarkMode = () => setDarkMode(!darkMode);
  
  // Modal handlers
  const openSchoolInfoModal = () => setIsSchoolInfoModalVisible(true);
  const closeSchoolInfoModal = () => setIsSchoolInfoModalVisible(false);

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

  const handleLogout = async () => {
    try {
      await signOut();
      // After successful logout, router will redirect to login
      // via the _layout.tsx effect
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // Render a setting item
  const renderSettingItem = (
    icon: React.ReactNode, 
    title: string, 
    description: string,
    control: React.ReactNode,
    onPress?: () => void
  ) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress}
      disabled={!onPress}
    >
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Settings</ThemedText>
        {localSchoolData.name && <ThemedText style={styles.schoolName}>{localSchoolData.name}</ThemedText>}
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
        </View>
        
        <View style={styles.section}>
          <ThemedText style={styles.sectionHeader}>Account</ThemedText>
          
          {renderSettingItem(
            <Building2 size={22} color="#4361ee" />,
            "School Information",
            schoolName || "Manage your school details",
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />,
            openSchoolInfoModal
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
      
      {/* School Info Modal */}
      <SchoolInfoModal 
        isVisible={isSchoolInfoModalVisible}
        onClose={closeSchoolInfoModal}
        schoolData={localSchoolData}
      />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
      }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  modalScrollView: {
    flex: 1,
  },
  infoSection: {
    flex: 1,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  infoValue: {
    fontSize: 15,
    color: Theme.colors.text.primary,
  },
  closeModalButton: {
    backgroundColor: '#4361ee',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});