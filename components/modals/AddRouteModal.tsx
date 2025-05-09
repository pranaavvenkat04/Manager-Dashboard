import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Platform, 
  KeyboardAvoidingView,
  Alert,
  Animated,
  ActivityIndicator
} from 'react-native';
import { X, MapPin } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import RouteDetailsForm from '@/components/routes/forms/RouteDetailsForm';
import RouteScheduleForm from '@/components/routes/forms/RouteScheduleForm';
import SimpleRouteMap from '@/components/routes/map/SimpleRouteMap';
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
import { calculateRouteTimings, fetchDrivers, generateRandomRouteKey, updateDriverRoutes } from '@/utils/RouteUtils';
import { debounce } from '@/utils/GoogleMapsUtils';
import styles from '@/styles/RouteModalStyles';
import { Theme } from '@/constants/Colors';

/**
 * Main modal component for adding a new route
 */
const AddRouteModal = ({ visible, onClose, onSave }: AddRouteModalProps) => {
  // Form state
  const [routeName, setRouteName] = useState('');
  const [routeKey, setRouteKey] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
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
  const [mapKey, setMapKey] = useState(`map-${Date.now()}`); // Add a unique key for the map
  const [isMapVisible, setIsMapVisible] = useState(false);
  const mapUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMapUpdateTimeRef = useRef(0);
  
  // New schedule state
  const [schedule, setSchedule] = useState<RouteSchedule>({
    operatingDays: [1, 2, 3, 4, 5], // Monday to Friday by default
    exceptions: [],
    effectiveDates: {
      startDate: new Date(),
      endDate: undefined
    }
  });
  
  // Add ref to store previous stops configuration
  const prevStopsConfigRef = useRef('');
  const calculationInProgressRef = useRef(false);
  
  // Track initial loading
  const [initialLoading, setInitialLoading] = useState(false);
  
  // Track map rendering to avoid double renders
  const mapRenderLockRef = useRef(false);
  
  // Debounced route timing calculation to avoid too many API calls
  const debouncedUpdateRouteTimings = useCallback(
    debounce(async (stopsArray: StopItem[], startTimeValue: string) => {
      // Prevent concurrent calculations
      if (calculationInProgressRef.current) {
        console.log('Calculation already in progress, waiting...');
        return;
      }
      
      calculationInProgressRef.current = true;
      console.log('Starting route timing calculation...');
      
      try {
        console.log('Calculating route timings for', stopsArray.length, 'stops');
        
        // First ensure ALL ETAs show pending state, including the first stop
        setStops(current => {
          return current.map(stop => ({
            ...stop,
            eta: '---'
          }));
        });
        
        // Then calculate actual values
        const result = await calculateRouteTimings(stopsArray, startTimeValue);
        
        // Important: use functional update to avoid state update loops
        setStops(current => {
          // Make sure stop order/IDs match to avoid incorrect ETA assignments
          if (current.length === result.updatedStops.length && 
              current.every((stop, i) => stop.id === result.updatedStops[i].id)) {
            return result.updatedStops;
          } else {
            console.warn('Stop order changed during calculation, assigning ETAs carefully');
            // Stops order changed during calculation, carefully assign ETAs
            return current.map(currentStop => {
              const matchingResultStop = result.updatedStops.find(s => s.id === currentStop.id);
              return matchingResultStop ? 
                {...currentStop, eta: matchingResultStop.eta} : 
                currentStop;
            });
          }
        });
        
        setEstimatedDuration(result.totalDuration);
        setCalculatedEndTime(result.calculatedEndTime);
      } catch (error) {
        console.error('Error calculating route timings:', error);
      } finally {
        // Add a small delay to prevent rapid recalculations
        setTimeout(() => {
          calculationInProgressRef.current = false;
          console.log('Route timing calculation complete, calculation lock released');
        }, 500);
        
        // Always ensure initialLoading is set to false after calculations
        setInitialLoading(false);
      }
    }, 1200), // Slightly reduced debounce time for better responsiveness
    []
  );
  
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
          position: relative !important;
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
        
        /* Map action buttons */
        .mapAction {
          transition: all 0.2s ease !important;
          cursor: pointer !important;
        }
        .mapAction:hover {
          background-color: #E2E4E8 !important;
          transform: translateY(-1px) !important;
        }
        
        /* Map styles */
        .google-maps-container {
          transition: all 0.3s ease !important;
        }
        
        /* Expanded map styles */
        .mapSectionExpanded {
          z-index: 100 !important;
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
      // Generate a random route code in the format RTXXXX where XXXX are 4 random numbers
      const randomNumbers = Math.floor(1000 + Math.random() * 9000); // 4 digit number between 1000-9999
      const generatedRouteCode = `RT${randomNumbers}`;
      setRouteKey(generatedRouteCode);
    }
  }, [visible, routeKey]);
  
  // Improve initialization to reduce flashing
  useEffect(() => {
    if (!visible) {
      resetForm();
      setIsMapVisible(false);
      setInitialLoading(false);
      mapRenderLockRef.current = false; // Reset render lock
      
      // Reset saving state when modal is closed
      setIsSaving(false);
      
      // Clear any pending map updates
      if (mapUpdateTimeoutRef.current) {
        clearTimeout(mapUpdateTimeoutRef.current);
      }
    } else {
      // Reset render lock before new modal opens
      mapRenderLockRef.current = false;
      
      // Ensure we're not in saving state when modal opens
      setIsSaving(false);
      
      // Fetch drivers when modal opens
      fetchDrivers()
        .then(driversData => setDrivers(driversData));
      
      // Use a more efficient approach for showing the map
      const timer = setTimeout(() => {
        // Show map if we have stops - simplify logic
        if (stops.length > 0) {
          // Set lock to prevent double rendering
          mapRenderLockRef.current = true;
          setMapKey(`map-initial-${Date.now()}`);
          setIsMapVisible(true);
          
          // Release lock after a delay
          setTimeout(() => {
            mapRenderLockRef.current = false;
          }, 1000);
        } else {
          setIsMapVisible(false);
        }
        // Always ensure we're not in loading state after initialization
        setInitialLoading(false);
      }, 800); // Reduced delay for smoother experience
      
      return () => clearTimeout(timer);
    }
  }, [visible]);
  
  // Add separate effect just to toggle map visibility based on stops
  useEffect(() => {
    // Skip if modal is not visible or we're already handling map rendering
    if (!visible || mapRenderLockRef.current) return;
    
    if (stops.length > 0) {
      // Set the lock to prevent multiple renders
      mapRenderLockRef.current = true;
      
      // Use timeout to batch visibility changes
      setTimeout(() => {
        setIsMapVisible(true);
        // Release the lock after a delay
        setTimeout(() => {
          mapRenderLockRef.current = false;
        }, 1000);
      }, 50);
    } else {
      setIsMapVisible(false);
    }
  }, [stops.length, visible]);
  
  // Function to safely update map key with debouncing
  const updateMapKey = useCallback((reason: string) => {
    const now = Date.now();
    
    // If we've updated recently, use a timeout
    if (now - lastMapUpdateTimeRef.current < 2000) {
      if (mapUpdateTimeoutRef.current) {
        clearTimeout(mapUpdateTimeoutRef.current);
      }
      
      mapUpdateTimeoutRef.current = setTimeout(() => {
        lastMapUpdateTimeRef.current = Date.now();
        setMapKey(`map-${reason}-${Date.now()}`);
        mapUpdateTimeoutRef.current = null;
      }, 2000);
    } else {
      // Otherwise update immediately
      lastMapUpdateTimeRef.current = now;
      setMapKey(`map-${reason}-${now}`);
    }
  }, []);
  
  // Update map less frequently - only when stops significantly change
  useEffect(() => {
    // Only update if the modal is visible and we've already initialized the map
    if (visible && isMapVisible) {
      // Calculate a signature based on stop IDs and coordinates
      const stopsSignature = stops.map(stop => `${stop.id}:${stop.lat},${stop.lng}`).join('|');
      
      // Create a hash code for this signature
      let hash = 0;
      for (let i = 0; i < stopsSignature.length; i++) {
        hash = ((hash << 5) - hash) + stopsSignature.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      
      // Only update map key when the signature changes significantly
      updateMapKey(`stops-${stops.length}-${hash.toString().slice(-4)}`);
    }
  }, [stops.length, visible, isMapVisible, updateMapKey]);
  
  // Update calculated end time only when stops or start time changes significantly
  useEffect(() => {
    // Only calculate if we have at least 2 stops and a valid start time
    if (stops.length >= 2 && startTime) {
      // Create a stops signature to detect actual changes in stops data
      const stopsSignature = stops.map(stop => `${stop.id}|${stop.lat}|${stop.lng}`).join('-');
      
      // Skip if configuration hasn't changed
      if (stopsSignature === prevStopsConfigRef.current) {
        return;
      }
      
      // Update the reference
      prevStopsConfigRef.current = stopsSignature;
      
      // Use the debounced function for calculation
      debouncedUpdateRouteTimings(stops, startTime);
    }
  }, [stops, startTime, debouncedUpdateRouteTimings]);
  
  // Stop selection callback
  const handleSelectAddress = useCallback((result: AddressResult) => {
    setStops(prevStops => {
      // Add the new stop
      const newStops = [
        ...prevStops, 
        {
          id: `stop-${Date.now()}`,
          name: result.name,
          address: result.address,
          lat: result.lat,
          lng: result.lng,
          eta: '---' // Mark new stop ETA as pending
        }
      ];
      
      // Mark all ETAs (except first) as pending recalculation when adding a new stop
      return newStops.map((stop, idx) => ({
        ...stop,
        eta: idx === 0 ? stop.eta : '---'
      }));
    });
    
    // Clear any stops field error if we have at least 2 stops now
    if (fieldErrors.stops && (stops.length + 1) >= 2) {
      setFieldErrors(prev => ({ ...prev, stops: undefined }));
    }
  }, [stops.length, fieldErrors.stops]);
  
  // Handle stop drag on map
  const handleStopDrag = useCallback((stopId: string, update: { lat: number; lng: number; address: string }) => {
    setStops(prevStops => 
      prevStops.map(stop => 
        stop.id === stopId ? { 
          ...stop, 
          lat: update.lat, 
          lng: update.lng,
          address: update.address
        } : stop
      )
    );
  }, []);
  
  // Handle map click to add a stop
  const handleMapClick = useCallback((newStop: StopItem) => {
    setStops(prevStops => {
      // Add the new stop with pending ETA
      const stopWithPendingETA = {
        ...newStop,
        eta: '---' // Mark as pending
      };
      
      const newStops = [...prevStops, stopWithPendingETA];
      
      // Mark all ETAs (except first) as pending recalculation
      return newStops.map((stop, idx) => ({
        ...stop,
        eta: idx === 0 ? stop.eta : '---'
      }));
    });
    
    // Clear any stops field error if we have at least 2 stops now
    if (fieldErrors.stops && (stops.length + 1) >= 2) {
      setFieldErrors(prev => ({ ...prev, stops: undefined }));
    }
  }, [stops.length, fieldErrors.stops]);
  
  // Move stop up in order
  const moveStopUp = useCallback((id: string) => {
    // Prevent rapid consecutive moves that could cause glitches
    if (calculationInProgressRef.current) {
      console.log('Calculation in progress, skipping move up');
      return;
    }
    
    setStops(prevStops => {
      const index = prevStops.findIndex(stop => stop.id === id);
      if (index <= 0) return prevStops; // Can't move the first item up
      
      // Create new array with swapped elements
      const newStops = [...prevStops];
      
      // Get the two stops being swapped
      const movingStop = newStops[index];
      const otherStop = newStops[index - 1];
      
      // Swap the stops
      newStops[index] = otherStop;
      newStops[index - 1] = movingStop;
      
      // Mark ALL ETAs as pending recalculation, including the first stop
      const stopsWithPendingETAs = newStops.map(stop => ({
        ...stop,
        eta: '---' // Mark ALL stops with pending ETA
      }));
      
      // Force map update with a new key when order changes
      updateMapKey(`reorder-${Date.now()}`);
      
      return stopsWithPendingETAs;
    });
  }, [updateMapKey]);
  
  // Move stop down in order
  const moveStopDown = useCallback((id: string) => {
    // Prevent rapid consecutive moves that could cause glitches
    if (calculationInProgressRef.current) {
      console.log('Calculation in progress, skipping move down');
      return;
    }
    
    setStops(prevStops => {
      const index = prevStops.findIndex(stop => stop.id === id);
      if (index < 0 || index >= prevStops.length - 1) return prevStops; // Can't move the last item down
      
      // Create new array with swapped elements
      const newStops = [...prevStops];
      
      // Get the two stops being swapped
      const movingStop = newStops[index];
      const otherStop = newStops[index + 1];
      
      // Swap the stops
      newStops[index] = otherStop;
      newStops[index + 1] = movingStop;
      
      // Mark ALL ETAs as pending recalculation, including the first stop
      const stopsWithPendingETAs = newStops.map(stop => ({
        ...stop,
        eta: '---' // Mark ALL stops with pending ETA
      }));
      
      // Force map update with a new key when order changes
      updateMapKey(`reorder-${Date.now()}`);
      
      return stopsWithPendingETAs;
    });
  }, [updateMapKey]);
  
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
      console.log(`AddRouteModal: Deleting stop with ID: ${id}`);
      // Make sure we can delete any stop, including the first one
      const newStops = prevStops.filter(stop => stop.id !== id);
      
      // If we now have fewer than 2 stops, add the stops field error
      if (newStops.length < 2) {
        setFieldErrors(prev => ({ 
          ...prev, 
          stops: 'At least 2 stops required' 
        }));
      }
      
      // Set render lock to prevent flickering
      mapRenderLockRef.current = true;
      
      // Handle the case when all stops are deleted
      if (newStops.length === 0) {
        console.log('All stops deleted, hiding map');
        setIsMapVisible(false);
        // Clear any pending map updates
        if (mapUpdateTimeoutRef.current) {
          clearTimeout(mapUpdateTimeoutRef.current);
        }
      } else {
        // Make sure map is visible if we still have stops
        setIsMapVisible(true);
        // Update with debouncing
        updateMapKey(`delete-${newStops.length}`);
      }
      
      // Release render lock after a delay
      setTimeout(() => {
        mapRenderLockRef.current = false;
      }, 800);
      
      return newStops;
    });
  }, [updateMapKey]);
  
  // Update UI to show map only when stops exist
  useEffect(() => {
    // This is a safety check to ensure map visibility matches stops count
    const shouldBeVisible = stops.length > 0 && visible;
    
    console.log('Update UI effect - stops:', stops.length, 'should be visible:', shouldBeVisible, 'is visible:', isMapVisible);
    
    if (!shouldBeVisible && isMapVisible) {
      console.log('Hiding map because there are no stops');
      setIsMapVisible(false);
    } else if (shouldBeVisible && !isMapVisible) {
      console.log('Showing map because we have stops');
      setIsMapVisible(true);
      // Force a map update
      updateMapKey(`visibility-change-${Date.now()}`);
    }
  }, [stops.length, isMapVisible, visible, updateMapKey]);
  
  // Reset form state
  const resetForm = () => {
    setRouteName('');
    setRouteKey('');
    setRouteDescription('');
    setStartTime('08:00 AM');
    setEndTime('09:15 AM');
    setCalculatedEndTime('');
    setEstimatedDuration(0);
    setStops([]);
    setSelectedDriver('');
    setFieldErrors({});
    setValidationErrors([]);
    setShowErrorMessage(false);
    setIsSaving(false); // Reset saving state
    
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
    // Required fields validation
    const requiredFieldErrors: FieldErrors = {};
    const errors: string[] = [];
    
    // Validate route name
    if (!routeName.trim()) {
      requiredFieldErrors.routeName = 'Required';
      errors.push('Route name is required');
    }
    
    // Don't validate route key - it will be auto-generated on the server
    
    // Validate start time
    if (!startTime.trim()) {
      requiredFieldErrors.startTime = 'Required';
      errors.push('Start time is required');
    }
    
    // Validate end time
    if (!endTime.trim() && !calculatedEndTime) {
      requiredFieldErrors.endTime = 'Required';
      errors.push('End time is required');
    }
    
    // Validate stops (require at least 2 stops)
    if (stops.length < 2) {
      requiredFieldErrors.stops = 'At least 2 stops required';
      errors.push('A route must have at least 2 stops');
    }
    
    // Check if any stops have empty fields
    const invalidStop = stops.find(stop => !stop.name.trim() || !stop.address.trim());
    if (invalidStop) {
      errors.push('All stops must have a name and address');
    }
    
    // Check if all stops have lat/lng
    const noLocationStop = stops.find(stop => stop.lat === null || stop.lng === null);
    if (noLocationStop) {
      errors.push(`The stop "${noLocationStop.name}" has no location data`);
    }
    
    // Validate schedule if provided
    const { isValid, errors: scheduleErrors, fieldErrors: scheduleFieldErrors } = validateRouteForm(
      routeName,
      routeKey,
      startTime,
      endTime,
      stops,
      schedule
    );
    
    // Update field errors state
    setFieldErrors({...requiredFieldErrors, ...scheduleFieldErrors});
    setValidationErrors([...errors, ...scheduleErrors]);
    
    if (errors.length > 0 || scheduleErrors.length > 0) {
      // Show error message banner
      setShowErrorMessage(true);
      return;
    }
    
    // Create route data object including schedule
    const routeData: RouteData = {
      // Primary fields needed by Firestore
      title: routeName, // Main field for route name
      route_code: routeKey, // Main field for route code
      
      // Keep these for backward compatibility
      name: routeName,
      routeCode: routeKey,
      
      // Time fields
      start_time: startTime,
      startTime: startTime,
      end_time: endTime || calculatedEndTime,
      endTime: endTime || calculatedEndTime,
      
      // Description
      description: routeDescription,
      
      // Stops
      stops: stops.map(stop => ({
        ...stop,
        latitude: stop.lat || 0,
        longitude: stop.lng || 0,
        order: 0, // Will be set on server
        status: true,
      })),
      stops_count: stops.length,
      stopsCount: stops.length,
      
      // Duration
      estimated_duration: estimatedDuration,
      estimatedDuration: estimatedDuration,
      
      // Driver
      assigned_driver_id: selectedDriver,
      assignedDriverId: selectedDriver,
      
      // Other data
      schedule: schedule,
      active: true,
      soft_delete: false
    };
    
    // Debug log for stops data
    console.log(`Saving route with ${stops.length} stops`);
    if (stops.length > 0) {
      console.log('First stop sample:', JSON.stringify({
        id: stops[0].id,
        name: stops[0].name,
        lat: stops[0].lat,
        lng: stops[0].lng
      }));
    }
    
    try {
      // Show loading state
      setIsSaving(true);
      
      // Call the save handler passed in props
      onSave(routeData);
      
      // Note: We don't reset isSaving state here since the modal will be closed by the parent component
      // The state will be reset when the modal is reopened due to the resetForm call in the visibility effect
    } catch (error) {
      console.error('Error saving route:', error);
      Alert.alert(
        'Error',
        'Failed to save route. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
      // Reset saving state on error
      setIsSaving(false);
    }
  };
  
  // Add memoized map component to prevent unnecessary re-renders
  const memoizedMap = React.useMemo(() => {
    // Skip rendering if we're in a render lock period
    if (!isMapVisible || stops.length === 0 || mapRenderLockRef.current) {
      console.log('Map not rendered - visible:', isMapVisible, 'stops:', stops.length, 'lock:', mapRenderLockRef.current);
      return null;
    }
    
    console.log('Rendering map with', stops.length, 'stops, key:', mapKey);
    return (
      <SimpleRouteMap
        key={mapKey}
        stops={stops}
        height={345}
        showHeader={false}
      />
    );
  }, [isMapVisible, stops, mapKey]);
  
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
              <X size={24} color={Theme.colors.text.secondary} />
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
                <X size={18} color={Theme.colors.error} />
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
                  <View style={[styles.sectionHeader, {paddingHorizontal: 0}]}>
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
                {/* Section Title - always visible */}
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ThemedText style={styles.sectionTitle}>Route Map</ThemedText>
                  </View>
                </View>
                
                {/* Map at the top */}
                <View>
                  {memoizedMap || (
                    <View style={{
                      height: 345, // Keeping consistent with the map height
                      backgroundColor: '#FFFFFF',
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 16
                    }}>
                      {stops.length === 0 ? (
                        <>
                          <MapPin size={24} color="#4B5563" />
                          <ThemedText style={{marginTop: 12, color: '#4B5563'}}>Add stops to display the route</ThemedText>
                        </>
                      ) : (
                        <>
                          <ActivityIndicator size="large" color="#4361ee" />
                          <ThemedText style={{marginTop: 12, color: '#4B5563'}}>Loading map...</ThemedText>
                        </>
                      )}
                    </View>
                  )}
                </View>
                
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
                  isRouteKeyEditable={false}
                  routeDescription={routeDescription}
                  setRouteDescription={setRouteDescription}
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
            <View style={{ flex: 1 }}></View>
            <View style={styles.rightButtons}>
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
                    {/* Replace div spinner with ActivityIndicator */}
                    {Platform.OS === 'web' ? (
                      <ActivityIndicator size="small" color="#ffffff" style={{marginRight: 8}} />
                    ) : (
                      <ActivityIndicator size="small" color="#ffffff" style={{marginRight: 8}} />
                    )}
                    <ThemedText style={styles.saveButtonText}>Saving...</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.saveButtonText}>Save Route</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AddRouteModal;
