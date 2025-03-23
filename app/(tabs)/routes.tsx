import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, TextInput, Alert, Animated, Platform, Modal } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Clock, MapPin, X } from 'lucide-react';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/PersistentSidebar';
import UpdateRouteModal from '@/components/modals/UpdateRouteModal';
import AddRouteModal from '@/components/modals/AddRouteModal';

// Define interface for Route based on Firestore structure
interface Route {
  id: string;
  route_key: string;
  name: string;
  school_id: string;
  assigned_driver_id: string;
  start_time: string;
  end_time: string;
  stops_count: number;
}

// Define interface for a Driver (for assignment)
interface Driver {
  id: string;
  name: string;
}

// Define interface for RouteData
interface RouteData {
  name: string;
  routeKey: string;
  startTime: string;
  endTime: string;
  stops: any[];
  estimatedDuration?: number;
  assignedDriverId?: string;
}

// Mock Firebase functions
const fetchRoutes = (): Promise<Route[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData: Route[] = [];
      for (let i = 1; i <= 10; i++) {
        mockData.push({ 
          id: `route${i}`, 
          route_key: `RT${1000+i}`,
          name: `Route ${i}`, 
          school_id: 'school1',
          assigned_driver_id: `driver${i % 3 + 1}`,
          start_time: '08:00 AM',
          end_time: '09:15 AM',
          stops_count: 5 + (i % 5) // Random number of stops between 5-9
        });
      }
      resolve(mockData);
    }, 500);
  });
};

// Mock function to fetch a specific route with its stops
const fetchRouteDetails = (routeId: string, schoolId: string): Promise<RouteData> => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // Create mock stops based on route ID
      const stops = [];
      const stopsCount = 5 + (parseInt(routeId.replace('route', '')) % 5);
      
      for (let i = 1; i <= stopsCount; i++) {
        stops.push({
          id: `stop-${routeId}-${i}`,
          name: `Stop ${i} for ${routeId}`,
          address: `${100 + i} Main St, New York, NY ${10000 + i}`,
          lat: 40.7 + (Math.random() * 0.1),
          lng: -73.9 + (Math.random() * 0.1),
          eta: `${8 + Math.floor(i/2)}:${(i * 5) % 60 < 10 ? '0' + (i * 5) % 60 : (i * 5) % 60} AM`
        });
      }
      
      // Create mock route data
      const routeData: RouteData = {
        name: `Route ${routeId.replace('route', '')}`,
        routeKey: `RT${1000 + parseInt(routeId.replace('route', ''))}`,
        startTime: '08:00 AM',
        endTime: '09:15 AM',
        stops: stops,
        estimatedDuration: 75, // minutes
        assignedDriverId: `driver${parseInt(routeId.replace('route', '')) % 3 + 1}`
      };
      
      resolve(routeData);
    }, 800);
  });
};

const fetchDrivers = (): Promise<Driver[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData: Driver[] = [];
      for (let i = 1; i <= 5; i++) {
        mockData.push({ 
          id: `driver${i}`, 
          name: `Driver ${i}`
        });
      }
      resolve(mockData);
    }, 300);
  });
};

