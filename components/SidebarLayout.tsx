// components/SidebarLayout.tsx
import React, { ReactNode, useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { usePathname, router } from 'expo-router';
import { LayoutDashboard, Package, MapPin, Users, Bell, HelpCircle, Settings, Menu, User } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface SidebarLayoutProps {
  children: ReactNode;
}

type AppRoute = '/' | '/drivers' | '/routes' | '/users' | '/notifications' | '/support' | '/settings';

interface RouteItem {
  path: AppRoute;
  icon: React.ComponentType<any>;
  label: string;
}

const ROUTES: RouteItem[] = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/drivers', icon: Package, label: 'Drivers' },
  { path: '/routes', icon: MapPin, label: 'Routes' },
  { path: '/users', icon: Users, label: 'Students/Parents' },
];

const BOTTOM_ROUTES: RouteItem[] = [
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/support', icon: HelpCircle, label: 'Help & support' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [activeIndicator] = useState(new Animated.Value(0));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth] = useState(new Animated.Value(230));
  
  // Find the index of the active route
  const getActiveIndex = () => {
    const allRoutes = [...ROUTES, ...BOTTOM_ROUTES];
    return allRoutes.findIndex(route => 
      pathname === route.path || pathname.startsWith(`${route.path}/`));
  };

  // Animate the active indicator when pathname changes
  useEffect(() => {
    const activeIndex = getActiveIndex();
    if (activeIndex !== -1) {
      Animated.timing(activeIndicator, {
        toValue: activeIndex,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [pathname]);

  // Toggle sidebar open/closed
  const toggleSidebar = () => {
    Animated.timing(sidebarWidth, {
      toValue: sidebarOpen ? 60 : 230,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setSidebarOpen(!sidebarOpen);
  };

  // Function to navigate to a route
  const navigateTo = (path: AppRoute) => {
    router.push(path as any);
  };

  // Calculate position for active indicator
  const getIndicatorStyle = () => {
    const index = getActiveIndex();
    const baseOffset = 70; // Starting position
    const spacing = 50; // Space between menu items
    const bottomOffset = 30; // Extra space between top and bottom groups
    
    const translateY = activeIndicator.interpolate({
      inputRange: [...ROUTES, ...BOTTOM_ROUTES].map((_, i) => i),
      outputRange: [...ROUTES, ...BOTTOM_ROUTES].map((_, i) => {
        if (i < ROUTES.length) {
          return baseOffset + (i * spacing);
        } else {
          return baseOffset + (ROUTES.length * spacing) + bottomOffset + ((i - ROUTES.length) * spacing);
        }
      }),
    });
    
    return {
      transform: [{ translateY }]
    };
  };

  // Render a nav item
  const renderNavItem = (route: RouteItem, index: number) => {
    const isActive = pathname === route.path || pathname.startsWith(`${route.path}/`);
    const Icon = route.icon;
    
    return (
      <TouchableOpacity
        key={route.path}
        style={[styles.navItem, isActive && styles.activeNavItem]}
        onPress={() => navigateTo(route.path)}
      >
        <Icon 
          size={20} 
          color={isActive ? '#FFFFFF' : '#94A3B8'} 
        />
        {sidebarOpen && (
          <ThemedText 
            style={[
              styles.navLabel, 
              isActive && styles.activeNavLabel
            ]}
          >
            {route.label}
          </ThemedText>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
        {/* Top section with logo and hamburger menu */}
        <View style={styles.sidebarHeader}>
          <View style={styles.logoContainer}>
            <ThemedText style={styles.logoText}>BusTrak</ThemedText>
          </View>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <Menu size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Active indicator - animated highlight */}
        <Animated.View style={[styles.activeIndicator, getIndicatorStyle()]} />
        
        {/* Top nav items */}
        <View style={styles.navGroup}>
          {ROUTES.map(renderNavItem)}
        </View>
        
        {/* Bottom nav items */}
        <View style={styles.bottomNavGroup}>
          {BOTTOM_ROUTES.map(renderNavItem)}
          
          {/* Profile button below settings */}
          <TouchableOpacity style={styles.profileItem}>
            <User size={20} color="#94A3B8" />
            {sidebarOpen && (
              <ThemedText style={styles.navLabel}>Profile</ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
      
      {/* Main content */}
      <View style={styles.content}>
        {/* Page content */}
        {children}
      </View>
    </View>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#192549', // Dark blue
    height: '100%',
    paddingTop: 20,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  logoContainer: {
    maxWidth: 150,
    flexShrink: 1,
    overflow: 'hidden',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  menuButton: {
    padding: 8,
  },
  navGroup: {
    marginTop: 10,
  },
  bottomNavGroup: {
    marginTop: 'auto',
    marginBottom: 20,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
  },
  activeNavItem: {
    backgroundColor: '#304878', // Slightly lighter blue when active
  },
  navLabel: {
    marginLeft: 12,
    fontSize: 14,
    color: '#94A3B8', // Light gray
  },
  activeNavLabel: {
    color: '#FFFFFF', // White when active
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    width: 4,
    height: 24,
    backgroundColor: '#4361ee',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    marginTop: 10,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});