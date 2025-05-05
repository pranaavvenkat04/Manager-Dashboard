import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Modal, TouchableOpacity, Alert, Platform, ScrollView, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { X, ChevronDown, Trash2, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { Theme } from '@/constants/Colors';
import { db, Timestamp } from '@/utils/firebase';

// Define interface for User based on Firestore structure
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school_id: string;
  user_type: 'parent' | 'student';
  role?: string;
  viewable_routes: string[];
  soft_delete?: boolean;
  deleted_at?: any;
  deleted_by?: string;
  updated_at?: any;
  updated_by?: string;
}

// Define interface for a Route (for reference)
interface Route {
  id: string;
  name: string;
  route_code?: string;
}

interface UserModalProps {
  isVisible: boolean;
  onClose: () => void;
  user: User | null;
  routes: Route[];
  onSave: (user: User) => void;
  onDelete: (user: User) => void;
  onSendPasswordReset: (email: string) => void;
  managerName?: string;
  managerId?: string;
}

// Track password reset timestamps globally - this persists between modal opens/closes
const passwordResetTimestamps = new Map<string, number>();

interface FieldError {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

const UserModal = ({
  isVisible,
  onClose,
  user,
  routes,
  onSave,
  onDelete,
  onSendPasswordReset,
  managerName = 'School Manager',
  managerId = ''
}: UserModalProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<'parent' | 'student'>('parent');
  const [viewableRoutes, setViewableRoutes] = useState<string[]>([]);
  
  // State for dropdown
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  
  // State for route search
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [filteredRoutes, setFilteredRoutes] = useState<Route[]>([]);

  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Password reset timer states
  const [resetCountdown, setResetCountdown] = useState(0);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
  // Field validation
  const [errors, setErrors] = useState<FieldError>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  
  // Ref for phone input to prevent cursor jumping
  const phoneInputRef = useRef<TextInput>(null);
  const phoneSelectionRef = useRef<{start: number, end: number} | null>(null);

  // Add no-outline style for web only - moved inside useEffect to be client-side only
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        .no-outline {
          outline: none !important;
        }
      `;
      document.head.appendChild(style);
      
      // Clean up style when component unmounts
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email);
      // Format the phone number when loading existing user
      setPhone(formatPhoneNumber(user.phone || ''));
      setUserType(user.user_type);
      setViewableRoutes(user.viewable_routes);
    } else {
      // Reset form for new user
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setUserType('parent');
      setViewableRoutes([]);
    }
    
    // Reset search
    setRouteSearchQuery('');
    // Reset errors
    setErrors({});
    setAttemptedSubmit(false);
  }, [user]);
  
  // Filter routes when search query changes
  useEffect(() => {
    if (routeSearchQuery.trim() === '') {
      setFilteredRoutes(routes);
    } else {
      const query = routeSearchQuery.toLowerCase();
      const filtered = routes.filter(route => 
        route.name.toLowerCase().includes(query) || 
        (route.route_code && route.route_code.toLowerCase().includes(query))
      );
      setFilteredRoutes(filtered);
    }
  }, [routeSearchQuery, routes]);

  // Reset countdown timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resetCountdown > 0) {
      timer = setTimeout(() => {
        setResetCountdown(prev => prev - 1);
      }, 1000);
    } else if (resetCountdown === 0 && resetSent) {
      setResetSent(false);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resetCountdown, resetSent]);

  // Initialize countdown timer when user changes or modal opens
  useEffect(() => {
    if (user?.email) {
      const timestamp = passwordResetTimestamps.get(user.email);
      if (timestamp) {
        // Calculate seconds remaining based on stored timestamp
        const secondsElapsed = Math.floor((Date.now() - timestamp) / 1000);
        const cooldownPeriod = 60; // 60 second cooldown
        const secondsRemaining = cooldownPeriod - secondsElapsed;
        
        if (secondsRemaining > 0) {
          setResetCountdown(secondsRemaining);
          setResetSent(true);
        } else {
          // Cooldown period has passed
          passwordResetTimestamps.delete(user.email);
          setResetCountdown(0);
          setResetSent(false);
        }
      }
    }
  }, [user?.email, isVisible]);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Remove all non-digits for validation
    const digitsOnly = phone.replace(/\D/g, '');
    // US phone numbers should have 10 digits
    return digitsOnly.length === 10;
  };

  // Format phone number
  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digits and take only the first 10 digits
    const digitsOnly = input.replace(/\D/g, '').slice(0, 10);
    
    // Format according to length of input
    if (digitsOnly.length === 0) {
      return '';
    } if (digitsOnly.length < 4) {
      return digitsOnly;
    } else if (digitsOnly.length < 7) {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3)}`;
    } else {
      return `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    }
  };

  const handlePhoneChange = (text: string) => {
    // Get only the digits from the input
    const newDigitsOnly = text.replace(/\D/g, '');
    
    // Format the phone number with digits in correct order
    const formatted = formatPhoneNumber(newDigitsOnly);
    
    // Get cursor position before the update
    let cursorPosition = 0;
    if (Platform.OS === 'web' && phoneInputRef.current) {
      const inputElement = phoneInputRef.current as any;
      if (inputElement.selectionStart !== undefined) {
        cursorPosition = inputElement.selectionStart;
      }
    }
    
    // Update the phone state
    setPhone(formatted);
    
    // After formatting, set the cursor position
    if (Platform.OS === 'web') {
      setTimeout(() => {
        if (phoneInputRef.current) {
          const inputElement = phoneInputRef.current as any;
          if (inputElement.setSelectionRange) {
            // Calculate appropriate cursor position based on the formatting
            let newPosition = cursorPosition;
            
            // If at the end, put cursor at the end
            if (cursorPosition >= phone.length) {
              newPosition = formatted.length;
            }
            // Handle special cases for parentheses and hyphen
            else if (cursorPosition === 4 && formatted.charAt(4) === ' ') {
              newPosition = 5;
            } else if (cursorPosition === 9 && formatted.charAt(9) === '-') {
              newPosition = 10;
            }
            
            inputElement.setSelectionRange(newPosition, newPosition);
          }
        }
      }, 0);
    }
    
    // Validate on change if user has already attempted to submit
    if (attemptedSubmit) {
      validateFields();
    }
  };

  // Comprehensive validation
  const validateFields = (): boolean => {
    const newErrors: FieldError = {};
    
    // Check required fields
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    setAttemptedSubmit(true);
    
    // Validate all fields
    if (!validateFields()) {
      return;
    }

    // Create updated user object with raw phone number (remove formatting)
    const updatedUser: User = {
      id: user?.id || `user_${Date.now()}`, // This is temporary and will be replaced with auth UID
      firstName,
      lastName,
      email,
      phone: phone.replace(/\D/g, ''), // Store only digits in the database
      school_id: user?.school_id || '', // Will be set in onSave
      user_type: userType,
      role: userType, // Add role field matching the user_type
      viewable_routes: viewableRoutes,
      soft_delete: false
    };

    onSave(updatedUser);
    onClose();
  };

  const handleDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (!user) return;
    
    // Create an updated user with soft delete fields
    const deletedUser: User = {
      ...user,
      soft_delete: true,
      deleted_at: Timestamp.now(),
      deleted_by: managerId || managerName // Use ID if available, fall back to name
    };
    
    onDelete(deletedUser);
    setShowDeleteConfirmation(false);
    onClose();
  };

  const handleSendPasswordReset = async () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required to send password reset');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    if (resetCountdown > 0) {
      Alert.alert('Please Wait', `You can request another reset email in ${resetCountdown} seconds`);
      return;
    }

    setResetSending(true);

    try {
      await onSendPasswordReset(email);
      setResetSent(true);
      setResetCountdown(60); // 60 second countdown
      // Store the timestamp for this email
      passwordResetTimestamps.set(email, Date.now());
      Alert.alert('Password Reset', `Password reset email sent to ${email}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send password reset email');
    } finally {
      setResetSending(false);
    }
  };

  const toggleRouteSelection = (routeId: string) => {
    const updatedRoutes = viewableRoutes.includes(routeId)
      ? viewableRoutes.filter(id => id !== routeId)
      : [...viewableRoutes, routeId];
    
    setViewableRoutes(updatedRoutes);
  };

  const selectAllRoutes = () => {
    if (viewableRoutes.length === routes.length) {
      // If all routes are already selected, deselect all
      setViewableRoutes([]);
    } else {
      // Otherwise, select all routes
      setViewableRoutes(routes.map(route => route.id));
    }
  };

  const removeRoute = (routeId: string, e?: any) => {
    e?.stopPropagation(); // Prevent triggering the parent TouchableOpacity
    setViewableRoutes(viewableRoutes.filter(id => id !== routeId));
  };

  const isEditMode = !!user;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>
              {isEditMode ? 'Edit User' : 'Add New User'}
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Left Column: Routes */}
            <View style={styles.routesColumn}>
              <ThemedText style={styles.formLabel}>Viewable Routes</ThemedText>
              
              {/* Search Routes Input */}
              <View style={styles.routeSearchContainer}>
                <View style={styles.searchIconContainer}>
                  <Search size={16} color={Theme.colors.text.secondary} />
                </View>
                <TextInput
                  style={styles.routeSearchInput}
                  value={routeSearchQuery}
                  onChangeText={setRouteSearchQuery}
                  placeholder="Search routes..."
                  placeholderTextColor={Theme.colors.text.tertiary}
                  className={Platform.OS === 'web' ? 'no-outline' : undefined}
                />
              </View>
              
              <ScrollView style={styles.routesScrollView} showsVerticalScrollIndicator={true}>
                {/* "All" Option */}
                <TouchableOpacity 
                  style={[
                    styles.allRoutesItem,
                    viewableRoutes.length === routes.length && styles.allRoutesSelected
                  ]}
                  onPress={selectAllRoutes}
                >
                  <ThemedText 
                    style={[
                      styles.allRoutesText,
                      viewableRoutes.length === routes.length && styles.allRoutesTextSelected
                    ]}
                  >
                    All Routes
                  </ThemedText>
                  {viewableRoutes.length === routes.length && (
                    <CheckCircle 
                      size={16} 
                      color="#fff" 
                    />
                  )}
                </TouchableOpacity>
                
                {/* Divider between All Routes and individual routes */}
                <View style={styles.routeDivider} />
                
                <View style={styles.routesContainer}>
                  {filteredRoutes.length > 0 ? (
                    filteredRoutes.map((route) => (
                      <View key={route.id} style={styles.routeItemWrapper}>
                        <TouchableOpacity 
                          style={[
                            styles.routeItem,
                            viewableRoutes.includes(route.id) && styles.routeItemSelected
                          ]}
                          onPress={() => toggleRouteSelection(route.id)}
                        >
                          <View style={styles.routeItemContent}>
                            <ThemedText 
                              style={[
                                styles.routeItemText,
                                viewableRoutes.includes(route.id) && styles.routeItemTextSelected
                              ]}
                            >
                              {route.name}
                            </ThemedText>
                            {route.route_code && (
                              <ThemedText 
                                style={[
                                  styles.routeCodeText,
                                  viewableRoutes.includes(route.id) && styles.routeCodeTextSelected
                                ]}
                              >
                                Code: {route.route_code}
                              </ThemedText>
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.noRoutesText}>
                      {routeSearchQuery ? "No routes found matching your search" : "No routes available"}
                    </ThemedText>
                  )}
                </View>
              </ScrollView>
            </View>
            
            {/* Right Column: User Details */}
            <View style={styles.detailsColumn}>
              <ThemedText style={styles.formLabel}>User Information</ThemedText>
              
              <ScrollView style={styles.formScrollView}>
                <View style={styles.formContainer}>
                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, styles.halfWidth]}>
                      <ThemedText style={styles.formLabel}>First Name <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                      <View>
                        <TextInput
                          style={[
                            styles.formInput,
                            errors.firstName ? styles.inputError : null
                          ]}
                          value={firstName}
                          onChangeText={(text) => {
                            setFirstName(text);
                            if (attemptedSubmit) validateFields();
                          }}
                          placeholder="Enter user's first name"
                          placeholderTextColor={Theme.colors.text.tertiary}
                        />
                        {errors.firstName && (
                          <View style={styles.errorContainer}>
                            <AlertCircle size={14} color={Theme.colors.error} />
                            <ThemedText style={styles.errorText}>{errors.firstName}</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={[styles.formGroup, styles.halfWidth]}>
                      <ThemedText style={styles.formLabel}>Last Name <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                      <View>
                        <TextInput
                          style={[
                            styles.formInput,
                            errors.lastName ? styles.inputError : null
                          ]}
                          value={lastName}
                          onChangeText={(text) => {
                            setLastName(text);
                            if (attemptedSubmit) validateFields();
                          }}
                          placeholder="Enter user's last name"
                          placeholderTextColor={Theme.colors.text.tertiary}
                        />
                        {errors.lastName && (
                          <View style={styles.errorContainer}>
                            <AlertCircle size={14} color={Theme.colors.error} />
                            <ThemedText style={styles.errorText}>{errors.lastName}</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, styles.halfWidth]}>
                      <ThemedText style={styles.formLabel}>Email <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                      <View>
                        <TextInput
                          style={[
                            styles.formInput,
                            errors.email ? styles.inputError : null,
                            isEditMode ? styles.inputDisabled : null
                          ]}
                          value={email}
                          onChangeText={(text) => {
                            // Allow changing email only when creating a new user
                            if (!isEditMode) {
                              setEmail(text);
                              if (attemptedSubmit) validateFields();
                            }
                          }}
                          placeholder="Enter email address"
                          placeholderTextColor={Theme.colors.text.tertiary}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          editable={!isEditMode}
                        />
                        {errors.email && (
                          <View style={styles.errorContainer}>
                            <AlertCircle size={14} color={Theme.colors.error} />
                            <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
                          </View>
                        )}
                        {isEditMode && (
                          <ThemedText style={styles.helperText}>
                            Email cannot be changed for existing users.
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    <View style={[styles.formGroup, styles.halfWidth]}>
                      <ThemedText style={styles.formLabel}>Phone <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                      <View>
                        <TextInput
                          ref={phoneInputRef}
                          style={[
                            styles.formInput,
                            errors.phone ? styles.inputError : null
                          ]}
                          value={phone}
                          onChangeText={handlePhoneChange}
                          placeholder="Enter phone number"
                          placeholderTextColor={Theme.colors.text.tertiary}
                          keyboardType="phone-pad"
                        />
                        {errors.phone && (
                          <View style={styles.errorContainer}>
                            <AlertCircle size={14} color={Theme.colors.error} />
                            <ThemedText style={styles.errorText}>{errors.phone}</ThemedText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.formGroup}>
                    <ThemedText style={styles.formLabel}>User Type</ThemedText>
                    <View style={styles.dropdown}>
                      <select
                        style={{
                          width: '100%',
                          height: '44px',
                          padding: '0 12px',
                          backgroundColor: Theme.colors.background.tertiary,
                          border: '1px solid ' + Theme.colors.border.light,
                          borderRadius: '8px',
                          color: Theme.colors.text.primary,
                          fontSize: '15px',
                          fontFamily: 'sans-serif',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' stroke='%236B7280' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          backgroundSize: '16px',
                          paddingRight: '32px',
                          outlineWidth: 0,
                          outlineStyle: 'none'
                        }}
                        value={userType}
                        onChange={(e) => setUserType(e.target.value as 'parent' | 'student')}
                      >
                        <option value="parent">Parent</option>
                        <option value="student">Student</option>
                      </select>
                    </View>
                  </View>

                  {isEditMode && (
                    <View style={styles.passwordSection}>
                      <ThemedText style={styles.passwordLabel}>Password Management</ThemedText>
                      <ThemedText style={styles.passwordHelpText}>
                        Send a password reset email to allow the user to set a new password.
                      </ThemedText>
                      <View style={styles.passwordResetRow}>
                        <TouchableOpacity 
                          style={[
                            styles.passwordResetButton,
                            resetCountdown > 0 && styles.passwordResetButtonDisabled
                          ]}
                          onPress={handleSendPasswordReset}
                          disabled={resetCountdown > 0 || resetSending}
                        >
                          {resetSending ? (
                            <ActivityIndicator size="small" color={Theme.colors.text.inverse} />
                          ) : (
                            <ThemedText style={styles.passwordResetButtonText}>
                              {resetCountdown > 0 
                                ? `Resend in ${resetCountdown}s` 
                                : 'Send Password Reset Email'}
                            </ThemedText>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* Divider line */}
          <View style={styles.dividerLine} />

          <View style={styles.actionButtons}>
            <View style={styles.leftButtons}>
              {isEditMode && (
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteConfirmation}>
                  <Trash2 size={18} color={Theme.colors.error} />
                  <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.rightButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <ThemedText style={styles.saveButtonText}>
                  {isEditMode ? 'Save Changes' : 'Add User'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModalContainer}>
            <View style={styles.confirmationHeader}>
              <ThemedText style={styles.confirmationTitle}>Confirm Deletion</ThemedText>
            </View>
            <View style={styles.confirmationContent}>
              <ThemedText style={styles.confirmationText}>
                Are you sure you want to delete {user?.firstName} {user?.lastName}?
                This action cannot be undone.
              </ThemedText>
            </View>
            <View style={styles.confirmationButtons}>
              <TouchableOpacity 
                style={styles.cancelConfirmButton} 
                onPress={() => setShowDeleteConfirmation(false)}
              >
                <ThemedText style={styles.cancelConfirmButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteConfirmButton} 
                onPress={handleConfirmDelete}
              >
                <ThemedText style={styles.deleteConfirmButtonText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  } as ViewStyle,
  
  modalContainer: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 1000,
    maxHeight: '70%',
    ...Platform.select({
      web: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        shadowColor: "#000",
      }
    })
  } as ViewStyle,
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  } as ViewStyle,
  
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
  } as TextStyle,
  
  closeButton: {
    padding: 4,
  } as ViewStyle,
  
  // Modal content
  modalContent: {
    flexDirection: 'row',
    flex: 1,
  } as ViewStyle,
  
  routesColumn: {
    width: '30%',
    marginRight: 16,
    borderRightWidth: 1,
    borderRightColor: Theme.colors.border.light,
    paddingRight: 16,
  } as ViewStyle,
  
  detailsColumn: {
    flex: 1,
  } as ViewStyle,
  
  formScrollView: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      height: '100%',
    } : {
      maxHeight: 350,
    })
  },
  
  formContainer: {
    marginBottom: 10,
  },
  
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  
  formGroup: {
    marginBottom: 16,
    minWidth: 200,
  },
  
  halfWidth: {
    width: '48%',
    ...Platform.select({
      web: {},
      default: {
        width: '100%'
      }
    })
  },
  
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Theme.colors.text.primary,
  } as TextStyle,
  
  formInput: {
    backgroundColor: Theme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: Theme.colors.text.primary,
    height: 44,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineStyle: 'none'
      }
    })
  },
  
  dropdown: {
    color: Theme.colors.text.primary,
    height: 44,
    width: '100%',
    paddingHorizontal: 12,
    paddingRight: 30,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineStyle: 'none',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        boxShadow: 'none'
      },
      default: {}
    })
  },
  
  routeSearchContainer: {
    position: 'relative',
    marginBottom: 16,
  } as ViewStyle,
  
  searchIconContainer: {
    position: 'absolute',
    left: 10,
    top: 10,
    zIndex: 1,
  } as ViewStyle,
  
  routeSearchInput: {
    backgroundColor: Theme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    padding: 12,
    paddingLeft: 36,
    fontSize: 15,
    color: Theme.colors.text.primary,
    height: 44,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineStyle: 'none'
      }
    })
  } as TextStyle,
  
  routesScrollView: {
    flex: 1,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    marginBottom: 10,
    height: 330,
    backgroundColor: Theme.colors.background.tertiary,
    ...(Platform.OS === 'web' ? { 
      overflow: 'auto',
      scrollbarWidth: 'thin',
      scrollbarColor: `${Theme.colors.border.medium} transparent`,
    } : {})
  } as ViewStyle,
  
  routesContainer: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  } as ViewStyle,
  
  routeDivider: {
    height: 1,
    backgroundColor: Theme.colors.border.medium,
    marginVertical: 4,
    marginHorizontal: 8,
  } as ViewStyle,
  
  allRoutesItem: {
    padding: 10,
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: Theme.colors.background.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  
  allRoutesText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.primary,
  } as TextStyle,
  
  allRoutesSelected: {
    backgroundColor: Theme.colors.primary,
  } as ViewStyle,
  
  allRoutesTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  } as TextStyle,
  
  routeItemWrapper: {
    paddingVertical: 2,
  } as ViewStyle,
  
  routeItem: {
    padding: 10,
    marginVertical: 2,
    backgroundColor: Theme.colors.background.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  
  routeItemContent: {
    flex: 1,
    marginRight: 8,
  } as ViewStyle,
  
  routeItemText: {
    fontSize: 14,
    color: Theme.colors.text.primary,
    fontWeight: '500',
  } as TextStyle,
  
  routeCodeText: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginTop: 4,
  } as TextStyle,
  
  routeItemSelected: {
    backgroundColor: Theme.colors.primary,
  } as ViewStyle,
  
  routeItemTextSelected: {
    color: '#fff',
    fontWeight: '600',
  } as TextStyle,
  
  routeCodeTextSelected: {
    color: '#fff',
  } as TextStyle,
  
  noRoutesText: {
    textAlign: 'center',
    padding: 16,
    color: Theme.colors.text.secondary,
    fontStyle: 'italic',
  } as TextStyle,
  
  passwordSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: Theme.colors.background.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  
  passwordLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
    marginBottom: 8,
  },
  
  passwordHelpText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginBottom: 16,
  },
  
  passwordResetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  passwordResetButton: {
    backgroundColor: Theme.colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  
  passwordResetButtonDisabled: {
    backgroundColor: Theme.colors.text.tertiary,
  },
  
  passwordResetButtonText: {
    color: Theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '500',
  },
  
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  
  leftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 12,
  },
  
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  
  saveButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  saveButtonText: {
    color: Theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '500',
  },
  
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Theme.colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Light red background
  },
  
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.error,
    marginLeft: 8,
  },
  
  dividerLine: {
    height: 1,
    backgroundColor: Theme.colors.border.light,
    marginVertical: 8,
  },
  
  requiredField: {
    color: Theme.colors.error,
  } as TextStyle,
  
  inputError: {
    borderColor: Theme.colors.error,
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  
  errorText: {
    fontSize: 12,
    color: Theme.colors.error,
    marginLeft: 4,
  },
  
  confirmationModalContainer: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
      }
    })
  },
  
  confirmationHeader: {
    marginBottom: 16,
  },
  
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
  },
  
  confirmationContent: {
    marginBottom: 24,
  },
  
  confirmationText: {
    fontSize: 15,
    lineHeight: 22,
    color: Theme.colors.text.secondary,
  },
  
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  
  cancelConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  
  cancelConfirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  
  deleteConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.error,
    borderRadius: 6,
  },
  
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.inverse,
  },
  
  inputDisabled: {
    backgroundColor: '#f0f0f0',
    opacity: 0.7,
  },
  
  helperText: {
    fontSize: 12,
    color: Theme.colors.text.tertiary,
    marginTop: 4,
  },
});

export default UserModal; 