import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView, Animated, Platform, ActivityIndicator } from 'react-native';
import { Search, MapPin, ChevronRight, Info } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { AddressResult, AddressSearchProps, FieldErrors } from '@/types/RouteTypes';
import { isValidAddress, highlightMatch } from '@/utils/ValidationUtils';
import { searchPlaces, debounce } from '@/utils/GoogleMapsUtils';
import { getManagerSchool, auth } from '@/utils/firebase';
import styles, { webFocusReset } from '@/styles/RouteModalStyles';
import { useSchoolContext } from '@/components/SchoolProvider';
import { getDoc } from 'firebase/firestore';

// Define school location type to match potential Firestore data structures
interface SchoolLocation {
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
}

// Define a type for the school data returned from getSchool
interface SchoolData {
  id: string;
  name?: string;
  location?: SchoolLocation;
  [key: string]: any;
}

// Type for the Manager-School relationship
interface SchoolInfo {
  schoolId: string;
  schoolRef: any;
  schoolData: {
    id?: string;
    name?: string;
    location?: SchoolLocation;
    [key: string]: any;
  };
}

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

const AddressSearch = ({ onSelectAddress, fieldErrors }: AddressSearchProps) => {
  const [searchAddress, setSearchAddress] = useState('');
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [showAddressResults, setShowAddressResults] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<{lat: number, lng: number} | null>(null);
  
  // Get school context
  const { schoolId } = useSchoolContext();
  
  // Load school location on component mount
  useEffect(() => {
    async function fetchSchoolLocation() {
      try {
        // Get the current user's school data directly through manager relation
        // Get the current user's UID if available
        const currentUser = auth?.currentUser;
        if (!currentUser) {
          console.log('No user logged in, using unbiased search');
          return;
        }
        
        const schoolInfo = await getManagerSchool(currentUser.uid) as SchoolInfo | null;
        
        if (!schoolInfo) {
          console.log('Could not determine school, using unbiased search');
          return;
        }
        
        // School data should be directly accessible from the returned object
        const schoolData = schoolInfo.schoolData;
        
        // Check if the school has a location field
        if (schoolData && typeof schoolData === 'object') {
          console.log('School data retrieved:', JSON.stringify(schoolData, (key, value) => 
            key === 'location' ? '[Location Object]' : value
          ));
          
          // The location might be stored in different formats
          if (schoolData.location) {
            console.log('School location found:', schoolData.location);
            
            // Check for different location formats
            if ('lat' in schoolData.location && schoolData.location.lat !== undefined && 
                'lng' in schoolData.location && schoolData.location.lng !== undefined) {
              // Already in the right format
              setSchoolLocation({
                lat: schoolData.location.lat,
                lng: schoolData.location.lng
              });
              console.log('Setting school location to:', schoolData.location);
            } else if ('latitude' in schoolData.location && schoolData.location.latitude !== undefined && 
                       'longitude' in schoolData.location && schoolData.location.longitude !== undefined) {
              // GeoPoint format
              setSchoolLocation({
                lat: schoolData.location.latitude,
                lng: schoolData.location.longitude
              });
              console.log('Setting school location from GeoPoint:', {
                lat: schoolData.location.latitude,
                lng: schoolData.location.longitude
              });
            } else {
              console.log('School location has unknown format:', schoolData.location);
            }
          } else {
            console.log('No location data found in school document');
          }
        } else {
          console.log('Invalid school data format:', schoolData);
        }
      } catch (error) {
        console.error('Error getting school location:', error);
        // Don't display the error to the user, just continue with no location bias
      }
    }
    
    fetchSchoolLocation();
  }, [schoolId]);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-10)).current;
  
  // Refs for the DOM elements
  const searchInputRef = useRef<any>(null);
  const searchResultsRef = useRef<any>(null);

  // Function to handle clicks outside the search results (web only)
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
  
  // Set up event listener for clicks (web only)
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [handleClickOutside]);

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

  // Debounced function to search for addresses using Google Places API
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      // Only search if the query is at least 2 characters
      if (query.length >= 2) {
        setIsSearchLoading(true);
        setSearchError(null);
        try {
          // Use school location for biased search if available
          const results = await searchPlaces(query, schoolLocation || undefined);
          setAddressResults(results);
        } catch (error) {
          console.error('Error searching for places:', error);
          setAddressResults([]);
          setSearchError(error instanceof Error ? error.message : 'Failed to search for addresses');
        } finally {
          setIsSearchLoading(false);
        }
      } else {
        setAddressResults([]);
        setIsSearchLoading(false);
      }
    }, 300), // Debounce by 300ms
    [schoolLocation]
  );
  
  // Handle search input change
  const handleSearchChange = (text: string) => {
    setSearchAddress(text);
    
    // Show the dropdown as soon as the user starts typing
    if (text.length > 0) {
      setShowAddressResults(true);
      setIsSearchLoading(true);
      debouncedSearch(text);
    } else {
      setShowAddressResults(false);
      setAddressResults([]);
    }
  };
  
  // Handle focus on search input
  const handleSearchFocus = () => {
    if (searchAddress.length > 0) {
      setShowAddressResults(true);
      // If we already have input but no results, trigger a search
      if (addressResults.length === 0 && searchAddress.length >= 2) {
        setIsSearchLoading(true);
        debouncedSearch(searchAddress);
      }
    }
  };
  
  // Render address search results with animation
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
          ) : searchError ? (
            // Error state
            <View style={styles.noResultsMessage}>
              <Info size={16} color="#EF4444" />
              <ThemedText style={[styles.noResultsText, { color: '#EF4444' }]}>
                {searchError}
              </ThemedText>
            </View>
          ) : addressResults.length > 0 ? (
            // Results list with simple hover effect
            addressResults.map((result) => (
              <TouchableOpacity 
                key={result.id}
                style={styles.searchOption}
                className="search-option"
                onPress={() => {
                  onSelectAddress(result);
                  setSearchAddress('');
                  setAddressResults([]);
                  setShowAddressResults(false);
                }}
              >
                <View className="search-icon">
                  <MapPin size={18} color="#4361ee" />
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <ThemedText style={styles.searchOptionName} className="search-option-name">
                    {result.name}
                  </ThemedText>
                  <ThemedText style={styles.searchOptionAddress} className="search-option-address">
                    {result.address}
                  </ThemedText>
                </View>
                <View className="search-icon" style={{ marginLeft: 'auto' }}>
                  <ChevronRight size={16} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
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
  
  return (
    <View style={styles.addressSearchContainer}>
      {/* Help text */}
      <View style={styles.addressHelpContainer}>
        <Info size={14} color="#6B7280" />
        <ThemedText style={styles.addressHelpText}>
        Search for a location to add stops to your route
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
  );
};

export default AddressSearch;