import React, { useState, useEffect, useCallback, memo, useContext } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, TextInput, Alert, Animated, Platform } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import UserModal from '@/components/modals/UserModal';
import { sendPasswordResetEmail, createUserWithEmailAndPassword, createUserWithoutSignIn, refreshAuthState, auth, deleteUserFromAuth } from '@/utils/firebase';
import { db, getCurrentSchool, Timestamp } from '@/utils/firebase';
import { collection, getDocs, query, where, doc, addDoc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { Theme } from '@/constants/Colors';
import { AuthContext } from '@/app/_layout';

// Define interface for User based on Firestore structure
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string; 
  school_id: string;
  user_type: 'parent' | 'student';
  role?: string;
  auth_uid?: string;
  viewable_routes: string[];
  soft_delete?: boolean;
  deleted_at?: any;
  deleted_by?: string;
  updated_at?: any;
  updated_by?: string;
  created_at?: any;
  created_by?: string;
}

// Define interface for a Route (for reference)
interface Route {
  id: string;
  name: string;
  route_code: string;
}

// Fetch users from Firestore
const fetchUsers = async (): Promise<User[]> => {
  try {
    const schoolId = await getCurrentSchool();
    if (!schoolId) {
      console.log('No school ID available');
      return [];
    }
    
    const usersRef = collection(db, 'Schools', schoolId, 'Users');
    // Only get users that are not soft deleted or where soft_delete is not set
    const q = query(usersRef, where('soft_delete', '!=', true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No users found for this school');
      return [];
    }
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        firstName: data.firstName || data.first_name || '',
        lastName: data.lastName || data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        school_id: schoolId,
        user_type: data.user_type || 'parent',
        role: data.role || data.user_type || 'parent', // Use existing role or default to user_type
        viewable_routes: data.viewable_routes || [],
        soft_delete: data.soft_delete || false
      };
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};

// Fetch routes from Firestore
const fetchRoutes = async (): Promise<Route[]> => {
  try {
    const schoolId = await getCurrentSchool();
    if (!schoolId) {
      console.log('No school ID available');
      return [];
    }
    
    const routesRef = collection(db, 'Schools', schoolId, 'Routes');
    const snapshot = await getDocs(routesRef);
    
    if (snapshot.empty) {
      console.log('No routes found for this school');
      return [];
    }
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || 'Unnamed Route',
      route_code: doc.data().route_code || doc.data().route_key || ''
    }));
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
};

