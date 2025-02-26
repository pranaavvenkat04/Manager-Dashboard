import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, TouchableWithoutFeedback, Platform } from 'react-native';
import { usePathname, router } from 'expo-router';
import { LayoutDashboard, Package, MapPin, Users, Bell, HelpCircle, Settings, User, LogOut } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

// Define props with schoolName to pass to children components
interface SchoolContextProps {
  schoolName?: string;
}

// Create context for school data
const SchoolContext = React.createContext<SchoolContextProps>({});

// Hook to access school context
export const useSchoolContext = () => React.useContext(SchoolContext);

interface SidebarLayoutProps {
  children: ReactNode;
}

type AppRoute = 
  | '/' 
  | '/drivers' 
  | '/routes' 
  | '/users' 
  | '/notifications' 
  | '/support' 
  | '/settings';

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

// Storage key for sidebar state
const SIDEBAR_STATE_KEY = 'bustrak_sidebar_open';

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('Jane Doe');
  const [schoolName, setSchoolName] = useState('School');
  const [showLogout, setShowLogout] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Use refs for animations to maintain consistent behavior
  const sidebarWidth = useRef(new Animated.Value(230)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const logoutOpacity = useRef(new Animated.Value(0)).current;
  const logoutScale = useRef(new Animated.Value(0.85)).current;
  const highlightPosition = useRef(new Animated.Value(0)).current;

  // Load saved sidebar state on component mount
  useEffect(() => {
    const loadSidebarState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(SIDEBAR_STATE_KEY);
        if (savedState !== null) {
          const isOpen = JSON.parse(savedState);
          setSidebarOpen(isOpen);
          sidebarWidth.setValue(isOpen ? 230 : 70);
          textOpacity.setValue(isOpen ? 1 : 0);
        }
        setInitialLoad(false);
      } catch (error) {
        console.error('Error loading sidebar state:', error);
        setInitialLoad(false);
      }
    };
    
    loadSidebarState();
  }, []);

  // Find the active index from the pathname
  const getActiveIndex = () => {
    const allRoutes = [...ROUTES, ...BOTTOM_ROUTES];
    return allRoutes.findIndex(route => 
      pathname === route.path || pathname.startsWith(`${route.path}/`));
  };
  
  const activeIndex = getActiveIndex();

  // Animate highlight position when pathname changes
  useEffect(() => {
    if (activeIndex !== -1 && !initialLoad) {
      Animated.timing(highlightPosition, {
        toValue: activeIndex,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [pathname, initialLoad]);

  // Fetch user profile and school data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mock API calls - in real app, these would be Firebase queries
        setTimeout(() => {
          setUserName('Jane Doe');
          setSchoolName('NYIT');
        }, 500);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  // Save sidebar state when it changes
  const saveSidebarState = async (isOpen: boolean) => {
    try {
      await AsyncStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(isOpen));
    } catch (error) {
      console.error('Error saving sidebar state:', error);
    }
  };

  // Toggle sidebar open/closed with animations
  const toggleSidebar = () => {
    if (animating) return; // Prevent multiple triggers during animation
    
    setAnimating(true);
    const newState = !sidebarOpen;
    
    // Save state to AsyncStorage
    saveSidebarState(newState);
    
    if (newState) {
      // Opening the sidebar
      Animated.timing(sidebarWidth, {
        toValue: 230,
        duration: 250,
        useNativeDriver: false,
      }).start();
      
      // Delayed text fade-in for smoother effect
      setTimeout(() => {
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setAnimating(false);
        });
      }, 100);
    } else {
      // Closing the sidebar - first fade out text, then shrink width
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(sidebarWidth, {
          toValue: 70,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          setAnimating(false);
        });
      });
    }
    
    setSidebarOpen(newState);
    
    // Hide logout if showing
    if (showLogout) {
      hideLogout();
    }
  };

  // Function to navigate to a route
  const navigateTo = (path: AppRoute) => {
    router.push(path as any);
  };

  // Show logout button with animation
  const showLogoutButton = () => {
    setShowLogout(true);
    Animated.parallel([
      Animated.timing(logoutOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(logoutScale, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Hide logout button with animation
  const hideLogout = () => {
    Animated.parallel([
      Animated.timing(logoutOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(logoutScale, {
        toValue: 0.85,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowLogout(false);
    });
  };

  // Handle logout
  const handleLogout = () => {
    hideLogout();
    // In real app - implement logout logic:
    // await firebase.auth().signOut();
    // router.replace('/login');
    alert('Logging out...');
  };

  // Calculate the position for the animated highlight
  const getHighlightPosition = () => {
    const basePosition = 70;  // Starting Y position
    const itemHeight = 48;    // Height of each nav item
    const spacing = 4;        // Space between items
    const bottomOffset = 30;  // Extra space between top and bottom groups
    
    return highlightPosition.interpolate({
      inputRange: Array.from({ length: ROUTES.length + BOTTOM_ROUTES.length }, (_, i) => i),
      outputRange: Array.from({ length: ROUTES.length + BOTTOM_ROUTES.length }, (_, i) => {
        if (i < ROUTES.length) {
          return basePosition + (i * (itemHeight + spacing));
        } else {
          return basePosition + (ROUTES.length * (itemHeight + spacing)) + 
                 bottomOffset + ((i - ROUTES.length) * (itemHeight + spacing));
        }
      }),
    });
  };

  // Render a navigation item
  const renderNavItem = (route: RouteItem, index: number, isBottomNav: boolean = false) => {
    const realIndex = isBottomNav ? index + ROUTES.length : index;
    const isActive = realIndex === activeIndex;
    
    return (
      <TouchableOpacity
        key={route.path}
        style={[
          styles.navItem,
          sidebarOpen ? styles.navItemExpanded : styles.navItemCollapsed,
        ]}
        onPress={(e) => {
          e.stopPropagation(); // Prevent sidebar toggle
          navigateTo(route.path);
        }}
      >
        <route.icon 
          size={20} 
          color={isActive ? '#FFFFFF' : '#94A3B8'} 
        />
        <Animated.View 
          style={{ 
            opacity: textOpacity, 
            marginLeft: 12,
            flex: 1 
          }}
        >
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
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <TouchableOpacity 
        activeOpacity={1}
        style={styles.sidebarTouchable}
        onPress={toggleSidebar}
      >
        <Animated.View style={[styles.sidebar, { width: sidebarWidth }]}>
          {/* Animated Highlight Background */}
          {activeIndex !== -1 && (
            <Animated.View 
              style={[
                styles.activeHighlight,
                {
                  top: getHighlightPosition(),
                  width: sidebarWidth.interpolate({
                    inputRange: [70, 230],
                    outputRange: [54, 214]
                  }),
                }
              ]} 
            />
          )}
        
          {/* Logo section */}
          <View style={styles.sidebarHeader}>
            <Animated.View style={{ opacity: textOpacity }}>
              <ThemedText style={styles.logoText}>BusTrak</ThemedText>
            </Animated.View>
            
            <Animated.View style={{
              opacity: sidebarWidth.interpolate({
                inputRange: [70, 150, 230],
                outputRange: [1, 0, 0]
              }),
              position: 'absolute',
              left: 25
            }}>
              <ThemedText style={styles.logoTextSmall}>BT</ThemedText>
            </Animated.View>
          </View>
          
          {/* Navigation items */}
          <View style={styles.navContainer}>
            {/* Top nav items */}
            <View style={styles.navGroup}>
              {ROUTES.map((route, index) => renderNavItem(route, index))}
            </View>
            
            {/* Bottom nav items */}
            <View style={styles.bottomNavGroup}>
              {BOTTOM_ROUTES.map((route, index) => renderNavItem(route, index, true))}
            </View>
          </View>
          
          {/* Profile section */}
          <View style={styles.profileContainer}>
            <TouchableOpacity 
              style={[
                styles.profileSection,
                !sidebarOpen && styles.profileSectionCollapsed
              ]} 
              onPress={(e) => {
                e.stopPropagation(); // Prevent sidebar toggle
                if (showLogout) {
                  hideLogout();
                } else {
                  showLogoutButton();
                }
              }}
            >
              <View style={styles.profileIcon}>
                <User size={20} color="#FFFFFF" />
              </View>
              <Animated.View style={{ 
                opacity: textOpacity, 
                marginLeft: 12,
                flex: 1
              }}>
                {sidebarOpen && (
                  <ThemedText style={styles.profileName}>{userName}</ThemedText>
                )}
              </Animated.View>
            </TouchableOpacity>
            
            {/* Animated logout button */}
            {showLogout && (
              <Animated.View 
                style={[
                  styles.logoutButtonContainer,
                  sidebarOpen ? styles.logoutContainerExpanded : styles.logoutContainerCollapsed,
                  { 
                    opacity: logoutOpacity,
                    transform: [{ scale: logoutScale }]
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.logoutButton}
                  onPress={(e) => {
                    e.stopPropagation(); // Prevent sidebar toggle
                    handleLogout();
                  }}
                >
                  <LogOut size={16} color="#FFFFFF" style={styles.logoutIcon} />
                  <ThemedText style={styles.logoutText}>Logout</ThemedText>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </TouchableOpacity>
      
      {/* Main content */}
      <TouchableWithoutFeedback onPress={() => {
        if (showLogout) hideLogout();
      }}>
        <View style={styles.content}>
          {/* Use context approach instead of directly cloning with props */}
          <SchoolContext.Provider value={{ schoolName }}>
            {children}
          </SchoolContext.Provider>
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarTouchable: {
    zIndex: 10,
  },
  sidebar: {
    backgroundColor: '#192549', // Dark blue
    height: '100%',
    paddingTop: 20,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative', // For absolute positioned highlight
  },
  activeHighlight: {
    position: 'absolute',
    height: 40,
    backgroundColor: '#304878',
    borderRadius: 8,
    zIndex: 0,
    left: 8, // Consistent left position
  },
  sidebarHeader: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    position: 'relative',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  logoTextSmall: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  navContainer: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 8,
  },
  navGroup: {
    position: 'relative',
  },
  bottomNavGroup: {
    marginTop: 'auto',
    marginBottom: 0,
    position: 'relative',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    marginBottom: 4,
    zIndex: 1,
    borderRadius: 8,
  },
  navItemExpanded: {
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  navItemCollapsed: {
    justifyContent: 'center', // Keep centered when collapsed
    alignItems: 'center',
    paddingHorizontal: 0, // Reset padding to center icon
  },
  navLabel: {
    fontSize: 14,
    color: '#94A3B8', // Light gray
  },
  activeNavLabel: {
    color: '#FFFFFF', // White when active
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  profileContainer: {
    position: 'relative',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    marginTop: 8,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 4,
    borderRadius: 8,
  },
  profileSectionCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0, // Reset for centering
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#304878',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  logoutButtonContainer: {
    position: 'absolute',
    zIndex: 100,
  },
  logoutContainerExpanded: {
    right: 12,
    top: 12,
  },
  logoutContainerCollapsed: {
    right: 10,
    top: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#304878', // Match sidebar highlight
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    minWidth: 100,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#FFFFFF', // White text to match sidebar
    fontWeight: '500',
  }
});