import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Modal, TouchableOpacity, Alert, Platform, ScrollView, LayoutAnimation, UIManager } from 'react-native';
import { X, Calendar, Check, Trash2, Plus } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { ScheduleException } from '@/types/RouteTypes';
import { Theme } from '@/constants/Colors';

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
  onDeleteByDate?: (date: Date) => Promise<void>;
  onDeleteByDateRange?: (startDate: Date, endDate: Date) => Promise<void>;
  existingExceptions?: ScheduleException[];
}

type TabType = 'add' | 'delete';

const RouteExceptionsModal = ({
  isVisible,
  onClose,
  onApply,
  onDeleteByDate = async (date: Date) => {},
  onDeleteByDateRange = async (startDate: Date, endDate: Date) => {},
  existingExceptions = []
}: RouteExceptionsModalProps) => {
  // Setup LayoutAnimation for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('add');
  
  // Form states
  const [dateText, setDateText] = useState(formatDate(new Date()));
  const [exceptionType, setExceptionType] = useState<'no_service' | 'special_service'>('no_service');
  const [reason, setReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isDeletingByDate, setIsDeletingByDate] = useState(false);
  const [isDeletingByDateRange, setIsDeletingByDateRange] = useState(false);
  const [deleteDateText, setDeleteDateText] = useState(formatDate(new Date()));
  const [startDateText, setStartDateText] = useState(formatDate(new Date()));
  const [endDateText, setEndDateText] = useState('');
  const [useRangeForAdd, setUseRangeForAdd] = useState(false);
  const [addStartDateText, setAddStartDateText] = useState(formatDate(new Date()));
  const [addEndDateText, setAddEndDateText] = useState('');
  const [useRangeForDelete, setUseRangeForDelete] = useState(false);
  
  // Custom confirmation modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<() => Promise<void>>(() => async () => {});
  const [confirmModalButtonText, setConfirmModalButtonText] = useState('');
  const [confirmModalButtonColor, setConfirmModalButtonColor] = useState(Theme.colors.primary);
  const [shouldCloseMainModal, setShouldCloseMainModal] = useState(false);

  // Function to handle tab switching with animation
  const switchTab = (tab: TabType) => {
    // Configure animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
  };

  // Function to toggle date range with animation
  const toggleDateRange = (isRangeForAdd: boolean, useRange: boolean) => {
    // Configure animation
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (isRangeForAdd) {
      setUseRangeForAdd(useRange);
    } else {
      setUseRangeForDelete(useRange);
    }
  };

  const handleDateChange = (text: string) => {
    setDateText(text);
  };

  const handleDeleteDateChange = (text: string) => {
    setDeleteDateText(text);
  };

  const handleStartDateChange = (text: string) => {
    setStartDateText(text);
  };

  const handleEndDateChange = (text: string) => {
    setEndDateText(text);
  };

  const handleAddStartDateChange = (text: string) => {
    setAddStartDateText(text);
  };

  const handleAddEndDateChange = (text: string) => {
    setAddEndDateText(text);
  };

  const showConfirmationModal = (
    title: string, 
    message: string, 
    action: () => Promise<void>,
    buttonText: string = 'Confirm',
    buttonColor: string = Theme.colors.primary,
    closeMainModal: boolean = true
  ) => {
    setConfirmModalTitle(title);
    setConfirmModalMessage(message);
    setConfirmModalAction(() => async () => {
      try {
        await action();
        if (closeMainModal) {
          onClose();
        }
      } catch (error) {
        console.error('Error performing action:', error);
      }
    });
    setConfirmModalButtonText(buttonText);
    setConfirmModalButtonColor(buttonColor);
    setShouldCloseMainModal(closeMainModal);
    setConfirmModalVisible(true);
  };

  const handleApply = () => {
    if (useRangeForAdd) {
      // Handle date range
      const startDate = parseDate(addStartDateText);
      const endDate = parseDate(addEndDateText);
      
      if (!startDate) {
        Alert.alert('Invalid Start Date', 'Please enter a valid start date in MM/DD/YYYY format');
        return;
      }
      
      if (!endDate) {
        Alert.alert('Invalid End Date', 'Please enter a valid end date in MM/DD/YYYY format');
        return;
      }
      
      if (startDate > endDate) {
        Alert.alert('Invalid Date Range', 'Start date must be before or equal to end date');
        return;
      }

      // Create a set of dates for the range
      const dates: Date[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Show custom confirmation dialog
      showConfirmationModal(
        'Confirm Exception Addition',
        `Are you sure you want to add this ${exceptionType === 'no_service' ? 'No Service' : 'Special Service'} exception to all routes for the date range from ${formatDate(startDate)} to ${formatDate(endDate)}?`,
        () => applyRangeExceptions(dates),
        'Yes, Apply to All'
      );
    } else {
      // Handle single date
      const date = parseDate(dateText);
      if (!date) {
        Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format');
        return;
      }

      // Show custom confirmation dialog
      showConfirmationModal(
        'Confirm Exception Addition',
        `Are you sure you want to add this ${exceptionType === 'no_service' ? 'No Service' : 'Special Service'} exception to all routes for ${formatDate(date)}?`,
        () => applySingleException(date),
        'Yes, Apply to All'
      );
    }
  };

  // Extract the single exception application logic to a separate function
  const applySingleException = async (date: Date) => {
    try {
      setIsApplying(true);
      
      // Create exception object
      const exception: ScheduleException = {
        date,
        type: exceptionType,
        reason: reason.trim() || undefined
      };
      
      await onApply(exception);
      setIsApplying(false);
      
      // Reset form
      setDateText(formatDate(new Date()));
      setExceptionType('no_service');
      setReason('');
      
      if (!shouldCloseMainModal) {
        Alert.alert(
          'Success', 
          'Exception has been applied to all routes', 
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setIsApplying(false);
      Alert.alert('Error', 'Failed to apply exception to routes. Please try again.');
      console.error('Error applying exception:', error);
      throw error;
    }
  };

  // Extract the range exception application logic to a separate function
  const applyRangeExceptions = async (dates: Date[]) => {
    try {
      setIsApplying(true);
      
      // Apply exception for each date
      for (const date of dates) {
        const exception: ScheduleException = {
          date,
          type: exceptionType,
          reason: reason.trim() || undefined
        };
        
        await onApply(exception);
      }
      
      setIsApplying(false);
      
      // Reset form
      setAddStartDateText(formatDate(new Date()));
      setAddEndDateText('');
      setExceptionType('no_service');
      setReason('');
      
      if (!shouldCloseMainModal) {
        Alert.alert(
          'Success', 
          'Exceptions have been applied for all dates in the range', 
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setIsApplying(false);
      Alert.alert('Error', 'Failed to apply exceptions. Please try again.');
      console.error('Error applying exceptions:', error);
      throw error;
    }
  };

  const handleDeleteByDate = () => {
    // Validate date
    const date = parseDate(deleteDateText);
    if (!date) {
      Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format');
      return;
    }

    showConfirmationModal(
      'Delete Exceptions by Date',
      `Are you sure you want to delete all exceptions on ${formatDate(date)} for all routes? This action cannot be undone.`,
      () => performDeleteByDate(date),
      'Delete',
      Theme.colors.error
    );
  };

  const performDeleteByDate = async (date: Date) => {
    try {
      setIsDeletingByDate(true);
      await onDeleteByDate(date);
      setIsDeletingByDate(false);
      setDeleteDateText(formatDate(new Date()));
      
      if (!shouldCloseMainModal) {
        Alert.alert(
          'Success', 
          'Exceptions have been deleted for the specified date', 
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setIsDeletingByDate(false);
      Alert.alert('Error', 'Failed to delete exceptions. Please try again.');
      console.error('Error deleting exceptions by date:', error);
      throw error;
    }
  };

  const handleDeleteByDateRange = () => {
    // Validate dates
    const startDate = parseDate(startDateText);
    const endDate = parseDate(endDateText);
    
    if (!startDate) {
      Alert.alert('Invalid Start Date', 'Please enter a valid start date in MM/DD/YYYY format');
      return;
    }
    
    if (!endDate) {
      Alert.alert('Invalid End Date', 'Please enter a valid end date in MM/DD/YYYY format');
      return;
    }
    
    if (startDate > endDate) {
      Alert.alert('Invalid Date Range', 'Start date must be before or equal to end date');
      return;
    }

    showConfirmationModal(
      'Delete Exceptions in Date Range',
      `Are you sure you want to delete all exceptions from ${formatDate(startDate)} to ${formatDate(endDate)} for all routes? This action cannot be undone.`,
      () => performDeleteByDateRange(startDate, endDate),
      'Delete',
      Theme.colors.error
    );
  };

  const performDeleteByDateRange = async (startDate: Date, endDate: Date) => {
    try {
      setIsDeletingByDateRange(true);
      await onDeleteByDateRange(startDate, endDate);
      setIsDeletingByDateRange(false);
      setStartDateText(formatDate(new Date()));
      setEndDateText('');
      
      if (!shouldCloseMainModal) {
        Alert.alert(
          'Success', 
          'Exceptions have been deleted for the specified date range', 
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      setIsDeletingByDateRange(false);
      Alert.alert('Error', 'Failed to delete exceptions in date range. Please try again.');
      console.error('Error deleting exceptions in date range:', error);
      throw error;
    }
  };

  // Render the Add Exception tab content
  const renderAddExceptionTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.formGroup}>
        <View style={styles.addTypeToggle}>
          <TouchableOpacity 
            style={[styles.addTypeButton, !useRangeForAdd && styles.addTypeButtonActive]}
            onPress={() => toggleDateRange(true, false)}
          >
            <ThemedText style={[
              styles.addTypeButtonText,
              !useRangeForAdd && styles.addTypeButtonTextActive
            ]}>Single Date</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.addTypeButton, useRangeForAdd && styles.addTypeButtonActive]}
            onPress={() => toggleDateRange(true, true)}
          >
            <ThemedText style={[
              styles.addTypeButtonText,
              useRangeForAdd && styles.addTypeButtonTextActive
            ]}>Date Range</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
      
      {useRangeForAdd ? (
        // Date Range Add
        <View style={styles.formGroup}>
          <ThemedText style={styles.formLabel}>Exception Date Range</ThemedText>
          <ThemedText style={styles.dateHelpText}>
            Enter start and end dates to add the exception for all dates in this range
          </ThemedText>
          
          <View style={styles.dateRangeContainer}>
            <View style={styles.dateRangeInput}>
              <ThemedText style={styles.dateRangeLabel}>Start Date:</ThemedText>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color={Theme.colors.text.secondary} style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  value={addStartDateText}
                  onChangeText={handleAddStartDateChange}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={Theme.colors.text.tertiary}
                />
              </View>
            </View>
            
            <View style={styles.dateRangeInput}>
              <ThemedText style={styles.dateRangeLabel}>End Date:</ThemedText>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color={Theme.colors.text.secondary} style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  value={addEndDateText}
                  onChangeText={handleAddEndDateChange}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={Theme.colors.text.tertiary}
                />
              </View>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.formLabel}>Exception Type</ThemedText>
            <View style={styles.typeOptions}>
              <TouchableOpacity 
                style={[
                  styles.typeOption,
                  exceptionType === 'no_service' && styles.selectedTypeOption
                ]}
                onPress={() => setExceptionType('no_service')}
              >
                <ThemedText 
                  style={[
                    styles.typeText, 
                    exceptionType === 'no_service' && styles.selectedTypeText
                  ]}
                >
                  No Service
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeOption,
                  exceptionType === 'special_service' && styles.selectedTypeOption
                ]}
                onPress={() => setExceptionType('special_service')}
              >
                <ThemedText 
                  style={[
                    styles.typeText, 
                    exceptionType === 'special_service' && styles.selectedTypeText
                  ]}
                >
                  Special Service
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.formLabel}>Reason (Optional)</ThemedText>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Enter reason for exception (e.g., Holiday, Snow Day)"
              placeholderTextColor={Theme.colors.text.tertiary}
              multiline={true}
              numberOfLines={2}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.applyButton, isApplying && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <ThemedText style={styles.applyButtonText}>Applying...</ThemedText>
            ) : (
              <>
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.applyButtonText}>
                  Apply to All Routes
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Single Date Add
        <View style={styles.formGroup}>
          <ThemedText style={styles.formLabel}>Exception Date</ThemedText>
          <View style={styles.dateInputContainer}>
            <Calendar size={16} color={Theme.colors.text.secondary} style={styles.dateIcon} />
            <TextInput
              style={styles.dateInput}
              value={dateText}
              onChangeText={handleDateChange}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={Theme.colors.text.tertiary}
            />
          </View>
          <ThemedText style={styles.dateHelpText}>
            Enter date in MM/DD/YYYY format
          </ThemedText>
        
          <View style={styles.formGroup}>
            <ThemedText style={styles.formLabel}>Exception Type</ThemedText>
            <View style={styles.typeOptions}>
              <TouchableOpacity 
                style={[
                  styles.typeOption,
                  exceptionType === 'no_service' && styles.selectedTypeOption
                ]}
                onPress={() => setExceptionType('no_service')}
              >
                <ThemedText 
                  style={[
                    styles.typeText, 
                    exceptionType === 'no_service' && styles.selectedTypeText
                  ]}
                >
                  No Service
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.typeOption,
                  exceptionType === 'special_service' && styles.selectedTypeOption
                ]}
                onPress={() => setExceptionType('special_service')}
              >
                <ThemedText 
                  style={[
                    styles.typeText, 
                    exceptionType === 'special_service' && styles.selectedTypeText
                  ]}
                >
                  Special Service
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <ThemedText style={styles.formLabel}>Reason (Optional)</ThemedText>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="Enter reason for exception (e.g., Holiday, Snow Day)"
              placeholderTextColor={Theme.colors.text.tertiary}
              multiline={true}
              numberOfLines={2}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.applyButton, isApplying && styles.applyButtonDisabled]}
            onPress={handleApply}
            disabled={isApplying}
          >
            {isApplying ? (
              <ThemedText style={styles.applyButtonText}>Applying...</ThemedText>
            ) : (
              <>
                <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.applyButtonText}>
                  Apply to All Routes
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Render the Delete Exception tab content
  const renderDeleteExceptionTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.formGroup}>
        <View style={styles.addTypeToggle}>
          <TouchableOpacity 
            style={[styles.addTypeButton, !useRangeForDelete && styles.addTypeButtonActive]}
            onPress={() => toggleDateRange(false, false)}
          >
            <ThemedText style={[
              styles.addTypeButtonText,
              !useRangeForDelete && styles.addTypeButtonTextActive
            ]}>Single Date</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.addTypeButton, useRangeForDelete && styles.addTypeButtonActive]}
            onPress={() => toggleDateRange(false, true)}
          >
            <ThemedText style={[
              styles.addTypeButtonText,
              useRangeForDelete && styles.addTypeButtonTextActive
            ]}>Date Range</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
      
      {useRangeForDelete ? (
        // Date Range Delete
        <View style={styles.formGroup}>
          <ThemedText style={styles.formLabel}>Delete by Date Range</ThemedText>
          <ThemedText style={styles.dateHelpText}>
            Enter start and end dates to delete all exceptions in this date range
          </ThemedText>
          
          <View style={styles.dateRangeContainer}>
            <View style={styles.dateRangeInput}>
              <ThemedText style={styles.dateRangeLabel}>Start Date:</ThemedText>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color={Theme.colors.text.secondary} style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  value={startDateText}
                  onChangeText={handleStartDateChange}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={Theme.colors.text.tertiary}
                />
              </View>
            </View>
            
            <View style={styles.dateRangeInput}>
              <ThemedText style={styles.dateRangeLabel}>End Date:</ThemedText>
              <View style={styles.dateInputContainer}>
                <Calendar size={16} color={Theme.colors.text.secondary} style={styles.dateIcon} />
                <TextInput
                  style={styles.dateInput}
                  value={endDateText}
                  onChangeText={handleEndDateChange}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={Theme.colors.text.tertiary}
                />
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteByDateRange}
            disabled={isDeletingByDateRange}
          >
            {isDeletingByDateRange ? (
              <ThemedText style={styles.deleteButtonText}>Deleting...</ThemedText>
            ) : (
              <>
                <Trash2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.deleteButtonText}>
                  Delete Exceptions in Date Range
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Single Date Delete
        <View style={styles.formGroup}>
          <ThemedText style={styles.formLabel}>Delete by Specific Date</ThemedText>
          <View style={styles.dateInputContainer}>
            <Calendar size={16} color={Theme.colors.text.secondary} style={styles.dateIcon} />
            <TextInput
              style={styles.dateInput}
              value={deleteDateText}
              onChangeText={handleDeleteDateChange}
              placeholder="MM/DD/YYYY"
              placeholderTextColor={Theme.colors.text.tertiary}
            />
          </View>
          <ThemedText style={styles.dateHelpText}>
            Enter date in MM/DD/YYYY format to delete all exceptions on this day
          </ThemedText>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteByDate}
            disabled={isDeletingByDate}
          >
            {isDeletingByDate ? (
              <ThemedText style={styles.deleteButtonText}>Deleting...</ThemedText>
            ) : (
              <>
                <Trash2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.deleteButtonText}>
                  Delete Exceptions on this Date
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // Custom Confirmation Modal
  const renderConfirmationModal = () => {
    return (
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContainer}>
            <ThemedText style={styles.confirmModalTitle}>{confirmModalTitle}</ThemedText>
            <ThemedText style={styles.confirmModalMessage}>{confirmModalMessage}</ThemedText>
            
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity
                style={styles.confirmModalCancelButton}
                onPress={() => setConfirmModalVisible(false)}
              >
                <ThemedText style={styles.confirmModalCancelText}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmModalConfirmButton,
                  { backgroundColor: confirmModalButtonColor }
                ]}
                onPress={async () => {
                  setConfirmModalVisible(false);
                  try {
                    await confirmModalAction();
                  } catch (error) {
                    console.error('Error in confirmation action:', error);
                  }
                }}
              >
                <ThemedText style={styles.confirmModalConfirmText}>
                  {confirmModalButtonText}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
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
              Route Exceptions Manager
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={Theme.colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.formDescription}>
            <ThemedText style={styles.formDescriptionText}>
              Manage exceptions for holidays, school closures, or other events that affect all routes.
            </ThemedText>
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'add' && styles.activeTabButton]}
              onPress={() => switchTab('add')}
            >
              <Plus size={16} color={activeTab === 'add' ? Theme.colors.primary : Theme.colors.text.secondary} style={{ marginRight: 6 }} />
              <ThemedText style={[styles.tabButtonText, activeTab === 'add' && styles.activeTabButtonText]}>
                Add Exception
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'delete' && styles.activeTabButton]}
              onPress={() => switchTab('delete')}
            >
              <Trash2 size={16} color={activeTab === 'delete' ? Theme.colors.error : Theme.colors.text.secondary} style={{ marginRight: 6 }} />
              <ThemedText style={[styles.tabButtonText, activeTab === 'delete' && styles.activeTabButtonText]}>
                Delete Exceptions
              </ThemedText>
            </TouchableOpacity>
          </View>
          
          {/* Tab Content */}
          {activeTab === 'add' ? renderAddExceptionTab() : renderDeleteExceptionTab()}
          
          {/* Existing Exceptions Section */}
          {existingExceptions.length > 0 && (
            <View style={styles.existingExceptionsSection}>
              <View style={styles.existingExceptionsHeader}>
                <ThemedText style={styles.sectionTitle}>Existing Exceptions</ThemedText>
              </View>
              <ScrollView style={styles.exceptionsListContainer}>
                <View style={styles.exceptionsList}>
                  {existingExceptions.map((exception, index) => (
                    <View key={index} style={styles.exceptionItem}>
                      <View style={styles.exceptionContent}>
                        <View style={[
                          styles.exceptionTypeBadge,
                          exception.type === 'no_service' ? styles.noServiceBadge : styles.specialServiceBadge
                        ]}>
                          <ThemedText style={styles.exceptionTypeBadgeText}>
                            {exception.type === 'no_service' ? 'No Service' : 'Special Service'}
                          </ThemedText>
                        </View>
                        <ThemedText style={styles.exceptionDate}>
                          {formatDate(exception.date)}
                        </ThemedText>
                        {exception.reason && (
                          <ThemedText style={styles.exceptionReason}>
                            {exception.reason}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        </View>
        
        {/* Custom Confirmation Modal */}
        {renderConfirmationModal()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: Platform.OS === 'web' ? 'fixed' : undefined,
    top: Platform.OS === 'web' ? 0 : undefined,
    left: Platform.OS === 'web' ? 0 : undefined,
    right: Platform.OS === 'web' ? 0 : undefined,
    bottom: Platform.OS === 'web' ? 0 : undefined,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
  modalContainer: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  formDescription: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formDescriptionText: {
    fontSize: 14,
    color: Theme.colors.text.secondary,
    marginBottom: 16,
  },
  // Tabs styling
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
    marginHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: Theme.colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  activeTabButtonText: {
    color: Theme.colors.primary,
  },
  // Content styling
  tabContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
    marginBottom: 8,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.tertiary,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? {
      borderColor: 'transparent',
    } : {})
  },
  dateIcon: {
    marginRight: 8,
  },
  dateInput: {
    flex: 1,
    height: 40,
    color: Theme.colors.text.primary,
    fontSize: 14,
    ...(Platform.OS === 'web' ? {
      borderWidth: 0,
      borderColor: 'transparent',
    } : {
      borderWidth: 0,
    })
  },
  dateHelpText: {
    fontSize: 12,
    color: Theme.colors.text.tertiary,
    marginTop: 4,
  },
  typeOptions: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background.tertiary,
  },
  selectedTypeOption: {
    backgroundColor: Theme.colors.primary,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  reasonInput: {
    backgroundColor: Theme.colors.background.tertiary,
    borderRadius: 8,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    color: Theme.colors.text.primary,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? {
      borderWidth: 0,
      borderColor: 'transparent',
    } : {
      borderWidth: 0,
    })
  },
  applyButton: {
    backgroundColor: Theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  applyButtonText: {
    color: Theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: Theme.colors.error,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: Theme.colors.text.inverse,
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.border.light,
    marginVertical: 16,
  },
  dateRangeContainer: {
    flexDirection: 'column',
    marginTop: 8,
  },
  dateRangeInput: {
    marginBottom: 12,
  },
  dateRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
    marginBottom: 8,
  },
  existingExceptionsSection: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Theme.colors.background.secondary,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  existingExceptionsHeader: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.text.primary,
  },
  exceptionsListContainer: {
    maxHeight: 200,
  },
  exceptionsList: {
    marginTop: 8,
  },
  exceptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.main,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
  },
  exceptionContent: {
    flex: 1,
  },
  exceptionTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  noServiceBadge: {
    backgroundColor: Theme.colors.error + '20', // 20% opacity
  },
  specialServiceBadge: {
    backgroundColor: Theme.colors.info + '20', // 20% opacity
  },
  exceptionTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.text.secondary,
  },
  exceptionDate: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.primary,
  },
  exceptionReason: {
    fontSize: 12,
    color: Theme.colors.text.secondary,
    marginTop: 2,
  },
  addTypeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border.light,
    overflow: 'hidden',
    marginBottom: 16,
  },
  addTypeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: Theme.colors.background.tertiary,
  },
  addTypeButtonActive: {
    backgroundColor: Theme.colors.primary,
  },
  addTypeButtonText: {
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  addTypeButtonTextActive: {
    color: Theme.colors.text.inverse,
  },
  selectedTypeText: {
    color: Theme.colors.text.inverse,
  },
  applyButtonDisabled: {
    backgroundColor: Theme.colors.primary + '80', // Add opacity to indicate disabled state
    opacity: 0.7,
  },
  // Custom confirmation modal styles
  confirmModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmModalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 600, // Much wider for visibility
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: Theme.colors.text.primary,
  },
  confirmModalMessage: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: Theme.colors.text.secondary,
    lineHeight: 24,
  },
  confirmModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  confirmModalCancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  confirmModalCancelText: {
    color: Theme.colors.text.secondary,
    fontWeight: '500',
    fontSize: 16,
  },
  confirmModalConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  confirmModalConfirmText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
});

export default RouteExceptionsModal; 