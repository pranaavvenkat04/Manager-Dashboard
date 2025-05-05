import React, { ReactNode, useEffect, useState, useRef, useContext } from 'react';
import { StyleSheet, View, TouchableOpacity, Animated, TouchableWithoutFeedback, Platform, Modal } from 'react-native';
import { usePathname, router } from 'expo-router';
import { LayoutDashboard, Package, MapPin, Users, Bell, HelpCircle, Settings, User, LogOut, Bus } from 'lucide-react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';
import { signOut, getCurrentUserSchoolData } from '../utils/firebase';
import { AuthContext } from '../app/_layout';
import { Theme } from '../constants/Colors';

import { ThemedText } from './ThemedText';

// Define props with schoolName to pass to children components
interface SchoolContextProps {
  schoolName: string;
  userName: string;
}

// Create context for school data
const SchoolContext = React.createContext<SchoolContextProps>({
  schoolName: '',
  userName: ''
});

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
  { path: '/drivers', icon: Bus, label: 'Drivers' },
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

// Define constant for sidebar background color to easily update everywhere
const SIDEBAR_BG_COLOR = Theme.colors.primary; // Using primary blue from app theme
const SIDEBAR_ACTIVE_BG_COLOR = 'rgba(255, 255, 255, 0.2)'; // Semi-transparent white
const SIDEBAR_HOVER_BG_COLOR = 'rgba(255, 255, 255, 0.1)'; // Semi-transparent white

