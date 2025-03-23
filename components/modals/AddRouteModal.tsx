import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Modal, 
  TouchableOpacity, 
  TextInput, 
  ScrollView, 
  Platform, 
  KeyboardAvoidingView,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { motion } from 'framer-motion';
import { X, Plus, MapPin, Trash2, Search, Clock, ChevronRight, Info, ChevronUp, ChevronDown } from 'lucide-react';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

// Get window dimensions for responsive sizing
const windowWidth = Dimensions.get('window').width;
const windowHeight = Dimensions.get('window').height;

// Constants for calculating timing
const AVERAGE_SPEED_KMH = 30; // Average bus speed in km/h
const STOP_DWELL_TIME = 2; // Average time spent at each stop in minutes

// StopItem interface
interface StopItem {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  eta?: string; // Estimated time of arrival
}

// Driver interface
interface Driver {
  id: string;
  name: string;
}

// AddRouteModal Props
interface AddRouteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (routeData: RouteData) => void;
}

// Updated RouteData interface
interface RouteData {
  name: string;
  routeKey: string;
  startTime: string;
  endTime: string;
  stops: StopItem[];
  estimatedDuration?: number; // in minutes
  assignedDriverId?: string; // Add driver ID field
}

// Add a new interface for field errors
interface FieldErrors {
  routeName?: string;
  routeKey?: string;
  startTime?: string;
  endTime?: string;
  stops?: string;
}

// Address result interface
interface AddressResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Add this type guard check helper function at the top level, after interfaces
const isStopItem = (item: any): item is StopItem => {
  return item && typeof item === 'object' && 'id' in item && 'name' in item && 'address' in item;
};

// Utility function to add minutes to a time string (format: "HH:MM AM/PM")
const addMinutesToTime = (timeStr: string, minutes: number): string => {
  const [time, period] = timeStr.split(' ');
  const [hours, mins] = time.split(':').map(Number);
  
  // Convert to 24-hour format
  let totalHours = hours;
  if (period === 'PM' && hours < 12) totalHours += 12;
  if (period === 'AM' && hours === 12) totalHours = 0;
  
  // Add minutes
  let totalMinutes = totalHours * 60 + mins + minutes;
  
  // Convert back to hours and minutes
  let newHours = Math.floor(totalMinutes / 60) % 24;
  let newMins = totalMinutes % 60;
  
  // Convert back to 12-hour format
  let newPeriod = newHours >= 12 ? 'PM' : 'AM';
  let display12Hour = newHours % 12;
  if (display12Hour === 0) display12Hour = 12;
  
  return `${display12Hour}:${newMins.toString().padStart(2, '0')} ${newPeriod}`;
};

// Checking if address is in valid format
const isValidAddress = (address: string): boolean => {
  // Valid address should have street number, street name, city, state (optional), and zip (optional)
  // For example: "123 Main St, New York, NY 10001"
  return address.trim().length > 10 && 
    address.includes(' ') &&
    (address.includes(',') || address.includes(' '));
};

// Skeleton component with pulse animation
const SkeletonPulse = ({ style }: { style: any }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);
  
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: pulseAnim
        }
      ]}
    />
  );
};

