import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, Animated, TextInput, Alert, Platform } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Phone, Mail } from 'lucide-react';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import DriverModal from '@/components/modals/DriverModal';
import { sendPasswordResetEmail } from '@/utils/auth';

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
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  
  // New state for the modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  
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

  // Open modal for editing a driver
  const handleEditDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsModalVisible(true);
  };

  // Open modal for adding a new driver
  const handleAddNewDriver = () => {
    setSelectedDriver(null);
    setIsModalVisible(true);
  };

  // Save driver changes
  const handleSaveDriver = (updatedDriver: Driver) => {
    if (updatedDriver.id.startsWith('driver_')) {
      // New driver
      setDrivers([...drivers, updatedDriver]);
      Alert.alert('Success', 'Driver has been added');
    } else {
      // Update existing driver
      const updatedDrivers = drivers.map(d => 
        d.id === updatedDriver.id ? updatedDriver : d
      );
      setDrivers(updatedDrivers);
      Alert.alert('Success', 'Driver information has been updated');
    }
  };

  // Delete driver
  const handleDeleteDriver = (driver: Driver) => {
    const updatedDrivers = drivers.filter(d => d.id !== driver.id);
    setDrivers(updatedDrivers);
    Alert.alert('Success', 'Driver has been deleted');
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

  // Render driver item
  const renderDriverItem = ({ item }: { item: Driver }) => (
    <View style={styles.driverCard}>
      <View style={styles.driverInfo}>
        <View style={styles.driverInitials}>
          <ThemedText style={styles.initialsText}>
            {item.name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </ThemedText>
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
        onPress={() => handleEditDriver(item)}
      >
        <Edit size={18} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Drivers</ThemedText>
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
            placeholder="Search drivers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
        </View>
        
        {/* Add Driver Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewDriver}
        >
          <Plus size={20} color="#FFFFFF" />
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
        driver={selectedDriver}
        onSave={handleSaveDriver}
        onDelete={handleDeleteDriver}
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
  driverCard: {
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
  driverInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverInitials: {
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
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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
    color: '#6B7280',
    marginLeft: 6,
  },
  actionButton: {
    padding: 8,
  },
});