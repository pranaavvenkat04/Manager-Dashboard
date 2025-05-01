import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Animated, Text } from 'react-native';
import { ChevronRight, Activity, Users, Map, BarChart } from 'lucide-react';
import { router } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Import the SchoolProvider from a consistent location
// Adjust this import path based on your actual component location
import { useSchoolContext } from '@/components/PersistentSidebar';

// Define interfaces for type safety based on Firestore structure
interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  school_id: string;
  assigned_vehicle_id: string;
}

interface Route {
  id: string;
  route_key: string;
  name: string;
  school_id: string;
  assigned_driver_id: string;
  start_time: string;
  end_time: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  school_id: string;
  viewable_routes: string[];
}

// Mock Firebase functions with proper typing
const fetchCollection = <T,>(collection: string): Promise<T[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockData: any[] = [];
      // Generate 6 mock items for each collection
      for (let i = 1; i <= 6; i++) {
        if (collection === 'Drivers') {
          mockData.push({ 
            id: `driver${i}`, 
            name: `Driver ${i}`, 
            email: `driver${i}@school.edu`, 
            phone: `555-000-${1000+i}`,
            school_id: 'school1',
            assigned_vehicle_id: `vehicle${i}`
          });
        } else if (collection === 'Routes') {
          mockData.push({ 
            id: `route${i}`, 
            route_key: `RT${1000+i}`,
            name: `Route ${i}`, 
            school_id: 'school1',
            assigned_driver_id: `driver${i % 3 + 1}`,
            start_time: '08:00 AM',
            end_time: '09:15 AM'
          });
        } else if (collection === 'ParentStudents') {
          mockData.push({ 
            id: `user${i}`, 
            name: `Student/Parent ${i}`, 
            email: `user${i}@email.com`, 
            school_id: 'school1',
            viewable_routes: [`route${i % 3 + 1}`]
          });
        }
      }
      resolve(mockData as T[]);
    }, 500);
  });
};

