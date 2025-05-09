import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Modal, TouchableOpacity, Alert, Platform, ScrollView, ViewStyle, TextStyle } from 'react-native';
import { X, Trash2, AlertCircle } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { Theme } from '@/constants/Colors';
import { db, Timestamp } from '@/utils/firebase';

// Define interface for Vehicle
interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  capacity: number;
  operational: boolean;
  school_id: string;
  in_use?: boolean;
  soft_delete?: boolean;
  deleted_at?: any;
  deleted_by?: string;
  registration?: string;
  inspectionInfo?: string;
  created_at?: any;
  created_by?: string;
  updated_at?: any;
  updated_by?: string;
}

interface VehicleModalProps {
  isVisible: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSave: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
  managerId?: string;
}

interface FieldError {
  make?: string;
  model?: string;
  year?: string;
  license_plate?: string;
  capacity?: string;
}

const VehicleModal = ({
  isVisible,
  onClose,
  vehicle,
  onSave,
  onDelete,
  managerId = ''
}: VehicleModalProps) => {
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [registration, setRegistration] = useState('');
  const [inspectionInfo, setInspectionInfo] = useState('');
  const [operational, setOperational] = useState(true);
  
  // Delete confirmation state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Field validation
  const [errors, setErrors] = useState<FieldError>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Add a useEffect hook to add a style tag to the document head on web platforms
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Create a style element to handle web-specific styling
      const styleElement = document.createElement('style');
      styleElement.innerHTML = `
        input {
          outline: none !important;
        }
        input:focus {
          outline: none !important;
        }
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
      `;
      // Add the style to the document head
      document.head.appendChild(styleElement);
      
      // Clean up function
      return () => {
        document.head.removeChild(styleElement);
      };
    }
  }, []);

  // Reset form when vehicle changes
  useEffect(() => {
    if (vehicle) {
      setMake(vehicle.make || '');
      setModel(vehicle.model || '');
      setYear(vehicle.year ? String(vehicle.year) : '');
      setLicensePlate(vehicle.license_plate || '');
      setCapacity(vehicle.capacity ? String(vehicle.capacity) : '');
      setRegistration(vehicle.registration || '');
      setInspectionInfo(vehicle.inspectionInfo || '');
      setOperational(vehicle.operational !== false);
    } else {
      // Reset form for new vehicle
      setMake('');
      setModel('');
      setYear('');
      setLicensePlate('');
      setCapacity('');
      setRegistration('');
      setInspectionInfo('');
      setOperational(true);
    }
    
    // Reset errors when form is reset
    setErrors({});
    setAttemptedSubmit(false);
  }, [vehicle]);

  // Validation functions
  const validateYear = (yearStr: string): boolean => {
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(yearStr, 10);
    return !isNaN(yearNum) && yearNum >= 1900 && yearNum <= currentYear + 1;
  };

  const validateCapacity = (capacityStr: string): boolean => {
    const capacityNum = parseInt(capacityStr, 10);
    return !isNaN(capacityNum) && capacityNum > 0 && capacityNum <= 100;
  };

  // Comprehensive validation
  const validateFields = (): boolean => {
    const newErrors: FieldError = {};
    
    // Check required fields
    if (!make.trim()) {
      newErrors.make = 'Make is required';
    }
    
    if (!model.trim()) {
      newErrors.model = 'Model is required';
    }
    
    if (!year.trim()) {
      newErrors.year = 'Year is required';
    } else if (!validateYear(year)) {
      newErrors.year = 'Please enter a valid year (1900 - present)';
    }
    
    if (!licensePlate.trim()) {
      newErrors.license_plate = 'License plate is required';
    }
    
    if (!capacity.trim()) {
      newErrors.capacity = 'Capacity is required';
    } else if (!validateCapacity(capacity)) {
      newErrors.capacity = 'Please enter a valid capacity (1-100)';
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

    // Create updated vehicle object
    const updatedVehicle: Vehicle = {
      id: vehicle?.id || `vehicle_${Date.now()}`, // Generate ID for new vehicles
      make,
      model,
      year: parseInt(year, 10),
      license_plate: licensePlate,
      capacity: parseInt(capacity, 10),
      operational,
      registration: registration || '',
      inspectionInfo: inspectionInfo || '',
      school_id: vehicle?.school_id || '',
      in_use: vehicle?.in_use || false,
      soft_delete: false
    };

    onSave(updatedVehicle);
    onClose();
  };

  const handleDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (!vehicle) return;
    
    // Create an updated vehicle with soft delete fields
    const deletedVehicle: Vehicle = {
      ...vehicle,
      soft_delete: true,
      deleted_at: Timestamp.now(),
      deleted_by: managerId
    };
    
    onDelete(deletedVehicle);
    setShowDeleteConfirmation(false);
    onClose();
  };

  const isEditMode = !!vehicle;

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
              {isEditMode ? 'Edit Vehicle' : 'Add New Vehicle'}
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScrollView}>
            <View style={styles.formContainer}>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <ThemedText style={styles.formLabel}>Make <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                  <View>
                    <TextInput
                      style={[
                        styles.formInput,
                        errors.make ? styles.inputError : null
                      ]}
                      value={make}
                      onChangeText={(text) => {
                        setMake(text);
                        if (attemptedSubmit) validateFields();
                      }}
                      placeholder="Enter vehicle make"
                      placeholderTextColor={Theme.colors.text.tertiary}
                    />
                    {errors.make && (
                      <View style={styles.errorContainer}>
                        <AlertCircle size={14} color={Theme.colors.error} />
                        <ThemedText style={styles.errorText}>{errors.make}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.formGroup, styles.halfWidth]}>
                  <ThemedText style={styles.formLabel}>Model <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                  <View>
                    <TextInput
                      style={[
                        styles.formInput,
                        errors.model ? styles.inputError : null
                      ]}
                      value={model}
                      onChangeText={(text) => {
                        setModel(text);
                        if (attemptedSubmit) validateFields();
                      }}
                      placeholder="Enter vehicle model"
                      placeholderTextColor={Theme.colors.text.tertiary}
                    />
                    {errors.model && (
                      <View style={styles.errorContainer}>
                        <AlertCircle size={14} color={Theme.colors.error} />
                        <ThemedText style={styles.errorText}>{errors.model}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <ThemedText style={styles.formLabel}>Year <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                  <View>
                    <TextInput
                      style={[
                        styles.formInput,
                        errors.year ? styles.inputError : null
                      ]}
                      value={year}
                      onChangeText={(text) => {
                        // Only allow numbers
                        const filtered = text.replace(/[^0-9]/g, '');
                        setYear(filtered);
                        if (attemptedSubmit) validateFields();
                      }}
                      placeholder="Enter vehicle year"
                      placeholderTextColor={Theme.colors.text.tertiary}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    {errors.year && (
                      <View style={styles.errorContainer}>
                        <AlertCircle size={14} color={Theme.colors.error} />
                        <ThemedText style={styles.errorText}>{errors.year}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.formGroup, styles.halfWidth]}>
                  <ThemedText style={styles.formLabel}>License Plate <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                  <View>
                    <TextInput
                      style={[
                        styles.formInput,
                        errors.license_plate ? styles.inputError : null
                      ]}
                      value={licensePlate}
                      onChangeText={(text) => {
                        setLicensePlate(text);
                        if (attemptedSubmit) validateFields();
                      }}
                      placeholder="Enter license plate"
                      placeholderTextColor={Theme.colors.text.tertiary}
                    />
                    {errors.license_plate && (
                      <View style={styles.errorContainer}>
                        <AlertCircle size={14} color={Theme.colors.error} />
                        <ThemedText style={styles.errorText}>{errors.license_plate}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, styles.halfWidth]}>
                  <ThemedText style={styles.formLabel}>Capacity <ThemedText style={styles.requiredField}>*</ThemedText></ThemedText>
                  <View>
                    <TextInput
                      style={[
                        styles.formInput,
                        errors.capacity ? styles.inputError : null
                      ]}
                      value={capacity}
                      onChangeText={(text) => {
                        // Only allow numbers
                        const filtered = text.replace(/[^0-9]/g, '');
                        setCapacity(filtered);
                        if (attemptedSubmit) validateFields();
                      }}
                      placeholder="Enter vehicle capacity"
                      placeholderTextColor={Theme.colors.text.tertiary}
                      keyboardType="numeric"
                    />
                    {errors.capacity && (
                      <View style={styles.errorContainer}>
                        <AlertCircle size={14} color={Theme.colors.error} />
                        <ThemedText style={styles.errorText}>{errors.capacity}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.formGroup, styles.halfWidth]}>
                  <ThemedText style={styles.formLabel}>Registration</ThemedText>
                  <TextInput
                    style={styles.formInput}
                    value={registration}
                    onChangeText={setRegistration}
                    placeholder="Enter registration number"
                    placeholderTextColor={Theme.colors.text.tertiary}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Inspection Information</ThemedText>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={inspectionInfo}
                  onChangeText={setInspectionInfo}
                  placeholder="Enter inspection details"
                  placeholderTextColor={Theme.colors.text.tertiary}
                  multiline={true}
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Operational Status</ThemedText>
                <View style={styles.dropdownContainer}>
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
                    value={operational ? 'operational' : 'non-operational'}
                    onChange={(e) => setOperational(e.target.value === 'operational')}
                  >
                    <option value="operational">Operational</option>
                    <option value="non-operational">Non-Operational</option>
                  </select>
                </View>
              </View>
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
                  {isEditMode ? 'Save Changes' : 'Add Vehicle'}
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
                  Are you sure you want to delete this vehicle ({make} {model})?
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
});

export default VehicleModal; 