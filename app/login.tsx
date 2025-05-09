import React, { useState } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Image, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { signIn } from '../utils/firebase';
import { Ionicons } from '@expo/vector-icons';
import { Theme, PRIMARY_COLORS, NEUTRAL_COLORS, SEMANTIC_COLORS } from '../constants/Colors';

// Function to inject CSS to remove input outlines on web platform
const injectWebStyles = () => {
  if (Platform.OS === 'web') {
    // Create a style element
    const style = document.createElement('style');
    // Define CSS rules to remove focus outlines
    style.textContent = `
      input:focus,
      textarea:focus,
      select:focus {
        outline: none !important;
      }
    `;
    // Append to document head
    document.head.appendChild(style);
  }
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Inject CSS styles for web platform
  React.useEffect(() => {
    injectWebStyles();
  }, []);

  const handleLogin = async () => {
    // Reset error message
    setError('');
    
    // Validate input
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      
      // Attempt to sign in with Firebase
      await signIn(email, password);
      
      // No need to navigate - the _layout.tsx will handle navigation
      // based on authentication state automatically
    } catch (error: any) {
      // Show specific error message based on Firebase error code
      let errorMsg = 'Login failed. Please check your credentials and try again.';
      
      if (error.message.includes('invalid-credential') || 
          error.message.includes('user-not-found') || 
          error.message.includes('wrong-password')) {
        errorMsg = 'Invalid email or password. Please try again.';
      } else if (error.message.includes('too-many-requests')) {
        errorMsg = 'Too many failed attempts. Please try again later.';
      } else if (error.message.includes('network-request-failed')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('not linked to any school')) {
        errorMsg = 'Your account is not linked to a school. Please contact the administrator.';
      }
      
      setError(errorMsg);
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // Using type safe navigation
    router.push('/forgot-password' as any);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Stack.Screen
        options={{
          title: '',
          headerShown: false,
        }}
      />
      <StatusBar style="light" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/bus-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Bus Tracker</Text>
          <Text style={styles.subtitle}>Manager Portal</Text>
        </View>
        
        <View style={styles.formWrapper}>
          <View style={styles.formContainer}>
            <Text style={styles.loginText}>Log In to Your Account</Text>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={26} color={Theme.colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor={Theme.colors.text.secondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                testID="email-input"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={26} color={Theme.colors.text.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Theme.colors.text.secondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                testID="password-input"
              />
              <TouchableOpacity 
                style={styles.passwordToggle} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={24} 
                  color={Theme.colors.text.secondary} 
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.forgotPassword} 
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={loading}
              testID="login-button"
            >
              {loading ? (
                <ActivityIndicator color={Theme.colors.text.inverse} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2024 Bus Tracker. All rights reserved.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background.main,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 70,
  },
  logo: {
    width: 150,
    height: 150,
  },
  appName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginTop: 5,
  },
  formWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    marginTop: 40,
  },
  loginText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: Theme.colors.error,
    marginBottom: 16,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.main,
    borderRadius: 8,
    marginVertical: 10,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Theme.colors.text.primary,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: Theme.colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: Theme.colors.primary,
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  loginButtonText: {
    color: Theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  footerText: {
    color: Theme.colors.text.secondary,
    fontSize: 12,
  },
}); 