// Memoized user item component
const UserItem = memo(({ item, onEdit, getRouteName }: { 
  item: User, 
  onEdit: (user: User) => void,
  getRouteName: (routeId: string) => string 
}) => {
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
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userInitials}>
          <ThemedText style={styles.initialsText}>
            {(item.firstName ? item.firstName[0] : '') + (item.lastName ? item.lastName[0] : '')}
          </ThemedText>
        </View>
        <View style={styles.userDetails}>
          <View style={styles.userHeader}>
            <ThemedText style={styles.userName}>{`${item.firstName} ${item.lastName}`}</ThemedText>
            <View style={[
              styles.userType, 
              item.user_type === 'student' ? styles.studentType : styles.parentType
            ]}>
              <ThemedText style={[
                styles.userTypeText,
                item.user_type === 'student' ? styles.studentTypeText : styles.parentTypeText
              ]}>
                {item.user_type === 'student' ? 'Student' : 'Parent'}
              </ThemedText>
            </View>
          </View>
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
          {item.viewable_routes.length > 0 && (
            <View style={styles.routeInfo}>
              <MapPin size={14} color={Theme.colors.text.secondary} />
              <ThemedText style={styles.routeText}>
                {item.viewable_routes.map(routeId => getRouteName(routeId)).join(', ')}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => onEdit(item)}
      >
        <Edit size={18} color={Theme.colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
});

export default function UsersScreen() {
  const { schoolName } = useSchoolContext();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'parent' | 'student'>('all');
  
  // New state for the modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Animation for content fade-in
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // Get the current user from Auth Context
  const { user } = useContext(AuthContext);
  
  // Get manager ID for metadata tracking
  const managerId = user?.uid || '';
  // Keep the display name for UI (can still be used in alerts, UI, etc.)
  const managerName = 'School Manager';

  useEffect(() => {
    // Fetch users and routes on component mount
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [usersData, routesData] = await Promise.all([
          fetchUsers(),
          fetchRoutes()
        ]);
        
        setUsers(usersData);
        setFilteredUsers(usersData);
        setRoutes(routesData);
        
        // Animate content fade-in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter users when search query or filter type changes
  useEffect(() => {
    let filtered = users;
    
    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(user => user.user_type === filterType);
    }
    
    // Apply search query
    if (searchQuery) {
      filtered = filtered.filter(user => 
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone.includes(searchQuery)
      );
    }
    
    setFilteredUsers(filtered);
  }, [searchQuery, users, filterType]);

  // Memoize functions that are passed to child components
  const handleEditUser = useCallback((user: User) => {
    setSelectedUser(user);
    setIsModalVisible(true);
  }, []);

  const handleAddNewUser = useCallback(() => {
    setSelectedUser(null);
    setIsModalVisible(true);
  }, []);

  const toggleFilterType = useCallback((type: 'all' | 'parent' | 'student') => {
    setFilterType(type);
  }, []);

  // Get route name by ID
  const getRouteName = useCallback((routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown';
  }, [routes]);

  // Memoized render function for FlatList
  const renderItem = useCallback(({ item }: { item: User }) => (
    <UserItem item={item} onEdit={handleEditUser} getRouteName={getRouteName} />
  ), [handleEditUser, getRouteName]);

  // Function to add a new user
  const onAddUser = async (updatedUser: User) => {
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
        // This also sends a password reset email automatically
        authUserId = await createUserWithoutSignIn(updatedUser.email, tempPassword);
        console.log('Created auth user with ID:', authUserId);
      } catch (authError: any) {
        console.error('Failed to create authentication user:', authError);
        Alert.alert('Error', `Failed to create authentication account: ${authError.message}`);
        setIsLoading(false);
        return;
      }
      
      // 2. Create a new user in Firestore using the auth UID as the document ID
      try {
        const usersRef = collection(db, 'Schools', currentSchoolId, 'Users');
        const newUserData = {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          user_type: updatedUser.user_type,
          role: updatedUser.user_type, // Set role to match user_type
          viewable_routes: updatedUser.viewable_routes || [],
          soft_delete: false,
          created_at: Timestamp.now(),
          created_by: currentManagerId,
          auth_uid: authUserId
        };
        
        // Use the auth UID as the document ID
        await setDoc(doc(usersRef, authUserId), newUserData);
      } catch (firestoreError: any) {
        console.error('Failed to add user to Firestore:', firestoreError);
        Alert.alert('Error', `User account created but failed to save details: ${firestoreError.message}`);
        setIsLoading(false);
        return;
      }
      
      // 3. Password reset email is already sent automatically by createUserWithoutSignIn
      
      // 4. Refresh user list
      await fetchUsers();
      
      Alert.alert('Success', `User ${updatedUser.firstName} ${updatedUser.lastName} added successfully. A password reset email has been sent.`);
    } catch (error: any) {
      console.error('Error adding user:', error);
      Alert.alert('Error', `Failed to add user: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save user changes
  const handleSaveUser = async (updatedUser: User) => {
    try {
      const schoolId = await getCurrentSchool();
      const currentManagerId = auth.currentUser?.uid;
      
      if (!schoolId || !currentManagerId) {
        Alert.alert('Error', 'School or manager information is missing');
        return;
      }
      
      // Set the school ID
      updatedUser.school_id = schoolId;
      
      if (updatedUser.id.startsWith('user_')) {
        // This is a new user - use onAddUser for consistency
        await onAddUser(updatedUser);
      } else {
        // Update existing user in Firestore
        const userRef = doc(db, 'Schools', schoolId, 'Users', updatedUser.id);
        
        // Get current user data to preserve fields we don't want to overwrite
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          Alert.alert('Error', 'User document not found');
          return;
        }
        
        // Keep email from being updated if user exists in auth system
        const existingData = userDoc.data();
        const emailChanged = existingData.email !== updatedUser.email;
        
        if (emailChanged && existingData.auth_uid) {
          Alert.alert(
            'Warning', 
            'Email address cannot be changed for users with existing accounts. Other information has been updated.'
          );
          
          // Use the existing email
          updatedUser.email = existingData.email;
        }
        
        // Update the document in Firestore
        await updateDoc(userRef, {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          phone: updatedUser.phone,
          user_type: updatedUser.user_type,
          role: updatedUser.user_type, // Update role to match user_type
          viewable_routes: updatedUser.viewable_routes,
          updated_at: Timestamp.now(),
          updated_by: currentManagerId // Use UID instead of name
        });
        
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u)
        );
        
        Alert.alert('Success', 'User information has been updated');
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      Alert.alert('Error', `Failed to save user: ${error.message}`);
    }
  };

  // Delete user (soft delete)
  const handleDeleteUser = async (user: User) => {
    try {
      const schoolId = await getCurrentSchool();
      if (!schoolId) {
        Alert.alert('Error', 'No school ID available');
        return;
      }
      
      // Get the current user data to check for auth_uid
      const userRef = doc(db, 'Schools', schoolId, 'Users', user.id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        Alert.alert('Error', 'User document not found');
        return;
      }
      
      const userData = userDoc.data();
      const authUid = userData.auth_uid;
      
      // Perform soft delete in Firestore
      await updateDoc(userRef, {
        soft_delete: true,
        deleted_at: Timestamp.now(),
        deleted_by: managerId
      });
      
      // If user has an auth account, attempt to delete it
      if (authUid) {
        try {
          console.log('Attempting to delete auth account for user:', authUid);
          
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
      setUsers(prevUsers => prevUsers.filter(u => u.id !== user.id));
      Alert.alert('Success', 'User has been deleted');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      Alert.alert('Error', `Failed to delete user: ${error.message}`);
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

  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Students & Parents</ThemedText>
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
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Theme.colors.text.tertiary}
          />
        </View>
        
        {/* Filter Type Buttons */}
        <View style={styles.filterButtonsContainer}>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              filterType === 'all' && styles.filterButtonActive
            ]}
            onPress={() => toggleFilterType('all')}
          >
            <ThemedText style={[
              styles.filterButtonText,
              filterType === 'all' && styles.filterButtonTextActive
            ]}>All</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              filterType === 'parent' && styles.filterButtonActive
            ]}
            onPress={() => toggleFilterType('parent')}
          >
            <ThemedText style={[
              styles.filterButtonText,
              filterType === 'parent' && styles.filterButtonTextActive
            ]}>Parents</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.filterButton, 
              filterType === 'student' && styles.filterButtonActive
            ]}
            onPress={() => toggleFilterType('student')}
          >
            <ThemedText style={[
              styles.filterButtonText,
              filterType === 'student' && styles.filterButtonTextActive
            ]}>Students</ThemedText>
          </TouchableOpacity>
        </View>
        
        {/* Add User Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewUser}
        >
          <Plus size={20} color={Theme.colors.text.inverse} />
          <ThemedText style={styles.addButtonText}>Add User</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Main content with fade-in animation */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredUsers}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
      
      {/* User Edit/Add Modal */}
      <UserModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        user={selectedUser}
        routes={routes}
        onSave={handleSaveUser}
        onDelete={handleDeleteUser}
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
    backgroundColor: '#F8FAFC',
  },
  pageHeader: {
    padding: 24,
    paddingBottom: 12,
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
    flexWrap: 'wrap',
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
    minWidth: 200,
    marginBottom: Platform.OS === 'web' ? 0 : 12,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  filterButtonsContainer: {
    flexDirection: 'row',
    marginRight: 12,
    marginLeft: Platform.OS === 'web' ? 12 : 0,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
    backgroundColor: Theme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  filterButtonActive: {
    backgroundColor: Theme.colors.primary,
    borderColor: Theme.colors.primaryDark,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  filterButtonTextActive: {
    color: Theme.colors.text.inverse,
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
  userCard: {
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
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  userInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  initialsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
    paddingTop: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  userType: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  studentType: {
    backgroundColor: '#EBF5FF', // Light blue background
    borderWidth: 1,
    borderColor: Theme.colors.info
  },
  parentType: {
    backgroundColor: '#ECFDF5', // Light green background
    borderWidth: 1,
    borderColor: Theme.colors.success
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  studentTypeText: {
    color: '#1E40AF', // Darker blue text
  },
  parentTypeText: {
    color: '#065F46', // Darker green text
  },
  contactInfo: {
    marginVertical: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  routeText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
});