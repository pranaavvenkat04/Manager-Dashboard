import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { 
  View, 
  Modal, 
  TouchableOpacity, 
  ScrollView,
  Platform, 
  KeyboardAvoidingView,
  Alert,
  Animated,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { X, Trash2, ChevronDown, MapPin } from 'lucide-react';
import { AuthContext } from '@/app/_layout';
import { Timestamp } from '@/utils/firebase';

import { ThemedText } from '@/components/ThemedText';
import RouteDetailsForm from '@/components/routes/forms/RouteDetailsForm';
import RouteScheduleForm from '@/components/routes/forms/RouteScheduleForm';
import SimpleRouteMap from '@/components/routes/map/SimpleRouteMap';
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
import { calculateRouteTimings, fetchDrivers, updateDriverRoutes } from '@/utils/RouteUtils';
import { debounce } from '@/utils/GoogleMapsUtils';
import baseStyles from '@/styles/RouteModalStyles';
import { Theme } from '@/constants/Colors';
import { routesFirebaseMethods } from '@/utils/FirebaseUtils';

// Create an extended styles object with the delete confirmation styles
// Use 'any' type to avoid TypeScript errors
const styles: any = {
  ...baseStyles,
  // Delete confirmation styles
  confirmDeleteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20, // Higher z-index to appear on top
  },
  confirmDeleteContainer: {
    backgroundColor: Theme.colors.background.main,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }
    })
  },
  confirmationHeader: {
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.text.primary,
  },
  confirmationContent: {
    marginBottom: 24,
  },
  confirmationText: {
    fontSize: 15,
    lineHeight: 22,
    color: Theme.colors.text.secondary,
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelConfirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.secondary,
  },
  deleteConfirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Theme.colors.error,
    borderRadius: 6,
  },
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Theme.colors.text.inverse,
  },
};

interface UpdateRouteModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdate: (routeData: RouteData) => void;
  onDelete: (routeData: RouteData) => void;
  route?: RouteData;
  schoolId: string;
}

/**
 * Modal component for updating an existing route
 * Reuses the same components as AddRouteModal
 */
