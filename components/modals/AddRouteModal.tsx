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
  AddRouteModalProps, 
  AddressResult, 
  StopItem, 
  RouteData,
  FieldErrors,
  RouteSchedule
} from '@/types/RouteTypes';

import { validateRouteForm } from '@/utils/ValidationUtils';
import { calculateRouteTimings, fetchDrivers, generateRandomRouteKey } from '@/utils/RouteUtils';
import styles from '@/styles/RouteModalStyles';

/**
 * Main modal component for adding a new route
 */
const AddRouteModal = ({ visible, onClose, onSave }: AddRouteModalProps) => {
  // Form state
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
  
  // New schedule state
  const [schedule, setSchedule] = useState<RouteSchedule>({
    operatingDays: [1, 2, 3, 4, 5], // Monday to Friday by default
    exceptions: [],
    effectiveDates: {
      startDate: new Date(),
      endDate: undefined
    }
  });
  
  // Add CSS for improved styling on web
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const style = document.createElement('style');
      style.textContent = `
        /* Make sure modals have a lower z-index than the date picker */
        .modalView {
          z-index: 10 !important;
          overflow: visible !important;
        }
        
        .modal-content {
          overflow: visible !important;
        }
        
        /* Allow calendar positioning outside the modal */
        #calendar-portal {
          z-index: 1000 !important;
        }
        
        .input-container:hover {
          background-color: #E2E4E8 !important;
        }
        .input-container:focus-within {
          background-color: #D1D5DB !important;
        }
        
        /* Date picker field styles */
        .date-picker-field {
          cursor: pointer !important;
        }
        .date-picker-field:hover {
          background-color: #E2E4E8 !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
        }
        .date-picker-field.active {
          background-color: #E2E4E8 !important;
          border: 1px solid #4361ee !important;
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
        .saveButton {
          transition: all 0.2s ease !important;
        }
        .saveButton:hover:not(:disabled) {
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
      `;
      document.head.appendChild(style);
      
      // Cleanup on unmount
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [visible]);
  
  // Generate a random route key on mount
  useEffect(() => {
    if (visible && !routeKey) {
      const randomKey = generateRandomRouteKey();
      setRouteKey(randomKey);
    }
  }, [visible, routeKey]);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    } else {
      // Fetch drivers when modal opens
      fetchDrivers()
        .then(driversData => setDrivers(driversData));
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
      
      // After reordering, recalculate ETAs
      if (startTime) {
        const { updatedStops } = calculateRouteTimings(newStops, startTime);
        return updatedStops;
      }
      
      return newStops;
    });
  }, [startTime]);
  
  // Move stop down in order
  const moveStopDown = useCallback((id: string) => {
    setStops(prevStops => {
      const index = prevStops.findIndex(stop => stop.id === id);
      if (index < 0 || index >= prevStops.length - 1) return prevStops; // Can't move the last item down
      
      const newStops = [...prevStops];
      const temp = newStops[index];
      newStops[index] = newStops[index + 1];
      newStops[index + 1] = temp;
      
      // After reordering, recalculate ETAs
      if (startTime) {
        const { updatedStops } = calculateRouteTimings(newStops, startTime);
        return updatedStops;
      }
      
      return newStops;
    });
  }, [startTime]);
  
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
    setRouteName('');
    setRouteKey('');
    setStartTime('08:00 AM');
    setEndTime('09:15 AM');
    setCalculatedEndTime('');
    setEstimatedDuration(0);
    setStops([]);
    setSelectedDriver('');
    setFieldErrors({});
    setValidationErrors([]);
    setShowErrorMessage(false);
    
    // Reset schedule to default values
    setSchedule({
      operatingDays: [1, 2, 3, 4, 5], // Monday to Friday by default
      exceptions: [],
      effectiveDates: {
        startDate: new Date(),
        endDate: undefined
      }
    });
  };
  
  // Validate form and save
  const handleSave = () => {
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
      title: routeName, // For backward compatibility
      route_key: routeKey,
      routeCode: routeKey, // For backward compatibility
      start_time: startTime,
      startTime: startTime, // For backward compatibility
      end_time: endTime || calculatedEndTime,
      endTime: endTime || calculatedEndTime, // For backward compatibility
      stops: stops.map(stop => ({
        ...stop,
        latitude: stop.lat || 0,
        longitude: stop.lng || 0,
        order: 0, // Will be set on server
        status: true,
      })),
      stops_count: stops.length,
      stopsCount: stops.length, // For backward compatibility
      estimated_duration: estimatedDuration,
      estimatedDuration: estimatedDuration, // For backward compatibility
      assigned_driver_id: selectedDriver,
      assignedDriverId: selectedDriver, // For backward compatibility
      schedule: schedule  // Include schedule data
    };
    
    // Simple mock save method
    try {
      // Show loading state
      setIsSaving(true);
      
      // Simulate network delay
      setTimeout(() => {
        // Call the save handler passed in props
        onSave(routeData);
        setIsSaving(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error saving route:', error);
      Alert.alert(
        'Error',
        'Failed to save route. Please try again.',
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
            <ThemedText style={styles.modalTitle}>Add New Route</ThemedText>
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
              onPress={handleSave}
              disabled={isSaving}
              className="saveButton"
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
                  <ThemedText style={styles.saveButtonText}>Saving...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.saveButtonText}>Save Route</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddRouteModal;