export default function PersistentSidebar({ children }: PersistentSidebarProps) {
  const { top, bottom } = useSafeAreaInsets();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  
  // Get auth context data
  const authContext = useContext(AuthContext);
  
  // Use refs for animations to maintain consistent behavior
  const sidebarWidth = useRef(new Animated.Value(230)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  
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
      } catch (error) {
        console.error('Error loading sidebar state:', error);
      }
    };
    
    loadSidebarState();
  }, []);
  
  // Load user and school data from auth context
  useEffect(() => {
    if (authContext.schoolData) {
      // Format the name as firstName + initial of lastName with a period
      const firstName = authContext.schoolData.user.firstName || '';
      const lastName = authContext.schoolData.user.lastName || '';
      
      // Truncate firstName if longer than 15 characters
      const truncatedFirstName = firstName.length > 15 
        ? firstName.substring(0, 15) 
        : firstName;
      
      // Get first initial of lastName if available
      const lastNameInitial = lastName ? `${lastName.charAt(0)}.` : '';
      
      // Set the formatted name
      const formattedName = `${truncatedFirstName} ${lastNameInitial}`.trim();
      setUserName(formattedName || 'Loading...');
      
      setSchoolName(authContext.schoolData.school.name || '');
    }
  }, [authContext.schoolData]);

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
        duration: 200, // Reduced from 250
        useNativeDriver: false,
      }).start();
      
      // Delayed text fade-in for smoother effect
      setTimeout(() => {
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 150, // Reduced from 200
          useNativeDriver: true,
        }).start();
      }, 50); // Reduced from 100
    } else {
      // Closing the sidebar - first fade out text, then shrink width
      Animated.timing(textOpacity, {
        toValue: 0,
        duration: 80, // Reduced from 100
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(sidebarWidth, {
          toValue: 70,
          duration: 150, // Reduced from 200
          useNativeDriver: false,
        }).start();
      });
    }
    
    setSidebarOpen(newState);
  };

  // Handle hover for items - removed unnecessary state updates
  const handleHoverChange = (itemKey: string, isHovering: boolean) => {
    // Only update state if needed to avoid unnecessary renders
    if (Platform.OS === 'web') {
      const element = document.getElementById(itemKey);
      if (element) {
        if (isHovering) {
          element.classList.add('nav-item-hover');
        } else {
          element.classList.remove('nav-item-hover');
        }
      }
    }
  };

  // Function to navigate to a route
  const navigateTo = (path: AppRoute) => {
    router.push(path as any);
  };

  // Show logout confirmation popup
  const showLogoutConfirmation = (e: any) => {
    e.stopPropagation(); // Prevent sidebar toggle
    setLogoutConfirmVisible(true);
  };

  // Handle logout on confirmation
  const handleLogout = async () => {
    try {
      await signOut();
      // Navigate to login screen after successful logout
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      // You could show an error message here if needed
    } finally {
      setLogoutConfirmVisible(false);
    }
  };

  // Cancel logout
  const cancelLogout = () => {
    setLogoutConfirmVisible(false);
  };

  // Find the active route based on pathname
  const activeIndex = [...ROUTES, ...BOTTOM_ROUTES].findIndex(route => 
    pathname === route.path || pathname.startsWith(`${route.path}/`));

  // Render a navigation item - optimized to use CSS for hover states
  const renderNavItem = (route: RouteItem, index: number, isBottomNav: boolean = false) => {
    const realIndex = isBottomNav ? index + ROUTES.length : index;
    const isActive = realIndex === activeIndex;
    const itemKey = `nav-${route.path}`;
    
    return (
      <Pressable
        key={route.path}
        id={itemKey}
        style={[
          styles.navItem,
          sidebarOpen ? styles.navItemExpanded : styles.navItemCollapsed,
          isActive && styles.navItemActive
        ]}
        className={isActive ? 'nav-item-active' : 'nav-item'}
        onPress={(e) => {
          e.stopPropagation(); // Prevent sidebar toggle
          navigateTo(route.path);
        }}
        onHoverIn={() => handleHoverChange(itemKey, true)}
        onHoverOut={() => handleHoverChange(itemKey, false)}
      >
        <route.icon 
          size={22} 
          color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)'} 
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
              isActive && styles.activeNavLabel
            ]}
          >
            {route.label}
          </ThemedText>
        </Animated.View>
      </Pressable>
    );
  };

  // Render logout item
  const renderLogoutItem = () => {
    const itemKey = "nav-logout";
    
    return (
      <Pressable
        key="logout"
        style={[
          styles.navItem,
          sidebarOpen ? styles.navItemExpanded : styles.navItemCollapsed,
        ]}
        onPress={showLogoutConfirmation}
      >
        <LogOut 
          size={22} 
          color="rgba(255, 255, 255, 0.7)" 
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
            ]}
          >
            Logout
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
          {/* Add CSS for web hover effects */}
          {Platform.OS === 'web' && (
            <style type="text/css">
              {`
                .nav-item-hover:not(.nav-item-active) {
                  background-color: ${SIDEBAR_HOVER_BG_COLOR};
                }
                .nav-item-hover:not(.nav-item-active) * {
                  color: #FFFFFF;
                }
              `}
            </style>
          )}
          
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
              {renderLogoutItem()}
            </View>
          </View>
          
          {/* User Profile */}
          <View style={styles.profileContainer}>
            <View style={styles.profileContent}>
              <View style={styles.avatarContainer}>
                <User size={24} color="#FFF" />
              </View>
              
              <Animated.View style={[styles.profileInfo, { opacity: textOpacity }]}>
                <ThemedText style={styles.profileName} numberOfLines={1}>
                  {userName || 'Loading...'}
                </ThemedText>
                <ThemedText style={styles.profileRole} numberOfLines={1}>
                  Manager
                </ThemedText>
              </Animated.View>
            </View>
          </View>
        </Animated.View>
      </TouchableWithoutFeedback>
      
      {/* Main content */}
      <View style={styles.content}>
        {/* Use context approach to pass schoolName to children */}
        <SchoolContext.Provider value={{ schoolName, userName }}>
          {children}
        </SchoolContext.Provider>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={logoutConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Confirm Logout</ThemedText>
              <ThemedText style={styles.modalText}>Are you sure you want to logout?</ThemedText>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={cancelLogout}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton} 
                  onPress={handleLogout}
                >
                  <ThemedText style={styles.confirmButtonText}>Logout</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: SIDEBAR_BG_COLOR,
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
    paddingBottom: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    marginBottom: 6,
    borderRadius: 8,
    cursor: 'pointer',
  },
  navItemExpanded: {
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
  },
  navItemCollapsed: {
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: SIDEBAR_ACTIVE_BG_COLOR,
  },
  navLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  activeNavLabel: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    backgroundColor: Theme.colors.background.secondary,
  },
  profileContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    marginTop: 0,
    position: 'relative',
    alignItems: 'flex-start',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SIDEBAR_ACTIVE_BG_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    marginLeft: 20,
  },
  profileName: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    marginBottom: 0,
  },
  profileRole: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }
    })
  },
  modalContainer: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
      }
    })
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  cancelButton: {
    backgroundColor: Theme.colors.background.tertiary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  confirmButton: {
    backgroundColor: Theme.colors.error,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
});