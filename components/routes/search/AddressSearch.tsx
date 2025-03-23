import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView, Animated, Platform } from 'react-native';
import { Search, MapPin, ChevronRight, Info } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { AddressResult, AddressSearchProps, FieldErrors } from '@/types/RouteTypes';
import { isValidAddress, highlightMatch } from '@/utils/ValidationUtils';
import styles, { webFocusReset } from '@/styles/RouteModalStyles';

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
        // Only process search if query has at least 2 characters
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
  
  // Handle search input change
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
  
  // Handle focus on search input
  const handleSearchFocus = () => {
    if (searchAddress.length > 0) {
      setShowAddressResults(true);
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
          ) : addressResults.length > 0 ? (
            // Results list with simple hover effect
            addressResults.map((result) => (
              <div 
                key={result.id}
                className="search-option"
                onClick={() => {
                  onSelectAddress(result);
                  setSearchAddress('');
                  setAddressResults([]);
                  setShowAddressResults(false);
                }}
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
  
  return (
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
  );
};

export default AddressSearch;