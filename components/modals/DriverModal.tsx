import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Modal, TouchableOpacity, Alert, Platform, ScrollView, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { X, Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { Picker } from '@react-native-picker/picker';

import { ThemedText } from '@/components/ThemedText';
import { Theme } from '@/constants/Colors';
import { db, Timestamp, getCurrentSchool } from '@/utils/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Define interface for Vehicle
interface Vehicle {
  id: string;
  name?: string;
  make?: string;
  model?: string;
  license_plate?: string;
  number?: string;
}

// Define interface for Driver based on Firestore structure
interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  school_id: string;
  assigned_vehicle_id: string | null;
  soft_delete?: boolean;
  deleted_at?: any;
  deleted_by?: string;
}

interface DriverModalProps {
  isVisible: boolean;
  onClose: () => void;
  driver: Driver | null;
  onSave: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  onSendPasswordReset: (email: string) => void;
  managerName: string;
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

const DriverModal = ({
  isVisible,
  onClose,
  driver,
  onSave,
  onDelete,
  onSendPasswordReset,
  managerName,
  managerId = ''
}: DriverModalProps) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleId, setVehicleId] = useState<string>('unassigned');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
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

  // Fetch vehicles from Firestore
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const schoolId = await getCurrentSchool();
        if (!schoolId) return;
        
        const vehiclesRef = collection(db, 'Schools', schoolId, 'Vehicles');
        const snapshot = await getDocs(vehiclesRef);
        
        if (!snapshot.empty) {
          const vehiclesList = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              make: data.make || '',
              model: data.model || '',
              license_plate: data.license_plate || '',
              number: data.number || ''
            };
          });
          setVehicles(vehiclesList);
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
      }
    };
    
    if (isVisible) {
      fetchVehicles();
      setAttemptedSubmit(false);
    }
  }, [isVisible]);

  // Reset form when driver changes
  useEffect(() => {
    if (driver) {
      setFirstName(driver.firstName || '');
      setLastName(driver.lastName || '');
      setEmail(driver.email);
      // Format the phone number when loading existing driver
      setPhone(formatPhoneNumber(driver.phone || ''));
      setVehicleId(driver.assigned_vehicle_id || 'unassigned');
    } else {
      // Reset form for new driver
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setVehicleId('unassigned');
    }
    
    // Reset errors when form is reset
    setErrors({});
    setAttemptedSubmit(false);
  }, [driver]);

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

  // Initialize countdown timer when driver changes or modal opens
  useEffect(() => {
    if (driver?.email) {
      const timestamp = passwordResetTimestamps.get(driver.email);
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
          passwordResetTimestamps.delete(driver.email);
          setResetCountdown(0);
          setResetSent(false);
        }
      }
    }
  }, [driver?.email, isVisible]);

  // Add a useEffect hook to add a style tag to the document head on web platforms
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Create a style element to handle web-specific styling
      const styleElement = document.createElement('style');
      styleElement.innerHTML = `
        select {
          outline: none !important;
          border: none !important;
          -webkit-appearance: none;
          -moz-appearance: none;
        }
        select:focus {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
        input {
          outline: none !important;
        }
        input:focus {
          outline: none !important;
        }
      `;
      // Add the style to the document head
      document.head.appendChild(styleElement);
      
      // Clean up function
      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, []);

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

  // Make sure the formatPhoneNumber function works correctly
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
      // Scroll to errors
      return;
    }

    // Create updated driver object with raw phone number (remove formatting)
    const updatedDriver: Driver = {
      id: driver?.id || `driver_${Date.now()}`, // Generate ID for new drivers
      firstName,
      lastName,
      email,
      phone: phone.replace(/\D/g, ''), // Store only digits in the database
      school_id: driver?.school_id || '', // Will be set in onSave
      assigned_vehicle_id: vehicleId === 'unassigned' ? null : vehicleId,
      soft_delete: false
    };

    onSave(updatedDriver);
    onClose();
  };

  const handleDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (!driver) return;
    
    // Create an updated driver with soft delete fields
    const deletedDriver: Driver = {
      ...driver,
      soft_delete: true,
      deleted_at: Timestamp.now(),
      deleted_by: managerId || managerName // Use ID if available, fall back to name
    };
    
    onDelete(deletedDriver);
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

  // Format vehicle display name
  const getVehicleDisplayName = (vehicle: Vehicle) => {
    const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
    if (makeModel && vehicle.license_plate) {
      return `${makeModel} (${vehicle.license_plate})`;
    } else if (makeModel) {
      return makeModel;
    } else if (vehicle.license_plate) {
      return `Vehicle (${vehicle.license_plate})`;
    } else {
      return `Vehicle ${vehicle.number || vehicle.id}`;
    }
  };

  const isEditMode = !!driver;

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
              {isEditMode ? 'Edit Driver' : 'Add New Driver'}
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

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
                      placeholder="Enter driver's first name"
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
                      placeholder="Enter driver's last name"
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
                        // Allow changing email only when creating a new driver
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
                        Email cannot be changed for existing drivers.
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
                      placeholder="(123) 456-7890"
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
                <ThemedText style={styles.formLabel}>Assigned Vehicle</ThemedText>
                <View style={styles.dropdownContainer}>
                  <Picker
                    selectedValue={vehicleId}
                    onValueChange={(itemValue) => setVehicleId(itemValue)}
                    style={styles.dropdown}
                    itemStyle={styles.dropdownItem}
                    dropdownIconColor="transparent" // Hide default dropdown icon
                  >
                    <Picker.Item label="Unassigned Vehicle" value="unassigned" />
                    {vehicles.map((vehicle) => (
                      <Picker.Item 
                        key={vehicle.id} 
                        label={getVehicleDisplayName(vehicle)} 
                        value={vehicle.id} 
                      />
                    ))}
                  </Picker>
                  <ChevronDown size={18} color={Theme.colors.text.secondary} style={styles.dropdownIcon} />
                </View>
              </View>

              {isEditMode && (
                <View style={styles.passwordSection}>
                  <ThemedText style={styles.passwordLabel}>Password Management</ThemedText>
                  <ThemedText style={styles.passwordHelpText}>
                    Send a password reset email to allow the driver to set a new password.
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
                  {isEditMode ? 'Save Changes' : 'Add Driver'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Delete confirmation overlay */}
        {showDeleteConfirmation && (
          <View style={styles.confirmDeleteOverlay}>
            <View style={styles.confirmDeleteContainer}>
              <View style={styles.confirmDeleteContent}>
                <ThemedText style={styles.confirmDeleteTitle}>Confirm Delete</ThemedText>
                <ThemedText style={styles.confirmDeleteMessage}>
                  Are you sure you want to delete {driver?.firstName} {driver?.lastName}?
                </ThemedText>
                <View style={styles.confirmDeleteButtons}>
                  <TouchableOpacity 
                    style={styles.cancelDeleteButton} 
                    onPress={() => setShowDeleteConfirmation(false)}
                  >
                    <ThemedText style={styles.cancelDeleteText}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmDeleteButton} 
                    onPress={handleConfirmDelete}
                  >
                    <ThemedText style={styles.confirmDeleteText}>Confirm Delete</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxWidth: 800,
    maxHeight: '90%',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
      }
    })
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  formScrollView: {
    flex: 1,
    maxHeight: 500,
  },
  formContainer: {
    marginBottom: 20,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 0,
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
    fontSize: 15,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
    marginBottom: 8,
  },
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
  inputError: {
    borderColor: Theme.colors.error,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: Theme.colors.error,
    marginLeft: 4,
  },
  dropdownContainer: {
    position: 'relative',
    backgroundColor: Theme.colors.background.tertiary,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dropdown: {
    color: Theme.colors.text.primary,
    height: 44,
    width: '100%',
    paddingHorizontal: 12,
    paddingRight: 30, // Space for custom icon
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
      default: {
        // No outline or border for native platforms
      }
    })
  },
  dropdownItem: {
    fontSize: 15,
    color: Theme.colors.text.primary,
  },
  dropdownIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    marginTop: -9,
    zIndex: 2,
    pointerEvents: 'none',
  },
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
    marginVertical: 16,
  },
  requiredField: {
    color: Theme.colors.error,
  },
  // New separate overlay for the delete confirmation
  confirmDeleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20, // Higher z-index to appear on top
  },
  confirmDeleteContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: Theme.colors.background.main,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 5,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)'
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }
    })
  },
  confirmDeleteContent: {
    padding: 20,
  },
  confirmDeleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: Theme.colors.text.primary,
  },
  confirmDeleteMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: Theme.colors.text.secondary,
  },
  confirmDeleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelDeleteButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelDeleteText: {
    color: Theme.colors.text.secondary,
    fontWeight: '500',
  },
  confirmDeleteButton: {
    backgroundColor: Theme.colors.error,
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: Theme.colors.text.inverse,
    fontWeight: 'bold',
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

export default DriverModal; 