export default function HomeScreen() {
  // Firebase Auth state
  const auth = getAuth();
  const [isSignedIn, setIsSignedIn] = useState(!!auth.currentUser);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Auth state change listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsSignedIn(!!user);
      setIsLoaded(true);
    });
    
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    console.log("Home screen auth state:", { isSignedIn, isLoaded });
  }, [isSignedIn, isLoaded]);
  
  // Get school context - use conditional to handle potential missing provider
  const schoolContext = useSchoolContext ? useSchoolContext() : { schoolName: "Demo School" };
  const { schoolName } = schoolContext;
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation for content fade-in
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Verify that we're on the home page and authenticated
    console.log("Home screen mounted, fetching data");
    
    // Fetch data on component mount
    const loadData = async () => {
      setIsLoading(true);
      try {
        const driversData = await fetchCollection<Driver>('Drivers');
        const routesData = await fetchCollection<Route>('Routes');
        const usersData = await fetchCollection<User>('ParentStudents');
        
        setDrivers(driversData);
        setRoutes(routesData);
        setUsers(usersData);
        
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

  const navigateToDetailView = (path: string) => {
    router.push(path as any);
  };

  if (!isLoaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading dashboard...</Text>
      </View>
    );
  }

  // If we somehow got here without being authenticated
  if (!isSignedIn) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Please log in to view the dashboard</Text>
      </View>
    );
  }

  const renderDrivers = () => {
    return (
      <ThemedView style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Users size={20} color="#4361ee" />
          <ThemedText type="subtitle" style={styles.sectionTitle}>Drivers</ThemedText>
        </View>
        
        {drivers.slice(0, 3).map((driver) => (
          <View key={driver.id} style={styles.itemContainer}>
            <ThemedText style={styles.itemText}>{driver.name}</ThemedText>
          </View>
        ))}
        
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => navigateToDetailView('/drivers')}
        >
          <ThemedText style={styles.viewAllText}>View All</ThemedText>
          <ChevronRight size={18} color="#4361ee" />
        </TouchableOpacity>
      </ThemedView>
    );
  };

  const renderRoutes = () => {
    return (
      <ThemedView style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Map size={20} color="#3a86ff" />
          <ThemedText type="subtitle" style={styles.sectionTitle}>Manage Routes</ThemedText>
        </View>
        
        {routes.slice(0, 3).map((route) => (
          <View key={route.id} style={styles.itemContainer}>
            <ThemedText style={styles.itemText}>{route.name}</ThemedText>
          </View>
        ))}
        
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => navigateToDetailView('/routes')}
        >
          <ThemedText style={styles.viewAllText}>View All</ThemedText>
          <ChevronRight size={18} color="#3a86ff" />
        </TouchableOpacity>
      </ThemedView>
    );
  };

  const renderUsers = () => {
    return (
      <ThemedView style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Users size={20} color="#7209b7" />
          <ThemedText type="subtitle" style={styles.sectionTitle}>Students/Parents</ThemedText>
        </View>
        
        {users.slice(0, 3).map((user) => (
          <View key={user.id} style={styles.itemContainer}>
            <ThemedText style={styles.itemText}>{user.name}</ThemedText>
          </View>
        ))}
        
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => navigateToDetailView('/users')}
        >
          <ThemedText style={styles.viewAllText}>View All</ThemedText>
          <ChevronRight size={18} color="#7209b7" />
        </TouchableOpacity>
      </ThemedView>
    );
  };

  const renderReports = () => {
    return (
      <ThemedView style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <BarChart size={20} color="#d1495b" />
          <ThemedText type="subtitle" style={styles.sectionTitle}>Generate Reports</ThemedText>
        </View>
        
        <View style={styles.itemContainer}>
          <ThemedText style={styles.itemText}>Monthly Activity Report</ThemedText>
        </View>
        
        <TouchableOpacity style={styles.generateReportButton}>
          <ThemedText style={styles.generateReportText}>Generate</ThemedText>
          <ChevronRight size={18} color="white" />
        </TouchableOpacity>
      </ThemedView>
    );
  };

  const renderStats = () => {
    return (
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: 'rgba(67, 97, 238, 0.1)' }]}>
          <ThemedText style={styles.statNumber}>{drivers.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Drivers</ThemedText>
        </View>
        
        <View style={[styles.statBox, { backgroundColor: 'rgba(58, 134, 255, 0.1)' }]}>
          <ThemedText style={styles.statNumber}>{routes.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Active Routes</ThemedText>
        </View>
        
        <View style={[styles.statBox, { backgroundColor: 'rgba(114, 9, 183, 0.1)' }]}>
          <ThemedText style={styles.statNumber}>{users.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Registered Users</ThemedText>
        </View>
        
        <View style={[styles.statBox, { backgroundColor: 'rgba(247, 37, 133, 0.1)' }]}>
          <ThemedText style={styles.statNumber}>15</ThemedText>
          <ThemedText style={styles.statLabel}>Buses On Road</ThemedText>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.mainContent}>
      {/* Page Title */}
      <View style={styles.pageHeader}>
        <ThemedText style={styles.pageTitle}>Dashboard</ThemedText>
        {schoolName && <ThemedText style={styles.schoolName}>{schoolName}</ThemedText>}
      </View>
      
      {/* Main content */}
      <ScrollView style={styles.scrollView}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {renderStats()}
          <View style={styles.gridContainer}>
            <View style={styles.column}>
              {renderDrivers()}
            </View>
            <View style={styles.column}>
              {renderRoutes()}
            </View>
            <View style={styles.column}>
              {renderUsers()}
              {renderReports()}
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageHeader: {
    padding: 24,
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
  scrollView: {
    flex: 1,
    padding: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  statBox: {
    width: '24%',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  column: {
    width: '33.33%',
    paddingHorizontal: 8,
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    padding: 24,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginLeft: 8,
    color: '#1f2937',
    fontWeight: '600',
  },
  itemContainer: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  itemText: {
    color: 'white',
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    backgroundColor: '#f0f5ff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  viewAllText: {
    color: '#4361ee',
    fontWeight: '600',
    marginRight: 8,
  },
  generateReportButton: {
    flexDirection: 'row',
    backgroundColor: '#d1495b',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  generateReportText: {
    color: 'white',
    fontWeight: '600',
    marginRight: 8,
  },
});