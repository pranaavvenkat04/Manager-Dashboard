import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { MapPin, ZoomIn, ZoomOut } from 'lucide-react';

import { ThemedText } from '@/components/ThemedText';
import { loadGoogleMapsScript } from '@/utils/GoogleMapsUtils';
import { Theme } from '@/constants/Colors';

// Extend Google Maps types to avoid TypeScript errors
declare global {
  namespace google.maps {
    interface Map {
      setCenter(latLng: google.maps.LatLng | google.maps.LatLngLiteral): void;
      getZoom(): number;
      setZoom(zoom: number): void;
      fitBounds(bounds: google.maps.LatLngBounds): void;
    }
    
    interface Marker {
      setPosition(latLng: google.maps.LatLng | google.maps.LatLngLiteral): void;
      getPosition(): google.maps.LatLng;
      setMap(map: google.maps.Map | null): void;
      addListener(eventName: string, handler: Function): google.maps.MapsEventListener;
    }
    
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    
    interface MapsEventListener {
      remove(): void;
    }
  }
}

interface SchoolMapProps {
  schoolLocation: {
    lat: number;
    lng: number;
    name: string;
  };
  height?: number;
}

/**
 * A simple map component that displays a marker at the school location
 */
const SchoolMap = ({ 
  schoolLocation = {
    lat: 40.7128, 
    lng: -74.0060, 
    name: 'Default School Location'
  },
  height = 300
}: SchoolMapProps) => {
  // Use refs to maintain reference to the map container and map instance
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  
  // Component state
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Initialize map after component mounts and container ref is available
  useEffect(() => {
    // Skip if not in browser environment
    if (typeof window === 'undefined') {
      console.log('Not in browser environment, skipping map initialization');
      return;
    }
    
    // Function to initialize map once Google Maps is loaded
    const initializeMap = () => {
      console.log('Initializing map...');
      
      // Check if map container ref is available
      if (!mapContainerRef.current) {
        console.error('Map container ref is not available');
        setError('Could not find map container');
        setIsMapLoading(false);
        return;
      }
      
      // Check if Google Maps is loaded
      if (!window.google || !window.google.maps) {
        console.error('Google Maps API not loaded');
        setError('Google Maps failed to load');
        setIsMapLoading(false);
        return;
      }
      
      try {
        // Create new map centered at school location
        console.log('Creating map with container:', mapContainerRef.current);
        const map = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: schoolLocation.lat, lng: schoolLocation.lng },
          zoom: 15,
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
        
        // Create marker for school location
        const marker = new window.google.maps.Marker({
          position: { lat: schoolLocation.lat, lng: schoolLocation.lng },
          map: map,
          title: schoolLocation.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: '#4361ee',
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 12
          }
        });
        
        // Add info window with school details
        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 4px;">${schoolLocation.name}</div>
              <div style="font-size: 12px; color: #666;">School Location</div>
            </div>
          `
        });
        
        // Show info window on marker click
        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
        
        // Store refs for later use
        googleMapRef.current = map;
        markerRef.current = marker;
        
        // Update component state
        setIsMapLoaded(true);
        setIsMapLoading(false);
        console.log('Map successfully created');
      } catch (err) {
        console.error('Error creating map:', err);
        setError('Error creating map: ' + (err instanceof Error ? err.message : String(err)));
        setIsMapLoading(false);
      }
    };
    
    // Load Google Maps script and then initialize map
    const loadAndInitMap = () => {
      setIsMapLoading(true);
      console.log('Loading Google Maps API...');
      
      // Load Google Maps script
      loadGoogleMapsScript(() => {
        console.log('Google Maps script loaded, initializing map in 500ms...');
        // Delay initialization to ensure DOM is ready
        setTimeout(initializeMap, 500);
      });
    };
    
    // If Google Maps is already loaded, initialize map directly
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded, initializing map directly');
      setTimeout(initializeMap, 500);
    } else {
      // Otherwise load the script first
      loadAndInitMap();
    }
    
    // Cleanup function
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      googleMapRef.current = null;
      markerRef.current = null;
      console.log('Map cleanup complete');
    };
  }, [schoolLocation]);
  
  // Update marker position when school location changes
  useEffect(() => {
    if (isMapLoaded && googleMapRef.current && markerRef.current) {
      const position = { lat: schoolLocation.lat, lng: schoolLocation.lng };
      
      // Update marker position
      markerRef.current.setPosition(position);
      
      // Center map on new position
      googleMapRef.current.setCenter(position);
    }
  }, [schoolLocation, isMapLoaded]);
  
  // Render map header
  const renderHeader = () => (
    <View style={styles.mapHeader}>
      <View style={styles.mapTitle}>
        <MapPin size={18} color="#4361ee" />
        <ThemedText style={styles.mapTitleText}>
          School Location
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
            >
              <ZoomIn size={18} color="#374151" />
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
      <MapPin size={24} color={Theme.colors.error} />
      <ThemedText style={styles.mapErrorText}>{error}</ThemedText>
    </View>
  );
  
  return (
    <View style={[styles.mapSection, { height }]}>
      {renderHeader()}
      
      <View style={styles.mapContainer}>
        {isMapLoading && renderLoading()}
        {error && renderError()}
        
        {/* Map container - this is where the map will be rendered */}
        <View style={styles.mapWrapper}>
          {Platform.OS === 'web' && (
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
          )}
          
          {Platform.OS !== 'web' && (
            <View style={{ width: '100%', height: '100%' }}>
              <ThemedText>Maps are only supported on web platform</ThemedText>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapSection: {
    borderRadius: 8,
    backgroundColor: Theme.colors.background.secondary,
    overflow: 'hidden',
    marginBottom: 16,
    width: '100%',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border.light,
  },
  mapTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapTitleText: {
    marginLeft: 8,
    fontWeight: '600',
  },
  mapActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapAction: {
    padding: 8,
    marginLeft: 4,
    borderRadius: 4,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    width: '100%',
  },
  mapWrapper: {
    flex: 1,
    overflow: 'hidden',
    width: '100%',
    height: '100%',
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 10,
  },
  mapLoadingText: {
    marginTop: 12,
    fontWeight: '500',
  },
  mapErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background.secondary,
    zIndex: 10,
  },
  mapErrorText: {
    marginTop: 12,
    color: Theme.colors.error,
    textAlign: 'center',
  }
});

export default SchoolMap; 