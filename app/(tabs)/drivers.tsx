import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, Animated, TextInput, Alert, Platform } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import DriverModal from '@/components/modals/DriverModal';
import { sendPasswordResetEmail, createUserWithEmailAndPassword, createUserWithoutSignIn, refreshAuthState, auth, deleteUserFromAuth } from '@/utils/firebase';
import { db, getCurrentSchool, Timestamp } from '@/utils/firebase';
import { collection, getDocs, query, where, doc, addDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { Theme } from '@/constants/Colors';
import { AuthContext } from '@/app/_layout';

// Define interface for Driver based on Firestore structure
interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school_id: string;
  assigned_vehicle_id: string | null;
  auth_uid?: string;
  soft_delete?: boolean;
  deleted_at?: any;
  deleted_by?: string;
}

export default function DriversScreen() {
  const { schoolName } = useSchoolContext();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Get the current user from Auth Context
  const { user } = useContext(AuthContext);
  
  // Get manager ID for metadata tracking
  const managerId = user?.uid || '';
  // Keep the display name for UI (can still be used in alerts, UI, etc.)
  const managerName = 'School Manager';

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await fetchDrivers();
        
        // Animate content fade-in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error loading driver data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Fetch drivers from Firestore
  const fetchDrivers = async () => {
    try {
      const currentSchoolId = await getCurrentSchool();
      if (!currentSchoolId) {
        console.error('No school ID found');
        return;
      }
      
      // Query to get non-deleted drivers from current school
      const driversRef = collection(db, 'Schools', currentSchoolId, 'Drivers');
      const q = query(driversRef, where('soft_delete', '!=', true));
      const querySnapshot = await getDocs(q);
      
      const driversData: Driver[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        driversData.push({
          id: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          school_id: currentSchoolId,
          assigned_vehicle_id: data.assigned_vehicle_id || null,
          soft_delete: data.soft_delete || false,
          auth_uid: data.auth_uid || undefined
        });
      });
      
      // Sort drivers by name
      driversData.sort((a, b) => {
        return a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName);
      });
      
      setDrivers(driversData);
      setFilteredDrivers(driversData);
      return driversData;
    } catch (error) {
      console.error('Error fetching drivers:', error);
      return [];
    }
  };

  // Filter drivers when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredDrivers(drivers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = drivers.filter(driver => 
        driver.firstName.toLowerCase().includes(query) ||
        driver.lastName.toLowerCase().includes(query) ||
        driver.email.toLowerCase().includes(query) ||
        driver.phone.includes(query)
      );
      setFilteredDrivers(filtered);
    }
  }, [searchQuery, drivers]);

  // Open modal to add a new driver
  const handleAddDriver = () => {
    setCurrentDriver(null);
    setIsEditMode(false);
    setIsModalVisible(true);
  };

  // Save driver changes
  const onSaveDriver = async (updatedDriver: Driver) => {
    if (isEditMode && currentDriver) {
      // Update existing driver
      await onUpdateDriver(updatedDriver);
    } else {
      // Create new driver
      await onAddDriver(updatedDriver);
    }
    
    setIsModalVisible(false);
  };

  // Function to add a new driver
  const onAddDriver = async (updatedDriver: Driver) => {
    try {
      const currentSchoolId = await getCurrentSchool();
      const currentManagerId = auth.currentUser?.uid;
      
      if (!currentSchoolId || !currentManagerId) {
        Alert.alert('Error', 'School or manager information is missing');
        return;
      }
      
      setIsLoading(true);
      
      // 1. Create Authentication account first
      let authUserId = '';
      try {
        // Generate a random password for initial account
        const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4) + '!2';
        
        // Create auth user with email/password without disturbing manager session
        authUserId = await createUserWithoutSignIn(updatedDriver.email, tempPassword);
        console.log('Created auth user with ID:', authUserId);
        
        // No need to verify manager session as we're using a secondary auth instance
      } catch (authError: any) {
        console.error('Failed to create authentication user:', authError);
        Alert.alert('Error', `Failed to create authentication account: ${authError.message}`);
        setIsLoading(false);
        return;
      }
      
      // 2. Create a new driver in Firestore using the auth UID as the document ID
      try {
        const driversRef = collection(db, 'Schools', currentSchoolId, 'Drivers');
        const newDriverData = {
          firstName: updatedDriver.firstName,
          lastName: updatedDriver.lastName,
          email: updatedDriver.email,
          phone: updatedDriver.phone,
          assigned_vehicle_id: updatedDriver.assigned_vehicle_id || null,
          soft_delete: false,
          created_at: Timestamp.now(),
          created_by: currentManagerId,
          auth_uid: authUserId
        };
        
        // Use the auth UID as the document ID
        await setDoc(doc(driversRef, authUserId), newDriverData);
      } catch (firestoreError: any) {
        console.error('Failed to add driver to Firestore:', firestoreError);
        Alert.alert('Error', `Driver account created but failed to save details: ${firestoreError.message}`);
        setIsLoading(false);
        return;
      }
      
      // 3. Password reset email is already sent automatically by createUserWithoutSignIn
      
      // 4. Refresh driver list
      await fetchDrivers();
      
      Alert.alert('Success', `Driver ${updatedDriver.firstName} ${updatedDriver.lastName} added successfully. A password reset email has been sent.`);
    } catch (error: any) {
      console.error('Error adding driver:', error);
      Alert.alert('Error', `Failed to add driver: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update an existing driver
  const onUpdateDriver = async (updatedDriver: Driver) => {
    try {
      const currentSchoolId = await getCurrentSchool();
      const currentManagerId = auth.currentUser?.uid;
      
      if (!currentSchoolId || !currentManagerId || !updatedDriver.id) {
        Alert.alert('Error', 'School or driver information is missing');
        return;
      }
      
      setIsLoading(true);
      
      // Get current driver data to preserve fields we don't want to overwrite
      const driverRef = doc(db, 'Schools', currentSchoolId, 'Drivers', updatedDriver.id);
      const driverDoc = await getDoc(driverRef);
      
      if (!driverDoc.exists()) {
        Alert.alert('Error', 'Driver document not found');
        setIsLoading(false);
        return;
      }
      
      // Keep email from being updated if user exists in auth system
      const existingData = driverDoc.data();
      const emailChanged = existingData.email !== updatedDriver.email;
      
      if (emailChanged && existingData.auth_uid) {
        Alert.alert(
          'Warning', 
          'Email address cannot be changed for drivers with existing accounts. Other information has been updated.'
        );
        
        // Keep the original email
        updatedDriver.email = existingData.email;
      }
      
      // Update the document in Firestore
      await updateDoc(driverRef, {
        firstName: updatedDriver.firstName,
        lastName: updatedDriver.lastName,
        email: updatedDriver.email,
        phone: updatedDriver.phone,
        assigned_vehicle_id: updatedDriver.assigned_vehicle_id,
        updated_at: Timestamp.now(),
        updated_by: currentManagerId
      });
      
      // Refresh the drivers list
      await fetchDrivers();
      
      Alert.alert('Success', 'Driver information has been updated');
    } catch (error: any) {
      console.error('Error updating driver:', error);
      Alert.alert('Error', `Failed to update driver: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Open modal for editing a driver
  const handleEditDriver = (driver: Driver) => {
    setCurrentDriver(driver);
    setIsEditMode(true);
    setIsModalVisible(true);
  };

  // Delete driver (soft delete)
  const handleDeleteDriver = async (driver: Driver) => {
    try {
      const schoolId = await getCurrentSchool();
      if (!schoolId) {
        Alert.alert('Error', 'No school ID available');
        return;
      }
      
      // Update driver document with soft delete fields
      const driverRef = doc(db, 'Schools', schoolId, 'Drivers', driver.id);
      
      // Get the current driver data to check for auth_uid
      const driverDoc = await getDoc(driverRef);
      if (!driverDoc.exists()) {
        Alert.alert('Error', 'Driver document not found');
        return;
      }
      
      const driverData = driverDoc.data();
      const authUid = driverData.auth_uid;
      
      // Perform soft delete in Firestore
      await updateDoc(driverRef, {
        soft_delete: true,
        deleted_at: Timestamp.now(),
        deleted_by: managerId
      });
      
      // If driver has an auth account, attempt to delete it
      if (authUid) {
        try {
          console.log('Attempting to delete auth account for driver:', authUid);
          
          // Try to delete the user from Firebase Authentication
          await deleteUserFromAuth(authUid);
          
          // Note: The deleteUserFromAuth function currently logs a message
          // about client-side deletion limitations but doesn't actually delete the user.
          // In a production environment, this should be replaced with a Cloud Function.
        } catch (authError) {
          console.error('Error deleting auth account:', authError);
          // Don't block the flow - the user is still soft-deleted in Firestore
        }
      }
      
      // Remove from local state
      setDrivers(prevDrivers => prevDrivers.filter(d => d.id !== driver.id));
      Alert.alert('Success', 'Driver has been deleted');
    } catch (error: any) {
      console.error('Error deleting driver:', error);
      Alert.alert('Error', `Failed to delete driver: ${error.message}`);
    }
  };

  // Handle password reset
  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(email);
      return Promise.resolve(); // Return resolved promise for the modal to handle
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      return Promise.reject(error); // Return rejected promise for the modal to handle
    }
  };

  // Render driver item
  const renderDriverItem = ({ item }: { item: Driver }) => {
    // Format phone number for display - using parentheses format (XXX) XXX-XXXX
    const formatPhoneNumber = (phone: string): string => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return phone; // Return original if not a 10-digit number
    };
    
    const formattedPhone = formatPhoneNumber(item.phone);
    
    return (
      <View style={styles.driverCard}>
        <View style={styles.driverInfo}>
          <View style={styles.driverInitials}>
            <ThemedText style={styles.initialsText}>
              {(item.firstName ? item.firstName[0] : '') + (item.lastName ? item.lastName[0] : '')}
            </ThemedText>
          </View>
          <View style={styles.driverDetails}>
            <ThemedText style={styles.driverName}>{`${item.firstName} ${item.lastName}`}</ThemedText>
            <View style={styles.contactInfo}>
              <View style={styles.contactItem}>
                <Mail size={14} color={Theme.colors.text.secondary} />
                <ThemedText style={styles.contactText}>{item.email}</ThemedText>
              </View>
              <View style={styles.contactItem}>
                <Phone size={14} color={Theme.colors.text.secondary} />
                <ThemedText style={styles.contactText}>{formattedPhone}</ThemedText>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleEditDriver(item)}
        >
          <Edit size={18} color={Theme.colors.text.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Drivers</ThemedText>
        <ThemedText style={styles.schoolName}>{schoolName || ''}</ThemedText>
      </View>
      
      {/* Search and Add Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color={Theme.colors.text.secondary} />
          <TextInput
            style={[
              styles.searchInput,
              Platform.OS === 'web' ? { outline: 'none' } : {}
            ]}
            placeholder="Search drivers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Theme.colors.text.tertiary}
          />
        </View>
        
        {/* Add Driver Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddDriver}
        >
          <Plus size={20} color={Theme.colors.text.inverse} />
          <ThemedText style={styles.addButtonText}>Add Driver</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Main content with fade-in animation */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredDrivers}
          renderItem={renderDriverItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
      
      {/* Driver Edit/Add Modal */}
      <DriverModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        driver={currentDriver}
        onSave={onSaveDriver}
        onDelete={handleDeleteDriver}
        onSendPasswordReset={handleSendPasswordReset}
        managerName={managerName}
        managerId={managerId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: Theme.colors.background.secondary,
  },
  pageHeader: {
    padding: 24,
    paddingBottom: 12,
    backgroundColor: Theme.colors.background.main,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
  },
  schoolName: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
  },
  searchBarContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.main,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    height: 40,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 16,
    marginLeft: 12,
  },
  addButtonText: {
    color: Theme.colors.text.inverse,
    fontWeight: '500',
    marginLeft: 6,
  },
  listContainer: {
    padding: 16,
  },
  list: {
    flex: 1,
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  driverInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initialsText: {
    color: Theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginBottom: 4,
  },
  contactInfo: {
    flexDirection: 'column',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  contactText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginLeft: 6,
  },
  actionButton: {
    padding: 8,
  },
});