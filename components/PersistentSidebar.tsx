import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, TouchableWithoutFeedback, Platform } from 'react-native';
import { usePathname, router } from 'expo-router';
import { LayoutDashboard, Package, MapPin, Users, Bell, HelpCircle, Settings, User, LogOut } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';

import { ThemedText } from './ThemedText';

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
  const { top, bottom } = useSafeAreaInsets();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('Jane Doe');
  const [schoolName, setSchoolName] = useState('NYIT');
  const [showLogout, setShowLogout] = useState(false);
  const [hoverStates, setHoverStates] = useState<{[key: string]: boolean}>({});
  const [profileHover, setProfileHover] = useState(false);
  
  // Use refs for animations to maintain consistent behavior
  const sidebarWidth = useRef(new Animated.Value(230)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const logoutOpacity = useRef(new Animated.Value(0)).current;
  const logoutScale = useRef(new Animated.Value(0.85)).current;
  
  // Calculate position for logout button based on sidebar state
  const logoutPositionX = useRef(new Animated.Value(sidebarOpen ? 210 : 70)).current;
  const logoutPositionY = useRef(new Animated.Value(10)).current;

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
          logoutPositionX.setValue(isOpen ? 210 : 70);
        }
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      }
    };
    
    loadSidebarState();
    
    // Fetch user profile and school data
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

  // Update logout visibility based on profile hover
  useEffect(() => {
    if (profileHover) {
      showLogoutButton();
    } else {
      hideLogout();
    }
  }, [profileHover]);

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
        }).start();
      }, 100);
      
      // Update logout button position
      Animated.timing(logoutPositionX, {
        toValue: 210,
        duration: 250,
        useNativeDriver: true,
      }).start();
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
        }).start();
      });
      
      // Update logout button position
      Animated.timing(logoutPositionX, {
        toValue: 70,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
    
    setSidebarOpen(newState);
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

  // Handle hover for items
  const handleHoverChange = (itemKey: string, isHovering: boolean) => {
    setHoverStates(prev => ({
      ...prev,
      [itemKey]: isHovering
    }));
  };

  // Function to navigate to a route
  const navigateTo = (path: AppRoute) => {
    router.push(path as any);
  };

  // Handle logout
  const handleLogout = (e: any) => {
    e.stopPropagation(); // Prevent sidebar toggle
    alert('Logging out...');
    // Implement actual logout logic here
    // await firebase.auth().signOut();
    // router.replace('/login');
  };

  // Find the active route based on pathname
  const activeIndex = [...ROUTES, ...BOTTOM_ROUTES].findIndex(route => 
    pathname === route.path || pathname.startsWith(`${route.path}/`));

  // Render a navigation item
  const renderNavItem = (route: RouteItem, index: number, isBottomNav: boolean = false) => {
    const realIndex = isBottomNav ? index + ROUTES.length : index;
    const isActive = realIndex === activeIndex;
    const itemKey = `nav-${route.path}`;
    const isHovering = hoverStates[itemKey] || false;
    
    return (
      <Pressable
        key={route.path}
        style={[
          styles.navItem,
          sidebarOpen ? styles.navItemExpanded : styles.navItemCollapsed,
          isActive && styles.navItemActive,
          isHovering && !isActive && styles.navItemHover,
        ]}
        onPress={(e) => {
          e.stopPropagation(); // Prevent sidebar toggle
          navigateTo(route.path);
        }}
        onHoverIn={() => handleHoverChange(itemKey, true)}
        onHoverOut={() => handleHoverChange(itemKey, false)}
      >
        <route.icon 
          size={22} 
          color={isActive ? '#FFFFFF' : isHovering ? '#FFFFFF' : '#94A3B8'} 
        />
        
        <Animated.View 
          style={{ 
            opacity: textOpacity, 
            marginLeft: 14,
            flex: 1,
            display: sidebarOpen ? 'flex' : 'none'
          }}
        >
          <ThemedText 
            style={[
              styles.navLabel, 
              isActive && styles.activeNavLabel,
              isHovering && !isActive && styles.hoverNavLabel
            ]}
          >
            {route.label}
          </ThemedText>
        </Animated.View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sidebar */}
      <TouchableWithoutFeedback onPress={toggleSidebar}>
        <Animated.View style={[
          styles.sidebar, 
          { 
            width: sidebarWidth,
            paddingTop: Platform.OS === 'web' ? 20 : (top || 20) 
          }
        ]}>
          {/* Logo/Brand Header */}
          <View style={styles.header}>
            <Animated.View style={{ 
              opacity: textOpacity,
              display: sidebarOpen ? 'flex' : 'none'
            }}>
              <ThemedText style={styles.logoText}>BusTrak</ThemedText>
            </Animated.View>
            
            <Animated.View style={{
              opacity: sidebarWidth.interpolate({
                inputRange: [70, 150, 230],
                outputRange: [1, 0, 0]
              }),
              display: sidebarOpen ? 'none' : 'flex'
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
          
          {/* Profile section with animated logout button */}
          <View style={[
            styles.profileContainer,
            { paddingBottom: Platform.OS === 'web' ? 20 : (bottom || 20) }
          ]}>
            {/* Main profile section */}
            <Pressable 
              onHoverIn={() => setProfileHover(true)}
              onHoverOut={() => setProfileHover(false)}
              style={[
                sidebarOpen ? styles.profileExpanded : styles.profileCollapsed,
                profileHover && styles.profileHover
              ]}
            >
              <View style={[
                styles.profileIcon,
                profileHover && styles.profileIconHover
              ]}>
                <User size={20} color="#FFFFFF" />
              </View>
              
              {sidebarOpen && (
                <Animated.View 
                  style={{ 
                    opacity: textOpacity,
                    marginLeft: 14,
                    flex: 1
                  }}
                >
                  <ThemedText style={[
                    styles.profileName,
                    profileHover && styles.profileNameHover
                  ]}>
                    {userName}
                  </ThemedText>
                </Animated.View>
              )}
            </Pressable>
            
            {/* Animated logout button */}
            {showLogout && (
              <Animated.View
                style={[
                  styles.logoutButtonContainer,
                  {
                    opacity: logoutOpacity,
                    transform: [
                      { scale: logoutScale },
                      { translateX: logoutPositionX },
                      { translateY: logoutPositionY }
                    ],
                    position: 'absolute',
                    zIndex: 100,
                  }
                ]}
              >
                <TouchableOpacity
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <LogOut size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
      
      {/* Main content */}
      <View style={styles.content}>
        {/* Use context approach to pass schoolName to children */}
        <SchoolContext.Provider value={{ schoolName }}>
          {children}
        </SchoolContext.Provider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#192549', // Dark blue (matching screenshots)
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 10,
  },
  header: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  logoTextSmall: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  navContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    paddingHorizontal: 12,
  },
  navGroup: {
    marginBottom: 8,
  },
  bottomNavGroup: {
    marginTop: 'auto',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    marginBottom: 8,
    borderRadius: 8,
    cursor: 'pointer', // Add cursor pointer for web
  },
  navItemExpanded: {
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  navItemCollapsed: {
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: '#304878', // Active item background color
  },
  navItemHover: {
    backgroundColor: 'rgba(48, 72, 120, 0.5)', // Hover background
  },
  navLabel: {
    fontSize: 15,
    color: '#94A3B8', // Light gray
  },
  activeNavLabel: {
    color: '#FFFFFF', // White when active
    fontWeight: '500',
  },
  hoverNavLabel: {
    color: '#FFFFFF', // White when hovering
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  profileContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingTop: 16,
    position: 'relative',
  },
  // Expanded profile styles
  profileExpanded: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    cursor: 'pointer', // Add cursor pointer for web
  },
  // Collapsed profile styles
  profileCollapsed: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    cursor: 'pointer', // Add cursor pointer for web
  },
  profileHover: {
    backgroundColor: 'rgba(48, 72, 120, 0.5)', // Hover background
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#304878',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconHover: {
    backgroundColor: '#415b94', // Lighter color on hover
  },
  profileName: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  profileNameHover: {
    color: '#FFFFFF', // Brighter white on hover
  },
  // Logout button container
  logoutButtonContainer: {
    // Position and transform properties are applied in-line
  },
  // Logout button
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#304878',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    cursor: 'pointer', // Add cursor pointer for web
  }
});