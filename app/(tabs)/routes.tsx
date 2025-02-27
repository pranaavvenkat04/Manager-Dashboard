import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, FlatList, TextInput, Alert, Animated } from 'react-native';
import { Search, Plus, Filter, MoreVertical, Edit, Trash2, Clock, MapPin } from 'lucide-react';
import { useNavigation } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useSchoolContext } from '@/components/SchoolProvider';

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
  const [routes, setRoutes] = useState<Route[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 });
  
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
  const showActionMenu = (route: Route, event: any) => {
    setSelectedRoute(route);
    // In a real implementation, get the touch coordinates
    // For now, we'll use mock coordinates
    setActionMenuPosition({ x: 100, y: 100 });
    setActionMenuVisible(true);
  };

  const hideActionMenu = () => {
    setActionMenuVisible(false);
    setSelectedRoute(null);
  };

  // Get driver name by ID
  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unassigned';
  };

  const handleEditRoute = (route: Route) => {
    hideActionMenu();
    Alert.alert('Edit Route', `Edit ${route.name}'s information`);
    // In a real implementation, navigate to edit form
  };

  const handleDeleteRoute = (route: Route) => {
    hideActionMenu();
    Alert.alert(
      'Delete Route',
      `Are you sure you want to delete ${route.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            // In a real implementation, delete from Firebase
            const updatedRoutes = routes.filter(r => r.id !== route.id);
            setRoutes(updatedRoutes);
            setFilteredRoutes(updatedRoutes);
            Alert.alert('Success', 'Route has been deleted');
          }
        }
      ]
    );
  };

  const handleAddNewRoute = () => {
    Alert.alert('Add Route', 'Navigate to add route form');
    // In a real implementation, navigate to add form
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
      
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={(e) => showActionMenu(item, e)}
      >
        <MoreVertical size={20} color="#6B7280" />
      </TouchableOpacity>
      
      {/* Action Menu (positioned absolutely in a real implementation) */}
      {actionMenuVisible && selectedRoute?.id === item.id && (
        <View style={[styles.actionMenu, { top: actionMenuPosition.y, left: actionMenuPosition.x }]}>
          <TouchableOpacity style={styles.actionMenuItem} onPress={() => handleEditRoute(item)}>
            <Edit size={16} color="#4B5563" />
            <ThemedText style={styles.actionMenuText}>Edit</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionMenuItem} onPress={() => handleDeleteRoute(item)}>
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
            placeholder="Search routes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#6B7280"
          />
        </View>
        
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#6B7280" />
          <ThemedText style={styles.filterText}>Filter</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewRoute}
        >
          <Plus size={20} color="white" />
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
    outline: 'none',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 16,
  },
  filterText: {
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
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
  routeCard: {
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