const UpdateRouteModal = ({ visible, onClose, onUpdate, onDelete, route, schoolId }: UpdateRouteModalProps) => {
  // Get current user from AuthContext
  const { user } = useContext(AuthContext);
  
  // Map related refs
  const mapUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMapUpdateTimeRef = useRef(0);
  const mapRenderLockRef = useRef(false);
  
  // Additional refs for managing calculations and rendering
  const prevStopsConfigRef = useRef('');
  const calculationInProgressRef = useRef(false);
  
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
  const [originalDriverId, setOriginalDriverId] = useState<string>(''); // Track original driver ID for comparison
  const [drivers, setDrivers] = useState<{id: string; name: string}[]>([]);
  const [mapKey, setMapKey] = useState(`map-${Date.now()}`);
  const [isMapVisible, setIsMapVisible] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false); // Added for delete confirmation
  
  // Schedule state
  const [schedule, setSchedule] = useState<RouteSchedule>({
    operatingDays: [1, 2, 3, 4, 5], // Monday to Friday by default
    exceptions: [],
    effectiveDates: {
      startDate: new Date(),
      endDate: undefined
    }
  });
  
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
        
        /* Delete button hover effects */
        .deleteButton {
          transition: all 0.2s ease !important;
        }
        .deleteButton:hover:not(:disabled) {
          background-color: #FECACA !important;
          transform: translateY(-1px) !important;
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
  
  // Load route data when modal becomes visible and route data is provided
  useEffect(() => {
    if (visible && route) {
      setIsLoading(true);
      
      // Handle both old and new property names for backward compatibility
      setRouteName(route.name || route.title || '');
      
      // Set route description if available
      setRouteDescription(route.description || '');
      
      // Log the route object to see what properties it has
      console.log('ROUTE DATA FOR UPDATE:', JSON.stringify(route, null, 2));
      
      // Get route_key from Firebase - this is the unique identifier for routes
      // In the database it's stored as 'route_key' but might be converted in the app
      const routeKeyValue = route.route_key || route.routeCode || '';
      console.log('Route key from Firebase:', routeKeyValue);
      setRouteKey(routeKeyValue);
      
      setStartTime(route.start_time || route.startTime || '08:00 AM');
      setEndTime(route.end_time || route.endTime || '09:15 AM');
      
      // Set the schedule data if it exists
      if (route.schedule) {
        setSchedule({
          ...route.schedule,
          effectiveDates: {
            startDate: route.schedule.effectiveDates?.startDate 
              ? new Date(route.schedule.effectiveDates.startDate) 
              : new Date(),
            endDate: route.schedule.effectiveDates?.endDate 
              ? new Date(route.schedule.effectiveDates.endDate) 
              : undefined
          }
        });
      }
      
      if (route.estimated_duration || route.estimatedDuration) {
        setEstimatedDuration(route.estimated_duration || route.estimatedDuration || 0);
      }
      
      setSelectedDriver(route.assigned_driver_id || route.assignedDriverId || '');
      setOriginalDriverId(route.assigned_driver_id || route.assignedDriverId || '');
      
      // Load stops from Firestore subcollection if schoolId and route.id exist
      if (schoolId && route.id) {
        console.log(`Loading stops for route: ${route.id} in school: ${schoolId}`);
        setInitialLoading(true);
        
        // Get route with stops from firebase
        routesFirebaseMethods.getRoute(route.id, schoolId)
          .then((routeWithStops: any) => {
            console.log(`Received route from Firebase:`, JSON.stringify(routeWithStops, null, 2));
            console.log(`Received route.routeKey:`, routeWithStops.routeKey);
            console.log(`Received route.route_key:`, routeWithStops.route_key);
            
            // If the route loaded from Firebase has a route_key, update our state
            // Use type assertion since we know the data structure but TypeScript doesn't
            const firebaseRouteKey = (routeWithStops as any).routeKey || routeWithStops.route_key || '';
            if (firebaseRouteKey) {
              console.log('Setting route key from direct Firebase query:', firebaseRouteKey);
              setRouteKey(firebaseRouteKey);
            } else {
              console.log('No route_key found in Firebase response!');
            }
            
            // Format stops correctly for the component
            if (routeWithStops.stops && routeWithStops.stops.length > 0) {
              const formattedStops = routeWithStops.stops.map((stop: any) => ({
                id: stop.id || `stop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: stop.name || '',
                address: stop.address || '',
                lat: stop.latitude !== undefined ? stop.latitude : stop.lat || null,
                lng: stop.longitude !== undefined ? stop.longitude : stop.lng || null,
                eta: stop.eta || '---'
              }));
              
              setStops(formattedStops);
              
              // Force map update with a new key when stops are loaded
              setMapKey(`map-initial-${Date.now()}`);
            } else if (route.stops && route.stops.length > 0) {
              // Fallback to the route prop if no stops in Firebase
              const mappedStops = route.stops.map(stop => ({
                id: stop.id || `stop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: stop.name || '',
                address: stop.address || '',
                lat: stop.lat !== undefined ? stop.lat : stop.latitude || null,
                lng: stop.lng !== undefined ? stop.lng : stop.longitude || null,
                eta: stop.eta || '---'
              }));
              setStops(mappedStops);
              
              // Force map update with a new key when stops are loaded
              setMapKey(`map-initial-${Date.now()}`);
            }
            
            setInitialLoading(false);
            setIsLoading(false);
          })
          .catch((error: any) => {
            console.error('Error loading route stops:', error);
            
            // Fallback to the route prop if Firebase fails
            if (route.stops && route.stops.length > 0) {
              const mappedStops = route.stops.map(stop => ({
                id: stop.id || `stop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                name: stop.name || '',
                address: stop.address || '',
                lat: stop.lat !== undefined ? stop.lat : stop.latitude || null,
                lng: stop.lng !== undefined ? stop.lng : stop.longitude || null,
                eta: stop.eta || '---'
              }));
              setStops(mappedStops);
              
              // Force map update with a new key when stops are loaded
              setMapKey(`map-initial-${Date.now()}`);
            }
            
            setInitialLoading(false);
            setIsLoading(false);
          });
      } else {
        // Fallback if no schoolId or route.id
        if (route.stops && route.stops.length > 0) {
          const mappedStops = route.stops.map(stop => ({
            id: stop.id || `stop-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: stop.name || '',
            address: stop.address || '',
            lat: stop.lat !== undefined ? stop.lat : stop.latitude || null,
            lng: stop.lng !== undefined ? stop.lng : stop.longitude || null,
            eta: stop.eta || '---'
          }));
          setStops(mappedStops);
          
          // Force map update with a new key when stops are loaded
          setMapKey(`map-initial-${Date.now()}`);
        }
        
        setIsLoading(false);
      }
      
      // Fetch drivers when modal opens
      fetchDrivers()
        .then(driversData => setDrivers(driversData));
    }
  }, [visible, route, schoolId]);
  
  // Improve initialization to reduce flashing
  useEffect(() => {
    if (!visible) {
      // Don't reset form for update modal
      setIsMapVisible(false);
      setInitialLoading(false);
      mapRenderLockRef.current = false; // Reset render lock
      
      // Clear any pending map updates
      if (mapUpdateTimeoutRef.current) {
        clearTimeout(mapUpdateTimeoutRef.current);
      }
    } else {
      // Reset render lock before new modal opens
      mapRenderLockRef.current = false;
      
      // Log current route_key value after initialization
      console.log('Route key after initialization:', routeKey);
      
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
  }, [visible, stops.length, routeKey]);
  
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
      console.log(`UpdateRouteModal: Deleting stop with ID: ${id}`);
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
  
  // Reset form state
  const resetForm = () => {
    if (!route) {
      setRouteName('');
      setRouteKey('');
      setStartTime('08:00 AM');
      setEndTime('09:15 AM');
      setCalculatedEndTime('');
      setEstimatedDuration(0);
      setStops([]);
      setSelectedDriver('');
      setOriginalDriverId('');
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
    } else {
      // If there is route data, restore the original route_key from Firestore without modifications
      const firebaseRouteKey = route.route_key || route.routeCode || '';
      if (!routeKey && firebaseRouteKey) {
        console.log('Preserving original Firestore route key on form reset:', firebaseRouteKey);
        setRouteKey(firebaseRouteKey);
      }
    }
  };
  
  // Handle delete button click
  const handleDeleteClick = () => {
    if (route) {
      setShowDeleteConfirmation(true);
    }
  };
  
  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (!route) return;
    
    // Get the current user's UID from AuthContext
    const currentUserId = user?.uid || 'system';
    
    // Create a route data object with soft_delete flag and deleted_by field
    const routeToDelete = {
      ...route,
      soft_delete: true,
      deleted_at: new Date().toISOString(),
      deleted_by: currentUserId // Set the deleted_by field to the current user's UID
    };
    
    // Call the onDelete callback with the updated route data
    onDelete(routeToDelete);
    
    // Close the confirmation dialog and modal
    setShowDeleteConfirmation(false);
    onClose();
  };
  
  // Validate form and update
  const handleUpdate = async () => {
    // Required fields validation
    const requiredFieldErrors: FieldErrors = {};
    const errors: string[] = [];
    
    console.log('Current route_key value before update:', routeKey);
    console.log('Driver assignment: Original:', originalDriverId, 'New:', selectedDriver);
    
    // Validate route name
    if (!routeName.trim()) {
      requiredFieldErrors.routeName = 'Required';
      errors.push('Route name is required');
    }
    
    // Don't validate route key - it should come from Firestore and not be modifiable
    
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
      routeKey, // Use the original route key from Firestore
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
    
    // Show loading state
    setIsSaving(true);
    
    try {
      // Check if driver assignment has changed
      const hasDriverChanged = selectedDriver !== originalDriverId;
      console.log(`Driver assignment changed: ${hasDriverChanged}`);
      
      // Create updated route data object
      const routeData: RouteData = {
        id: route?.id, // Preserve the original ID
        
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
        active: route?.active !== undefined ? route.active : true,
        soft_delete: route?.soft_delete !== undefined ? route.soft_delete : false, // Preserve soft delete status
        deleted_at: route?.deleted_at,
        deleted_by: route?.deleted_by
      };
      
      // Debug log for stops data
      console.log(`Updating route with ${stops.length} stops`);
      if (stops.length > 0) {
        console.log('First stop sample:', JSON.stringify({
          id: stops[0].id,
          name: stops[0].name,
          lat: stops[0].lat,
          lng: stops[0].lng
        }));
      }
      
      // Call the update handler passed in props
      await onUpdate(routeData);
      
      // If driver has changed, update the driver's assigned routes
      if (hasDriverChanged && route?.id) {
        try {
          console.log(`Updating driver assignment for route: ${route.id}`);
          await updateDriverRoutes(selectedDriver, route.id, originalDriverId);
          console.log('Driver assignment updated successfully');
        } catch (driverUpdateError) {
          console.error('Error updating driver routes:', driverUpdateError);
          // Don't block the flow if driver update fails - the route is still updated
          Alert.alert(
            'Warning',
            'Route updated, but there was an issue updating the driver assignment.'
          );
        }
      }
    } catch (error) {
      console.error('Error updating route:', error);
      Alert.alert(
        'Error',
        'Failed to update route. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
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
  
  // Log the current route_key value during render
  console.log('Current routeKey value during render:', routeKey);
  
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
            <View style={{
              flex: 1,
              justifyContent: 'flex-start',
              alignItems: 'flex-start'
            }}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteClick}
                disabled={isSaving || !route}
                className="deleteButton"
              >
                <Trash2 size={16} color={Theme.colors.error} />
                <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
              </TouchableOpacity>
            </View>
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
                onPress={handleUpdate}
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
                    <ThemedText style={styles.saveButtonText}>Updating...</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.saveButtonText}>Update Route</ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Delete confirmation overlay */}
          {showDeleteConfirmation && (
            <View style={styles.confirmDeleteOverlay}>
              <View style={styles.confirmDeleteContainer}>
                <View style={styles.confirmationHeader}>
                  <ThemedText style={styles.confirmationTitle}>Confirm Deletion</ThemedText>
                </View>
                <View style={styles.confirmationContent}>
                  <ThemedText style={styles.confirmationText}>
                    Are you sure you want to delete this route?
                    This action cannot be undone.
                  </ThemedText>
                </View>
                <View style={styles.confirmationButtons}>
                  <TouchableOpacity 
                    style={styles.cancelConfirmButton} 
                    onPress={() => setShowDeleteConfirmation(false)}
                  >
                    <ThemedText style={styles.cancelConfirmButtonText}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteConfirmButton} 
                    onPress={handleConfirmDelete}
                  >
                    <ThemedText style={styles.deleteConfirmButtonText}>Delete</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default UpdateRouteModal;