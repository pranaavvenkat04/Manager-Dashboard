import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
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
import { AuthContext } from '@/app/_layout';

import { RouteData, RouteSchedule, ScheduleException } from '@/types/RouteTypes';
import { getCurrentSchool } from '@/utils/firebase';
import { db } from '@/utils/firebase';
import { Theme } from '@/constants/Colors';
import { updateDriverRoutes } from '@/utils/RouteUtils';

// Update fetch functions to use Firebase instead of mock data
// Looking at two specific functions to edit:

// Update the fetchRoutes function to retrieve routes from Firestore
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

    // Get all routes data
    const routesData = routesSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Log the soft_delete value for debugging
      console.log(`Route ${doc.id} (${data.name || 'Unnamed'}): soft_delete = ${data.soft_delete ? 'true' : 'false'}`);
      
      // Format start and end times properly
      const formattedStartTime = data.start_time || '08:00 AM';
      const formattedEndTime = data.end_time || '09:15 AM';
      
      return {
        id: doc.id,
        name: data.name || 'Unnamed Route',
        stops: data.stops_count || 0,
        status: data.active ? 'Active' : 'Inactive',
        driverId: data.assigned_driver_id || null,
        driverName: 'Loading...', // Will be populated later
        startTime: formattedStartTime,
        start_time: formattedStartTime,
        endTime: formattedEndTime,
        end_time: formattedEndTime,
        duration: data.estimated_duration || 0,
        route_key: data.route_key || '',
        route_code: data.route_code || data.route_key || doc.id.substring(0, 6),
        soft_delete: data.soft_delete || false // Include soft_delete flag
      };
    });
    
    // Filter out soft-deleted routes
    const activeRoutes = routesData.filter(route => !route.soft_delete);
    console.log(`Filtered routes: ${routesData.length} total, ${activeRoutes.length} active (${routesData.length - activeRoutes.length} soft-deleted)`);
    
    // Get all drivers for reference with complete information
    const driversData = await fetchDrivers();
    
    // Create a map for quick driver lookups
    const driversMap = new Map();
    driversData.forEach(driver => {
      if (driver.id) {
        driversMap.set(driver.id, driver.name);
      }
    });
    
    // Add driver names to routes
    return activeRoutes.map(route => ({
      ...route,
      driverName: route.driverId && driversMap.has(route.driverId) 
        ? driversMap.get(route.driverId) 
        : 'Unassigned'
    }));
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
      // Format driver name properly, using firstName and lastName if available
      const firstName = data.firstName || '';
      const lastName = data.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      return {
        id: doc.id,
        name: fullName || data.name || 'Unnamed Driver'
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
    
    // Use routesFirebaseMethods to get the route details with stops
    return await routesFirebaseMethods.getRoute(routeId, schoolId);
  } catch (error: any) {
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
  const [currentSchoolId, setCurrentSchoolId] = useState<string>('');
  
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

  const { user } = useContext(AuthContext);

  useEffect(() => {
    // Fetch routes and drivers on component mount
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Get the current school ID first
        const schoolId = await getCurrentSchool();
        if (schoolId) {
          setCurrentSchoolId(schoolId);
        }
        
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
      route={{
        ...item,
        driverName: item.driverName // Ensure driverName is passed to the component
      }}
      drivers={drivers}
      onActionMenu={() => {}}
      activeRouteId={null}
      actionMenuVisible={false}
      onEdit={handleEditRoute}
      onDelete={showDeleteConfirmation}
    />
  ), [drivers, handleEditRoute, showDeleteConfirmation]);

  // Handle delete route
  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;

    try {
      // Show loading state
      setIsLoading(true);
      
      // Get current school ID
      const currentSchoolId = await getCurrentSchool();
      if (!currentSchoolId) {
        throw new Error('No school ID found');
      }
      
      // Create a complete route object with all required fields
      const routeToSoftDelete = {
        ...routeToDelete,
        active: false,
        soft_delete: true,
        
        // Add deletion metadata - use the deleted_by value if it exists, otherwise use 'system'
        deleted_at: routeToDelete.deleted_at || new Date().toISOString(),
        deleted_by: routeToDelete.deleted_by || 'system',
        
        // Ensure these required fields have valid values
        start_time: routeToDelete.startTime || routeToDelete.start_time || '00:00',
        end_time: routeToDelete.endTime || routeToDelete.end_time || '00:00',
        title: routeToDelete.name || 'Unnamed Route',
        name: routeToDelete.name || 'Unnamed Route'
      };
      
      console.log('Soft deleting route with data:', JSON.stringify({
        id: routeToSoftDelete.id,
        name: routeToSoftDelete.name,
        start_time: routeToSoftDelete.start_time,
        end_time: routeToSoftDelete.end_time,
        soft_delete: routeToSoftDelete.soft_delete,
        deleted_at: routeToSoftDelete.deleted_at,
        deleted_by: routeToSoftDelete.deleted_by
      }));
      
      // Update the route with soft_delete flag set to true
      await routesFirebaseMethods.updateRoute(routeToDelete.id, routeToSoftDelete, currentSchoolId);
      
      console.log(`Route ${routeToDelete.id} soft deleted successfully`);
      
      // Refresh the routes list (filtered list will not include soft-deleted routes)
      const routesData = await fetchRoutes();
      setRoutes(routesData);
      setFilteredRoutes(routesData);
      
      // Clear state and close modal
      setRouteToDelete(null);
      setDeleteModalVisible(false);
      
      // Show success message
      Alert.alert('Success', 'Route has been deleted');
    } catch (error: any) {
      console.error('Error deleting route:', error);
      Alert.alert('Error', `Failed to delete route: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle save from modal
  const handleSaveRoute = async (routeData: RouteData) => {
    try {
      // Show loading state
      setIsLoading(true);
      
      // Get current school ID
      const currentSchoolId = await getCurrentSchool();
      if (!currentSchoolId) {
        throw new Error('No school ID found');
      }
      
      // Save the route to Firebase
      const routeId = await routesFirebaseMethods.addRoute(routeData, currentSchoolId);
      
      // If a driver is assigned, update the driver's assigned routes
      if (routeData.assigned_driver_id || routeData.assignedDriverId) {
        const driverId = routeData.assigned_driver_id || routeData.assignedDriverId;
        try {
          if (driverId && routeId) {
            await updateDriverRoutes(driverId, routeId);
            console.log(`Driver ${driverId} assigned to route ${routeId}`);
          }
        } catch (driverUpdateError: any) {
          console.error('Error updating driver routes:', driverUpdateError);
          // Don't block the flow if driver update fails
          Alert.alert(
            'Warning',
            'Route created, but there was an issue updating the driver assignment.'
          );
        }
      }
      
      // Refresh the routes list
      const routesData = await fetchRoutes();
      setRoutes(routesData);
      setFilteredRoutes(routesData);
      
      // Close the modal
      setAddModalVisible(false);
      
      // Show success message
      Alert.alert('Success', 'Route has been created successfully');
    } catch (error: any) {
      console.error('Error saving route:', error);
      Alert.alert('Error', `Failed to save route: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle update from modal
  const handleUpdateRoute = async (routeData: RouteData) => {
    // IMPROVED: Add a safeguard for when selectedRoute might not be set,
    // but we still need to perform a soft delete
    if (!selectedRoute && !routeData.soft_delete) {
      console.error('No selected route found for update');
      Alert.alert('Error', 'No route selected for update');
      return;
    }
    
    try {
      // Show loading state
      setIsLoading(true);
      
      // Get current school ID
      const currentSchoolId = await getCurrentSchool();
      if (!currentSchoolId) {
        throw new Error('No school ID found');
      }
      
      // Use the route ID from the routeData if selectedRoute is not available
      const routeId = routeData.id || (selectedRoute ? selectedRoute.id : null);
      
      if (!routeId) {
        throw new Error('No route ID found for update');
      }
      
      // Check if this is a soft delete operation
      if (routeData.soft_delete) {
        console.log(`Soft deleting route ${routeId}`);
        
        // Ensure the soft_delete flag is explicitly set and all required fields have values
        const routeToSoftDelete = {
          ...routeData,
          id: routeId,
          active: false,
          soft_delete: true,  // Explicitly set to true
          
          // Add deletion metadata - use the deleted_by field from routeData if it exists,
          // otherwise use the current user's UID or 'system' as fallback
          deleted_at: routeData.deleted_at || new Date().toISOString(),
          deleted_by: routeData.deleted_by || (user?.uid || 'system'),
          
          // Ensure these required fields have valid values
          start_time: routeData.start_time || routeData.startTime || '00:00',
          end_time: routeData.end_time || routeData.endTime || '00:00',
          title: routeData.title || routeData.name || 'Unnamed Route',
          name: routeData.name || routeData.title || 'Unnamed Route'
        };
        
        console.log('Soft deleting with data:', JSON.stringify({
          id: routeToSoftDelete.id,
          name: routeToSoftDelete.name,
          start_time: routeToSoftDelete.start_time,
          end_time: routeToSoftDelete.end_time,
          soft_delete: routeToSoftDelete.soft_delete,
          deleted_at: routeToSoftDelete.deleted_at,
          deleted_by: routeToSoftDelete.deleted_by
        }));
        
        // Update the route in Firebase with soft_delete flag
        await routesFirebaseMethods.updateRoute(routeId, routeToSoftDelete, currentSchoolId);
        
        console.log(`Route ${routeId} soft deleted successfully`);
      } else {
        // Normal update operation
        // Make sure required fields are not undefined
        const updatedRouteData = {
          ...routeData,
          start_time: routeData.start_time || routeData.startTime || '00:00',
          end_time: routeData.end_time || routeData.endTime || '00:00',
          title: routeData.title || routeData.name || 'Unnamed Route',
          name: routeData.name || routeData.title || 'Unnamed Route'
        };
        
        // Update the route in Firebase
        await routesFirebaseMethods.updateRoute(routeId, updatedRouteData, currentSchoolId);
      }
      
      // Refresh the routes list
      const routesData = await fetchRoutes();
      setRoutes(routesData);
      setFilteredRoutes(routesData);
      
      // Close the modal
      setUpdateModalVisible(false);
      
      // Show success message
      Alert.alert('Success', routeData.soft_delete ? 
        'Route has been deleted' : 
        'Route has been updated successfully'
      );
    } catch (error: any) {
      console.error('Error updating route:', error);
      Alert.alert('Error', `Failed to update route: ${error.message}`);
    } finally {
      setIsLoading(false);
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
          <View style={styles.confirmationModalContainer}>
            <View style={styles.confirmationHeader}>
              <ThemedText style={styles.confirmationTitle}>Confirm Deletion</ThemedText>
            </View>
            <View style={styles.confirmationContent}>
              <ThemedText style={styles.confirmationText}>
                Are you sure you want to delete <ThemedText style={styles.routeNameText}>{routeToDelete.name}</ThemedText>?
                This action cannot be undone.
              </ThemedText>
            </View>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={styles.cancelConfirmButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <ThemedText style={styles.cancelConfirmButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteRoute}
              >
                <ThemedText style={styles.deleteConfirmButtonText}>Delete</ThemedText>
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
      // Get current school ID
      const schoolId = await getCurrentSchool();
      if (!schoolId) {
        throw new Error('No school ID found');
      }
      
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
        
        // Update the route in Firebase
        try {
          if (route.id) {
            await routesFirebaseMethods.updateRoute(route.id, {
              ...route,
              schedule: route.schedule
            }, schoolId);
          }
        } catch (updateError) {
          console.error(`Error updating route ${route.id}:`, updateError);
          // Continue with other routes even if this one fails
        }
      }
      
      // Update the state with the new routes
      setRoutes(updatedRoutes);
      setFilteredRoutes(updatedRoutes);
      
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
  const handleUpdateRouteModalDelete = async (routeData: RouteData) => {
    try {
      console.log(`Soft deleting route ${routeData.id}`);
      setIsLoading(true);
      
      // Get current school ID
      const currentSchoolId = await getCurrentSchool();
      if (!currentSchoolId) {
        throw new Error('No school ID found');
      }
      
      if (!routeData.id) {
        throw new Error('No route ID found for deletion');
      }
      
      // Ensure routeData has soft_delete flag explicitly set to true
      // and all required fields have valid values (not undefined)
      const routeToSoftDelete: RouteData = {
        ...routeData,
        active: false,
        soft_delete: true, // Explicitly set for clarity
        
        // Add deletion metadata
        deleted_at: new Date().toISOString(),
        deleted_by: 'system',
        
        // Ensure these required fields have valid values
        start_time: routeData.start_time || routeData.startTime || '00:00',
        end_time: routeData.end_time || routeData.endTime || '00:00',
        title: routeData.title || routeData.name || 'Unnamed Route',
        name: routeData.name || routeData.title || 'Unnamed Route'
      };
      
      console.log('Route data being sent:', JSON.stringify({
        id: routeToSoftDelete.id,
        name: routeToSoftDelete.name,
        title: routeToSoftDelete.title,
        start_time: routeToSoftDelete.start_time,
        end_time: routeToSoftDelete.end_time,
        soft_delete: routeToSoftDelete.soft_delete,
        deleted_at: routeToSoftDelete.deleted_at
      }));
      
      // Update the route in Firebase with soft delete flag
      await routesFirebaseMethods.updateRoute(
        routeData.id, 
        routeToSoftDelete, 
        currentSchoolId
      );
      
      console.log(`Route ${routeData.id} soft deleted successfully, refreshing routes list`);
      
      // Refresh the routes list (filtered list will not include soft-deleted routes)
      const routesData = await fetchRoutes();
      setRoutes(routesData);
      setFilteredRoutes(routesData);
      
      // Close the update modal
      setUpdateModalVisible(false);
      setSelectedRoute(null);
      setSelectedRouteData(undefined);
      
      // Show success message
      Alert.alert('Success', 'Route has been deleted');
    } catch (error) {
      console.error('Error soft deleting route:', error);
      Alert.alert('Error', 'Failed to delete route. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
      // Get current school ID
      const schoolId = await getCurrentSchool();
      if (!schoolId) {
        throw new Error('No school ID found');
      }
      
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
        
        // Update the route in Firebase
        try {
          if (route.id) {
            await routesFirebaseMethods.updateRoute(route.id, {
              ...route,
              schedule: route.schedule
            }, schoolId);
          }
        } catch (updateError) {
          console.error(`Error updating route ${route.id}:`, updateError);
          // Continue with other routes even if this one fails
        }
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
      // Get current school ID
      const schoolId = await getCurrentSchool();
      if (!schoolId) {
        throw new Error('No school ID found');
      }
      
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
        
        // Update the route in Firebase
        try {
          if (route.id) {
            await routesFirebaseMethods.updateRoute(route.id, {
              ...route,
              schedule: route.schedule
            }, schoolId);
          }
        } catch (updateError) {
          console.error(`Error updating route ${route.id}:`, updateError);
          // Continue with other routes even if this one fails
        }
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
          schoolId={currentSchoolId}
        />
      )}
      
      {/* Delete Confirmation Modal */}
      {renderDeleteConfirmationModal()}
      
      {/* Loading Overlay */}
      {renderLoadingOverlay()}
      
      {/* Add CSS animation for spinner */}
      {Platform.OS === 'web' && typeof document !== 'undefined' && (() => {
        // Create a style element for the spinner animation if it doesn't exist yet
        if (!document.getElementById('spinner-animation-style')) {
          const styleEl = document.createElement('style');
          styleEl.id = 'spinner-animation-style';
          styleEl.textContent = `
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(styleEl);
        }
        return null;
      })()}
      
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
  confirmationModalContainer: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
      }
    })
  },
  confirmationHeader: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  confirmationContent: {
    marginBottom: 24,
  },
  confirmationText: {
    fontSize: 15,
    lineHeight: 22,
    color: Theme.colors.text.secondary,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  cancelConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelConfirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  deleteConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.error,
    borderRadius: 6,
  },
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.inverse,
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
  deleteModalContainer: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 450,
    alignItems: 'center',
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
});