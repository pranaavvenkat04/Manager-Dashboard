import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, TextInput, Alert, Animated, Platform, Modal } from 'react-native';
import { Search, Plus, Filter, Trash2, X, Calendar, Edit } from 'lucide-react';
import { router } from 'expo-router';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import UpdateRouteModal from '@/components/modals/UpdateRouteModal';
import AddRouteModal from '@/components/modals/AddRouteModal';
import RouteCard from '@/components/routes/RouteCard';
import { routesFirebaseMethods, formatDate } from '@/utils/FirebaseUtils';
import RouteExceptionsModal from '@/components/modals/RouteExceptionsModal';

import { RouteData, RouteSchedule, ScheduleException } from '@/types/RouteTypes';
import { getCurrentSchool } from '@/utils/firebase';
import { db } from '@/utils/firebase';
import { Theme } from '@/constants/Colors';

// Update fetch functions to use Firebase instead of mock data
// Looking at two specific functions to edit:

// Update the fetchRoutes function
const fetchRoutes = async (): Promise<any[]> => {
  try {
    const schoolId = await getCurrentSchool();
    if (!schoolId) {
      console.log('No school ID available');
      return [];
    }

    const routesCollectionRef = collection(db, 'Schools', schoolId, 'Routes');
    const routesSnapshot = await getDocs(routesCollectionRef);
    
    if (routesSnapshot.empty) {
      console.log('No routes found');
      return [];
    }

    return routesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unnamed Route',
        stops: data.stops_count || 0,
        status: data.active ? 'Active' : 'Inactive',
        driverId: data.assigned_driver_id || null,
        driverName: 'Loading...',
        startTime: data.start_time || '',
        endTime: data.end_time || '',
        duration: data.estimated_duration || 0,
        route_code: data.route_code || doc.id.substring(0, 2) || ''
      };
    });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
};

// Update the fetchDrivers function
const fetchDrivers = async (): Promise<{id: string; name: string;}[]> => {
  try {
    const schoolId = await getCurrentSchool();
    if (!schoolId) {
      console.log('No school ID available');
      return [];
    }

    const driversCollectionRef = collection(db, 'Schools', schoolId, 'Drivers');
    const driversSnapshot = await getDocs(driversCollectionRef);
    
    if (driversSnapshot.empty) {
      console.log('No drivers found');
      return [];
    }

    return driversSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.fullName || 'Unnamed Driver'
      };
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return [];
  }
};

// Fetch route details with schedule data
const fetchRouteDetails = async (routeId: string): Promise<RouteData> => {
  try {
    const schoolId = await getCurrentSchool();
    if (!schoolId) {
      throw new Error('No school ID available');
    }
    
    // Get the route document from the subcollection
    const routeRef = doc(db, 'Schools', schoolId, 'Routes', routeId);
    const routeDoc = await getDoc(routeRef);
    
    if (!routeDoc.exists()) {
      throw new Error('Route not found');
    }
    
    const routeData = routeDoc.data();
    console.log("Fetched route data:", routeData); // Log for debugging
    
    // Get the stops for this route if there's a stops subcollection
    let stops: Array<{
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      eta: string;
    }> = [];
    
    try {
      const stopsCollectionRef = collection(db, 'Schools', schoolId, 'Routes', routeId, 'Stops');
      const stopsSnapshot = await getDocs(stopsCollectionRef);
      
      stops = stopsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || '',
        address: doc.data().address || '',
        lat: doc.data().latitude || 0,
        lng: doc.data().longitude || 0,
        eta: doc.data().eta || ''
      }));
    } catch (error) {
      console.error('Error fetching stops:', error);
    }
    
    // Format the schedule data
    const schedule: RouteSchedule = {
      operatingDays: routeData.operating_days || [1, 2, 3, 4, 5],
      exceptions: routeData.exceptions || [],
      effectiveDates: {
        startDate: routeData.effective_start_date ? new Date(routeData.effective_start_date.seconds * 1000) : new Date(),
        endDate: routeData.effective_end_date ? new Date(routeData.effective_end_date.seconds * 1000) : undefined
      }
    };
    
    // Return the formatted route data
    return {
      name: routeData.name || '',
      route_key: routeData.route_code || routeData.route_key || '',
      startTime: routeData.start_time || '',
      endTime: routeData.end_time || '',
      stops: stops,
      estimatedDuration: routeData.estimated_duration || 0,
      assignedDriverId: routeData.assigned_driver_id || '',
      schedule: schedule
    };
  } catch (error) {
    console.error('Error fetching route details:', error);
    throw error;
  }
};

