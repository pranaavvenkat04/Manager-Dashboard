import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Calendar, AlertCircle, Plus, X } from 'lucide-react';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  // Local state for date pickers and new exception
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showExceptionDatePicker, setShowExceptionDatePicker] = useState(false);
  
  const [newException, setNewException] = useState<ScheduleException>({
    date: new Date(),
    type: 'no_service',
    reason: ''
  });
  
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
  
  // Handle date changes
  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setSchedule({
        ...schedule,
        effectiveDates: {
          ...schedule.effectiveDates,
          startDate: selectedDate
        }
      });
      
      // Clear error
      if (fieldErrors.effectiveDates) {
        setFieldErrors({...fieldErrors, effectiveDates: undefined});
      }
    }
  };
  
  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    setSchedule({
      ...schedule,
      effectiveDates: {
        ...schedule.effectiveDates,
        endDate: selectedDate
      }
    });
  };
  
  const handleExceptionDateChange = (event: any, selectedDate?: Date) => {
    setShowExceptionDatePicker(false);
    if (selectedDate) {
      setNewException({
        ...newException,
        date: selectedDate
      });
    }
  };
  
  // Add an exception
  const addException = () => {
    setSchedule({
      ...schedule,
      exceptions: [...schedule.exceptions, {...newException}]
    });
    
    // Reset the new exception form
    setNewException({
      date: new Date(),
      type: 'no_service',
      reason: ''
    });
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
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Render custom date picker for web
  const renderWebDatePicker = (value: Date, onChange: (date: Date) => void, label: string) => {
    if (typeof document === 'undefined') return null;
    
    return (
      <div style={{
        backgroundColor: '#F3F4F6',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        width: '100%',
        boxSizing: 'border-box'
      }} 
      onClick={() => {
        const datePicker = document.createElement('input');
        datePicker.type = 'date';
        datePicker.style.position = 'absolute';
        datePicker.style.visibility = 'hidden';
        
        // Set the current value
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        datePicker.value = `${year}-${month}-${day}`;
        
        // Add event listener
        datePicker.addEventListener('change', () => {
          const newDate = new Date(datePicker.value);
          onChange(newDate);
          document.body.removeChild(datePicker);
        });
        
        // Add to body and trigger click
        document.body.appendChild(datePicker);
        datePicker.click();
      }}>
        <Calendar size={16} color="#6B7280" style={{ marginRight: 8 }} />
        <ThemedText style={{ fontSize: 14, color: '#4B5563' }}>
          {formatDate(value)}
        </ThemedText>
      </div>
    );
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
        
        <View style={[
          scheduleStyles.daysContainer,
          fieldErrors.operatingDays && styles.inputError
        ]}>
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day.value}
              style={[
                scheduleStyles.dayButton,
                schedule.operatingDays.includes(day.value) && scheduleStyles.dayButtonActive
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
            {typeof window === 'undefined' ? (
              // For native platforms
              <>
                <TouchableOpacity
                  style={[
                    scheduleStyles.datePickerButton,
                    fieldErrors.effectiveDates && styles.inputError
                  ]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Calendar size={16} color="#6B7280" style={{ marginRight: 8 }} />
                  <ThemedText style={scheduleStyles.dateText}>
                    {formatDate(schedule.effectiveDates.startDate)}
                  </ThemedText>
                </TouchableOpacity>
                
                {showStartDatePicker && (
                  <DateTimePicker
                    value={schedule.effectiveDates.startDate}
                    mode="date"
                    display="default"
                    onChange={handleStartDateChange}
                  />
                )}
              </>
            ) : (
              // For web
              renderWebDatePicker(
                schedule.effectiveDates.startDate,
                (date) => setSchedule({
                  ...schedule,
                  effectiveDates: {
                    ...schedule.effectiveDates,
                    startDate: date
                  }
                }),
                'Start Date'
              )
            )}
          </View>
          
          {/* End Date (Optional) */}
          <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <ThemedText style={scheduleStyles.dateLabel}>End Date</ThemedText>
              <ThemedText style={scheduleStyles.optionalLabel}>(Optional)</ThemedText>
            </View>
            
            {typeof window === 'undefined' ? (
              // For native platforms
              <>
                <TouchableOpacity
                  style={scheduleStyles.datePickerButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Calendar size={16} color="#6B7280" style={{ marginRight: 8 }} />
                  <ThemedText style={scheduleStyles.dateText}>
                    {schedule.effectiveDates.endDate 
                      ? formatDate(schedule.effectiveDates.endDate)
                      : 'No end date'}
                  </ThemedText>
                </TouchableOpacity>
                
                {showEndDatePicker && (
                  <DateTimePicker
                    value={schedule.effectiveDates.endDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                  />
                )}
              </>
            ) : (
              // For web
              schedule.effectiveDates.endDate ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {renderWebDatePicker(
                    schedule.effectiveDates.endDate,
                    (date) => setSchedule({
                      ...schedule,
                      effectiveDates: {
                        ...schedule.effectiveDates,
                        endDate: date
                      }
                    }),
                    'End Date'
                  )}
                  <TouchableOpacity
                    style={scheduleStyles.clearDateButton}
                    onPress={() => setSchedule({
                      ...schedule,
                      effectiveDates: {
                        ...schedule.effectiveDates,
                        endDate: undefined
                      }
                    })}
                  >
                    <X size={14} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={scheduleStyles.datePickerButton}
                  onPress={() => setSchedule({
                    ...schedule,
                    effectiveDates: {
                      ...schedule.effectiveDates,
                      endDate: new Date()
                    }
                  })}
                >
                  <Calendar size={16} color="#6B7280" style={{ marginRight: 8 }} />
                  <ThemedText style={scheduleStyles.dateText}>
                    No end date (click to set)
                  </ThemedText>
                </TouchableOpacity>
              )
            )}
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
              
              {typeof window === 'undefined' ? (
                // For native platforms
                <>
                  <TouchableOpacity
                    style={scheduleStyles.datePickerButton}
                    onPress={() => setShowExceptionDatePicker(true)}
                  >
                    <Calendar size={16} color="#6B7280" style={{ marginRight: 8 }} />
                    <ThemedText style={scheduleStyles.dateText}>
                      {formatDate(newException.date)}
                    </ThemedText>
                  </TouchableOpacity>
                  
                  {showExceptionDatePicker && (
                    <DateTimePicker
                      value={newException.date}
                      mode="date"
                      display="default"
                      onChange={handleExceptionDateChange}
                    />
                  )}
                </>
              ) : (
                // For web
                renderWebDatePicker(
                  newException.date,
                  (date) => setNewException({...newException, date}),
                  'Exception Date'
                )
              )}
            </View>
            
            {/* Exception Type */}
            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <ThemedText style={scheduleStyles.dateLabel}>Type</ThemedText>
              <View style={styles.selectContainer}>
                <select
                  className="select-exception-type"
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    backgroundColor: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    color: '#4B5563',
                    fontSize: '14px',
                    outline: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' stroke='%236B7280' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '16px',
                    paddingRight: '32px',
                    cursor: 'pointer',
                    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)'
                  }}
                  value={newException.type}
                  onChange={(e) => setNewException({
                    ...newException, 
                    type: e.target.value as 'no_service' | 'special_service'
                  })}
                >
                  <option value="no_service">No Service</option>
                  <option value="special_service">Special Service</option>
                </select>
              </View>
            </View>
          </View>
          
          {/* Reason Field */}
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
        
        {/* List of exceptions */}
        {schedule.exceptions.length > 0 ? (
          <View style={scheduleStyles.exceptionsList}>
            <ThemedText style={scheduleStyles.exceptionsHeader}>Saved Exceptions:</ThemedText>
            {schedule.exceptions.map((exception, index) => (
              <View key={index} style={scheduleStyles.exceptionItem}>
                <View style={scheduleStyles.exceptionInfo}>
                  <View style={[
                    scheduleStyles.exceptionBadge,
                    exception.type === 'no_service' ? scheduleStyles.noServiceBadge : scheduleStyles.specialServiceBadge
                  ]}>
                    <ThemedText style={scheduleStyles.exceptionBadgeText}>
                      {exception.type === 'no_service' ? 'No Service' : 'Special Service'}
                    </ThemedText>
                  </View>
                  <ThemedText style={scheduleStyles.exceptionDate}>
                    {formatDate(exception.date)}
                  </ThemedText>
                  {exception.reason && (
                    <ThemedText style={scheduleStyles.exceptionReason}>
                      Reason: {exception.reason}
                    </ThemedText>
                  )}
                </View>
                <TouchableOpacity 
                  style={scheduleStyles.removeExceptionButton}
                  onPress={() => removeException(index)}
                >
                  <X size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={scheduleStyles.noExceptionsMessage}>
            <ThemedText style={scheduleStyles.noExceptionsText}>
              No exceptions added. Use the form above to add dates when the route won't run,
              or days when it will have special service.
            </ThemedText>
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
  datePickerButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  exceptionInfo: {
    flex: 1,
  },
  exceptionBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  noServiceBadge: {
    backgroundColor: '#FEE2E2',
  },
  specialServiceBadge: {
    backgroundColor: '#DBEAFE',
  },
  exceptionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  exceptionDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  exceptionReason: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeExceptionButton: {
    padding: 8,
  },
  noExceptionsMessage: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  noExceptionsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
  }
});

export { type RouteSchedule, type ScheduleException };
export default RouteScheduleForm;