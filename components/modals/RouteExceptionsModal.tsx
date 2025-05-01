import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Modal, TouchableOpacity, Alert, Platform } from 'react-native';
import { X, Calendar, Check } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { ScheduleException } from '@/types/RouteTypes';

// Date format to use for display
const DATE_FORMAT = 'MM/DD/YYYY';

// Format date for display
const formatDate = (date: Date): string => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

// Parse a date string in MM/DD/YYYY format
const parseDate = (dateString: string): Date | null => {
  const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const match = dateString.match(regex);
  
  if (match) {
    const month = parseInt(match[1]) - 1; // Month is 0-indexed
    const day = parseInt(match[2]);
    const year = parseInt(match[3]);
    
    if (!isNaN(month) && !isNaN(day) && !isNaN(year) && 
        month >= 0 && month < 12 && 
        day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }
  
  return null;
};

interface RouteExceptionsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApply: (exception: ScheduleException) => Promise<void>;
}

const RouteExceptionsModal = ({
  isVisible,
  onClose,
  onApply
}: RouteExceptionsModalProps) => {
  const [dateText, setDateText] = useState(formatDate(new Date()));
  const [exceptionType, setExceptionType] = useState<'no_service' | 'special_service'>('no_service');
  const [reason, setReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const handleDateChange = (text: string) => {
    setDateText(text);
  };

  const handleApply = async () => {
    // Validate date
    const date = parseDate(dateText);
    if (!date) {
      Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format');
      return;
    }

    // Create exception object
    const exception: ScheduleException = {
      date,
      type: exceptionType,
      reason: reason.trim() || undefined
    };

    try {
      setIsApplying(true);
      await onApply(exception);
      setIsApplying(false);
      
      // Reset form
      setDateText(formatDate(new Date()));
      setExceptionType('no_service');
      setReason('');
      
      onClose();
    } catch (error) {
      setIsApplying(false);
      Alert.alert('Error', 'Failed to apply exception to routes. Please try again.');
      console.error('Error applying exception:', error);
    }
  };

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
              Apply Exception to All Routes
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <ThemedText style={styles.formDescription}>
              This will apply the same exception to all routes. Use this for holidays, 
              school closures, or other events affecting all routes.
            </ThemedText>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Exception Date</ThemedText>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color="#6B7280" style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  value={dateText}
                  onChangeText={handleDateChange}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <ThemedText style={styles.dateHelpText}>
                Enter date in MM/DD/YYYY format
              </ThemedText>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Exception Type</ThemedText>
              <View style={styles.exceptionTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    exceptionType === 'no_service' && styles.typeButtonActive
                  ]}
                  onPress={() => setExceptionType('no_service')}
                >
                  <ThemedText 
                    style={[
                      styles.typeButtonText,
                      exceptionType === 'no_service' && styles.typeButtonTextActive
                    ]}
                  >
                    No Service
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    styles.typeButtonRight,
                    exceptionType === 'special_service' && styles.typeButtonActive
                  ]}
                  onPress={() => setExceptionType('special_service')}
                >
                  <ThemedText 
                    style={[
                      styles.typeButtonText,
                      exceptionType === 'special_service' && styles.typeButtonTextActive
                    ]}
                  >
                    Special Service
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.formLabelContainer}>
                <ThemedText style={styles.formLabel}>Reason</ThemedText>
                <ThemedText style={styles.optionalLabel}>(Optional)</ThemedText>
              </View>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason (e.g. Holiday, School Closure)"
                placeholderTextColor="#9CA3AF"
                multiline={true}
                numberOfLines={2}
              />
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.applyButton, isApplying && styles.applyButtonDisabled]} 
              onPress={handleApply}
              disabled={isApplying}
            >
              {isApplying ? (
                <ThemedText style={styles.applyButtonText}>Applying...</ThemedText>
              ) : (
                <>
                  <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.applyButtonText}>
                    Apply to All Routes
                  </ThemedText>
                </>
              )}
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
  formDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
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
  formLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  optionalLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1F2937',
  },
  dateHelpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  exceptionTypeContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  typeButtonRight: {
    borderLeftWidth: 0,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#4361ee',
    borderColor: '#3050ee',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  reasonInput: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    textAlignVertical: 'top',
    minHeight: 80,
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
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4361ee',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
  },
  applyButtonDisabled: {
    backgroundColor: '#A1A1AA',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default RouteExceptionsModal; 