export default function RoutesScreen() {
  const { schoolName } = useSchoolContext();
  // Use a default schoolId since it's not available in the context
  const schoolId = 'school1';
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  
  // State for action menu
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  
  // State for delete confirmation modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  
  // State for modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [selectedRouteData, setSelectedRouteData] = useState<RouteData | undefined>(undefined);
  const [isLoadingRouteData, setIsLoadingRouteData] = useState(false);
  
  // Animation for content fade-in
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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

  // Action menu handlers
  const toggleActionMenu = (route: Route) => {
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
  };

  // Get driver name by ID
  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unassigned';
  };

  const handleEditRoute = async (route: Route) => {
    // Close action menu
    setActionMenuVisible(false);
    setActiveRouteId(null);
    
    // Show loading state
    setIsLoadingRouteData(true);
    
    try {
      // In a real implementation, this would fetch from Firebase
      // For now, we use our mock function
      const routeData = await fetchRouteDetails(route.id, route.school_id);
      
      // Set the route data and show the update modal
      setSelectedRouteData(routeData);
      setUpdateModalVisible(true);
    } catch (error) {
      console.error('Error loading route details:', error);
      Alert.alert('Error', 'Failed to load route details. Please try again.');
    } finally {
      setIsLoadingRouteData(false);
    }
  };

  const showDeleteConfirmation = (route: Route) => {
    // Close action menu
    setActionMenuVisible(false);
    setActiveRouteId(null);
    
    // Set route to delete and show delete modal
    setRouteToDelete(route);
    setDeleteModalVisible(true);
  };

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

  const handleAddNewRoute = () => {
    // Open the add route modal
    setAddModalVisible(true);
  };
  
  // Handle save from modal
  const handleSaveRoute = (routeData: RouteData) => {
    // In a real implementation, this would save to Firebase
    // For now, we'll add it to our local state
    const newRoute: Route = {
      id: `route-${Date.now()}`,
      route_key: routeData.routeKey,
      name: routeData.name,
      school_id: schoolId || 'school1', // Use current school ID
      assigned_driver_id: routeData.assignedDriverId || '', 
      start_time: routeData.startTime,
      end_time: routeData.endTime,
      stops_count: routeData.stops.length
    };
    
    const updatedRoutes = [newRoute, ...routes];
    setRoutes(updatedRoutes);
    setFilteredRoutes(updatedRoutes);
    setAddModalVisible(false);
    
    // Show success message
    Alert.alert('Success', 'Route has been created successfully');
  };
  
  // Handle update from modal
  const handleUpdateRoute = (routeData: RouteData) => {
    // In a real implementation, this would update in Firebase
    // For now, we'll update our local state
    if (selectedRoute) {
      const updatedRoute: Route = {
        ...selectedRoute,
        name: routeData.name,
        route_key: routeData.routeKey,
        start_time: routeData.startTime,
        end_time: routeData.endTime,
        assigned_driver_id: routeData.assignedDriverId || '',
        stops_count: routeData.stops.length
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
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <Trash2 size={24} color="#EF4444" />
              <ThemedText style={styles.confirmationTitle}>Delete Route</ThemedText>
            </View>
            
            <View style={styles.confirmationContent}>
              <ThemedText style={styles.confirmationText}>
                Are you sure you want to delete <ThemedText style={styles.routeNameText}>{routeToDelete.name}</ThemedText>?
              </ThemedText>
              <ThemedText style={styles.confirmationSubtext}>
                This action cannot be undone. All data associated with this route will be permanently removed.
              </ThemedText>
            </View>
            
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleteModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteRoute}
              >
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Render route item
  const renderRouteItem = ({ item }: { item: Route }) => (
    <View style={styles.routeCard}>
      <View style={styles.routeInfo}>
        <View style={styles.routeHeader}>
          <View style={styles.routeIdentifier}>
            <ThemedText style={styles.routeKey}>{item.route_key}</ThemedText>
          </View>
          <ThemedText style={styles.routeName}>{item.name}</ThemedText>
        </View>
        
        <View style={styles.routeDetails}>
          <View style={styles.detailItem}>
            <Clock size={14} color="#6B7280" />
            <ThemedText style={styles.detailText}>{item.start_time} - {item.end_time}</ThemedText>
          </View>
          <View style={styles.detailItem}>
            <MapPin size={14} color="#6B7280" />
            <ThemedText style={styles.detailText}>{item.stops_count} stops</ThemedText>
          </View>
        </View>
        
        <View style={styles.driverSection}>
          <ThemedText style={styles.driverLabel}>Driver:</ThemedText>
          <ThemedText style={styles.driverName}>
            {getDriverName(item.assigned_driver_id)}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => toggleActionMenu(item)}
        >
          <MoreVertical size={20} color="#6B7280" />
        </TouchableOpacity>
        
        {/* Action Menu - displayed inline instead of absolutely positioned */}
        {actionMenuVisible && activeRouteId === item.id && (
          <View style={styles.actionMenu}>
            <TouchableOpacity 
              style={styles.actionMenuItem} 
              onPress={() => handleEditRoute(item)}
            >
              <Edit size={16} color="#4B5563" />
              <ThemedText style={styles.actionMenuText}>Edit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionMenuItem} 
              onPress={() => showDeleteConfirmation(item)}
            >
              <Trash2 size={16} color="#EF4444" />
              <ThemedText style={[styles.actionMenuText, styles.deleteText]}>Delete</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

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
              borderRadius: '50%',
              border: '3px solid rgba(67, 97, 238, 0.3)',
              borderTopColor: '#4361ee',
              animation: 'spin 1s linear infinite',
              marginTop: '12px'
            }}></div>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Routes</ThemedText>
        <ThemedText style={styles.schoolName}>{schoolName}</ThemedText>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={[
              styles.searchInput,
              Platform.OS === 'web' ? { outline: 'none' } : {}
            ]}
            placeholder="Search routes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewRoute}
        >
          <Plus size={18} color="white" />
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
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchContainer: {
    flex: 1,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
    height: 40,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361ee',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
  },
  routeCard: {
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    position: 'relative',
  },
  routeInfo: {
    flex: 1,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeIdentifier: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  routeKey: {
    fontWeight: '600',
    fontSize: 14,
    color: '#4F46E5',
  },
  routeName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1F2937',
  },
  routeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  driverLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  actionContainer: {
    position: 'relative',
  },
  actionButton: {
    padding: 8,
  },
  actionMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    width: 150,
    zIndex: 1000,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  actionMenuText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4B5563',
  },
  deleteText: {
    color: '#EF4444',
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
  // Delete confirmation modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: Platform.OS === 'web' ? 400 : '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  confirmationContent: {
    marginBottom: 24,
  },
  confirmationText: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 24,
  },
  routeNameText: {
    fontWeight: 'bold',
    color: '#1F2937',
  },
  confirmationSubtext: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});