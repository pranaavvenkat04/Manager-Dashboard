import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Image, ActivityIndicator, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs, updateDoc } from 'firebase/firestore';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const auth = getAuth();
const db = getFirestore();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Print debug info when the component loads
  React.useEffect(() => {
    console.log("[Login] Login page loaded");
  }, []);

  // Function to show an alert message for failed login
  const showLoginFailedAlert = (message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`Login Failed: ${message}`);
    } else {
      Alert.alert(
        "Login Failed",
        message,
        [{ text: "OK", onPress: () => console.log("Alert acknowledged") }]
      );
    }
  };

  // Check if user is a manager
  const checkIfUserIsManager = async (userId: string) => {
    try {
      // Get all schools
      const schoolsRef = collection(db, "Schools");
      const schoolsSnapshot = await getDocs(schoolsRef);
      
      // Check each school for the manager
      for (const schoolDoc of schoolsSnapshot.docs) {
        const schoolId = schoolDoc.id;
        const managerRef = doc(db, `Schools/${schoolId}/Managers`, userId);
        const managerSnap = await getDoc(managerRef);
        
        if (managerSnap.exists()) {
          // Update last sign in time
          await updateDoc(managerRef, {
            lastSignIn: new Date().toISOString()
          });
          
          return { 
            data: managerSnap.data(), 
            schoolId 
          };
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error checking if user is manager:", error);
      return null;
    }
  };

  const handleSignIn = useCallback(async () => {
    if (loading) {
        console.log("[Login] Already loading");
        return;
    }

    setLoading(true);
    setError(null);

    try {
        console.log("[Login] Attempting to sign in with:", email);

        // Step 1: Authenticate with Firebase
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        if (!user) {
          throw new Error("Authentication succeeded but no user was returned");
        }

        // Step 2: Check if user is a manager
        const managerData = await checkIfUserIsManager(user.uid);
        
        // Step 3: Validate manager role
        if (managerData) {
          console.log("[Login] Manager verified, proceeding to dashboard");
          router.replace('/(tabs)');
        } else {
          console.log("[Login] User is not a manager");
          await auth.signOut();
          const errorMessage = 'Access denied. Only managers can access this application.';
          setError(errorMessage);
          showLoginFailedAlert(errorMessage);
        }
    } catch (err: any) {
        console.error('[Login] Error signing in:', err);

        let errorMessage = 'Login failed. Please check your credentials and try again.';

        // Handle common Firebase Auth errors
        const errorCode = err.code;
        if (errorCode === 'auth/user-not-found') {
          errorMessage = 'Email not found. Please check your email address.';
        } else if (errorCode === 'auth/wrong-password') {
          errorMessage = 'Incorrect password. Please try again.';
        } else if (errorCode === 'auth/invalid-email') {
          errorMessage = 'Invalid email format. Please enter a valid email.';
        } else if (errorCode === 'auth/too-many-requests') {
          errorMessage = 'Too many failed login attempts. Please try again later.';
        } else if (err.message) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        showLoginFailedAlert(errorMessage);
    } finally {
        setLoading(false);
    }
  }, [email, password, loading]);

  // Check if user is already logged in
  React.useEffect(() => {
    const checkAuthStatus = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("[Login] User already logged in, checking role");
        
        // Check if user is a manager
        const managerData = await checkIfUserIsManager(currentUser.uid);
        
        if (managerData) {
          console.log("[Login] Manager verified, proceeding to dashboard");
          router.replace('/(tabs)');
        } else {
          console.log("[Login] User is not a manager");
          // Sign out the user if they're not a manager
          await auth.signOut();
          const errorMessage = 'Access denied. Only managers can access this application.';
          setError(errorMessage);
          showLoginFailedAlert(errorMessage);
        }
      }
    };
    
    checkAuthStatus();
  }, []);

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.innerContainer}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/Trakbuss.png')} 
            style={styles.logo}
            onError={() => console.log('[Login] Logo image not found')}
          />
          <ThemedText style={styles.appTitle}>BusTrak</ThemedText>
          <ThemedText style={styles.appTagline}>School Bus Management</ThemedText>
        </View>
        
        <ThemedView style={styles.formContainer}>
          <ThemedText style={styles.formHeader}>Manager Login</ThemedText>
          
          {error && (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}
          
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <TextInput
              style={[
                styles.input,
                Platform.OS === 'web' ? { outline: 'none' } : {}
              ]}
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <ThemedText style={styles.inputLabel}>Password</ThemedText>
            <TextInput
              style={[
                styles.input,
                Platform.OS === 'web' ? { outline: 'none' } : {}
              ]}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#9CA3AF"
            />
          </View>
          
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
          >
            <ThemedText style={styles.forgotPasswordText}>Forgot password?</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.loginButton, (!email || !password || loading) && styles.loginButtonDisabled]}
            onPress={handleSignIn}
            disabled={!email || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <ThemedText style={styles.loginButtonText}>Login</ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>
        
        <ThemedText style={styles.versionText}>Version 1.0.0</ThemedText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 16,
    borderRadius: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#6B7280',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  formHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#4361ee',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#4361ee',
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
  },
});