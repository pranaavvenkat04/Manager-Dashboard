import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, TouchableWithoutFeedback, Platform, Alert } from 'react-native';
import { usePathname, router } from 'expo-router';
import { LayoutDashboard, Package, MapPin, Users, Bell, HelpCircle, Settings, User, LogOut } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';

import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

import { useAuth } from '@clerk/clerk-expo';
// Removed duplicate import of 'router'

// Define props with schoolName to pass to children components
interface SchoolContextProps {
  schoolName?: string;
}

// Create context for school data
const SchoolContext = React.createContext<SchoolContextProps>({});

// Hook to access school context
export const useSchoolContext = () => React.useContext(SchoolContext);

interface PersistentSidebarProps {
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

export default function PersistentSidebar({ children }: PersistentSidebarProps) {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('Jane Doe');
  const [schoolName, setSchoolName] = useState('School');
  const [showLogout, setShowLogout] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { user } = useUser();

  
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
    if (user) {
      setUserName(user.fullName || 'User');
    }
  }, [user]);

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
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(logoutScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  // Hide logout button with animation
  const hideLogout = () => {
    Animated.parallel([
      Animated.timing(logoutOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(logoutScale, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      setShowLogout(false);
    });
  };
  
  // We'll use a simpler approach for the hover-based logout
  // Instead of triggering on hover, we'll just toggle on press
  
  // Handle logout button display
  const toggleLogoutButton = () => {
    if (showLogout) {
      hideLogout();
    } else {
      showLogoutButton();
    }
  };
  
  useEffect(() => {
    // Make sure the logout button works correctly
    return () => {
      // Clean up any pending animations
      if (logoutOpacity && logoutScale) {
        logoutOpacity.stopAnimation();
        logoutScale.stopAnimation();
      }
    };
  }, []);

  // Handle logout
  // In PersistentSidebar.tsx
// Add these imports at the top


// Then inside your component function, add:
const { signOut } = useAuth();

// Update the handleLogout function
const handleLogout = async () => {
  console.log("[Settings] Logout button clicked");
  
  // Check if we're on web platform
  if (Platform.OS === 'web') {
    // Web browser confirmation
    if (window.confirm("Are you sure you want to logout?")) {
      try {
        console.log("[Settings] About to call signOut()");
        await signOut();
        console.log("[Settings] signOut completed successfully");
        
        setTimeout(() => {
          console.log("[Settings] Attempting navigation to login");
          router.replace('/login');
        }, 300);
      } catch (error) {
        console.error("[Settings] Error during logout:", error);
      }
    } else {
      console.log("[Settings] Logout cancelled");
    }
  } else {
    // Mobile Alert
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => console.log("[Settings] Logout cancelled")
        },
        {
          text: "Logout",
          onPress: async () => {
            try {
              console.log("[Settings] About to call signOut()");
              await signOut();
              console.log("[Settings] signOut completed successfully");
              
              setTimeout(() => {
                console.log("[Settings] Attempting navigation to login");
                router.replace('/login');
              }, 300);
            } catch (error) {
              console.error("[Settings] Error during logout:", error);
            }
          }
        }
      ]
    );
  }
};

  // Calculate the position for the animated highlight
  // We're not using this anymore as we're applying active styles directly to nav items
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
          isActive && styles.navItemActive,
        ]}
        onPress={(e) => {
          e.stopPropagation(); // Prevent sidebar toggle
          navigateTo(route.path);
        }}
      >
        <View style={styles.iconContainer}>
          <route.icon 
            size={22} 
            color={isActive ? '#FFFFFF' : '#94A3B8'} 
          />
        </View>
        <Animated.View 
          style={{ 
            opacity: textOpacity, 
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
                toggleLogoutButton();
              }}
            >
              <View style={styles.profileIconContainer}>
                <View style={styles.profileIcon}>
                  <User size={20} color="#FFFFFF" />
                </View>
              </View>
              <Animated.View style={{ 
                  opacity: textOpacity,
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
    backgroundColor: '#192549', // Dark blue (matching screenshots)
    height: '100%',
    paddingTop: 20,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  sidebarHeader: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 32,
    position: 'relative',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  logoTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  navContainer: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 12,
  },
  navGroup: {
    position: 'relative',
    marginBottom: 8,
  },
  bottomNavGroup: {
    marginTop: 'auto',
    marginBottom: 16,
    position: 'relative',
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    marginBottom: 8,
    zIndex: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  navItemExpanded: {
    justifyContent: 'flex-start',
  },
  navItemCollapsed: {
    justifyContent: 'center', // Keep centered when collapsed
    alignItems: 'center', // Center content vertically
    paddingHorizontal: 23, // Center the icon in collapsed state
  },
  navItemActive: {
    backgroundColor: '#304878', // Active item background color
  },
  navLabel: {
    fontSize: 15,
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
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  profileIconContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  profileSectionCollapsed: {
    justifyContent: 'center',
    alignItems: 'center', // Center properly
    paddingHorizontal: 17, // Center in collapsed state
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
    right: -110, // Position it away from the sidebar
    top: 0,
    zIndex: 100,
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