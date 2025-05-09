import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Platform, Alert } from 'react-native';
import { MapPin, Maximize, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { RouteMapProps, StopItem } from '@/types/RouteTypes';
import { formatDuration } from '@/utils/TimeUtils';
import { 
  loadGoogleMapsScript,
  createStopMarkers,
  createRoute,
  diagnoseGoogleMapsConnectivity 
} from '@/utils/GoogleMapsUtils';
import { Theme } from '@/constants/Colors';

// Special flag to track map initialization attempts
let mapInitAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Extend MarkerOptions to include the label property
declare global {
  namespace google.maps {
    interface MarkerOptions {
      label?: string | {
        text: string;
        color?: string;
        fontWeight?: string;
        fontSize?: string;
        fontFamily?: string;
      };
    }
    
    interface LatLngBounds {
      getNorthEast(): any;
      getSouthWest(): any;
    }

    // Add interface for map options to properly type zoomControl
    interface MapOptions {
      zoomControl?: boolean;
      styles?: Array<{
        featureType?: string;
        elementType?: string;
        stylers: Array<{[key: string]: any}>;
      }>;
    }
  }
}

/**
 * Route map component that displays the route on a map using Google Maps
 */
const RouteMap = ({ 
  stops = [], 
  estimatedDuration = 0,
  onStopDrag,
  onMapClick
}: RouteMapProps) => {
  // Use a ref to store the actual DOM element
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Initialize Google Maps after the container is available
  useEffect(() => {
    // Skip if not in browser environment
    if (Platform.OS !== 'web') {
      setIsMapLoading(false);
      setError('Map is only available in web environment');
      return;
    }

    // Only proceed if container ref is available and we've marked the DOM as ready
    if (!mapContainerRef.current || !mapReady) {
      return;
    }

    // Increment attempt counter
    mapInitAttempts++;
    console.log(`Map init effect triggered (attempt ${mapInitAttempts}/${MAX_INIT_ATTEMPTS})`);
    
    if (isMapLoaded && googleMapRef.current) {
      console.log("Map already initialized");
      return;
    }
    
    async function setupMap() {
      try {
        // Load Google Maps script if not already loaded
        if (!window.google || !window.google.maps) {
          await new Promise<void>((resolve) => {
            loadGoogleMapsScript(() => {
              resolve();
            });
          });
        }

        const mapContainer = mapContainerRef.current;
        if (!mapContainer) {
          throw new Error("Map container element not found");
        }

        console.log("Creating map with container", mapContainer);
        
        // Create a new map instance
        const map = new google.maps.Map(mapContainer, {
          center: { lat: 40.7128, lng: -74.0060 }, // Default to New York
          zoom: 12,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });
        
        if (!map) {
          throw new Error("Failed to create map instance");
        }
        
        googleMapRef.current = map;
        
        // Add click handler to map for adding new stops
        if (onMapClick) {
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              
              // Reverse geocode to get address
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                  const address = results[0].formatted_address;
                  const name = results[0].address_components?.[0]?.short_name || 'New Location';
                  
                  // Call the callback with a new stop
                  onMapClick({
                    id: `stop-${Date.now()}`,
                    name: name,
                    address: address || 'Unknown Address',
                    lat,
                    lng
                  });
                } else {
                  onMapClick({
                    id: `stop-${Date.now()}`,
                    name: 'New Stop',
                    address: 'Unknown Address',
                    lat,
                    lng
                  });
                }
              });
            }
          });
        }
        
        console.log("Map initialization complete");
        mapInitAttempts = 0; // Reset attempts on success
        setIsMapLoaded(true);
        setIsMapLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        
        // If we've reached max attempts, show error to user
        if (mapInitAttempts >= MAX_INIT_ATTEMPTS) {
          setError(`Failed to initialize map after ${MAX_INIT_ATTEMPTS} attempts. Please try refreshing the page.`);
          setIsMapLoading(false);
        } else {
          // Try again after a delay
          console.log(`Retrying map initialization (attempt ${mapInitAttempts}/${MAX_INIT_ATTEMPTS})`);
          setTimeout(() => {
            setIsMapLoading(true);
            setupMap();
          }, 1000);
        }
      }
    }
    
    // Start map initialization
    setupMap();
    
    // Cleanup function
    return () => {
      console.log("Map cleanup triggered");
      // Clear any markers
      if (markersRef.current) {
        markersRef.current.forEach(marker => marker.setMap(null));
      }
      markersRef.current = [];
      
      // Clear directions renderer
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
      }
      directionsRendererRef.current = null;
      
      // Clear map reference
      googleMapRef.current = null;
    };
  }, [mapReady, onMapClick]);
  
  // Mark DOM as ready after a short delay once component is mounted
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Give the DOM a moment to render the container
      const timer = setTimeout(() => {
        setMapReady(true);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Update markers and route when stops change
  useEffect(() => {
    if (!isMapLoaded || !googleMapRef.current) return;
    
    // Clear existing markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    }
    
    // Clear existing route
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    
    // Exit if no stops
    if (stops.length === 0) {
      return;
    }
    
    const map = googleMapRef.current;
    
    // Create markers for stops
    const markers = createStopMarkers(map, stops, {
      onMarkerDrag: onStopDrag
    });
    markersRef.current = markers;
    
    // Create route if we have at least 2 stops
    if (stops.length >= 2) {
      createRoute(map, stops)
        .then(({ directionsRenderer }) => {
          directionsRendererRef.current = directionsRenderer;
        })
        .catch(error => {
          console.error('Error creating route:', error);
        });
    }
  }, [stops, isMapLoaded, onStopDrag]);
  
  // Handle map expansion
  useEffect(() => {
    if (isExpanded && googleMapRef.current && isMapLoaded) {
      // Trigger resize to ensure map renders correctly
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        
        // Recenter map if we have stops
        if (stops.length > 0 && googleMapRef.current) {
          const bounds = new google.maps.LatLngBounds();
          let hasValidStops = false;
          
          stops.forEach(stop => {
            if (stop.lat && stop.lng) {
              bounds.extend({ lat: stop.lat, lng: stop.lng });
              hasValidStops = true;
            }
          });
          
          if (hasValidStops) {
            googleMapRef.current.fitBounds(bounds);
          }
        }
      }, 100);
    }
  }, [isExpanded, stops, isMapLoaded]);
  
  // Render map header
  const renderHeader = () => (
    <View style={styles.mapHeader}>
      <View style={styles.mapTitle}>
        <MapPin size={18} color="#4361ee" />
        <ThemedText style={styles.mapTitleText}>
          Route Map {stops.length > 0 ? `(${stops.length} stops)` : ''}
        </ThemedText>
      </View>
      
      <View style={styles.mapActions}>
        {isMapLoaded && (
          <>
            <TouchableOpacity 
              style={styles.mapAction}
              onPress={() => {
                if (googleMapRef.current) {
                  const currentZoom = googleMapRef.current.getZoom() || 10;
                  googleMapRef.current.setZoom(currentZoom - 1);
                }
              }}
              className="mapAction"
            >
              <ZoomOut size={18} color="#374151" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapAction}
              onPress={() => {
                if (googleMapRef.current) {
                  const currentZoom = googleMapRef.current.getZoom() || 10;
                  googleMapRef.current.setZoom(currentZoom + 1);
                }
              }}
              className="mapAction"
            >
              <ZoomIn size={18} color="#374151" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.mapAction}
              onPress={() => setIsExpanded(!isExpanded)}
              className="mapAction"
            >
              <Maximize size={18} color="#374151" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
  
  // Render loading state
  const renderLoading = () => (
    <View style={styles.mapLoadingContainer}>
      <ActivityIndicator size="large" color="#4361ee" />
      <ThemedText style={styles.mapLoadingText}>Loading map...</ThemedText>
    </View>
  );
  
  // Render error state
  const renderError = () => (
    <View style={styles.mapErrorContainer}>
      <AlertCircle size={32} color={Theme.colors.error} />
      <ThemedText style={styles.mapErrorText}>{error}</ThemedText>
      <TouchableOpacity 
        style={styles.mapRetryButton}
        onPress={() => {
          setIsMapLoading(true);
          setError('');
          mapInitAttempts = 0;
          
          // Force reload Google Maps script
          loadGoogleMapsScript(() => {
            // Map will be reinitialized by the useEffect
            setIsMapLoaded(false);
            setMapReady(true); // Make sure we marked it as ready
          });
        }}
      >
        <ThemedText style={styles.mapRetryButtonText}>Retry</ThemedText>
      </TouchableOpacity>
    </View>
  );
  
  // Render the map itself
  const renderMap = () => {
    // If we're not in a web environment, show a placeholder
    if (Platform.OS !== 'web') {
      return (
        <View style={styles.mapContent}>
          <ThemedText>Map is only available in web environment</ThemedText>
        </View>
      );
    }
    
    return (
      <View style={styles.mapContent}>
        {/* Map container using ref instead of ID */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%', 
            height: '100%',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
          className="google-maps-container"
        />
        
        {/* Duration overlay */}
        {isMapLoaded && estimatedDuration > 0 && (
          <View style={styles.durationOverlay}>
            <ThemedText style={styles.durationText}>
              Estimated Duration: {formatDuration(estimatedDuration)}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };
  
  return (
    <View 
      style={[
        styles.mapContainer,
        isExpanded && styles.mapContainerExpanded
      ]}
      className={isExpanded ? 'mapSectionExpanded' : undefined}
    >
      {renderHeader()}
      
      {isMapLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : (
        renderMap()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 320
  },
  mapContainerExpanded: {
    position: 'fixed',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    height: 'auto',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  mapTitle: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  mapTitleText: {
    marginLeft: 8,
    fontWeight: '500',
    fontSize: 16
  },
  mapActions: {
    flexDirection: 'row',
    gap: 8
  },
  mapAction: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  mapContent: {
    flex: 1,
    position: 'relative',
    height: 260
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 260
  },
  mapLoadingText: {
    marginTop: 12,
    color: '#4B5563'
  },
  mapErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 260,
    padding: 16
  },
  mapErrorText: {
    marginTop: 8,
    marginBottom: 16,
    color: Theme.colors.error,
    textAlign: 'center'
  },
  mapRetryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4361ee',
    borderRadius: 4
  },
  mapRetryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500'
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    padding: 8
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500'
  }
});

export default RouteMap;