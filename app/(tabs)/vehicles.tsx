import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, Animated, TextInput, Alert, Platform } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Car, PanelTopClose } from 'lucide-react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import VehicleModal from '@/components/modals/VehicleModal';
import { db, getCurrentSchool, Timestamp } from '@/utils/firebase';
import { collection, getDocs, query, where, doc, addDoc, updateDoc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { Theme } from '@/constants/Colors';
import { AuthContext } from '@/app/_layout';

// Define interface for Vehicle
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  capacity: number;
  operational: boolean;
  school_id: string;
  in_use?: boolean;
  soft_delete?: boolean;
  deleted_at?: any;
  deleted_by?: string;
  registration?: string;
  inspectionInfo?: string;
  created_at?: any;
  created_by?: string;
  updated_at?: any;
  updated_by?: string;
}

export default function VehiclesScreen() {
  const { schoolName } = useSchoolContext();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(null);
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
        await fetchVehicles();
        
        // Animate content fade-in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error loading vehicle data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Fetch vehicles from Firestore
  const fetchVehicles = async () => {
    try {
      const currentSchoolId = await getCurrentSchool();
      if (!currentSchoolId) {
        console.error('No school ID found');
        return;
      }
      
      // Query to get non-deleted vehicles from current school
      const vehiclesRef = collection(db, 'Schools', currentSchoolId, 'Vehicles');
      const q = query(vehiclesRef, where('soft_delete', '!=', true));
      const querySnapshot = await getDocs(q);
      
      const vehiclesData: Vehicle[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        vehiclesData.push({
          id: doc.id,
          make: data.make || '',
          model: data.model || '',
          year: data.year || 0,
          license_plate: data.license_plate || '',
          capacity: data.capacity || 0,
          operational: data.operational !== false,
          school_id: currentSchoolId,
          in_use: data.in_use || false,
          soft_delete: data.soft_delete || false,
          registration: data.registration || '',
          inspectionInfo: data.inspectionInfo || '',
        });
      });
      
      // Sort vehicles by make and model
      vehiclesData.sort((a, b) => {
        return a.make.localeCompare(b.make) || a.model.localeCompare(b.model);
      });
      
      setVehicles(vehiclesData);
      setFilteredVehicles(vehiclesData);
      return vehiclesData;
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }
  };

  // Filter vehicles when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredVehicles(vehicles);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = vehicles.filter(vehicle => 
        vehicle.make.toLowerCase().includes(query) ||
        vehicle.model.toLowerCase().includes(query) ||
        vehicle.license_plate.toLowerCase().includes(query) ||
        vehicle.year.toString().includes(query)
      );
      setFilteredVehicles(filtered);
    }
  }, [searchQuery, vehicles]);

  // Open modal to add a new vehicle
  const handleAddVehicle = () => {
    setCurrentVehicle(null);
    setIsEditMode(false);
    setIsModalVisible(true);
  };

  // Save vehicle changes
  const onSaveVehicle = async (updatedVehicle: Vehicle) => {
    if (isEditMode && currentVehicle) {
      // Update existing vehicle
      await onUpdateVehicle(updatedVehicle);
    } else {
      // Create new vehicle
      await onAddVehicle(updatedVehicle);
    }
    
    setIsModalVisible(false);
  };

  // Function to add a new vehicle
  const onAddVehicle = async (newVehicle: Vehicle) => {
    try {
      const currentSchoolId = await getCurrentSchool();
      const currentManagerId = user?.uid;
      
      if (!currentSchoolId || !currentManagerId) {
        Alert.alert('Error', 'School or manager information is missing');
        return;
      }
      
      setIsLoading(true);
      
      // Create a new vehicle document in Firestore
      const vehiclesRef = collection(db, 'Schools', currentSchoolId, 'Vehicles');
      const newVehicleData = {
        make: newVehicle.make,
        model: newVehicle.model,
        year: newVehicle.year,
        license_plate: newVehicle.license_plate,
        capacity: newVehicle.capacity,
        operational: newVehicle.operational,
        registration: newVehicle.registration || '',
        inspectionInfo: newVehicle.inspectionInfo || '',
        in_use: false,
        soft_delete: false,
        created_at: Timestamp.now(),
        created_by: currentManagerId,
        school_id: currentSchoolId
      };
      
      const docRef = await addDoc(vehiclesRef, newVehicleData);
      
      // Update local state with the new vehicle
      const addedVehicle = {
        ...newVehicleData,
        id: docRef.id
      };
      
      setVehicles(prev => {
        const updated = [...prev, addedVehicle].sort((a, b) => 
          a.make.localeCompare(b.make) || a.model.localeCompare(b.model)
        );
        return updated;
      });
      
      Alert.alert('Success', `${newVehicle.make} ${newVehicle.model} has been added.`);
    } catch (error) {
      console.error('Error adding vehicle:', error);
      Alert.alert('Error', 'Failed to add vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update an existing vehicle
  const onUpdateVehicle = async (updatedVehicle: Vehicle) => {
    try {
      if (!updatedVehicle.id) {
        Alert.alert('Error', 'Vehicle ID is missing');
        return;
      }
      
      const currentSchoolId = await getCurrentSchool();
      const currentManagerId = user?.uid;
      
      if (!currentSchoolId || !currentManagerId) {
        Alert.alert('Error', 'School or manager information is missing');
        return;
      }
      
      setIsLoading(true);
      
      // Update the vehicle in Firestore
      const vehicleRef = doc(db, 'Schools', currentSchoolId, 'Vehicles', updatedVehicle.id);
      await updateDoc(vehicleRef, {
        make: updatedVehicle.make,
        model: updatedVehicle.model,
        year: updatedVehicle.year,
        license_plate: updatedVehicle.license_plate,
        capacity: updatedVehicle.capacity,
        operational: updatedVehicle.operational,
        registration: updatedVehicle.registration || '',
        inspectionInfo: updatedVehicle.inspectionInfo || '',
        updated_at: Timestamp.now(),
        updated_by: currentManagerId
      });
      
      // Update local state
      setVehicles(prev => {
        const updated = prev.map(vehicle => 
          vehicle.id === updatedVehicle.id ? {
            ...vehicle,
            ...updatedVehicle,
            updated_at: Timestamp.now(),
            updated_by: currentManagerId
          } : vehicle
        ).sort((a, b) => 
          a.make.localeCompare(b.make) || a.model.localeCompare(b.model)
        );
        return updated;
      });
      
      Alert.alert('Success', `${updatedVehicle.make} ${updatedVehicle.model} has been updated.`);
    } catch (error) {
      console.error('Error updating vehicle:', error);
      Alert.alert('Error', 'Failed to update vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle editing a vehicle
  const handleEditVehicle = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
    setIsEditMode(true);
    setIsModalVisible(true);
  };

  // Function to handle vehicle deletion
  const onDeleteVehicle = async (vehicle: Vehicle) => {
    try {
      const currentSchoolId = await getCurrentSchool();
      
      if (!currentSchoolId) {
        Alert.alert('Error', 'School information is missing');
        return;
      }
      
      setIsLoading(true);
      
      // Soft delete - update the document with delete flags
      const vehicleRef = doc(db, 'Schools', currentSchoolId, 'Vehicles', vehicle.id);
      await updateDoc(vehicleRef, {
        soft_delete: true,
        deleted_at: Timestamp.now(),
        deleted_by: managerId
      });
      
      // Update local state by removing the vehicle
      setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
      setFilteredVehicles(prev => prev.filter(v => v.id !== vehicle.id));
      
      Alert.alert('Success', `${vehicle.make} ${vehicle.model} has been deleted.`);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      Alert.alert('Error', 'Failed to delete vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render a vehicle card
  const renderVehicleItem = ({ item }: { item: Vehicle }) => {
    return (
      <ThemedView style={styles.vehicleCard}>
        <View style={styles.vehicleInfo}>
          <View style={styles.vehicleInitials}>
            <ThemedText style={styles.initialsText}>
              {item.make.charAt(0) + item.model.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.vehicleDetails}>
            <View style={styles.vehicleHeader}>
              <ThemedText style={styles.vehicleName}>
                {item.make} {item.model} ({item.year})
              </ThemedText>
              
              <View style={[
                styles.vehicleStatusBadge, 
                item.operational ? styles.statusOperational : styles.statusNonOperational
              ]}>
                <ThemedText style={[
                  styles.statusText,
                  item.operational ? styles.operationalText : styles.nonOperationalText
                ]}>
                  {item.operational ? 'Operational' : 'Non-Operational'}
                </ThemedText>
              </View>
            </View>
            
            <View style={styles.vehicleDetails}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Car size={14} color={Theme.colors.text.secondary} />
                  <ThemedText style={styles.detailText}>{item.license_plate}</ThemedText>
                </View>
                
                <View style={styles.detailItem}>
                  <PanelTopClose size={14} color={Theme.colors.text.secondary} />
                  <ThemedText style={styles.detailText}>Capacity: {item.capacity}</ThemedText>
                </View>
              </View>
            </View>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleEditVehicle(item)}
        >
          <Edit size={18} color={Theme.colors.text.secondary} />
        </TouchableOpacity>
      </ThemedView>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Vehicles</ThemedText>
        <ThemedText style={styles.subtitle}>{schoolName}</ThemedText>
      </View>
      
      <View style={styles.toolbarContainer}>
        <View style={styles.searchContainer}>
          <Search size={18} color={Theme.colors.text.tertiary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vehicles..."
            placeholderTextColor={Theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        
        <View style={styles.toolbarActions}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddVehicle}>
            <Plus size={18} color={Theme.colors.text.inverse} />
            <ThemedText style={styles.addButtonText}>Add Vehicle</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
      
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={styles.loadingText}>Loading vehicles...</ThemedText>
          </View>
        ) : filteredVehicles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              {searchQuery.trim() !== '' 
                ? 'No vehicles match your search' 
                : 'No vehicles found. Add a vehicle to get started.'}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={filteredVehicles}
            renderItem={renderVehicleItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
      
      {isModalVisible && (
        <VehicleModal
          isVisible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
          vehicle={currentVehicle}
          onSave={onSaveVehicle}
          onDelete={onDeleteVehicle}
          managerId={managerId}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  header: {
    backgroundColor: Theme.colors.background.main,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
  },
  subtitle: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  },
  toolbarContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Theme.colors.background.main,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Theme.colors.background.tertiary,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    marginRight: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.text.primary,
    height: '100%',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  toolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: Theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    height: 40,
  },
  addButtonText: {
    color: Theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 32,
  },
  vehicleCard: {
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
  vehicleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  vehicleInitials: {
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
  vehicleDetails: {
    flex: 1,
    paddingTop: 2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
    marginRight: 8,
    flex: 1,
  },
  vehicleStatusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
    borderWidth: 1,
  },
  statusOperational: {
    backgroundColor: '#ECFDF5', // Light green background
    borderColor: Theme.colors.success,
  },
  statusNonOperational: {
    backgroundColor: '#FEF2F2', // Light red background
    borderColor: Theme.colors.error,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  operationalText: {
    color: '#065F46', // Darker green
  },
  nonOperationalText: {
    color: '#B91C1C', // Darker red
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  }
}); 