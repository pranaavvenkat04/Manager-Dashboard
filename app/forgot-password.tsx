import React, { useState } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { sendPasswordResetEmail } from '../utils/firebase';
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

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  // Inject CSS styles for web platform
  React.useEffect(() => {
    injectWebStyles();
  }, []);

  const handleResetPassword = async () => {
    // Reset messages
    setErrorMessage('');
    setSuccessMessage('');

    // Validate input
    if (!email || !email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      // Use the Firebase password reset function
      await sendPasswordResetEmail(email);
      
      // Show success message but don't navigate away immediately
      setSuccessMessage('If the email exists in our system, you will receive password reset instructions.');
    } catch (error: any) {
      // Handle specific error codes
      let message = 'Failed to send password reset email. Please try again.';
      
      if (error.message.includes('user-not-found')) {
        // Don't reveal if email exists for security reasons
        setSuccessMessage('If the email exists in our system, you will receive password reset instructions.');
        return;
      } else if (error.message.includes('invalid-email')) {
        message = 'Please enter a valid email address.';
      } else if (error.message.includes('network-request-failed')) {
        message = 'Network error. Please check your connection and try again.';
      }
      
      setErrorMessage(message);
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Stack.Screen
        options={{
          title: 'Forgot Password',
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: Theme.colors.background.main,
          },
          headerTintColor: Theme.colors.primary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
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
        </View>

        <View style={styles.formWrapper}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.description}>
              Enter your email address and we'll send you instructions to reset your password.
            </Text>
            
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
            
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
              />
            </View>
            
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Theme.colors.text.inverse} />
              ) : (
                <Text style={styles.resetButtonText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'flex-start',
    paddingTop: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 90,
    height: 90,
  },
  formWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: Theme.colors.text.secondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  errorText: {
    fontSize: 14,
    color: Theme.colors.error,
    marginBottom: 16,
    fontWeight: '500',
  },
  successText: {
    fontSize: 14,
    color: Theme.colors.success,
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
  resetButton: {
    backgroundColor: Theme.colors.primary,
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  resetButtonText: {
    color: Theme.colors.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  backButtonText: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: '500',
  },
}); 