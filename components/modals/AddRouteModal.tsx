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
import RouteMap from '@/components/routes/map/RouteMap';
import AddressSearch from '@/components/routes/search/AddressSearch';
import StopsList from '@/components/routes/stops/StopsList';

import { 
  AddRouteModalProps, 
  AddressResult, 
  StopItem, 
  RouteData,
  FieldErrors
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
    if (visible) {
      const randomKey = generateRandomRouteKey();
      setRouteKey(randomKey);
    }
  }, [visible]);
  
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
  };
  
  // Validate form and save
  const handleSave = () => {
    // Validate form
    const { isValid, errors, fieldErrors: newFieldErrors } = validateRouteForm(
      routeName,
      routeKey,
      startTime,
      endTime,
      stops
    );
    
    // Update field errors state
    setFieldErrors(newFieldErrors);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      // Show error message banner
      setShowErrorMessage(true);
      return;
    }
    
    // Create route data object
    const routeData: RouteData = {
      name: routeName,
      routeKey: routeKey,
      startTime: startTime,
      endTime: endTime || calculatedEndTime,
      stops: stops,
      estimatedDuration: estimatedDuration,
      assignedDriverId: selectedDriver
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