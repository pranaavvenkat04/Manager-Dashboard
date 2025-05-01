import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Modal, TouchableOpacity, Alert, Platform } from 'react-native';
import { X, ChevronDown } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';

// Define interface for User based on Firestore structure
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  school_id: string;
  user_type: 'parent' | 'student';
  viewable_routes: string[];
}

// Define interface for a Route (for reference)
interface Route {
  id: string;
  name: string;
}

interface UserModalProps {
  isVisible: boolean;
  onClose: () => void;
  user: User | null;
  routes: Route[];
  onSave: (user: User) => void;
  onDelete: (user: User) => void;
  onSendPasswordReset: (email: string) => void;
}

const UserModal = ({
  isVisible,
  onClose,
  user,
  routes,
  onSave,
  onDelete,
  onSendPasswordReset
}: UserModalProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<'parent' | 'student'>('parent');
  const [viewableRoutes, setViewableRoutes] = useState<string[]>([]);
  
  // State for dropdown
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  // Reset form when user changes
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone);
      setUserType(user.user_type);
      setViewableRoutes(user.viewable_routes);
    } else {
      // Reset form for new user
      setName('');
      setEmail('');
      setPhone('');
      setUserType('parent');
      setViewableRoutes([]);
    }
  }, [user]);

  const handleSave = () => {
    // Basic validation
    if (!name.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    // Create updated user object
    const updatedUser: User = {
      id: user?.id || `user_${Date.now()}`, // Generate ID for new users
      name,
      email,
      phone,
      school_id: user?.school_id || 'school1', // Default school ID
      user_type: userType,
      viewable_routes: viewableRoutes
    };

    onSave(updatedUser);
    onClose();
  };

  const handleDelete = () => {
    if (!user) return;
    
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            onDelete(user);
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

  const toggleRouteSelection = (routeId: string) => {
    const updatedRoutes = viewableRoutes.includes(routeId)
      ? viewableRoutes.filter(id => id !== routeId)
      : [...viewableRoutes, routeId];
    
    setViewableRoutes(updatedRoutes);
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
                placeholder="Enter user's name"
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
              <ThemedText style={styles.formLabel}>User Type</ThemedText>
              <View style={styles.dropdown}>
                <TouchableOpacity 
                  style={styles.dropdownButton}
                  onPress={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                >
                  <ThemedText style={styles.dropdownText}>
                    {userType === 'student' ? 'Student' : 'Parent'}
                  </ThemedText>
                  <ChevronDown size={16} color="#6B7280" />
                </TouchableOpacity>
                
                {isTypeDropdownOpen && (
                  <View style={styles.dropdownMenu}>
                    <TouchableOpacity 
                      style={styles.dropdownItem}
                      onPress={() => {
                        setUserType('parent');
                        setIsTypeDropdownOpen(false);
                      }}
                    >
                      <ThemedText style={styles.dropdownItemText}>Parent</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.dropdownItem}
                      onPress={() => {
                        setUserType('student');
                        setIsTypeDropdownOpen(false);
                      }}
                    >
                      <ThemedText style={styles.dropdownItemText}>Student</ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Viewable Routes</ThemedText>
              <View style={styles.routesContainer}>
                {routes.map(route => (
                  <TouchableOpacity 
                    key={route.id}
                    style={[
                      styles.routeItem,
                      viewableRoutes.includes(route.id) && styles.routeItemSelected
                    ]}
                    onPress={() => toggleRouteSelection(route.id)}
                  >
                    <ThemedText 
                      style={[
                        styles.routeItemText,
                        viewableRoutes.includes(route.id) && styles.routeItemTextSelected
                      ]}
                    >
                      {route.name}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {isEditMode && (
              <View style={styles.passwordSection}>
                <ThemedText style={styles.passwordLabel}>Password Management</ThemedText>
                <ThemedText style={styles.passwordHelpText}>
                  Send a password reset email to allow the user to set a new password.
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
    borderRadius: 8,
    padding: 24,
    width: '90%',
    maxWidth: 500,
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
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    height: 44,
  },
  dropdown: {
    position: 'relative',
    zIndex: 10,
  },
  dropdownButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 15,
    color: '#1F2937',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    marginTop: 4,
    zIndex: 20,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
      }
    })
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1F2937',
  },
  routesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
  },
  routeItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  routeItemSelected: {
    backgroundColor: '#4361ee',
    borderColor: '#3050ee',
  },
  routeItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  routeItemTextSelected: {
    color: 'white',
  },
  passwordSection: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordLabel: {
    fontSize: 15,
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
    borderRadius: 6,
    alignItems: 'center',
  },
  passwordResetButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightButtons: {
    flexDirection: 'row',
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
    borderRadius: 6,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 12,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
});

export default UserModal; 