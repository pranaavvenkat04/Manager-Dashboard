import React, { memo } from 'react';
import { View, TextInput, TouchableOpacity, Platform } from 'react-native';
import { Clock } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { RouteDetailsFormProps } from '@/types/RouteTypes';
import styles, { webFocusReset } from '@/styles/RouteModalStyles';

/**
 * Route details form component
 * Handles input of route name, route key, start time, end time, and driver assignment
 */
const RouteDetailsForm = ({ 
  routeName,
  setRouteName,
  routeKey,
  setRouteKey,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  calculatedEndTime,
  estimatedDuration,
  drivers,
  selectedDriver,
  setSelectedDriver,
  fieldErrors,
  setFieldErrors
}: RouteDetailsFormProps) => {

  return (
    <View style={styles.routeDetailsSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Route Details</ThemedText>
      </View>
      
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <View style={styles.formLabelContainer}>
            <ThemedText style={styles.formLabel}>Route Name</ThemedText>
            {fieldErrors.routeName && <ThemedText style={styles.requiredLabel}>*Required</ThemedText>}
          </View>
          <View 
            style={[
              styles.formInputContainer, 
              fieldErrors.routeName && styles.inputError,
              { overflow: 'hidden' }
            ]} 
            className="input-container"
          >
            <TextInput
              style={[
                styles.formInput,
                { borderWidth: 0, borderColor: 'transparent' },
                webFocusReset,
                routeName ? { backgroundColor: '#E2E4E8' } : {}
              ]}
              value={routeName}
              onChangeText={(text) => {
                setRouteName(text);
                if (text.trim()) {
                  setFieldErrors({...fieldErrors, routeName: undefined});
                }
              }}
              placeholder="Enter route name"
              placeholderTextColor="#9CA3AF"
              selectionColor="#4361ee"
              underlineColorAndroid="transparent"
            />
          </View>
        </View>
        
        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <View style={styles.formLabelContainer}>
            <ThemedText style={styles.formLabel}>Route ID</ThemedText>
            {fieldErrors.routeKey && <ThemedText style={styles.requiredLabel}>*Required</ThemedText>}
          </View>
          <View 
            style={[
              styles.formInputContainer, 
              fieldErrors.routeKey && styles.inputError,
              { overflow: 'hidden' },
              { backgroundColor: '#D1D5DB' } // Darker gray background
            ]} 
            className="input-container"
          >
            <TextInput
              style={[
                styles.formInput,
                { 
                  borderWidth: 0, 
                  borderColor: 'transparent',
                  backgroundColor: '#D1D5DB', 
                  color: '#1F2937', 
                  fontWeight: 'bold'
                },
                webFocusReset
              ]}
              value={routeKey}
              readOnly={true}
              editable={false}
              onChangeText={(text) => {
                setRouteKey(text);
                if (text.trim()) {
                  setFieldErrors({...fieldErrors, routeKey: undefined});
                }
              }}
              placeholder="Route ID is auto-generated"
              placeholderTextColor="#6B7280"
              selectionColor="#4361ee"
              underlineColorAndroid="transparent"
            />
          </View>
        </View>
      </View>
      
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <View style={styles.formLabelContainer}>
            <ThemedText style={styles.formLabel}>Start Time</ThemedText>
            {fieldErrors.startTime && <ThemedText style={styles.requiredLabel}>*Required</ThemedText>}
          </View>
          <View 
            style={[
              styles.timeInputContainer, 
              fieldErrors.startTime && styles.inputError,
              { overflow: 'hidden' }
            ]} 
            className="input-container"
          >
            <Clock size={16} color="#6B7280" style={styles.timeIcon} />
            <TextInput
              style={[
                styles.timeInput, 
                { borderWidth: 0, borderColor: 'transparent' },
                webFocusReset,
                startTime !== '08:00 AM' ? { backgroundColor: '#E2E4E8' } : {}
              ]}
              value={startTime}
              onChangeText={(text) => {
                setStartTime(text);
                if (text.trim()) {
                  setFieldErrors({...fieldErrors, startTime: undefined});
                }
              }}
              placeholder="08:00 AM"
              placeholderTextColor="#9CA3AF"
              selectionColor="#4361ee"
              underlineColorAndroid="transparent"
            />
          </View>
        </View>
        
        <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
          <View style={styles.formLabelContainer}>
            <ThemedText style={styles.formLabel}>End Time</ThemedText>
            {fieldErrors.endTime && <ThemedText style={styles.requiredLabel}>*Required</ThemedText>}
          </View>
          <View 
            style={[
              styles.timeInputContainer, 
              fieldErrors.endTime && styles.inputError,
              { overflow: 'hidden' }
            ]} 
            className="input-container"
          >
            <Clock size={16} color="#6B7280" style={styles.timeIcon} />
            <TextInput
              style={[
                styles.timeInput, 
                { borderWidth: 0, borderColor: 'transparent' },
                webFocusReset,
                endTime !== '09:15 AM' ? { backgroundColor: '#E2E4E8' } : {}
              ]}
              value={endTime}
              onChangeText={(text) => {
                setEndTime(text);
                if (text.trim()) {
                  setFieldErrors({...fieldErrors, endTime: undefined});
                }
              }}
              placeholder="09:15 AM"
              placeholderTextColor="#9CA3AF"
              selectionColor="#4361ee"
              underlineColorAndroid="transparent"
            />
          </View>
        </View>
      </View>
      
      {/* Driver Assignment Field */}
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <ThemedText style={styles.formLabel}>Assign Driver</ThemedText>
          <View style={styles.selectContainer}>
            <select
              className="select-driver input-container"
              style={{
                width: '100%',
                height: '40px',
                padding: '0 12px',
                backgroundColor: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                color: '#1F2937',
                fontSize: '14px',
                fontWeight: '500',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24' stroke='%236B7280' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
                paddingRight: '32px',
                cursor: 'pointer',
                boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)'
              }}
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
            >
              {drivers.map((driver) => (
                <option 
                  key={driver.id} 
                  value={driver.id}
                  style={{
                    color: driver.id === 'unassigned' ? '#EF4444' : '#1F2937',
                    fontWeight: driver.id === 'unassigned' ? 'bold' : 'normal',
                    padding: '8px',
                    backgroundColor: driver.id === selectedDriver ? '#F3F4F6' : 'white'
                  }}
                >
                  {driver.name}
                </option>
              ))}
            </select>
          </View>
          <ThemedText style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
            Select a driver or leave as unassigned
          </ThemedText>
        </View>
      </View>
      
      {/* Calculated timing section */}
      {estimatedDuration > 0 && calculatedEndTime && (
        <View style={styles.timingSummary}>
          <View style={styles.timingHeader}>
            <Clock size={16} color="#6B7280" />
            <ThemedText style={styles.timingTitle}>Calculated Timings</ThemedText>
          </View>
          
          <View style={styles.timingDetails}>
            <View style={styles.timingRow}>
              <ThemedText style={styles.timingLabel}>Departure:</ThemedText>
              <ThemedText style={styles.timingValue}>{startTime}</ThemedText>
            </View>
            
            <View style={styles.timingRow}>
              <ThemedText style={styles.timingLabel}>ETA:</ThemedText>
              <ThemedText style={styles.timingValue}>{calculatedEndTime}</ThemedText>
            </View>
            
            <View style={styles.timingRow}>
              <ThemedText style={styles.timingLabel}>Est. Duration:</ThemedText>
              <ThemedText style={styles.durationText}>
                {Math.floor(estimatedDuration / 60) > 0 
                  ? `${Math.floor(estimatedDuration / 60)}h ${estimatedDuration % 60}m` 
                  : `${estimatedDuration}m`}
              </ThemedText>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Memoize to prevent unnecessary re-renders
export default memo(RouteDetailsForm);