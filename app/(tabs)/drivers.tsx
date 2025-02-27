import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, Animated, TextInput, Alert, Platform } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { useNavigation } from 'expo-router';
import { DrawerActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/SchoolProvider';

// Define interface for Driver based on Firestore structure
interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  school_id: string;
  assigned_vehicle_id: string;
}

// Mock Firebase functions
const fetchDrivers = (): Promise<Driver[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData: Driver[] = [];
      for (let i = 1; i <= 10; i++) {
        mockData.push({ 
          id: `driver${i}`, 
          name: `Driver ${i}`, 
          email: `driver${i}@school.edu`, 
          phone: `555-000-${1000+i}`,
          school_id: 'school1',
          assigned_vehicle_id: `vehicle${i % 5 + 1}`
        });
      }
      resolve(mockData);
    }, 500);
  });
};

export default function DriversScreen() {
  const { schoolName } = useSchoolContext();
  const navigation = useNavigation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  
  // Animation for content fade-in
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fetch drivers on component mount
    const loadData = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDrivers();
        setDrivers(data);
        setFilteredDrivers(data);
        
        // Animate content fade-in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error fetching drivers:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Filter drivers when search query changes
  useEffect(() => {
    if (searchQuery) {
      const filtered = drivers.filter(driver => 
        driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver.phone.includes(searchQuery)
      );
      setFilteredDrivers(filtered);
    } else {
      setFilteredDrivers(drivers);
    }
  }, [searchQuery, drivers]);

  // Toggle drawer
  const toggleDrawer = () => {
    navigation.dispatch(DrawerActions.toggleDrawer());
  };

  // Action menu handlers
  const showActionMenu = (driver: Driver, event: any) => {
    setSelectedDriver(driver);
    // In a real implementation, get the touch coordinates
    // For now, we'll use mock coordinates
    setActionMenuPosition({ x: 100, y: 100 });
    setActionMenuVisible(true);
  };

  const hideActionMenu = () => {
    setActionMenuVisible(false);
    setSelectedDriver(null);
  };

  const handleEditDriver = (driver: Driver) => {
    hideActionMenu();
    Alert.alert('Edit Driver', `Edit ${driver.name}'s information`);
    // In a real implementation, navigate to edit form
  };

  const handleDeleteDriver = (driver: Driver) => {
    hideActionMenu();
    Alert.alert(
      'Delete Driver',
      `Are you sure you want to delete ${driver.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // In a real implementation, delete from Firebase
            const updatedDrivers = drivers.filter(d => d.id !== driver.id);
            setDrivers(updatedDrivers);
            setFilteredDrivers(updatedDrivers);
            Alert.alert('Success', 'Driver has been deleted');
          }
        }
      ]
    );
  };

  const handleAddNewDriver = () => {
    Alert.alert('Add Driver', 'Navigate to add driver form');
    // In a real implementation, navigate to add form
  };

  // Render driver item
  const renderDriverItem = ({ item }: { item: Driver }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverInfo}>
        <View style={styles.driverInitials}>
          <ThemedText style={styles.initialsText}>{item.name.substring(0, 2).toUpperCase()}</ThemedText>
        </View>
        <View style={styles.driverDetails}>
          <ThemedText style={styles.driverName}>{item.name}</ThemedText>
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
        </View>
      </View>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={(e) => showActionMenu(item, e)}
      >
        <MoreVertical size={20} color="#6B7280" />
      </TouchableOpacity>
      
      {/* Action Menu (would be positioned absolutely in a real implementation) */}
      {actionMenuVisible && selectedDriver?.id === item.id && (
        <View style={[styles.actionMenu, { top: actionMenuPosition.y, left: actionMenuPosition.x }]}>
          <TouchableOpacity style={styles.actionMenuItem} onPress={() => handleEditDriver(item)}>
            <Edit size={16} color="#4B5563" />
            <ThemedText style={styles.actionMenuText}>Edit</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionMenuItem} onPress={() => handleDeleteDriver(item)}>
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
            style={[
              styles.searchInput,
              Platform.OS === 'web' ? { outline: 'none' } : {}
            ]}
            placeholder="Search drivers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
        </View>
        
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#6B7280" />
          <ThemedText style={styles.filterText}>Filter</ThemedText>
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
  },
  topButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  contentContainer: {
    flex: 1,
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
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
    height: 40,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  filterText: {
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  driverCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverInitials: {
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
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 4,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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