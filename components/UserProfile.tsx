import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/ThemedText'; 

type UserProfileProps = {
  showLogout?: boolean;
  compact?: boolean;
};

interface UserData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  id?: string;
}

export function UserProfile({ showLogout = true, compact = false }: UserProfileProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const auth = getAuth();
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Try to get user data from AsyncStorage first
        const storedUserData = await AsyncStorage.getItem('userData');
        
        if (storedUserData) {
          setUserData(JSON.parse(storedUserData));
        } else if (auth.currentUser) {
          // Fallback to Firebase User data if available
          const user = auth.currentUser;

          const displayName = user.displayName || '';
          
          // Try to extract first and last name from display name
          const nameParts = displayName.split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          
          setUserData({
            firstName,
            lastName,
            fullName: displayName,
            email: user.email || '',
            id: user.uid
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
    
    // Set up a listener for auth state changes
    const unsubscribe = auth.onAuthStateChanged(() => {
      loadUserData();
    });
    
    return () => unsubscribe();
  }, []);
  
  if (!userData || !auth.currentUser) {
    return null;
  }

  const handleSignOut = async () => {
    try {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Sign Out",
            onPress: async () => {
              try {
                await signOut(auth);
                // Clear user data from AsyncStorage
                await AsyncStorage.removeItem('userData');
                // Force redirect to login
                router.replace('/login');
              } catch (error) {
                console.error('Error during sign out:', error);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error with sign out dialog:', error);
    }
  };

  // Get initials from user's full name
  const getInitials = () => {
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
    } else if (userData.firstName) {
      return userData.firstName[0].toUpperCase();
    } else if (userData.fullName) {
      const parts = userData.fullName.split(' ');
      if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return userData.fullName[0].toUpperCase();
    }
    return 'U';
  };

  // Try to get profile picture from Firebase if available
  const profilePicture = auth.currentUser?.photoURL || '';

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.userInfo}>
        {profilePicture ? (
          <Image source={{ uri: profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <ThemedText style={styles.initials}>{getInitials()}</ThemedText>
          </View>
        )}
        
        {!compact && (
          <View style={styles.userDetails}>
            <ThemedText style={styles.userName}>
              {userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim()}
            </ThemedText>
            <ThemedText style={styles.userEmail}>
              {userData.email || auth.currentUser?.email || ''}
            </ThemedText>
          </View>
        )}
      </View>
      
      {showLogout && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <LogOut size={compact ? 16 : 20} color="#6B7280" />
          {!compact && <ThemedText style={styles.logoutText}>Logout</ThemedText>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  compactContainer: {
    padding: 8,
    borderBottomWidth: 0,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4361ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userDetails: {
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  logoutText: {
    marginLeft: 8,
    color: '#6B7280',
    fontSize: 14,
  },
});