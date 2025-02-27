import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText';

// Storage key for sidebar state
const SIDEBAR_STATE_KEY = 'bustrak_sidebar_open';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { bottom } = useSafeAreaInsets();
  const pathname = usePathname();
  const [userName, setUserName] = useState('Jane Doe');
  const [schoolName, setSchoolName] = useState('NYIT');
  const [showLogout, setShowLogout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Use refs for animations to maintain consistent behavior
  const sidebarWidth = useRef(new Animated.Value(230)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const logoutOpacity = useRef(new Animated.Value(0)).current;
  const logoutScale = useRef(new Animated.Value(0.85)).current;

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
    }
    
    setSidebarOpen(newState);
    
    // Hide logout if showing
    if (showLogout) {
      hideLogout();
    }
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

  const handleLogout = () => {
    hideLogout();
    // In real app - implement logout logic:
    // await firebase.auth().signOut();
    // router.replace('/login');
    alert('Logging out...');
  };

  return (
    <View style={styles.container}>
      {/* Logo/Brand Header with Toggle */}
      <TouchableOpacity 
        activeOpacity={0.8} 
        style={styles.header} 
        onPress={toggleSidebar}
      >
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
      </TouchableOpacity>

      {/* Main Drawer Items with animation support */}
      <DrawerContentScrollView 
        {...props} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* DrawerItemList with conditional rendering for text */}
        <View>
          {/* We'll manually render items similar to DrawerItemList but with animations */}
          {props.state.routes.map((route, index) => {
            const { options } = props.descriptors[route.key];
            const labelText = typeof options.drawerLabel === 'string' 
              ? options.drawerLabel 
              : typeof options.title === 'string' 
                ? options.title 
                : route.name;
            const isFocused = props.state.index === index;
            
            const onPress = () => {
              const event = props.navigation.emit({
                type: 'drawerItemPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                props.navigation.navigate(route.name);
              }
            };
            
            // Custom drawer item with animation support
            return (
              <TouchableOpacity
                key={route.key}
                style={[
                  styles.drawerItem,
                  isFocused && styles.drawerItemActive,
                ]}
                onPress={onPress}
              >
                {options.drawerIcon && 
                  options.drawerIcon({ 
                    focused: isFocused, 
                    color: isFocused ? '#FFFFFF' : '#94A3B8', 
                    size: 22 
                  })
                }
                
                <Animated.View style={{ 
                  opacity: textOpacity, 
                  marginLeft: 12,
                  flex: 1
                }}>
                  {sidebarOpen && (
                    <ThemedText style={[
                      styles.drawerLabel,
                      isFocused && styles.drawerLabelActive
                    ]}>
                      {labelText}
                    </ThemedText>
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Profile and Logout Section */}
      <View style={[styles.profileContainer, { marginBottom: bottom || 20 }]}>
        <TouchableOpacity 
          style={styles.profileSection} 
          onPress={() => {
            if (showLogout) {
              hideLogout();
            } else {
              showLogoutButton();
            }
          }}
        >
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={20} color="#FFFFFF" />
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
              onPress={handleLogout}
            >
              <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={styles.logoutIcon} />
              <ThemedText style={styles.logoutText}>Logout</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#192549', // Dark blue background
  },
  header: {
    height: 70,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
  scrollContent: {
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  drawerItemActive: {
    backgroundColor: '#304878',
  },
  drawerLabel: {
    fontSize: 14,
    color: '#94A3B8', // Light gray
  },
  drawerLabelActive: {
    color: '#FFFFFF', // White when active
    fontWeight: '500',
  },
  profileContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 8,
    paddingHorizontal: 8,
    position: 'relative',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
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