import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { Calendar, Plus, X } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import styles, { webFocusReset } from '@/styles/RouteModalStyles';

// Days of the week array for rendering
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

// Type definition for Schedule Exception
interface ScheduleException {
  date: Date;
  type: 'no_service' | 'special_service';
  reason?: string;
}

// Type definition for Route Schedule
interface RouteSchedule {
  operatingDays: number[]; // 0-6 for Sunday-Saturday
  exceptions: ScheduleException[];
  effectiveDates: {
    startDate: Date;
    endDate?: Date;
  };
}

// Props for the component
interface RouteScheduleFormProps {
  schedule: RouteSchedule;
  setSchedule: (schedule: RouteSchedule) => void;
  fieldErrors: any;
  setFieldErrors: (errors: any) => void;
}

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

// Check if a date is today or in the future
const isDateTodayOrFuture = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
};

/**
 * Route schedule form component
 * Handles selection of operating days, effective dates, and exceptions
 */
const RouteScheduleForm = ({
  schedule,
  setSchedule,
  fieldErrors,
  setFieldErrors
}: RouteScheduleFormProps) => {
  // State for new exception
  const [newException, setNewException] = useState<ScheduleException>({
    date: new Date(),
    type: 'no_service',
    reason: ''
  });
  
  // State for date fields text
  const [startDateText, setStartDateText] = useState(formatDate(schedule.effectiveDates.startDate));
  const [endDateText, setEndDateText] = useState(schedule.effectiveDates.endDate ? formatDate(schedule.effectiveDates.endDate) : '');
  const [exceptionDateText, setExceptionDateText] = useState(formatDate(newException.date));
  
  // Toggle a day in the operating days array
  const toggleDay = (day: number) => {
    const newOperatingDays = [...schedule.operatingDays];
    
    // Check if day is already in the array
    const index = newOperatingDays.indexOf(day);
    if (index > -1) {
      // Remove the day
      newOperatingDays.splice(index, 1);
    } else {
      // Add the day and sort
      newOperatingDays.push(day);
      newOperatingDays.sort();
    }
    
    // Update schedule
    setSchedule({
      ...schedule,
      operatingDays: newOperatingDays
    });
    
    // Clear error if at least one day is selected
    if (newOperatingDays.length > 0 && fieldErrors.operatingDays) {
      setFieldErrors({...fieldErrors, operatingDays: undefined});
    }
  };
  
  // Validate and update start date
  const handleStartDateChange = (text: string) => {
    setStartDateText(text);
    
    const date = parseDate(text);
    if (date) {
      // Valid date format, update state
      const newEffectiveDates = { ...schedule.effectiveDates, startDate: date };
      
      // If end date exists and is before the new start date, clear it
      if (newEffectiveDates.endDate && date > newEffectiveDates.endDate) {
        newEffectiveDates.endDate = undefined;
        setEndDateText('');
      }
      
      setSchedule({
        ...schedule,
        effectiveDates: newEffectiveDates
      });
      
      // Clear error
      if (fieldErrors.effectiveDates) {
        setFieldErrors({...fieldErrors, effectiveDates: undefined});
      }
    }
  };
  
  // Validate and update end date
  const handleEndDateChange = (text: string) => {
    setEndDateText(text);
    
    if (text === '') {
      // Clear end date
      setSchedule({
        ...schedule,
        effectiveDates: {
          ...schedule.effectiveDates,
          endDate: undefined
        }
      });
      return;
    }
    
    const date = parseDate(text);
    if (date) {
      // Validate that end date is not before start date
      if (date < schedule.effectiveDates.startDate) {
        Alert.alert('Invalid Date', 'End date cannot be before start date');
        return;
      }
      
      // Validate that end date is today or in the future
      if (!isDateTodayOrFuture(date)) {
        Alert.alert('Invalid Date', 'End date must be today or in the future');
        return;
      }
      
      // Valid date format and validation passed, update state
      setSchedule({
        ...schedule,
        effectiveDates: {
          ...schedule.effectiveDates,
          endDate: date
        }
      });
    }
  };
  
  // Validate and update exception date
  const handleExceptionDateChange = (text: string) => {
    setExceptionDateText(text);
    
    const date = parseDate(text);
    if (date) {
      // Valid date format, update state
      setNewException({
        ...newException,
        date: date
      });
    }
  };
  
  const handleClearEndDate = () => {
    setEndDateText('');
    setSchedule({
      ...schedule,
      effectiveDates: {
        ...schedule.effectiveDates,
        endDate: undefined
      }
    });
  };
  
  // Set end date to 30 days after start date
  const setDefaultEndDate = () => {
    const startDate = new Date(schedule.effectiveDates.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);
    
    setEndDateText(formatDate(endDate));
    setSchedule({
      ...schedule,
      effectiveDates: {
        ...schedule.effectiveDates,
        endDate: endDate
      }
    });
  };
  
  // Add an exception
  const addException = () => {
    // Validate exception date
    if (!parseDate(exceptionDateText)) {
      Alert.alert('Invalid Date', 'Please enter a valid date in MM/DD/YYYY format');
      return;
    }
    
    setSchedule({
      ...schedule,
      exceptions: [...schedule.exceptions, {...newException}]
    });
    
    // Reset the new exception form
    const resetDate = new Date();
    setNewException({
      date: resetDate,
      type: 'no_service',
      reason: ''
    });
    setExceptionDateText(formatDate(resetDate));
  };
  
  // Remove an exception
  const removeException = (index: number) => {
    const newExceptions = [...schedule.exceptions];
    newExceptions.splice(index, 1);
    
    setSchedule({
      ...schedule,
      exceptions: newExceptions
    });
  };

  return (
    <View style={scheduleStyles.scheduleSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Route Schedule</ThemedText>
      </View>
      
      {/* Operating Days */}
      <View style={styles.formGroup}>
        <View style={styles.formLabelContainer}>
          <ThemedText style={styles.formLabel}>Operating Days</ThemedText>
          {fieldErrors.operatingDays && (
            <ThemedText style={styles.requiredLabel}>*Required</ThemedText>
          )}
        </View>
        
        <View style={scheduleStyles.daysContainer}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day.value}
              style={[
                scheduleStyles.dayButton,
                schedule.operatingDays.includes(day.value) && scheduleStyles.dayButtonActive,
                fieldErrors.operatingDays && scheduleStyles.dayButtonError
              ]}
              onPress={() => toggleDay(day.value)}
            >
              <ThemedText
                style={[
                  scheduleStyles.dayText,
                  schedule.operatingDays.includes(day.value) && scheduleStyles.dayTextActive
                ]}
              >
                {day.label}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Effective Dates */}
      <View style={styles.formGroup}>
        <View style={styles.formLabelContainer}>
          <ThemedText style={styles.formLabel}>Effective Dates</ThemedText>
          {fieldErrors.effectiveDates && (
            <ThemedText style={styles.requiredLabel}>*Required</ThemedText>
          )}
        </View>
        
        <View style={styles.formRow}>
          {/* Start Date */}
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <ThemedText style={scheduleStyles.dateLabel}>Start Date</ThemedText>
            
            <View style={[styles.timeInputContainer, { overflow: 'hidden' }]}>
              <Calendar size={16} color="#6B7280" style={styles.timeIcon} />
              <TextInput
                style={[
                  styles.timeInput,
                  { flex: 1, padding: 8 },
                  webFocusReset
                ]}
                value={startDateText}
                onChangeText={handleStartDateChange}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#9CA3AF"
                selectionColor="#4361ee"
              />
            </View>
            <ThemedText style={scheduleStyles.dateHelpText}>
              Enter date in MM/DD/YYYY format
            </ThemedText>
          </View>
          
          {/* End Date (Optional) */}
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={scheduleStyles.dateLabel}>End Date</ThemedText>
              <ThemedText style={scheduleStyles.optionalLabel}>(Optional)</ThemedText>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.timeInputContainer, { flex: 1, overflow: 'hidden' }]}>
                <Calendar size={16} color="#6B7280" style={styles.timeIcon} />
                <TextInput
                  style={[
                    styles.timeInput,
                    { flex: 1, padding: 8 },
                    webFocusReset
                  ]}
                  value={endDateText}
                  onChangeText={handleEndDateChange}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#9CA3AF"
                  selectionColor="#4361ee"
                />
              </View>
              
              {endDateText ? (
                <TouchableOpacity
                  style={scheduleStyles.clearDateButton}
                  onPress={handleClearEndDate}
                >
                  <X size={14} color="#6B7280" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={scheduleStyles.setDefaultDateButton}
                  onPress={setDefaultEndDate}
                >
                  <Plus size={14} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
            <ThemedText style={scheduleStyles.dateHelpText}>
              Must be today or future date
            </ThemedText>
          </View>
        </View>
      </View>
      
      {/* Exceptions */}
      <View style={styles.formGroup}>
        <ThemedText style={styles.formLabel}>Exceptions</ThemedText>
        
        {/* Add exception form */}
        <View style={scheduleStyles.addExceptionForm}>
          <View style={styles.formRow}>
            {/* Exception Date */}
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <ThemedText style={scheduleStyles.dateLabel}>Date</ThemedText>
              
              <View style={[styles.timeInputContainer, { overflow: 'hidden' }]}>
                <Calendar size={16} color="#6B7280" style={styles.timeIcon} />
                <TextInput
                  style={[
                    styles.timeInput,
                    { flex: 1, padding: 8 },
                    webFocusReset
                  ]}
                  value={exceptionDateText}
                  onChangeText={handleExceptionDateChange}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor="#9CA3AF"
                  selectionColor="#4361ee"
                />
              </View>
            </View>
            
            {/* Exception Type */}
            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <ThemedText style={scheduleStyles.dateLabel}>Type</ThemedText>
              
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[
                    scheduleStyles.typeButton,
                    newException.type === 'no_service' && scheduleStyles.typeButtonActive
                  ]}
                  onPress={() => setNewException({...newException, type: 'no_service'})}
                >
                  <ThemedText 
                    style={[
                      scheduleStyles.typeButtonText,
                      newException.type === 'no_service' && scheduleStyles.typeButtonTextActive
                    ]}
                  >
                    No Service
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    scheduleStyles.typeButton,
                    scheduleStyles.typeButtonRight,
                    newException.type === 'special_service' && scheduleStyles.typeButtonActive
                  ]}
                  onPress={() => setNewException({...newException, type: 'special_service'})}
                >
                  <ThemedText 
                    style={[
                      scheduleStyles.typeButtonText,
                      newException.type === 'special_service' && scheduleStyles.typeButtonTextActive
                    ]}
                  >
                    Special Service
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <View style={styles.formLabelContainer}>
              <ThemedText style={scheduleStyles.dateLabel}>Reason</ThemedText>
              <ThemedText style={scheduleStyles.optionalLabel}>(Optional)</ThemedText>
            </View>
            <View style={styles.formInputContainer} className="input-container">
              <TextInput
                style={[
                  styles.formInput,
                  { borderWidth: 0, borderColor: 'transparent' },
                  webFocusReset,
                  newException.reason ? { backgroundColor: '#E2E4E8' } : {}
                ]}
                value={newException.reason || ''}
                onChangeText={(text) => setNewException({...newException, reason: text})}
                placeholder="Enter reason for exception (e.g. Holiday, School Closure)"
                placeholderTextColor="#9CA3AF"
                selectionColor="#4361ee"
                underlineColorAndroid="transparent"
              />
            </View>
          </View>
          
          {/* Add Exception Button */}
          <TouchableOpacity 
            style={scheduleStyles.addExceptionButton}
            onPress={addException}
            className="addExceptionButton"
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <ThemedText style={scheduleStyles.addExceptionText}>
              Add Exception
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        {/* Exceptions List */}
        {schedule.exceptions.length > 0 && (
          <View style={scheduleStyles.exceptionsList}>
            <ThemedText style={scheduleStyles.exceptionsHeader}>
              Added Exceptions:
            </ThemedText>
            
            {schedule.exceptions.map((exception, index) => (
              <View key={index} style={scheduleStyles.exceptionItem}>
                <View style={scheduleStyles.exceptionDetails}>
                  <View style={scheduleStyles.exceptionDate}>
                    <Calendar size={14} color="#4B5563" style={{ marginRight: 4 }} />
                    <ThemedText style={scheduleStyles.exceptionText}>
                      {formatDate(exception.date)}
                    </ThemedText>
                  </View>
                  <View style={scheduleStyles.exceptionTag}>
                    <ThemedText style={scheduleStyles.exceptionTagText}>
                      {exception.type === 'no_service' ? 'No Service' : 'Special Service'}
                    </ThemedText>
                  </View>
                  {exception.reason && (
                    <ThemedText style={scheduleStyles.exceptionReason}>
                      {exception.reason}
                    </ThemedText>
                  )}
                </View>
                <TouchableOpacity 
                  style={scheduleStyles.removeButton}
                  onPress={() => removeException(index)}
                >
                  <X size={14} color="#6B7280" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

// Separate styles specific to the schedule form
const scheduleStyles = StyleSheet.create({
  scheduleSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dayButtonActive: {
    backgroundColor: '#4361ee',
    borderColor: '#3050ee',
  },
  dayButtonError: {
    borderColor: '#EF4444',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
  },
  dayTextActive: {
    color: 'white',
  },
  dateLabel: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 6,
  },
  dateHelpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  setDefaultDateButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 14,
    color: '#4B5563',
  },
  clearDateButton: {
    padding: 8,
    marginLeft: 8,
  },
  optionalLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  addExceptionForm: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    backgroundColor: '#F9FAFB',
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    alignItems: 'center',
  },
  typeButtonRight: {
    borderLeftWidth: 0,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  typeButtonActive: {
    backgroundColor: '#4361ee',
    borderColor: '#3050ee',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#4B5563',
    textAlign: 'center',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  addExceptionButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  addExceptionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  exceptionsList: {
    marginTop: 16,
  },
  exceptionsHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  exceptionItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  exceptionDetails: {
    flex: 1,
  },
  exceptionDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  exceptionText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  exceptionTag: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  exceptionTagText: {
    fontSize: 12,
    color: '#4B5563',
  },
  exceptionReason: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  removeButton: {
    padding: 6,
  },
});

export default RouteScheduleForm;