// Memoized RouteCard component to prevent unnecessary re-renders
const MemoizedRouteCard = React.memo(RouteCard);

export default function RoutesScreen() {
  const { schoolName } = useSchoolContext();
  const [routes, setRoutes] = useState<any[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [drivers, setDrivers] = useState<{id: string; name: string;}[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any | null>(null);
  
  // State for action menu
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  
  // State for delete confirmation modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<any | null>(null);
  
  // State for modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedRouteData, setSelectedRouteData] = useState<RouteData | undefined>(undefined);
  const [isLoadingRouteData, setIsLoadingRouteData] = useState(false);
  
  // Animation for content fade-in
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  
  // Add state for exceptions modal
  const [exceptionsModalVisible, setExceptionsModalVisible] = useState(false);

  useEffect(() => {
    // Fetch routes and drivers on component mount
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [routesData, driversData] = await Promise.all([
          fetchRoutes(),
          fetchDrivers()
        ]);
        
        setRoutes(routesData);
        setFilteredRoutes(routesData);
        setDrivers(driversData);
        
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

  // Filter routes when search query changes
  useEffect(() => {
    if (searchQuery) {
      const filtered = routes.filter(route => 
        route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        route.route_key.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredRoutes(filtered);
    } else {
      setFilteredRoutes(routes);
    }
  }, [searchQuery, routes]);

  // Memoize functions that are passed to child components
  const handleEditRoute = useCallback(async (route: any) => {
    // Close action menu
    setActionMenuVisible(false);
    setActiveRouteId(null);
    
    // Show loading state
    setIsLoadingRouteData(true);
    
    try {
      // In a real implementation, this would fetch from Firebase
      // For now, we use our mock function
      const routeData = await fetchRouteDetails(route.id);
      
      // Set the route data and show the update modal
      setSelectedRouteData(routeData);
      setUpdateModalVisible(true);
    } catch (error) {
      console.error('Error loading route details:', error);
      Alert.alert('Error', 'Failed to load route details. Please try again.');
    } finally {
      setIsLoadingRouteData(false);
    }
  }, []);

  const showDeleteConfirmation = useCallback((route: any) => {
    // Close action menu
    setActionMenuVisible(false);
    setActiveRouteId(null);
    
    // Set route to delete and show delete modal
    setRouteToDelete(route);
    setDeleteModalVisible(true);
  }, []);

  const handleAddNewRoute = useCallback(() => {
    // Open the add route modal
    setAddModalVisible(true);
  }, []);

  // Memoize the renderItem function to prevent rerenders
  const renderRouteItem = useCallback(({ item }: { item: any }) => (
    <MemoizedRouteCard
      route={item}
      drivers={drivers}
      onActionMenu={() => {}}
      activeRouteId={null}
      actionMenuVisible={false}
      onEdit={handleEditRoute}
      onDelete={showDeleteConfirmation}
    />
  ), [drivers, handleEditRoute, showDeleteConfirmation]);

  const handleDeleteRoute = () => {
    if (!routeToDelete) return;
    
    // In a real implementation, delete from Firebase
    const updatedRoutes = routes.filter(r => r.id !== routeToDelete.id);
    setRoutes(updatedRoutes);
    setFilteredRoutes(updatedRoutes);
    
    // Clear state and close modal
    setRouteToDelete(null);
    setDeleteModalVisible(false);
    
    // Show success message
    Alert.alert('Success', 'Route has been deleted');
  };
  
  // Handle save from modal
  const handleSaveRoute = async (routeData: RouteData) => {
    // In a real implementation, this would save to Firebase
    // For now, we'll add it to our local state
    
    // Get current school ID
    const currentSchoolId = await getCurrentSchool();
    
    // Convert route data format from the modal to match our routes format
    const newRoute = {
      id: `route-${Date.now()}`,
      route_key: routeData.route_key,
      name: routeData.name,
      school_id: currentSchoolId || '', // Use current school ID
      assigned_driver_id: routeData.assignedDriverId || '', 
      start_time: routeData.startTime,
      end_time: routeData.endTime,
      stops_count: routeData.stops?.length || 0,
      schedule: routeData.schedule
    };
    
    const updatedRoutes = [newRoute, ...routes];
    setRoutes(updatedRoutes);
    setFilteredRoutes(updatedRoutes);
    setAddModalVisible(false);
    
    // Show success message
    Alert.alert('Success', 'Route has been created successfully');
  };
  
  // Handle update from modal
  const handleUpdateRoute = async (routeData: RouteData) => {
    // In a real implementation, this would update in Firebase
    // For now, we'll update our local state
    if (selectedRoute) {
      // Get current school ID
      const currentSchoolId = await getCurrentSchool();
      
      const updatedRoute = {
        ...selectedRoute,
        name: routeData.name,
        route_key: routeData.route_key,
        school_id: currentSchoolId || '',
        start_time: routeData.startTime,
        end_time: routeData.endTime,
        assigned_driver_id: routeData.assignedDriverId || '',
        stops_count: routeData.stops?.length || 0,
        schedule: routeData.schedule
      };
      
      const updatedRoutes = routes.map(route => 
        route.id === selectedRoute.id ? updatedRoute : route
      );
      
      setRoutes(updatedRoutes);
      setFilteredRoutes(updatedRoutes);
      setUpdateModalVisible(false);
      
      // Show success message
      Alert.alert('Success', 'Route has been updated successfully');
    }
  };
  
  // Close modals
  const handleCloseAddModal = () => {
    setAddModalVisible(false);
  };
  
  const handleCloseUpdateModal = () => {
    setUpdateModalVisible(false);
    setSelectedRouteData(undefined);
  };

  // Render delete confirmation modal
  const renderDeleteConfirmationModal = () => {
    if (!routeToDelete) return null;
    
    return (
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <ThemedText style={styles.deleteModalTitle}>Delete Route</ThemedText>
            <ThemedText style={styles.deleteModalText}>
              Are you sure you want to delete <ThemedText style={styles.routeNameText}>{routeToDelete.name}</ThemedText>?
            </ThemedText>
            <ThemedText style={styles.deleteModalText}>
              This action cannot be undone. All data associated with this route will be permanently removed.
            </ThemedText>
            <View style={styles.deleteButtonsContainer}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <ThemedText style={styles.cancelDeleteText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={handleDeleteRoute}
              >
                <ThemedText style={styles.confirmDeleteText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render loading overlay when loading route data
  const renderLoadingOverlay = () => {
    if (!isLoadingRouteData) return null;
    
    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading route data...</ThemedText>
          {Platform.OS === 'web' && (
            <div className="spinner" style={{
              width: '24px',
              height: '24px',
              border: '3px solid rgba(0, 0, 0, 0.1)',
              borderTopColor: Theme.colors.primary,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
          )}
        </View>
      </View>
    );
  };

  // Add function to open exceptions modal
  const handleOpenExceptionsModal = () => {
    setExceptionsModalVisible(true);
  };

  // Add function to apply exception to all routes
  const handleApplyExceptionToAllRoutes = async (exception: ScheduleException) => {
    // Show loading state
    setIsLoading(true);
    
    try {
      // Create a copy of all routes to update
      const updatedRoutes = [...routes];
      
      // Loop through each route and add the exception
      for (let i = 0; i < updatedRoutes.length; i++) {
        const route = updatedRoutes[i];
        
        // Ensure schedule and exceptions arrays exist
        if (!route.schedule) {
          route.schedule = {
            operatingDays: [1, 2, 3, 4, 5], // Default to weekdays
            exceptions: [],
            effectiveDates: {
              startDate: new Date()
            }
          };
        }
        
        if (!route.schedule.exceptions) {
          route.schedule.exceptions = [];
        }
        
        // Add the exception if it doesn't already exist for the same date
        const existingExceptionIndex = route.schedule.exceptions.findIndex(
          (ex: ScheduleException) => ex.date.toDateString() === exception.date.toDateString()
        );
        
        if (existingExceptionIndex >= 0) {
          // Replace existing exception for the same date
          route.schedule.exceptions[existingExceptionIndex] = exception;
        } else {
          // Add new exception
          route.schedule.exceptions.push(exception);
        }
      }
      
      // Update the state with the new routes
      setRoutes(updatedRoutes);
      setFilteredRoutes(updatedRoutes);
      
      // In a real implementation, this would update the routes in Firebase
      // For each route in the database
      // await Promise.all(updatedRoutes.map(route => 
      //   updateDoc(doc(db, 'Routes', route.id), { 
      //     schedule: {
      //       ...route.schedule,
      //       exceptions: route.schedule.exceptions
      //     }
      //   })
      // ));
      
      // Show success message
      Alert.alert('Success', 'Exception has been applied to all routes');
    } catch (error) {
      console.error('Error applying exception to routes:', error);
      Alert.alert('Error', 'Failed to apply exception to routes. Please try again.');
      throw error; // Rethrow to be caught by the modal
    } finally {
      setIsLoading(false);
    }
  };

  // Update the UpdateRouteModal props to include onDelete
  const handleUpdateRouteModalDelete = (routeData: RouteData) => {
    // Get the route to delete based on the routeData
    const routeToDelete = routes.find(r => r.id === routeData.id);
    if (routeToDelete) {
      showDeleteConfirmation(routeToDelete);
    }
    // Close the update modal
    setUpdateModalVisible(false);
  };

  // Action menu handlers
  const toggleActionMenu = useCallback((route: any) => {
    if (activeRouteId === route.id) {
      // If this route's menu is already open, close it
      setActionMenuVisible(false);
      setActiveRouteId(null);
    } else {
      // Otherwise, open this route's menu
      setSelectedRoute(route);
      setActiveRouteId(route.id);
      setActionMenuVisible(true);
    }
  }, [activeRouteId]);

  const handleDeleteExceptionsByDate = async (date: Date) => {
    // Show loading state
    setIsLoading(true);
    
    try {
      // Create a copy of all routes to update
      const updatedRoutes = [...routes];
      
      // Loop through each route and remove exceptions for the specified date
      for (let i = 0; i < updatedRoutes.length; i++) {
        const route = updatedRoutes[i];
        
        // Skip routes without schedules or exceptions
        if (!route.schedule || !route.schedule.exceptions) continue;
        
        // Filter out exceptions for the specified date
        route.schedule.exceptions = route.schedule.exceptions.filter(
          (ex: ScheduleException) => ex.date.toDateString() !== date.toDateString()
        );
      }
      
      // Update the state with the new routes
      setRoutes(updatedRoutes);
      setFilteredRoutes(updatedRoutes);
      
      // Show success message
      Alert.alert('Success', 'Exceptions for the specified date have been removed from all routes');
    } catch (error) {
      console.error('Error deleting exceptions by date:', error);
      Alert.alert('Error', 'Failed to delete exceptions. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExceptionsByDateRange = async (startDate: Date, endDate: Date) => {
    // Show loading state
    setIsLoading(true);
    
    try {
      // Create a copy of all routes to update
      const updatedRoutes = [...routes];
      
      // Set start/end dates to the beginning/end of their respective days
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      // Loop through each route and remove exceptions within the date range
      for (let i = 0; i < updatedRoutes.length; i++) {
        const route = updatedRoutes[i];
        
        // Skip routes without schedules or exceptions
        if (!route.schedule || !route.schedule.exceptions) continue;
        
        // Filter out exceptions within the date range
        route.schedule.exceptions = route.schedule.exceptions.filter(
          (ex: ScheduleException) => {
            const exDate = new Date(ex.date);
            return exDate < start || exDate > end;
          }
        );
      }
      
      // Update the state with the new routes
      setRoutes(updatedRoutes);
      setFilteredRoutes(updatedRoutes);
      
      // Show success message
      Alert.alert('Success', `Exceptions between ${startDate.toLocaleDateString()} and ${endDate.toLocaleDateString()} have been removed from all routes`);
    } catch (error) {
      console.error('Error deleting exceptions by date range:', error);
      Alert.alert('Error', 'Failed to delete exceptions. Please try again.');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Routes</ThemedText>
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
            placeholder="Search routes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={Theme.colors.text.tertiary}
          />
        </View>
        
        {/* Exceptions Button */}
        <TouchableOpacity 
          style={styles.exceptionsButton}
          onPress={handleOpenExceptionsModal}
        >
          <Calendar size={20} color={Theme.colors.text.inverse} />
          <ThemedText style={styles.exceptionsButtonText}>Exceptions</ThemedText>
        </TouchableOpacity>
        
        {/* Add Route Button */}
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewRoute}
        >
          <Plus size={20} color={Theme.colors.text.inverse} />
          <ThemedText style={styles.addButtonText}>Add Route</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Main content with fade-in animation */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredRoutes}
          renderItem={renderRouteItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>
      
      {/* Add Route Modal */}
      <AddRouteModal
        visible={addModalVisible}
        onClose={handleCloseAddModal}
        onSave={handleSaveRoute}
      />
      
      {/* Update Route Modal */}
      {/* Conditional rendering to prevent issues with undefined route data */}
      {selectedRouteData && (
        <UpdateRouteModal
          visible={updateModalVisible}
          onClose={handleCloseUpdateModal}
          onUpdate={handleUpdateRoute}
          onDelete={handleUpdateRouteModalDelete}
          route={selectedRouteData}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {renderDeleteConfirmationModal()}
      
      {/* Loading Overlay */}
      {renderLoadingOverlay()}
      
      {/* Add CSS animation for spinner */}
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `
        }} />
      )}
      
      {/* Add Route Exceptions Modal */}
      <RouteExceptionsModal
        isVisible={exceptionsModalVisible}
        onClose={() => setExceptionsModalVisible(false)}
        onApply={handleApplyExceptionToAllRoutes}
        onDeleteByDate={handleDeleteExceptionsByDate}
        onDeleteByDateRange={handleDeleteExceptionsByDateRange}
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
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: Theme.colors.text.primary,
    marginLeft: 8,
  },
  exceptionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 16,
    marginLeft: 12,
  },
  exceptionsButtonText: {
    color: Theme.colors.text.inverse,
    fontWeight: '500',
    marginLeft: 6,
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
  list: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteModalContainer: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteModalText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  deleteButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  cancelDeleteButton: {
    backgroundColor: Theme.colors.background.tertiary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 12,
  },
  cancelDeleteText: {
    color: Theme.colors.text.primary,
    fontWeight: '500',
  },
  confirmDeleteButton: {
    backgroundColor: Theme.colors.error,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  confirmDeleteText: {
    color: Theme.colors.text.inverse,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
  routeNameText: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
});