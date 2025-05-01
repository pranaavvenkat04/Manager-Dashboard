import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Modal, TouchableOpacity, Alert, Platform } from 'react-native';
import { X } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';

// Define interface for Driver based on Firestore structure
interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  school_id: string;
  assigned_vehicle_id: string;
}

interface DriverModalProps {
  isVisible: boolean;
  onClose: () => void;
  driver: Driver | null;
  onSave: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  onSendPasswordReset: (email: string) => void;
}

const DriverModal = ({
  isVisible,
  onClose,
  driver,
  onSave,
  onDelete,
  onSendPasswordReset
}: DriverModalProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleId, setVehicleId] = useState('');

  // Reset form when driver changes
  React.useEffect(() => {
    if (driver) {
      setName(driver.name);
      setEmail(driver.email);
      setPhone(driver.phone);
      setVehicleId(driver.assigned_vehicle_id);
    } else {
      // Reset form for new driver
      setName('');
      setEmail('');
      setPhone('');
      setVehicleId('');
    }
  }, [driver]);

  const handleSave = () => {
    // Basic validation
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    // Create updated driver object
    const updatedDriver: Driver = {
      id: driver?.id || `driver_${Date.now()}`, // Generate ID for new drivers
      name,
      email,
      phone,
      school_id: driver?.school_id || 'school1', // Default school ID
      assigned_vehicle_id: vehicleId
    };

    onSave(updatedDriver);
    onClose();
  };

  const handleDelete = () => {
    if (!driver) return;
    
    Alert.alert(
      'Delete Driver',
      `Are you sure you want to delete ${driver.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDelete(driver);
            onClose();
          }
        }
      ]
    );
  };

  const handleSendPasswordReset = () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email is required to send password reset');
      return;
    }

    onSendPasswordReset(email);
    Alert.alert('Password Reset', `Password reset email sent to ${email}`);
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
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Name</ThemedText>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter driver's name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Email</ThemedText>
              <TextInput
                style={styles.formInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Phone</ThemedText>
              <TextInput
                style={styles.formInput}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Assigned Vehicle ID</ThemedText>
              <TextInput
                style={styles.formInput}
                value={vehicleId}
                onChangeText={setVehicleId}
                placeholder="Enter assigned vehicle ID"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {isEditMode && (
              <View style={styles.passwordSection}>
                <ThemedText style={styles.passwordLabel}>Password Management</ThemedText>
                <ThemedText style={styles.passwordHelpText}>
                  Send a password reset email to allow the driver to set a new password.
                </ThemedText>
                <TouchableOpacity 
                  style={styles.passwordResetButton}
                  onPress={handleSendPasswordReset}
                >
                  <ThemedText style={styles.passwordResetButtonText}>Send Password Reset Email</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            {isEditMode && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </TouchableOpacity>
            )}
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
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 500,
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  passwordSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  passwordHelpText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  passwordResetButton: {
    backgroundColor: '#4361ee',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  passwordResetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelButton: {
    padding: 12,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  saveButton: {
    backgroundColor: '#4361ee',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    marginRight: 'auto',
    padding: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
});

export default DriverModal; 