// Stop item component with up/down arrows instead of drag
const StopItem = ({ 
  stop, 
  index,
  total,
  onEdit, 
  onDelete,
  onMoveUp,
  onMoveDown
}: { 
  stop: StopItem, 
  index: number,
  total: number,
  onEdit: (id: string, field: 'name' | 'address', value: string) => void,
  onDelete: (id: string) => void,
  onMoveUp: (id: string) => void,
  onMoveDown: (id: string) => void
}) => {
  const [editing, setEditing] = useState(false);

  return (
    <div
      className="stop-item"
      style={{
        position: 'relative',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        marginBottom: '8px',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Stop number indicator with increased contrast */}
      <div 
        className="stop-number"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '12px',
          backgroundColor: '#3050ee', // Darker blue for better contrast
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: '12px',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
          flexShrink: 0
        }}
      >
        <span style={{
          color: 'white',
          fontSize: '12px',
          fontWeight: 'bold',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          lineHeight: '1'
        }}>
          {index + 1}
        </span>
      </div>
      
      {/* Stop content */}
      <View style={[styles.stopContent, { flex: 1, overflow: 'hidden' }]}>
        {editing ? (
          <View style={styles.editStopForm}>
            <ThemedText style={styles.editStopTitle}>Edit Stop Name</ThemedText>
            <TextInput
              style={[
                styles.editStopInput,
                { borderWidth: 0, borderColor: 'transparent', outline: 'none' },
                stop.name ? { backgroundColor: '#E2E4E8' } : {}
              ]}
              value={stop.name}
              onChangeText={(text) => onEdit(stop.id, 'name', text)}
              placeholder="Stop name"
              placeholderTextColor="#9CA3AF"
              selectionColor="#4361ee"
              underlineColorAndroid="transparent"
            />
            
            {/* Display address as non-editable field */}
            <View style={styles.addressDisplayRow}>
              <ThemedText style={styles.addressDisplayLabel}>Address:</ThemedText>
              <ThemedText style={styles.addressDisplayText}>{stop.address}</ThemedText>
            </View>
            
            <TouchableOpacity 
              style={styles.doneEditingButton}
              onPress={() => setEditing(false)}
              className="doneEditingButton"
            >
              <ThemedText style={styles.doneEditingText}>Done</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.stopInfo, { overflow: 'hidden' }]}
            onPress={() => setEditing(true)}
          >
            <View style={styles.stopNameContainer}>
              <ThemedText 
                style={[styles.stopName, { overflow: 'hidden' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {stop.name}
              </ThemedText>
            </View>
            <ThemedText 
              style={[styles.stopAddress, { overflow: 'hidden', fontWeight: 'bold' }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {stop.address}
            </ThemedText>
            {stop.eta && (
              <ThemedText style={styles.stopEta}>ETA: {stop.eta}</ThemedText>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {/* Up/Down Arrows + Delete button */}
      <View style={[styles.stopActions, { flexShrink: 0 }]}>
        <View style={styles.arrowButtons}>
          <TouchableOpacity 
            style={[
              styles.arrowButton,
              index === 0 && styles.disabledButton,
              { backgroundColor: '#d1d5db' }
            ]}
            onPress={() => index > 0 && onMoveUp(stop.id)}
            disabled={index === 0}
            className="arrowButton"
          >
            <ChevronUp size={16} color={index === 0 ? "#D1D5DB" : "#3050ee"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.arrowButton,
              index === total - 1 && styles.disabledButton,
              { backgroundColor: '#d1d5db' }
            ]}
            onPress={() => index < total - 1 && onMoveDown(stop.id)}
            disabled={index === total - 1}
            className="arrowButton"
          >
            <ChevronDown size={16} color={index === total - 1 ? "#D1D5DB" : "#3050ee"} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.stopActionButton, styles.deleteStopButton]}
          onPress={() => onDelete(stop.id)}
          className="deleteStopButton"
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </div>
  );
};

// Main AddRouteModal component
export default function AddRouteModal({ visible, onClose, onSave }: AddRouteModalProps) {
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
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // Add field errors state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  
  // Add state to control error message visibility
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  
  // Address search state
  const [searchAddress, setSearchAddress] = useState('');
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [showAddressResults, setShowAddressResults] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  
  // Ref for the search input
  const searchInputRef = useRef<any>(null);
  const searchResultsRef = useRef<any>(null);
  
  // Function to handle clicks outside the search results
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (Platform.OS === 'web' && showAddressResults) {
      // Use document.getElementById which is more reliable
      const searchInput = document.getElementById('search-input-field');
      const searchResults = document.getElementById('search-results-dropdown');
      
      // If the click is outside both elements, hide the results
      if (
        searchInput && 
        searchResults && 
        !searchInput.contains(event.target as Node) &&
        !searchResults.contains(event.target as Node)
      ) {
        setShowAddressResults(false);
      }
    }
  }, [showAddressResults]);
  
  // Set up event listener for clicks
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [handleClickOutside]);
  
  // Handle focus on search input
  const handleSearchFocus = () => {
    if (searchAddress.length > 0) {
      setShowAddressResults(true);
    }
  };
  
  // Generate a random route key on mount
  useEffect(() => {
    if (visible) {
      const randomKey = `RT${1000 + Math.floor(Math.random() * 9000)}`;
      setRouteKey(randomKey);
    }
  }, [visible]);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      resetForm();
    } else {
      // Fetch drivers when modal opens
      fetchDrivers();
    }
  }, [visible]);
  
  // Update calculated end time whenever stops or start time changes
  useEffect(() => {
    if (stops.length > 0 && startTime) {
      calculateRouteTimings();
    }
  }, [stops, startTime]);
  
  // Animation for search results dropdown
  useEffect(() => {
    if (showAddressResults) {
      // Show animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -10,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAddressResults, fadeAnim, slideAnim]);
  
  // Move stop up in order
  const moveStopUp = (id: string) => {
    const index = stops.findIndex(stop => stop.id === id);
    if (index <= 0) return; // Can't move the first item up
    
    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[index - 1];
    newStops[index - 1] = temp;
    
    setStops(newStops);
  };
  
  // Move stop down in order
  const moveStopDown = (id: string) => {
    const index = stops.findIndex(stop => stop.id === id);
    if (index < 0 || index >= stops.length - 1) return; // Can't move the last item down
    
    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[index + 1];
    newStops[index + 1] = temp;
    
    setStops(newStops);
  };

  // Update CSS for improved styling, including button hover effects
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        .input-container:hover {
          background-color: #E2E4E8 !important;
        }
        .input-container:focus-within {
          background-color: #D1D5DB !important;
        }
        .search-btn:hover {
          background-color: #E2E4E8 !important;
        }
        
        /* Ensure consistent layout of stop items */
        .stop-item {
          align-items: center !important;
          margin-bottom: 8px !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        .stop-number {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          width: 24px !important;
          height: 24px !important;
        }
        
        /* Ensure modal z-index is high enough */
        .centeredView {
          z-index: 1000;
        }
        
        .modalView {
          overflow: hidden;
        }
        
        /* Match search bar and stops container widths */
        .search-bar-width {
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        
        .stops-container {
          width: 100% !important;
          box-sizing: border-box !important;
          height: 400px !important;
          overflow-y: auto !important;
        }
        
        .stops-container:empty {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        
        /* Simple, direct hover effect for search results */
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
        
        /* Keep the icon visible on hover */
        .search-option:hover svg {
          color: white !important;
          stroke: white !important;
          opacity: 1 !important;
        }
        
        /* Ensure MapPin and ChevronRight have consistent styling */
        .search-icon {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 24px !important;
          height: 24px !important;
          flex-shrink: 0 !important;
        }
        
        .search-option-name {
          font-size: 14px !important;
          font-weight: 500 !important;
          color: #1F2937 !important;
          margin-bottom: 2px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        
        .search-option-address {
          font-size: 12px !important;
          color: #6B7280 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        
        /* Button hover effects */
        /* Save button hover */
        .saveButton {
          transition: all 0.2s ease !important;
        }
        .saveButton:hover:not(:disabled) {
          background-color: #2341CE !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        
        /* Cancel button hover */
        .cancelButton {
          transition: all 0.2s ease !important;
        }
        .cancelButton:hover {
          background-color: #E5E7EB !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Arrow buttons hover */
        .arrowButton {
          transition: all 0.2s ease !important;
          border: 1px solid #9ca3af !important;
          background-color: #d1d5db !important;
          cursor: pointer !important;
        }
        .arrowButton:hover:not(:disabled) {
          background-color: #9ca3af !important;
          border-color: #3050ee !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25) !important;
        }
        .arrowButton:active:not(:disabled) {
          background-color: #6b7280 !important;
          transform: translateY(0px) !important;
          box-shadow: none !important;
        }
        .arrowButton:disabled {
          opacity: 0.5 !important;
          cursor: not-allowed !important;
          background-color: #e5e7eb !important;
        }
        
        /* Done editing button hover */
        .doneEditingButton {
          transition: all 0.2s ease !important;
        }
        .doneEditingButton:hover {
          background-color: #2341CE !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        
        /* Use calculated button hover */
        .useCalculatedButton {
          transition: all 0.2s ease !important;
        }
        .useCalculatedButton:hover {
          background-color: #2341CE !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
        }
        
        /* Delete button hover */
        .deleteStopButton {
          transition: all 0.15s ease !important;
          border-radius: 4px !important;
        }
        .deleteStopButton:hover {
          background-color: #FEE2E2 !important;
          transform: translateY(-1px) !important;
        }
        
        /* Close button hover */
        .closeButton, .closeErrorButton {
          transition: all 0.15s ease !important;
          border-radius: 50% !important;
        }
        .closeButton:hover {
          background-color: #F3F4F6 !important;
        }
        .closeErrorButton:hover {
          background-color: rgba(0, 0, 0, 0.05) !important;
        }
        
        /* Driver dropdown hover */
        .select-driver {
          transition: all 0.2s ease !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
        .select-driver:hover {
          background-color: #F9FAFB !important;
          border-color: #D1D5DB !important;
        }
        .select-driver:focus {
          background-color: #F9FAFB !important;
          border-color: #4361ee !important;
          box-shadow: 0 0 0 2px rgba(67, 97, 238, 0.2) !important;
        }
      `;
      document.head.appendChild(style);
      
      // Cleanup on unmount
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);
  
  // Calculate route timings
  const calculateRouteTimings = () => {
    // Simple estimate for now - will be replaced with Google Directions API data
    // Assume each stop adds distance and time
    let totalDuration = 0;
    
    // Calculate time between stops based on mock distances
    for (let i = 0; i < stops.length - 1; i++) {
      // Mock distance calculation (random between 2-5km)
      const mockDistanceKm = 2 + Math.random() * 3;
      
      // Time to travel between stops (hours) = distance / speed
      const travelTimeHours = mockDistanceKm / AVERAGE_SPEED_KMH;
      
      // Convert to minutes
      const travelTimeMinutes = travelTimeHours * 60;
      
      // Add to total duration
      totalDuration += travelTimeMinutes;
      
      // Add dwell time at stop (except for the last stop)
      totalDuration += STOP_DWELL_TIME;
    }
    
    // Round to nearest minute
    totalDuration = Math.round(totalDuration);
    setEstimatedDuration(totalDuration);
    
    // Calculate end time
    const calculatedEnd = addMinutesToTime(startTime, totalDuration);
    setCalculatedEndTime(calculatedEnd);
    
    // Calculate ETAs for each stop
    let currentTime = startTime;
    const updatedStops = stops.map((stop, index) => {
      // First stop has ETA of start time
      if (index === 0) {
        return { ...stop, eta: startTime };
      }
      
      // For other stops, calculate based on previous stop
      // Mock distance calculation (random between 2-5km)
      const mockDistanceKm = 2 + Math.random() * 3;
      
      // Time to travel from previous stop (hours) = distance / speed
      const travelTimeHours = mockDistanceKm / AVERAGE_SPEED_KMH;
      
      // Convert to minutes
      const travelTimeMinutes = Math.round(travelTimeHours * 60);
      
      // Add dwell time at previous stop
      const totalTimeFromPreviousStop = travelTimeMinutes + STOP_DWELL_TIME;
      
      // Calculate ETA
      currentTime = addMinutesToTime(currentTime, totalTimeFromPreviousStop);
      
      return { ...stop, eta: currentTime };
    });
    
    setStops(updatedStops);
  };
  
  // Helper function to highlight matching text parts
  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    
    // Case insensitive search
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Check if query appears in text
    if (!lowerText.includes(lowerQuery)) return text;
    
    // Special case handling for state abbreviations to avoid highlighting just "NY" in addresses
    if (query.length <= 2 && 
        (lowerText.includes(`, ${lowerQuery}`) || lowerText.includes(` ${lowerQuery} `))) {
      // This is likely a state abbreviation, so only highlight it if it appears as a standalone entity
      return text;
    }
    
    // Create highlighted parts
    const parts = [];
    let currentIndex = 0;
    
    // Find all occurrences and mark them for highlighting
    let searchIndex = lowerText.indexOf(lowerQuery, currentIndex);
    
    while (searchIndex !== -1) {
      // Check if this is part of a state or zip code (to avoid highlighting "New York" in state context)
      const isStateOrZip = 
        (searchIndex > 2 && lowerText.substring(searchIndex-2, searchIndex) === ', ') || // State pattern: ", NY"
        /\d{5}/.test(lowerText.substring(searchIndex, searchIndex + 5)); // Zip code pattern: 5 digits
      
      // Only highlight if it's not part of state/zip context
      if (!isStateOrZip) {
        // Add non-highlighted part
        if (searchIndex > currentIndex) {
          parts.push({
            text: text.substring(currentIndex, searchIndex),
            highlight: false
          });
        }
        
        // Add highlighted part
        parts.push({
          text: text.substring(searchIndex, searchIndex + query.length),
          highlight: true
        });
        
        currentIndex = searchIndex + query.length;
      } else {
        // Skip this match as it's part of state/zip
        searchIndex += query.length;
      }
      
      // Find next occurrence
      searchIndex = lowerText.indexOf(lowerQuery, currentIndex);
    }
    
    // Add any remaining non-highlighted text
    if (currentIndex < text.length) {
      parts.push({
        text: text.substring(currentIndex),
        highlight: false
      });
    }
    
    return parts.length > 0 ? parts : text;
  };

  // Mock address search function (placeholder for Google Maps API)
  const searchAddresses = (query: string) => {
    // Show dropdown for any input, even a single character
    if (query.length > 0) {
      // Set loading state and show dropdown immediately
      setIsSearchLoading(true);
      setShowAddressResults(true);
      setAddressResults([]); // Clear previous results while loading
      
      // In a real implementation, this would call the Google Places API
      // For now, we simulate the API response with a delay
      setTimeout(() => {
        // Only process search if query has at least 3 characters
        if (query.length >= 2) {
          // Mock database of places
          const allMockResults = [
            { id: '1', name: 'New York Tech', address: '1855 Broadway, New York, NY 10023', lat: 40.7689, lng: -73.9835 },
            { id: '2', name: 'Central Park', address: 'Central Park, New York, NY', lat: 40.7812, lng: -73.9665 },
            { id: '3', name: 'Empire State Building', address: '350 Fifth Avenue, New York, NY 10118', lat: 40.7484, lng: -73.9857 },
            { id: '4', name: 'Times Square', address: 'Broadway, New York, NY 10036', lat: 40.7580, lng: -73.9855 },
            { id: '5', name: 'Brooklyn Bridge', address: 'Brooklyn Bridge, New York, NY 10038', lat: 40.7061, lng: -73.9969 },
            { id: '6', name: 'Statue of Liberty', address: 'Liberty Island, New York, NY 10004', lat: 40.6892, lng: -74.0445 },
            { id: '7', name: 'Grand Central Terminal', address: '89 E 42nd St, New York, NY 10017', lat: 40.7527, lng: -73.9772 },
            { id: '8', name: 'Metropolitan Museum of Art', address: '1000 5th Ave, New York, NY 10028', lat: 40.7794, lng: -73.9632 },
            { id: '9', name: 'One World Trade Center', address: '285 Fulton St, New York, NY 10007', lat: 40.7127, lng: -74.0134 },
            { id: '10', name: 'New York University', address: '70 Washington Square S, New York, NY 10012', lat: 40.7295, lng: -73.9965 }
          ];
          
          // Smarter filtering that prioritizes name matches over address matches
          // and excludes cases where the query only matches the state part of the address
          const queryLower = query.toLowerCase();
          
          // First find exact matches in name or beginning of address (not state part)
          const exactMatches = allMockResults.filter(result => {
            const nameLower = result.name.toLowerCase();
            const addressParts = result.address.split(',');
            const streetPart = addressParts[0].toLowerCase();
            
            return nameLower.includes(queryLower) || 
                   streetPart.includes(queryLower);
          });
          
          // If we have exact matches, use those
          if (exactMatches.length > 0) {
            setAddressResults(exactMatches);
          } else {
            // Otherwise fall back to the broader search
            const filteredResults = allMockResults.filter(result => 
              result.name.toLowerCase().includes(queryLower) || 
              result.address.toLowerCase().includes(queryLower)
            );
            
            setAddressResults(filteredResults);
          }
        }
        
        // Set loading to false when results are ready
        setIsSearchLoading(false);
      }, 500); // Simulate network delay
    } else {
      // Clear results for empty query
      setAddressResults([]);
      setShowAddressResults(false);
      setIsSearchLoading(false);
    }
  };
  
  // Handle address search input
  const handleSearchChange = (text: string) => {
    setSearchAddress(text);
    
    // Show the dropdown as soon as the user starts typing
    if (text.length > 0) {
      setShowAddressResults(true);
    } else {
      setShowAddressResults(false);
    }
    
    searchAddresses(text);
  };
  
  // Handle start time change
  const handleStartTimeChange = (text: string) => {
    setStartTime(text);
    // This will trigger the useEffect to recalculate end time
  };
  
  // Handle end time change
  const handleEndTimeChange = (text: string) => {
    setEndTime(text);
  };
  
  // Select address from search results
  const selectAddress = (result: AddressResult) => {
    // Otherwise add a new stop
    const newStop: StopItem = {
      id: `stop-${Date.now()}`,
      name: result.name,
      address: result.address,
      lat: result.lat,
      lng: result.lng
    };
    
    setStops([...stops, newStop]);
    setSearchAddress('');
    setAddressResults([]);
    setShowAddressResults(false);
  };
  
  // Add a stop from address search
  const addStop = () => {
    if (!searchAddress || searchAddress.trim().length < 5) {
      Alert.alert(
        'Invalid Address', 
        'Please enter a valid address to search for, like "123 Main St, City, State ZIP"'
      );
      return;
    }
    
    // In a real implementation, this would geocode the address using Google Maps Geocoding API
    // For now, we'll show a placeholder response
    Alert.alert(
      'Geocoding Address',
      `Searching for: "${searchAddress}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Search', 
          onPress: () => {
            // This is where you'd integrate with Google Geocoding API
            // Mock response for now
            setTimeout(() => {
              // Check if we found a match
              if (isValidAddress(searchAddress)) {
                // For demo purposes, let's say we found a match
                const mockLat = 40.7 + (Math.random() * 0.1);
                const mockLng = -73.9 + (Math.random() * 0.1);
                
                const nameParts = searchAddress.split(',');
                const newStop: StopItem = {
                  id: `stop-${Date.now()}`,
                  name: nameParts[0].trim(),
                  address: searchAddress,
                  lat: mockLat,
                  lng: mockLng
                };
                
                setStops([...stops, newStop]);
                setSearchAddress('');
              } else {
                Alert.alert(
                  'Address Not Found',
                  'Could not geocode the address. Please enter a more specific address.'
                );
              }
            }, 500);
          }
        }
      ]
    );
  };
  
  // Edit stop fields
  const editStop = (id: string, field: 'name' | 'address', value: string) => {
    const updatedStops = stops.map(stop => 
      stop.id === id ? { ...stop, [field]: value } : stop
    );
    setStops(updatedStops);
  };
  
  // Delete stop
  const deleteStop = (id: string) => {
    const updatedStops = stops.filter(stop => stop.id !== id);
    setStops(updatedStops);
  };
  
  // Reset form
  const resetForm = () => {
    setRouteName('');
    setRouteKey('');
    setStartTime('08:00 AM');
    setEndTime('09:15 AM');
    setCalculatedEndTime('');
    setEstimatedDuration(0);
    setStops([]);
    setSearchAddress('');
    setAddressResults([]);
    setShowAddressResults(false);
    setSelectedDriver('');
    setFieldErrors({}); // Reset field errors
    setValidationErrors([]);
  };
  
  // Mock function to fetch drivers
  const fetchDrivers = () => {
    // Simulate fetching from Firebase
    setTimeout(() => {
      const mockDrivers: Driver[] = [
        { id: 'unassigned', name: 'Unassigned' },
        { id: 'driver1', name: 'Driver 1' },
        { id: 'driver2', name: 'Driver 2' },
        { id: 'driver3', name: 'Driver 3' },
        { id: 'driver4', name: 'Driver 4' },
        { id: 'driver5', name: 'Driver 5' }
      ];
      setDrivers(mockDrivers);
    }, 300);
  };
  
  // Validate form with improved error messages
  const validateForm = () => {
    const errors: string[] = [];
    const newFieldErrors: FieldErrors = {};
    let isValid = true;
    
    if (!routeName.trim()) {
      errors.push('Route name is required');
      newFieldErrors.routeName = 'Required';
      isValid = false;
    }
    
    if (!routeKey.trim()) {
      errors.push('Route key is required');
      newFieldErrors.routeKey = 'Required';
      isValid = false;
    }
    
    if (!startTime.trim()) {
      errors.push('Start time is required');
      newFieldErrors.startTime = 'Required';
      isValid = false;
    }
    
    if (!endTime.trim()) {
      errors.push('End time is required');
      newFieldErrors.endTime = 'Required';
      isValid = false;
    }
    
    if (stops.length < 2) {
      errors.push('At least two stops are required for a valid route');
      newFieldErrors.stops = 'At least 2 stops required';
      isValid = false;
    }
    
    // Check if any stop has empty fields
    const invalidStop = stops.find(stop => !stop.name.trim() || !stop.address.trim());
    if (invalidStop) {
      errors.push('All stops must have a name and address');
    }
    
    // Check if all stops have lat/lng
    const noLocationStop = stops.find(stop => stop.lat === null || stop.lng === null);
    if (noLocationStop) {
      errors.push(`The stop "${noLocationStop.name}" has no location data`);
    }
    
    // Set the field errors
    setFieldErrors(newFieldErrors);
    setValidationErrors(errors);
    
    if (errors.length > 0) {
      // Show error message banner
      setShowErrorMessage(true);
      return false;
    }
    
    return isValid;
  };
  
  // Handle save without Firebase
  const handleSave = () => {
    if (!validateForm()) return;
    
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
        // Success message
        Alert.alert(
          'Success',
          'Route saved successfully!',
          [{ text: 'OK', onPress: () => onSave(routeData) }]
        );
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
  
  // Handle platform-specific styling to remove focus outlines on web
  const webFocusReset = Platform.OS === 'web' ? {
    outlineWidth: 0,
    outlineColor: 'transparent',
    WebkitTapHighlightColor: 'rgba(0,0,0,0)',
  } : {};
  
  // Render the map section with improved route visualization
  const renderMap = () => (
    <View style={styles.mapSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>Route Map</ThemedText>
        {estimatedDuration > 0 && (
          <ThemedText style={styles.durationText}>
            Est. Duration: {Math.floor(estimatedDuration / 60)}h {estimatedDuration % 60}m
          </ThemedText>
        )}
      </View>
      
      <View style={styles.mapContainer}>
        <View style={styles.mapPlaceholder}>
          <MapPin size={32} color="#4361ee" />
          <ThemedText style={styles.mapPlaceholderText}>
            Map will be displayed here
          </ThemedText>
          <ThemedText style={styles.mapPlaceholderSubtext}>
            Add stops to visualize the route
          </ThemedText>
        </View>
      </View>
    </View>
  );
  
  // Render route details form
  const renderRouteDetailsForm = () => (
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
              { overflow: 'hidden' }
            ]} 
            className="input-container"
          >
            <TextInput
              style={[
                styles.formInput,
                { borderWidth: 0, borderColor: 'transparent' },
                webFocusReset,
                routeKey ? { backgroundColor: '#E2E4E8' } : {}
              ]}
              value={routeKey}
              onChangeText={(text) => {
                setRouteKey(text);
                if (text.trim()) {
                  setFieldErrors({...fieldErrors, routeKey: undefined});
                }
              }}
              placeholder="Enter route ID"
              placeholderTextColor="#9CA3AF"
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
                handleStartTimeChange(text);
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
                handleEndTimeChange(text);
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
      {stops.length > 0 && calculatedEndTime && (
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
            
            <TouchableOpacity 
              style={styles.useCalculatedButton}
              onPress={() => setEndTime(calculatedEndTime)}
              className="useCalculatedButton"
            >
              <Clock size={14} color="#FFFFFF" style={styles.calculatedButtonIcon} />
              <ThemedText style={styles.useCalculatedText}>
                Use Calculated Time
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
  
  // Improved address search results with hover effect
  const renderAddressResults = () => {
    if (!showAddressResults) return null;
    
    return (
      <Animated.View 
        style={[
          styles.addressSearchResults, 
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            zIndex: 9999
          }
        ]}
        ref={searchResultsRef}
        id="search-results-dropdown"
      >
        <ScrollView 
          style={styles.addressResultsScroll}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 2 }}
        >
          {isSearchLoading ? (
            // Skeleton loading UI
            <>
              {[1, 2, 3, 4].map((i) => (
                <View key={`skeleton-${i}`} style={styles.skeletonItem}>
                  <SkeletonPulse style={styles.skeletonIcon} />
                  <View style={styles.skeletonContent}>
                    <SkeletonPulse style={styles.skeletonTitle} />
                    <SkeletonPulse style={styles.skeletonSubtitle} />
                  </View>
                </View>
              ))}
            </>
          ) : addressResults.length > 0 ? (
            // Results list with simple hover effect
            addressResults.map((result) => (
              <div 
                key={result.id}
                className="search-option"
                onClick={() => selectAddress(result)}
              >
                <div className="search-icon">
                  <MapPin size={18} color="#4361ee" />
                </div>
                <div style={{ marginLeft: 12, flex: 1 }}>
                  <div className="search-option-name">
                    {result.name}
                  </div>
                  <div className="search-option-address">
                    {result.address}
                  </div>
                </div>
                <div className="search-icon" style={{ marginLeft: 'auto' }}>
                  <ChevronRight size={16} color="#9CA3AF" />
                </div>
              </div>
            ))
          ) : searchAddress.length < 2 ? (
            // Prompt to type more
            <View style={styles.noResultsMessage}>
              <ThemedText style={styles.noResultsText}>
                Type to search for an address...
              </ThemedText>
            </View>
          ) : (
            // No results message
            <View style={styles.noResultsMessage}>
              <ThemedText style={styles.noResultsText}>
                No matching addresses found
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    );
  };
  
  // Render stops section with validation indicator
  const renderStopsSection = () => (
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
      <View style={styles.addressSearchContainer}>
        {/* Help text */}
        <View style={styles.addressHelpContainer}>
          <Info size={14} color="#6B7280" />
          <ThemedText style={styles.addressHelpText}>
            Enter a valid address (e.g., "123 Main St, New York, NY 10001")
          </ThemedText>
        </View>
        
        {/* Search input */}
        <View 
          style={[
            styles.searchBarContainer, 
            fieldErrors.stops && styles.inputError, 
            { overflow: 'visible' }
          ]} 
          className="input-container search-bar-width"
        >
          <View style={styles.searchInputContainer}>
            <Search size={18} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={[
                styles.searchInput, 
                { borderWidth: 0, borderColor: 'transparent' },
                webFocusReset,
                searchAddress ? { backgroundColor: '#E2E4E8' } : {}
              ]}
              value={searchAddress}
              onChangeText={handleSearchChange}
              placeholder="Search for an address to add a stop"
              placeholderTextColor="#9CA3AF"
              selectionColor="#4361ee"
              underlineColorAndroid="transparent"
              ref={searchInputRef}
              onFocus={handleSearchFocus}
              id="search-input-field"
            />
          </View>
          
          {renderAddressResults()}
        </View>
      </View>
      
      {/* Improved Stops List with Up/Down buttons instead of Framer Motion */}
      <View style={[styles.stopsList, { marginTop: 8 }]}>
        {stops.length === 0 ? (
          <div style={{
            width: '100%',
            height: '400px',
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px',
            boxSizing: 'border-box',
            border: fieldErrors.stops ? '1px solid #EF4444' : '1px solid #E5E7EB'
          }} className="stops-container search-bar-width">
            <div style={{
              textAlign: 'center',
              width: '100%'
            }}>
              <ThemedText style={[styles.noStopsText, fieldErrors.stops && { color: '#EF4444' }]}>
                {fieldErrors.stops ? fieldErrors.stops : 'No stops added yet. Use the search above to add stops.'}
              </ThemedText>
            </div>
          </div>
        ) : (
          <>
            <div style={{
              width: '100%',
              position: 'relative',
              backgroundColor: '#F3F4F6',
              borderRadius: '8px',
              padding: '6px',
              height: '400px',
              boxSizing: 'border-box',
              border: fieldErrors.stops ? '1px solid #EF4444' : '1px solid #E5E7EB',
              overflowY: 'auto'
            }} className="stops-container search-bar-width">
              <div style={{
                backgroundColor: '#F3F4F6',
                padding: '8px 10px',
                textAlign: 'left',
                borderBottom: '1px solid #E5E7EB',
                marginBottom: '8px'
              }}>
                <ThemedText style={styles.dragInstructions}>
                  Use arrows to reorder stops
                </ThemedText>
                {fieldErrors.stops && (
                  <ThemedText style={[styles.errorText, { marginTop: 4 }]}>
                    {fieldErrors.stops}
                  </ThemedText>
                )}
              </div>
              
              {stops.map((stop, index) => (
                <StopItem
                  key={stop.id}
                  stop={stop}
                  index={index}
                  total={stops.length}
                  onEdit={editStop}
                  onDelete={deleteStop}
                  onMoveUp={moveStopUp}
                  onMoveDown={moveStopDown}
                />
              ))}
            </div>
          </>
        )}
      </View>
    </View>
  );
  
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
                {renderStopsSection()}
              </ScrollView>
            </View>
            
            {/* Right column: Map and Route Details */}
            <View style={styles.mapDetailsColumn}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Map at the top */}
                {renderMap()}
                
                {/* Route details below the map */}
                {renderRouteDetailsForm()}
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
          
          {/* Add CSS animation for spinner */}
          {Platform.OS === 'web' && (
            <style dangerouslySetInnerHTML={{
              __html: `
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `
            }} />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Core modal styles
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'relative',
  },
  modalView: {
    width: Platform.OS === 'web' ? Math.min(1100, windowWidth - 40) : windowWidth - 40,
    height: Platform.OS === 'web' ? Math.min(700, windowHeight - 80) : windowHeight - 80,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 6,
  },
  modalContent: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    position: 'relative',
  },
  stopsColumn: {
    flex: 1,
    borderRightWidth: Platform.OS === 'web' ? 1 : 0,
    borderRightColor: '#E5E7EB',
    maxWidth: Platform.OS === 'web' ? '40%' : '100%',
    position: 'relative',
    zIndex: 50,
    overflow: 'hidden',
    paddingRight: 16,
    paddingLeft: 16,
    boxSizing: 'border-box',
  },
  mapDetailsColumn: {
    flex: 1.5,
    padding: 16,
    borderLeftWidth: Platform.OS === 'web' ? 1 : 0,
    borderLeftColor: '#E5E7EB',
  },
  stopsSection: {
    position: 'relative',
    zIndex: 10,
    width: '100%',
    boxSizing: 'border-box',
    paddingRight: 0,
    paddingLeft: 0,
    paddingTop: 0,
    paddingBottom: 16,
  },
  mapSection: {
    padding: 16,
  },
  routeDetailsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  stopCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4361ee',
  },
  
  // Form styles
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  formInputContainer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    width: '100%',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  formInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
    boxSizing: 'border-box',
    height: '100%',
    outline: 'none',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  timeInputContainer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    width: '100%',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
    boxSizing: 'border-box',
    height: '100%',
    outline: 'none',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  
  // Map styles
  mapContainer: {
    marginBottom: 16,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  
  // Timing section styles
  timingSummary: {
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  timingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  timingDetails: {
    paddingLeft: 22,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timingLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 100,
  },
  timingValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  useCalculatedButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calculatedButtonIcon: {
    marginRight: 4,
  },
  useCalculatedText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  
  // Address search styles
  addressSearchContainer: {
    marginBottom: 8,
    position: 'relative',
    zIndex: 20,
  },
  addressHelpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressHelpText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  searchBarContainer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'visible',
    marginBottom: 2,
    position: 'relative',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    position: 'relative',
    zIndex: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#1F2937',
    fontSize: 14,
    padding: 0,
    height: '100%',
    width: '100%',
    outline: 'none',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  searchContainerWrapper: {
    position: 'relative',
    zIndex: 100,
    marginBottom: 12,
  },
  absoluteResultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 200,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 300,
  },
  addressSearchResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: 200,
    padding: 4,
  },
  addressResultsScroll: {
    maxHeight: 200,
  },
  addressResultItem: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 4,
    marginVertical: 2,
    alignItems: 'center',
  },
  addressResultContent: {
    marginLeft: 12,
    flex: 1,
  },
  addressResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  addressResultAddress: {
    fontSize: 12,
    color: '#6B7280',
  },
  highlightedText: {
    fontWeight: 'bold',
    color: '#000000',
  },
  noResultsMessage: {
    padding: 12,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  
  // Stop list styles
  stopsList: {
    marginTop: 8,
    position: 'relative',
    width: '100%',
    minHeight: 100,
    boxSizing: 'border-box',
  },
  stopsListHeader: {
    marginBottom: 8,
    alignItems: 'center',
  },
  dragInstructions: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  noStopsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  stopNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3050ee', // Darker blue for better contrast
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4, // Increased opacity for more shadow
    shadowRadius: 3,
    elevation: 3
  },
  stopNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stopContent: {
    flex: 1,
    paddingVertical: 4,
    marginRight: 8,
  },
  stopInfo: {
    flex: 1,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  stopAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  stopEta: {
    fontSize: 12,
    color: '#4361ee',
    marginTop: 4,
    fontWeight: '500',
  },
  editStopForm: {
    flex: 1,
  },
  editStopInput: {
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    color: '#1F2937',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 0,
    marginBottom: 8,
    height: 40,
    width: '100%',
    boxSizing: 'border-box',
    textAlignVertical: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addressDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressDisplayLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 4,
    fontWeight: '500',
  },
  addressDisplayText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: 'bold',
    flex: 1,
  },
  doneEditingButton: {
    backgroundColor: '#4361ee',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  doneEditingText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  stopActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopActionButton: {
    padding: 6,
    marginLeft: 4,
  },
  deleteStopButton: {
    marginLeft: 8,
  },
  
  // Arrow button styles for reordering
  arrowButtons: {
    flexDirection: 'column',
    marginRight: 8,
  },
  arrowButton: {
    padding: 8,
    backgroundColor: '#D1D5DB',
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#E5E7EB',
  },
  
  // Drag items visual styles
  dragHandle: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  dragLine: {
    width: 16,
    height: 2,
    backgroundColor: '#9CA3AF',
    marginVertical: 1,
    borderRadius: 1,
  },
  stopCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  // Stop name container styles
  stopNameContainer: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  editStopTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 8,
  },
  
  // Skeleton loader styles
  skeletonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1D5DB',
    marginRight: 12,
  },
  skeletonContent: {
    flex: 1,
  },
  skeletonTitle: {
    height: 16,
    width: '80%',
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 12,
    width: '60%',
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#4361ee',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  saveButtonDisabled: {
    opacity: 0.7
  },
  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeIcon: {
    marginRight: 8,
  },
  selectContainer: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 0,
    borderColor: 'transparent',
    overflow: 'visible',
    marginBottom: 2,
    position: 'relative',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // New styles for form validation
  formLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requiredLabel: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderStyle: 'solid',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontStyle: 'italic',
  },
  errorMessageBar: {
    backgroundColor: '#FEE2E2',
    padding: 8,
    paddingRight: 4,
    borderRadius: 4,
    margin: 16,
    marginTop: 0,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorMessageContent: {
    flex: 1,
  },
  errorMessageText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  closeErrorButton: {
    padding: 4,
    borderRadius: 50,
  },
});