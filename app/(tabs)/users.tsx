import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, TextInput, Alert, Animated } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { useNavigation } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/SchoolProvider';

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
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  const [filterType, setFilterType] = useState<'all' | 'parent' | 'student'>('all');
  
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

  // Action menu handlers
  const showActionMenu = (user: User, event: any) => {
    setSelectedUser(user);
    // In a real implementation, get the touch coordinates
    // For now, we'll use mock coordinates
    setActionMenuPosition({ x: 100, y: 100 });
    setActionMenuVisible(true);
  };

  const hideActionMenu = () => {
    setActionMenuVisible(false);
    setSelectedUser(null);
  };

  // Get route name by ID
  const getRouteName = (routeId: string) => {
    const route = routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown';
  };

  const handleEditUser = (user: User) => {
    hideActionMenu();
    Alert.alert('Edit User', `Edit ${user.name}'s information`);
    // In a real implementation, navigate to edit form
  };

  const handleDeleteUser = (user: User) => {
    hideActionMenu();
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // In a real implementation, delete from Firebase
            const updatedUsers = users.filter(u => u.id !== user.id);
            setUsers(updatedUsers);
            setFilteredUsers(updatedUsers);
            Alert.alert('Success', 'User has been deleted');
          }
        }
      ]
    );
  };

  const handleAddNewUser = () => {
    Alert.alert('Add User', 'Navigate to add user form');
    // In a real implementation, navigate to add form
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
            <View style={styles.routeSection}>
              <MapPin size={14} color="#6B7280" />
              <ThemedText style={styles.routeText}>
                Assigned to: {item.viewable_routes.map(rid => getRouteName(rid)).join(', ')}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={(e) => showActionMenu(item, e)}
      >
        <MoreVertical size={20} color="#6B7280" />
      </TouchableOpacity>
      
      {/* Action Menu */}
      {actionMenuVisible && selectedUser?.id === item.id && (
        <View style={[styles.actionMenu, { top: actionMenuPosition.y, left: actionMenuPosition.x }]}>
          <TouchableOpacity style={styles.actionMenuItem} onPress={() => handleEditUser(item)}>
            <Edit size={16} color="#4B5563" />
            <ThemedText style={styles.actionMenuText}>Edit</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionMenuItem} onPress={() => handleDeleteUser(item)}>
            <Trash2 size={16} color="#EF4444" />
            <ThemedText style={[styles.actionMenuText, styles.deleteText]}>Delete</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.mainContent}>
      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
        </View>
        
        <View style={styles.filterGroup}>
          <TouchableOpacity 
            style={[
              styles.filterTab,
              filterType === 'all' && styles.filterTabActive
            ]}
            onPress={() => toggleFilterType('all')}
          >
            <ThemedText style={[
              styles.filterTabText,
              filterType === 'all' && styles.filterTabTextActive
            ]}>All</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterTab,
              filterType === 'parent' && styles.filterTabActive
            ]}
            onPress={() => toggleFilterType('parent')}
          >
            <ThemedText style={[
              styles.filterTabText,
              filterType === 'parent' && styles.filterTabTextActive
            ]}>Parents</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterTab,
              filterType === 'student' && styles.filterTabActive
            ]}
            onPress={() => toggleFilterType('student')}
          >
            <ThemedText style={[
              styles.filterTabText,
              filterType === 'student' && styles.filterTabTextActive
            ]}>Students</ThemedText>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewUser}
        >
          <Plus size={20} color="white" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
  },
  contentContainer: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'wrap',
  },
  searchContainer: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 16,
    minWidth: 150,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
    height: 40,
    outline: 'none',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    height: 36,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterTabActive: {
    backgroundColor: '#4361ee',
  },
  filterTabText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: 'white',
  },
  addButton: {
    backgroundColor: '#4361ee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 8,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  userInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4361ee',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initialsText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1F2937',
    marginRight: 8,
  },
  userType: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 16,
  },
  parentType: {
    backgroundColor: '#DBEAFE',
  },
  studentType: {
    backgroundColor: '#FCE7F3',
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  routeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  actionButton: {
    padding: 8,
  },
  actionMenu: {
    position: 'absolute',
    right: 16,
    top: 40,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    minWidth: 120,
  },
  actionMenuText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  deleteText: {
    color: '#EF4444',
  },
});