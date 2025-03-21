import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Alert } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { router } from 'expo-router';
import { LogOut } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText'; 

type UserProfileProps = {
  showLogout?: boolean;
  compact?: boolean;
};

export function UserProfile({ showLogout = true, compact = false }: UserProfileProps) {
  const { user } = useUser();
  const { signOut } = useAuth();
  
  if (!user) {
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
              await signOut();
              // Force redirect to login
              router.replace('/login');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get initials from user's full name
  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    } else if (user.firstName) {
      return user.firstName[0].toUpperCase();
    } else if (user.username) {
      return user.username[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.userInfo}>
        {user.imageUrl ? (
          <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <ThemedText style={styles.initials}>{getInitials()}</ThemedText>
          </View>
        )}
        
        {!compact && (
          <View style={styles.userDetails}>
            <ThemedText style={styles.userName}>
              {user.firstName} {user.lastName}
            </ThemedText>
            <ThemedText style={styles.userEmail}>
              {user.primaryEmailAddress?.emailAddress || ''}
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