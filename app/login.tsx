import React, { useState, useCallback } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Image, ActivityIndicator, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSignIn, useClerk, useUser } from '@clerk/clerk-expo';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { signIn, setActive, isLoaded } = useSignIn();
  const clerk = useClerk();
  const { user, isLoaded: isUserLoaded } = useUser();
  
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

  const handleSignIn = useCallback(async () => {
    if (!isLoaded || loading) {
        console.log("[Login] Sign-in not loaded yet or already loading");
        return;
    }

    setLoading(true);
    setError(null);

    try {
        console.log("[Login] Attempting to sign in with:", email);

        // Step 1: Create the sign-in attempt
        const signInAttempt = await signIn.create({
            identifier: email,
            password,
        });

        // Step 2: Check if sign-in is complete
        if (signInAttempt.status === 'complete') {
            console.log("[Login] Sign-in successful, setting active session");

            // Step 3: Set active session
            await setActive({ session: signInAttempt.createdSessionId });

            // Step 4: Fetch user data before navigating
            const userData = await clerk.user;

            if (!userData) throw new Error("Could not retrieve user data");

            const userRole = userData.unsafeMetadata?.role;
            console.log("[Login] User Role:", userRole);

            // Step 5: Validate role before navigating
            if (userRole === 'manager') {
                console.log("[Login] Manager verified, proceeding to dashboard");
                router.replace('/(tabs)');
            } else {
                console.log("[Login] User is not a manager:", userRole);
                await clerk.signOut();
                const errorMessage = 'Access denied. Only managers can access this application.';
                setError(errorMessage);
                showLoginFailedAlert(errorMessage);
            }
        } else {
            throw new Error('Invalid credentials or authentication step required.');
        }
    } catch (err: any) {
        console.error('[Login] Error signing in:', err);

        let errorMessage = 'Login failed. Please check your credentials and try again.';

        if (err.errors && err.errors.length > 0) {
            const clerkError = err.errors[0];

            if (clerkError.code === 'form_identifier_not_found') {
                errorMessage = 'Email not found. Please check your email address.';
            } else if (clerkError.code === 'form_password_incorrect') {
                errorMessage = 'Incorrect password. Please try again.';
            } else {
                errorMessage = clerkError.message || 'Invalid email or password. Please try again.';
            }
        }

        setError(errorMessage);
        showLoginFailedAlert(errorMessage);
    } finally {
        setLoading(false);
    }
}, [isLoaded, email, password, signIn, setActive, clerk, loading]);


  // Check for user data if we're already logged in
  React.useEffect(() => {
    const checkManagerStatus = async () => {
      // Only proceed if user data is loaded and available
      if (isUserLoaded && user) {
        console.log("[Login] User already logged in, checking role");
        
        // Get the user role from unsafe metadata
        const userRole = user.unsafeMetadata?.role;
        
        console.log("[Login] User Role:", userRole);
        
        // Check if the user has the manager role
        if (userRole === 'manager') {
          console.log("[Login] Manager verified, proceeding to dashboard");
          router.replace('/(tabs)');
        } else {
          console.log("[Login] User is not a manager:", userRole);
          // Sign out the user if they're not a manager
          await clerk.signOut();
          const errorMessage = 'Access denied. Only managers can access this application.';
          setError(errorMessage);
          showLoginFailedAlert(errorMessage);
        }
      }
    };
    
    checkManagerStatus();
  }, [isUserLoaded, user, clerk]);

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