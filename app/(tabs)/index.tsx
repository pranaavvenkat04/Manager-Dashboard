import React, { useEffect, useState, useContext } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Animated, ActivityIndicator } from 'react-native';
import { Users, LocateIcon, TruckIcon, ArrowRight, AlertTriangle } from 'lucide-react';
import { router } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { useSchoolContext } from '@/components/PersistentSidebar';
import { AuthContext } from '@/app/_layout';
import { Theme } from '@/constants/Colors';

// Type for dashboard metrics
interface MetricItem {
  id: string;
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  route: string;
}

export default function DashboardScreen() {
  const { schoolName } = useSchoolContext();
  const authContext = useContext(AuthContext);
  const [metrics, setMetrics] = useState<MetricItem[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Animation for content fade-in
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (authContext.schoolData) {
          // Create metrics array from the counts in the school data
          const counts = authContext.schoolData.counts;
          
          const metricsData: MetricItem[] = [
            {
              id: 'routes',
              title: 'Routes',
              count: counts.routes,
              icon: <LocateIcon size={24} color="white" />,
              color: '#3B82F6',
              route: '/routes',
            },
            {
              id: 'students',
              title: 'Students & Parents',
              count: counts.users,
              icon: <Users size={24} color="white" />,
              color: '#10B981',
              route: '/users',
            },
            {
              id: 'drivers',
              title: 'Drivers',
              count: counts.drivers,
              icon: <TruckIcon size={24} color="white" />,
              color: '#F59E0B',
              route: '/drivers',
            },
          ];
          
          setMetrics(metricsData);
        }
        
        // No alerts for now
        setAlerts([]);
        
        // Animate content fade-in
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [authContext.schoolData]);

  return (
    <View style={styles.container}>
      {/* Page Title */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Dashboard</ThemedText>
        <ThemedText style={styles.schoolName}>{schoolName || 'School'}</ThemedText>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <ThemedText style={styles.loadingText}>Loading dashboard...</ThemedText>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Metrics Section */}
            <View style={styles.metricsContainer}>
              <ThemedText style={styles.sectionTitle}>Overview</ThemedText>
              <View style={styles.metricsGrid}>
                {metrics.map((metric) => (
                  <TouchableOpacity
                    key={metric.id}
                    style={styles.metricCard}
                    onPress={() => router.push(`/(tabs)${metric.route}` as any)}
                  >
                    <View style={[styles.metricIconContainer, { backgroundColor: metric.color }]}>
                      {metric.icon}
                    </View>
                    <View style={styles.metricInfo}>
                      <ThemedText style={styles.metricTitle}>{metric.title}</ThemedText>
                      <ThemedText style={styles.metricCount}>{metric.count}</ThemedText>
                    </View>
                    <ArrowRight size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Alerts Section - Empty state */}
            {alerts.length === 0 ? (
              <View style={styles.alertsContainer}>
                <ThemedText style={styles.sectionTitle}>Recent Alerts</ThemedText>
                <View style={styles.emptyAlerts}>
                  <AlertTriangle size={24} color="#9CA3AF" />
                  <ThemedText style={styles.emptyText}>No alerts at this time</ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.alertsContainer}>
                <ThemedText style={styles.sectionTitle}>Recent Alerts</ThemedText>
                {/* Alert items would go here */}
              </View>
            )}
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 24,
    paddingBottom: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  schoolName: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  metricsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  metricsGrid: {
    gap: 12,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  metricInfo: {
    flex: 1,
  },
  metricTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  alertsContainer: {
    marginBottom: 24,
  },
  emptyAlerts: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
});