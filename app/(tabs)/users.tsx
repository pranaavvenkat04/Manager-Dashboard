import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, TextInput, Alert, Animated, Platform } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import UserModal from '@/components/modals/UserModal';
import { sendPasswordResetEmail } from '@/utils/auth';

// Define interface for User based on Firestore structure
interface User {
  id: string;
  name: string;
  email: string;
  phone: string; 
  school_id: string;
  user_type: 'parent' | 'student';
  viewable_routes: string[];
}

// Define interface for a Route (for reference)
interface Route {
  id: string;
  name: string;
}

// Mock Firebase functions
const fetchUsers = (): Promise<User[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData: User[] = [];
      for (let i = 1; i <= 15; i++) {
        mockData.push({ 
          id: `user${i}`, 
          name: `User ${i}`,
          email: `user${i}@school.edu`, 
          phone: `555-123-${1000+i}`,
          school_id: 'school1',
          user_type: i % 3 === 0 ? 'student' : 'parent',
          viewable_routes: [`route${i % 5 + 1}`]
        });
      }
      resolve(mockData);
    }, 500);
  });
};

const fetchRoutes = (): Promise<Route[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData: Route[] = [];
      for (let i = 1; i <= 5; i++) {
        mockData.push({ 
          id: `route${i}`, 
          name: `Route ${i}`
        });
      }
      resolve(mockData);
    }, 300);
  });
};

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
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone.includes(searchQuery)
      );
    }
    
    setFilteredUsers(filtered);
  }, [searchQuery, users, filterType]);

  // Open modal for editing a user
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsModalVisible(true);
  };

  // Open modal for adding a new user
  const handleAddNewUser = () => {
    setSelectedUser(null);
    setIsModalVisible(true);
  };

  // Save user changes
  const handleSaveUser = (updatedUser: User) => {
    if (updatedUser.id.startsWith('user_')) {
      // New user
      setUsers([...users, updatedUser]);
      Alert.alert('Success', 'User has been added');
    } else {
      // Update existing user
      const updatedUsers = users.map(u => 
        u.id === updatedUser.id ? updatedUser : u
      );
      setUsers(updatedUsers);
      Alert.alert('Success', 'User information has been updated');
    }
  };

  // Delete user
  const handleDeleteUser = (user: User) => {
    const updatedUsers = users.filter(u => u.id !== user.id);
    setUsers(updatedUsers);
    Alert.alert('Success', 'User has been deleted');
  };

  // Handle password reset
  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendPasswordResetEmail(email);
      Alert.alert('Success', `Password reset email sent to ${email}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email');
      console.error('Error sending password reset:', error);
    }
  };

  // Get route name by ID
  const getRouteName = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown';
  };

  // Toggle filter type
  const toggleFilterType = (type: 'all' | 'parent' | 'student') => {
    setFilterType(type);
  };

  // Render user item
  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userInitials}>
          <ThemedText style={styles.initialsText}>{item.name.substring(0, 2).toUpperCase()}</ThemedText>
        </View>
        <View style={styles.userDetails}>
          <View style={styles.userHeader}>
            <ThemedText style={styles.userName}>{item.name}</ThemedText>
            <View style={[
              styles.userType, 
              item.user_type === 'student' ? styles.studentType : styles.parentType
            ]}>
              <ThemedText style={styles.userTypeText}>
                {item.user_type === 'student' ? 'Student' : 'Parent'}
              </ThemedText>
            </View>
          </View>
          <View style={styles.contactInfo}>
            <View style={styles.contactItem}>
              <Mail size={14} color="#6B7280" />
              <ThemedText style={styles.contactText}>{item.email}</ThemedText>
            </View>
            <View style={styles.contactItem}>
              <Phone size={14} color="#6B7280" />
              <ThemedText style={styles.contactText}>{item.phone}</ThemedText>
            </View>
          </View>
          {item.viewable_routes.length > 0 && (
            <View style={styles.routeInfo}>
              <MapPin size={14} color="#6B7280" />
              <ThemedText style={styles.routeText}>
                {item.viewable_routes.map(routeId => getRouteName(routeId)).join(', ')}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={() => handleEditUser(item)}
      >
        <Edit size={18} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Students & Parents</ThemedText>
        <ThemedText style={styles.schoolName}>{schoolName || 'NYIT'}</ThemedText>
      </View>
      
      {/* Search and Add Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={[
              styles.searchInput,
              Platform.OS === 'web' ? { outline: 'none' } : {}
            ]}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
        </View>
        
        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <TouchableOpacity 
            style={[
              styles.filterButton,
              styles.filterButtonFirst,
              filterType === 'all' && styles.filterButtonActive
            ]}
            onPress={() => toggleFilterType('all')}
          >
            <ThemedText style={[
              styles.filterButtonText,
              filterType === 'all' && styles.filterButtonTextActive
            ]}>
              All
            </ThemedText>
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
            ]}>
              Parents
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.filterButton,
              styles.filterButtonLast,
              filterType === 'student' && styles.filterButtonActive
            ]}
            onPress={() => toggleFilterType('student')}
          >
            <ThemedText style={[
              styles.filterButtonText,
              filterType === 'student' && styles.filterButtonTextActive
            ]}>
              Students
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        {/* Add User Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewUser}
        >
          <Plus size={20} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText}>Add User</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Main content with fade-in animation */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 40,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#1F2937',
    marginLeft: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    marginLeft: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRightWidth: 0,
  },
  filterButtonActive: {
    backgroundColor: '#4361ee',
    borderColor: '#3050ee',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  filterButtonFirst: {
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  filterButtonLast: {
    borderRightWidth: 1,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361ee',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 16,
    marginLeft: 12,
  },
  addButtonText: {
    color: 'white',
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
    backgroundColor: 'white',
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
    alignItems: 'center',
  },
  userInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4361ee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  initialsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
  },
  studentType: {
    backgroundColor: '#FEF3C7',
  },
  parentType: {
    backgroundColor: '#DBEAFE',
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  contactInfo: {
    marginVertical: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  routeText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  actionButton: {
    padding: 8,
  },
});