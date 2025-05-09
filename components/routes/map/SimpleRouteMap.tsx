import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { GOOGLE_MAPS_CONFIG } from '@/apiKeys';
import { StopItem } from '@/types/RouteTypes';
import { MapPin } from 'lucide-react';

interface SimpleRouteMapProps {
  stops: StopItem[];
  height?: number;
  width?: string | number;
  showHeader?: boolean;
}

/**
 * A simple route map component that uses an iframe to embed Google Maps
 * This approach is more reliable in modals and avoids DOM-related issues
 */
const SimpleRouteMap = ({ 
  stops, 
  height = 320, 
  width = '100%',
  showHeader = true 
}: SimpleRouteMapProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastMapUrlRef = useRef<string>('');
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mapLoadedRef = useRef(false);
  const iframeLoadedRef = useRef(false);

  // Get API key
  const apiKey = GOOGLE_MAPS_CONFIG.apiKey;
  
  // Early return content for various conditions
  const [content, setContent] = useState<React.ReactNode | null>(null);
  
  // Filter stops to only include those with coordinates
  const validStops = useMemo(() => {
    return stops.filter(stop => 
      stop.lat && stop.lng && 
      !isNaN(Number(stop.lat)) && !isNaN(Number(stop.lng))
    );
  }, [stops]);
  
  // Create the Google Maps URL - memoize to prevent unnecessary recalculations
  const mapUrl = useMemo(() => {
    // Skip if not in browser environment or if there are no stops
    if (Platform.OS !== 'web') {
      return '';
    }

    // Check API key
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return '';
    }

    // Check for stops
    if (!validStops || validStops.length === 0) {
      return '';
    }
    
    // Create a signature to prevent unnecessary URL generation
    const stopsSignature = validStops
      .map(stop => `${stop.lat},${stop.lng}`)
      .join('|');
    
    // Use places or directions API depending on number of stops
    let url;
    
    if (validStops.length >= 2) {
      // Use directions for multiple stops
      const origin = `${validStops[0].lat},${validStops[0].lng}`;
      const destination = `${validStops[validStops.length - 1].lat},${validStops[validStops.length - 1].lng}`;
      
      // Format any waypoints (stops between first and last)
      let waypointsParam = '';
      if (validStops.length > 2) {
        const waypoints = validStops
          .slice(1, validStops.length - 1)
          .map(stop => `${stop.lat},${stop.lng}`)
          .join('|');
        waypointsParam = `&waypoints=${waypoints}`;
      }
      
      // Use directions API without traffic - include timestamp to prevent caching issues
      url = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin}&destination=${destination}${waypointsParam}&mode=driving&avoid=highways&units=imperial&zoom=10`;
    } else {
      // Use place API for single stop
      const location = `${validStops[0].lat},${validStops[0].lng}`;
      url = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${location}&zoom=15`;
    }
    
    return url;
  }, [validStops, apiKey]);

  // Check conditions and set content
  useEffect(() => {
    if (Platform.OS !== 'web') {
      setContent(
        <View style={[styles.container, { height }]}>
          <ThemedText style={styles.placeholderText}>
            Map is only available in web environment
          </ThemedText>
        </View>
      );
      return;
    }

    // Check API key
    if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      setContent(
        <View style={[styles.container, { height }]}>
          <ThemedText style={styles.placeholderText}>
            Google Maps API key is missing or invalid
          </ThemedText>
        </View>
      );
      return;
    }

    // Check for stops
    if (!stops || stops.length === 0) {
      setContent(
        <View style={[styles.container, { height: showHeader ? height + 45 : height }]}>
          {showHeader && (
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <MapPin size={18} color="#4361ee" />
                <ThemedText style={styles.headerText}>
                  Route Map
                </ThemedText>
              </View>
            </View>
          )}
          <View style={styles.emptyStateContainer}>
            <ThemedText style={styles.emptyStateText}>
              Please add stops to display the map
            </ThemedText>
          </View>
        </View>
      );
      return;
    }
    
    if (validStops.length === 0) {
      setContent(
        <View style={[styles.container, { height: showHeader ? height + 45 : height }]}>
          {showHeader && (
            <View style={styles.header}>
              <View style={styles.headerTitle}>
                <MapPin size={18} color="#4361ee" />
                <ThemedText style={styles.headerText}>
                  Route Map
                </ThemedText>
              </View>
            </View>
          )}
          <View style={styles.emptyStateContainer}>
            <ThemedText style={styles.emptyStateText}>
              No stops with valid coordinates
            </ThemedText>
          </View>
        </View>
      );
      return;
    }
    
    // If we have a valid configuration, set content to null to render the map
    setContent(null);
  }, [apiKey, height, stops, validStops, showHeader]);

  // Update iframe only when mapUrl changes to avoid unnecessary reloads
  useEffect(() => {
    // Skip if no valid map URL or content is already set
    if (!mapUrl || content !== null) return;
    
    // Set loading state
    setIsLoading(true);
    
    // Clear any existing timeout
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
    
    console.log('Map URL generated, preparing to load iframe');
    
    // Immediate update for the initial load
    if (iframeRef.current && !lastMapUrlRef.current) {
      console.log('First load, setting iframe src immediately');
      iframeRef.current.src = mapUrl;
      lastMapUrlRef.current = mapUrl;
    } else {
      // Set a timeout to prevent too frequent updates for subsequent loads
      loadTimeoutRef.current = setTimeout(() => {
        if (iframeRef.current) {
          console.log('Loading iframe with URL');
          iframeRef.current.src = mapUrl;
          lastMapUrlRef.current = mapUrl;
        }
      }, 500); // Reduced timeout for quicker loading
    }
    
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, [mapUrl, content]);

  // Handle iframe loading and errors
  const handleLoad = () => {
    console.log('Map iframe loaded successfully');
    setIsLoading(false);
    iframeLoadedRef.current = true;
    mapLoadedRef.current = true;
  };

  const handleError = () => {
    console.error('Error loading map iframe');
    setIsLoading(false);
    iframeLoadedRef.current = true;
    setError('Failed to load map. Please check your API key and internet connection.');
  };

  // If we have early return content, show it
  if (content) {
    return content;
  }

  return (
    <View style={[styles.container, { height }]}>
      {isLoading && (
        <View style={{
          ...styles.loadingContainer,
          top: 0 // Changed from top: 45 to account for removed header
        }}>
          <ActivityIndicator size="large" color="#4361ee" />
          <ThemedText style={styles.loadingText}>Loading map...</ThemedText>
        </View>
      )}
      
      {error && (
        <View style={{
          ...styles.errorContainer,
          top: 0 // Changed from top: 45 to account for removed header
        }}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}
      
      {Platform.OS === 'web' && (
        <div
          style={{
            display: 'block', // Always display the container
            width: '100%',
            height: `${height}px`, // Removed showHeader condition
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          <iframe 
            ref={iframeRef}
            src=""
            width="100%"
            height="100%"
            style={{
              border: 'none',
              width: '100%',
              height: '100%',
              display: isLoading ? 'none' : 'block'
            }}
            frameBorder="0"
            allowFullScreen
            aria-hidden="false"
            title="Route Map"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    height: 45,
    backgroundColor: '#FFFFFF'
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerText: {
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 16
  },
  placeholderText: {
    color: '#6B7280',
    textAlign: 'center',
    padding: 20
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    height: '100%'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    padding: 20,
    fontWeight: '500'
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 10,
    color: '#4B5563'
  },
  errorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 20
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center'
  }
});

export default SimpleRouteMap; 