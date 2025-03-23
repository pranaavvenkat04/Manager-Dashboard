import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Platform, 
  KeyboardAvoidingView,
  Alert,
  Animated,
} from 'react-native';
import { X } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import RouteDetailsForm from '@/components/routes/forms/RouteDetailsForm';
import RouteScheduleForm from '@/components/routes/forms/RouteScheduleForm';
import RouteMap from '@/components/routes/map/RouteMap';
import AddressSearch from '@/components/routes/search/AddressSearch';
import StopsList from '@/components/routes/stops/StopsList';

import { 
  AddressResult, 
  StopItem, 
  RouteData,
  FieldErrors,
  RouteSchedule
} from '@/types/RouteTypes';

import { validateRouteForm } from '@/utils/ValidationUtils';
import { calculateRouteTimings, fetchDrivers } from '@/utils/RouteUtils';
import styles from '@/styles/RouteModalStyles';
import {webDatepickerStyles} from '@/styles/ScheduleStyles';

interface UpdateRouteModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (routeData: RouteData) => void;
  route?: RouteData;
}

/**
 * Modal component for updating an existing route
 * Reuses the same components as AddRouteModal
 */
const UpdateRouteModal = ({ visible, onClose, onUpdate, route }: UpdateRouteModalProps) => {
  // Form state - initialized with existing route data if available
  const [routeName, setRouteName] = useState('');
  const [routeKey, setRouteKey] = useState('');
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('09:15 AM');
  const [calculatedEndTime, setCalculatedEndTime] = useState('');
  const [stops, setStops] = useState<StopItem[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [drivers, setDrivers] = useState<{id: string; name: string}[]>([]);
  
  // Schedule state
  const [schedule, setSchedule] = useState<RouteSchedule>({
    operatingDays: [1, 2, 3, 4, 5], // Monday to Friday by default
    exceptions: [],
    effectiveDates: {
      startDate: new Date(),
      endDate: undefined
    }
  });
  
  // Load route data when modal becomes visible and route data is provided
  useEffect(() => {
    if (visible && route) {
      setRouteName(route.name);
      setRouteKey(route.routeKey);
      setStartTime(route.startTime);
      setEndTime(route.endTime);
      setStops(route.stops);
      setEstimatedDuration(route.estimatedDuration || 0);
      setSelectedDriver(route.assignedDriverId || '');
      
      // Load schedule if available
      if (route.schedule) {
        setSchedule(route.schedule);
      } else {
        // Reset to default if no schedule
        setSchedule({
          operatingDays: [1, 2, 3, 4, 5],
          exceptions: [],
          effectiveDates: {
            startDate: new Date(),
            endDate: undefined
          }
        });
      }
    }
  }, [visible, route]);
  
  // Add CSS for improved styling on web
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const style = document.createElement('style');
      style.textContent = `
        .input-container:hover {
          background-color: #E2E4E8 !important;
        }
        .input-container:focus-within {
          background-color: #D1D5DB !important;
        }
        
        /* Search result styles */
        .search-option {
          padding: 12px 10px !important;
          margin: 2px 4px !important;
          border-radius: 6px !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          width: calc(100% - 8px) !important;
          box-sizing: border-box !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
        }
        
        .search-option:hover {
          background-color: #4361ee !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        }
        
        .search-option:hover * {
          color: white !important;
        }
        
        .search-option:hover svg {
          color: white !important;
          stroke: white !important;
          opacity: 1 !important;
        }
        
        /* Button hover effects */
        .updateButton {
          transition: all 0.2s ease !important;
        }
        .updateButton:hover:not(:disabled) {
          background-color: #2341CE !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        
        .cancelButton {
          transition: all 0.2s ease !important;
        }
        .cancelButton:hover {
          background-color: #E5E7EB !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Spinner animation */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        ${webDatepickerStyles}
      `;
      document.head.appendChild(style);
      
      // Cleanup on unmount
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [visible]);
  
  // Fetch drivers when modal opens
  useEffect(() => {
    if (visible) {
      fetchDrivers()
        .then(driversData => setDrivers(driversData));
    }
  }, [visible]);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);
  
  // Update calculated end time whenever stops or start time changes
  useEffect(() => {
    if (stops.length > 0 && startTime) {
      const { updatedStops, totalDuration, calculatedEndTime } = calculateRouteTimings(stops, startTime);
      setStops(updatedStops);
      setEstimatedDuration(totalDuration);
      setCalculatedEndTime(calculatedEndTime);
    }
  }, [stops.length, startTime]);
  
  // Stop selection callback
  const handleSelectAddress = useCallback((result: AddressResult) => {
    // Create a new stop from the selected address
    const newStop: StopItem = {
      id: `stop-${Date.now()}`,
      name: result.name,
      address: result.address,
      lat: result.lat,
      lng: result.lng
    };
    
    setStops(prevStops => [...prevStops, newStop]);
    
    // Clear any stops field error if we have at least 2 stops now
    if (fieldErrors.stops && (stops.length + 1) >= 2) {
      setFieldErrors(prev => ({ ...prev, stops: undefined }));
    }
  }, [stops.length, fieldErrors.stops]);
  
  // Move stop up in order
  const moveStopUp = useCallback((id: string) => {
    setStops(prevStops => {
      const index = prevStops.findIndex(stop => stop.id === id);
      if (index <= 0) return prevStops; // Can't move the first item up
      
      const newStops = [...prevStops];
      const temp = newStops[index];
      newStops[index] = newStops[index - 1];
      newStops[index - 1] = temp;
      
      return newStops;
    });
  }, []);
  
  // Move stop down in order
  const moveStopDown = useCallback((id: string) => {
    setStops(prevStops => {
      const index = prevStops.findIndex(stop => stop.id === id);
      if (index < 0 || index >= prevStops.length - 1) return prevStops; // Can't move the last item down
      
      const newStops = [...prevStops];
      const temp = newStops[index];
      newStops[index] = newStops[index + 1];
      newStops[index + 1] = temp;
      
      return newStops;
    });
  }, []);
  
  // Edit stop fields
  const editStop = useCallback((id: string, field: 'name' | 'address', value: string) => {
    setStops(prevStops => 
      prevStops.map(stop => 
        stop.id === id ? { ...stop, [field]: value } : stop
      )
    );
  }, []);
  
  // Delete stop
  const deleteStop = useCallback((id: string) => {
    setStops(prevStops => {
      const newStops = prevStops.filter(stop => stop.id !== id);
      
      // If we now have fewer than 2 stops, add the stops field error
      if (newStops.length < 2) {
        setFieldErrors(prev => ({ 
          ...prev, 
          stops: 'At least 2 stops required' 
        }));
      }
      
      return newStops;
    });
  }, []);
  
  // Reset form state
  const resetForm = () => {
    if (route) {
      // Reset to initial route data
      setRouteName(route.name);
      setRouteKey(route.routeKey);
      setStartTime(route.startTime);
      setEndTime(route.endTime);
      setStops(route.stops);
      setEstimatedDuration(route.estimatedDuration || 0);
      setSelectedDriver(route.assignedDriverId || '');
      
      // Reset schedule
      if (route.schedule) {
        setSchedule(route.schedule);
      } else {
        setSchedule({
          operatingDays: [1, 2, 3, 4, 5],
          exceptions: [],
          effectiveDates: {
            startDate: new Date(),
            endDate: undefined
          }
        });
      }
    } else {
      // Reset to empty state if no route provided
      setRouteName('');
      setRouteKey('');
      setStartTime('08:00 AM');
      setEndTime('09:15 AM');
      setCalculatedEndTime('');
      setEstimatedDuration(0);
      setStops([]);
      setSelectedDriver('');
      
      // Reset schedule to default
      setSchedule({
        operatingDays: [1, 2, 3, 4, 5],
        exceptions: [],
        effectiveDates: {
          startDate: new Date(),
          endDate: undefined
        }
      });
    }
    
    setFieldErrors({});
    setValidationErrors([]);
    setShowErrorMessage(false);
  };
  
  // Validate form and update
  const handleUpdate = () => {
    // Validate form including schedule
    const { isValid, errors, fieldErrors: newFieldErrors } = validateRouteForm(
      routeName,
      routeKey,
      startTime,
      endTime,
      stops,
      schedule
    );
    
    // Update field errors state
    setFieldErrors(newFieldErrors);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      // Show error message banner
      setShowErrorMessage(true);
      return;
    }
    
    // Create route data object including schedule
    const routeData: RouteData = {
      name: routeName,
      routeKey: routeKey,
      startTime: startTime,
      endTime: endTime || calculatedEndTime,
      stops: stops,
      estimatedDuration: estimatedDuration,
      assignedDriverId: selectedDriver,
      schedule: schedule // Include schedule data
    };
    
    // Simple mock update method
    try {
      // Show loading state
      setIsSaving(true);
      
      // Simulate network delay
      setTimeout(() => {
        // Call the update handler passed in props
        onUpdate(routeData);
        setIsSaving(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error updating route:', error);
      Alert.alert(
        'Error',
        'Failed to update route. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
      setIsSaving(false);
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.centeredView}
      >
        <View style={styles.modalView}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Update Route</ThemedText>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} className="closeButton">
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {/* Validation errors message bar */}
          {validationErrors.length > 0 && showErrorMessage && (
            <View style={styles.errorMessageBar}>
              <View style={styles.errorMessageContent}>
                <ThemedText style={styles.errorMessageText}>
                  Please correct the errors before saving
                </ThemedText>
              </View>
              <TouchableOpacity 
                style={styles.closeErrorButton} 
                onPress={() => setShowErrorMessage(false)}
                className="closeErrorButton"
              >
                <X size={18} color="#B91C1C" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Two-column layout */}
          <View style={styles.modalContent} className="modal-content">
            {/* Left column: Stops only */}
            <View style={styles.stopsColumn} className="stops-column">
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Stops Section */}
                <View style={styles.stopsSection}>
                  <View style={styles.sectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ThemedText style={styles.sectionTitle}>Stops</ThemedText>
                      {fieldErrors.stops && (
                        <ThemedText style={[styles.requiredLabel, { marginLeft: 8 }]}>
                          {fieldErrors.stops}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={styles.stopCount}>
                      {stops.length} {stops.length === 1 ? 'Stop' : 'Stops'}
                    </ThemedText>
                  </View>
                  
                  {/* Address Search */}
                  <AddressSearch 
                    onSelectAddress={handleSelectAddress}
                    fieldErrors={fieldErrors}
                  />
                  
                  {/* Stops List */}
                  <StopsList
                    stops={stops}
                    onEdit={editStop}
                    onDelete={deleteStop}
                    onMoveUp={moveStopUp}
                    onMoveDown={moveStopDown}
                    fieldErrors={fieldErrors}
                  />
                </View>
              </ScrollView>
            </View>
            
            {/* Right column: Map and Route Details */}
            <View style={styles.mapDetailsColumn}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Map at the top */}
                <RouteMap
                  stops={stops}
                  estimatedDuration={estimatedDuration}
                />
                
                {/* Route details below the map */}
                <RouteDetailsForm
                  routeName={routeName}
                  setRouteName={setRouteName}
                  routeKey={routeKey}
                  setRouteKey={setRouteKey}
                  startTime={startTime}
                  setStartTime={setStartTime}
                  endTime={endTime}
                  setEndTime={setEndTime}
                  calculatedEndTime={calculatedEndTime}
                  estimatedDuration={estimatedDuration}
                  drivers={drivers}
                  selectedDriver={selectedDriver}
                  setSelectedDriver={setSelectedDriver}
                  fieldErrors={fieldErrors}
                  setFieldErrors={setFieldErrors}
                />
                
                {/* Schedule section */}
                <RouteScheduleForm
                  schedule={schedule}
                  setSchedule={setSchedule}
                  fieldErrors={fieldErrors}
                  setFieldErrors={setFieldErrors}
                />
              </ScrollView>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSaving}
              className="cancelButton"
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleUpdate}
              disabled={isSaving}
              className="updateButton"
            >
              {isSaving ? (
                <View style={styles.savingContainer}>
                  {/* Simple loading spinner for web */}
                  <div className="spinner" style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px'
                  }}></div>
                  <ThemedText style={styles.saveButtonText}>Updating...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.saveButtonText}>Update Route</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default UpdateRouteModal;