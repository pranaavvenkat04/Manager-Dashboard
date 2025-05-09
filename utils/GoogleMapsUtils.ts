import { AddressResult, StopItem } from '@/types/RouteTypes';
import { addMinutesToTime } from './TimeUtils';
import { GOOGLE_MAPS_CONFIG } from '@/apiKeys';

// Google Maps API key
const GOOGLE_MAPS_API_KEY = GOOGLE_MAPS_CONFIG.apiKey;

// Check if we have a valid API key
if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
  console.error('Google Maps API key is missing or invalid. Please check your apiKeys.js file.');
}

// Global variables to track script state
let isScriptLoaded = false;
let isLoadingScript = false;

// Add a cache to store directions results
const directionsCache = new Map();

// Generate a cache key from stops array
function generateCacheKey(stops: StopItem[]): string {
  return stops.map(stop => `${stop.id}|${stop.lat}|${stop.lng}`).join('-');
}

// Add typings for window and Google Maps
declare global {
  interface Window {
    [key: string]: any;
    google: {
      maps: {
        Map: any;
        Marker: any;
        InfoWindow: any;
        LatLngBounds: any;
        Geocoder: any;
        DirectionsService: any;
        DirectionsRenderer: any;
        DirectionsStatus: {
          OK: string;
        };
        MapMouseEvent: any;
        SymbolPath: {
          CIRCLE: any;
        };
        TravelMode: {
          DRIVING: string;
        };
        places: {
          PlacesService: any;
          PlacesServiceStatus: {
            OK: string;
          };
        };
        event: {
          removeListener(listener: any): void;
          addListenerOnce(instance: any, eventName: string, handler: Function): any;
          addListener(instance: any, eventName: string, handler: Function): any;
        }
      };
    };
  }
}

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
  }
}

/**
 * Loads the Google Maps JavaScript API
 */
export function loadGoogleMapsScript(callback: () => void): void {
  console.log('Enhanced loadGoogleMapsScript called, checking API presence...');
  
  // Validate API key first
  if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
    console.error('Google Maps API key is missing or invalid. Please check your apiKeys.js file.');
    callback(); // Call callback anyway to allow the app to handle the error gracefully
    return;
  }

  // If API is already loaded
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    console.log('Google Maps already loaded, running diagnostics and firing callback immediately');
    diagnoseGoogleMapsConnectivity();
    isScriptLoaded = true;
    callback();
    return;
  }
  
  // If already loading, don't load again
  if (isLoadingScript) {
    console.log('Google Maps script is already loading, waiting...');
    
    // Set up a timer to check if Maps is available
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        console.log('Google Maps is now available');
        isScriptLoaded = true;
        // Run diagnostics after successful load
        diagnoseGoogleMapsConnectivity();
        callback();
      } else if (document.getElementById('google-maps-script')?.getAttribute('data-loaded') === 'error') {
        console.error('Google Maps script loading encountered an error');
        isLoadingScript = false;
        callback();
      } else {
        setTimeout(checkGoogleMaps, 200);
      }
    };
    
    setTimeout(checkGoogleMaps, 200);
    return;
  }

  // Start loading the script
  if (typeof document !== 'undefined') {
    console.log('Loading Google Maps script');
    isLoadingScript = true;
    
    // Remove any existing script to avoid conflicts
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      console.log('Removing existing Google Maps script');
      existingScript.remove();
    }
    
    // Create global callback
    const callbackName = `initGoogleMaps${Date.now()}`;
    window[callbackName] = function() {
      console.log('Google Maps loaded via callback');
      isScriptLoaded = true;
      isLoadingScript = false;
      
      // Mark script as successfully loaded
      const script = document.getElementById('google-maps-script');
      if (script) {
        script.setAttribute('data-loaded', 'success');
      }
      
      // Run diagnostics after successful load
      diagnoseGoogleMapsConnectivity();
      
      callback();
      delete window[callbackName];
    };
    
    // Create script element
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;
    
    // Handle script loading errors
    script.onerror = (e) => {
      console.error('Error loading Google Maps script:', e);
      script.setAttribute('data-loaded', 'error');
      isLoadingScript = false;
      // Still call the callback to handle the error gracefully
      callback();
    };
    
    document.head.appendChild(script);
    
    // Set a safety timeout to prevent indefinite hanging
    setTimeout(() => {
      if (isLoadingScript && (!window.google || !window.google.maps)) {
        console.error('Google Maps script loading timed out');
        script.setAttribute('data-loaded', 'timeout');
        isLoadingScript = false;
        callback();
      }
    }, 10000); // 10-second timeout
  } else {
    callback();
  }
}

/**
 * Reset the Google Maps script
 */
export function resetGoogleMapsScript(): void {
  if (typeof document !== 'undefined') {
    const script = document.getElementById('google-maps-script');
    if (script) {
      script.remove();
    }
    
    isScriptLoaded = false;
    isLoadingScript = false;
    console.log('Google Maps script reset');
  }
}

/**
 * Geocode an address
 */
export function geocodeAddress(address: string): Promise<{lat: number, lng: number}> {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error('Google Maps not loaded'));
      return;
    }
    
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any, status: string) => {
      if (status === 'OK' && results && results[0] && results[0].geometry) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng()
        });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Calculate route timings using Google Maps API
 * @param stops Array of stops
 * @param startTime Start time string in format "HH:MM AM/PM"
 * @returns Promise with calculated values
 */
export async function calculateRouteTimingsWithGoogleAPI(
  stops: StopItem[], 
  startTime: string
): Promise<{
  updatedStops: StopItem[];
  totalDuration: number;
  calculatedEndTime: string;
  polylinePath?: string;
}> {
  // Make sure we have at least 2 stops
  if (stops.length < 2) {
    return {
      updatedStops: stops.map(stop => ({ ...stop, eta: startTime })),
      totalDuration: 0,
      calculatedEndTime: startTime
    };
  }
  
  // Make sure Google Maps is loaded
  if (!window.google || !window.google.maps) {
    return new Promise((resolve, reject) => {
      loadGoogleMapsScript(() => {
        calculateRouteTimingsWithGoogleAPI(stops, startTime)
          .then(resolve)
          .catch(reject);
      });
    });
  }
  
  // Generate a cache key for these stops
  const cacheKey = generateCacheKey(stops);
  
  // Check cache first
  if (directionsCache.has(cacheKey)) {
    console.log('Using cached directions result');
    const cachedResult = directionsCache.get(cacheKey);
    
    // Still need to recalculate ETAs based on current start time
    let totalDuration = 0;
    let currentTime = startTime;
    
    // Calculate ETAs using cached leg durations
    const updatedStops = stops.map((stop, index) => {
      if (index === 0) {
        return { ...stop, eta: startTime };
      }
      
      const legMinutes = cachedResult.legDurations[index - 1];
      const totalMinutes = legMinutes + 5; // 5 minutes dwell time
      
      totalDuration += totalMinutes;
      currentTime = addMinutesToTime(currentTime, totalMinutes);
      
      return { ...stop, eta: currentTime };
    });
    
    return {
      updatedStops,
      totalDuration,
      calculatedEndTime: addMinutesToTime(startTime, totalDuration),
      polylinePath: cachedResult.polylinePath
    };
  }
  
  return new Promise((resolve, reject) => {
    try {
      const directionsService = new window.google.maps.DirectionsService();
      
      // Prepare waypoints (all stops except first and last)
      const waypoints = stops.slice(1, -1).map(stop => ({
        location: { lat: stop.lat || 0, lng: stop.lng || 0 },
        stopover: true
      }));
      
      // Set up the request
      const request = {
        origin: { lat: stops[0].lat || 0, lng: stops[0].lng || 0 },
        destination: { lat: stops[stops.length - 1].lat || 0, lng: stops[stops.length - 1].lng || 0 },
        waypoints: waypoints,
        travelMode: window.google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      };
      
      console.log('Making new directions API request');
      
      // Execute the request
      directionsService.route(request, (result: any, status: string) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          // Get the total duration
          let totalDuration = 0;
          let currentTime = startTime;
          
          // Calculate ETAs for each stop
          const legs = result.routes[0].legs;
          
          // Store leg durations for cache
          const legDurations: number[] = [];
          
          const updatedStops = stops.map((stop, index) => {
            // First stop has ETA of start time
            if (index === 0) {
              return { ...stop, eta: startTime };
            }
            
            // Get duration from previous to current stop (in seconds)
            const legDuration = legs[index - 1].duration.value;
            
            // Convert to minutes and add dwell time (5 min per stop)
            const legMinutes = Math.ceil(legDuration / 60);
            legDurations.push(legMinutes);
            
            const totalMinutes = legMinutes + 5; // 5 minutes dwell time
            
            // Add to total duration
            totalDuration += totalMinutes;
            
            // Calculate ETA
            currentTime = addMinutesToTime(currentTime, totalMinutes);
            
            return { ...stop, eta: currentTime };
          });
          
          // Calculate the end time
          const calculatedEndTime = addMinutesToTime(startTime, totalDuration);
          
          // Get the encoded polyline path if available
          const polylinePath = result.routes[0].overview_polyline?.points;
          
          // Store in cache
          directionsCache.set(cacheKey, {
            legDurations,
            polylinePath
          });
          
          // If the cache gets too big, remove oldest entries
          if (directionsCache.size > 50) {
            const firstKey = directionsCache.keys().next().value;
            directionsCache.delete(firstKey);
          }
          
          resolve({
            updatedStops,
            totalDuration,
            calculatedEndTime,
            polylinePath
          });
        } else {
          console.error('Directions request failed:', status);
          reject(new Error(`Failed to calculate route: ${status}`));
        }
      });
    } catch (error) {
      console.error('Error calculating route timings:', error);
      reject(error);
    }
  });
}

/**
 * Search for places using Google Places API
 * @param query The search query
 * @param locationBias Optional location to bias results around (school location)
 */
export function searchPlaces(
  query: string, 
  locationBias?: { lat: number; lng: number; radius?: number }
): Promise<AddressResult[]> {
  return new Promise((resolve, reject) => {
    // Validate API key first
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      reject(new Error('Google Maps API key is missing or invalid. Please check your apiKeys.js file.'));
      return;
    }
    
    // Make sure Google Maps API is loaded
    if (!window.google || !window.google.maps) {
      // Load the Google Maps script first
      loadGoogleMapsScript(() => {
        // After loading, either search for places or reject if there was an error
        if (window.google && window.google.maps) {
          _performSearch(query, resolve, locationBias);
        } else {
          reject(new Error('Failed to load Google Maps API'));
        }
      });
    } else {
      _performSearch(query, resolve, locationBias);
    }
  });
}

// Helper function to perform search
function _performSearch(
  query: string, 
  callback: (results: AddressResult[]) => void,
  locationBias?: { lat: number; lng: number; radius?: number }
): void {
  try {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.error('Google Maps Places not available');
      callback([]);
      return;
    }
    
    const service = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );
    
    // Create the search request
    const searchRequest: any = { query };
    
    // Add location bias if provided
    if (locationBias) {
      // Create a location bias with the provided coordinates and radius (default 10km/10000m)
      const radius = locationBias.radius || 10000; // Default to 10km
      searchRequest.locationBias = {
        center: new google.maps.LatLng(locationBias.lat, locationBias.lng),
        radius
      };
    }
    
    service.textSearch(
      searchRequest,
      (results: any, status: string) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const addressResults: AddressResult[] = results.map((result: any) => ({
            id: result.place_id || `place-${Date.now()}-${Math.random()}`,
            name: result.name || 'Unknown Place',
            address: result.formatted_address || '',
            lat: result.geometry?.location?.lat() || 0,
            lng: result.geometry?.location?.lng() || 0
          }));
          callback(addressResults);
        } else {
          console.error('Places search failed:', status);
          callback([]);
        }
      }
    );
  } catch (error) {
    console.error('Error in places search:', error);
    callback([]);
  }
}

/**
 * Simple debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
}

/**
 * Try to force a reload of the Google Maps script
 */
export function reloadGoogleMapsScript(callback: () => void): void {
  console.log('Forcing Google Maps script reload');
  
  // Reset state
  isScriptLoaded = false;
  isLoadingScript = false;
  
  // Remove existing script
  if (typeof document !== 'undefined') {
    const script = document.getElementById('google-maps-script');
    if (script) {
      script.remove();
    }
    
    // Clear any Google objects
    if (window.google && window.google.maps) {
      try {
        // Instead of trying to delete or set undefined, use a different approach
        // that doesn't cause TypeScript errors
        if (window.google) {
          // @ts-ignore - This is a workaround to reset google maps
          window.google._mapsResetNeeded = true;
        }
      } catch (e) {
        console.error('Failed to clean up Google Maps object', e);
      }
    }
  }
  
  // Load script again after a short delay
  setTimeout(() => {
    loadGoogleMapsScript(callback);
  }, 300); // Increased delay to allow cleanup
}

/**
 * Check if the Google Maps API key is valid and working
 * @returns Promise that resolves with whether the key is valid
 */
export function checkGoogleMapsApiKey(): Promise<{isValid: boolean, message: string}> {
  return new Promise((resolve) => {
    // First check if we have a key
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_GOOGLE_MAPS_API_KEY') {
      resolve({
        isValid: false,
        message: 'Google Maps API key is missing or appears to be a placeholder'
      });
      return;
    }
    
    // Create a temporary callback
    const callbackName = `checkGoogleMapsApiKey${Date.now()}`;
    let timeoutId: number | null = null;
    
    // Create a success callback
    window[callbackName] = function() {
      if (timeoutId) clearTimeout(timeoutId);
      delete window[callbackName];
      
      // Remove the script tag
      const script = document.getElementById('google-maps-api-check');
      if (script) {
        script.remove();
      }
      
      resolve({
        isValid: true,
        message: 'Google Maps API key is valid'
      });
    };
    
    // Create script element with minimal libraries
    const script = document.createElement('script');
    script.id = 'google-maps-api-check';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=${callbackName}&loading=async`;
    
    // Handle error
    script.onerror = () => {
      if (timeoutId) clearTimeout(timeoutId);
      delete window[callbackName];
      
      // Remove the script tag
      script.remove();
      
      resolve({
        isValid: false,
        message: 'Google Maps API key appears to be invalid or restricted'
      });
    };
    
    // Set a timeout
    timeoutId = window.setTimeout(() => {
      delete window[callbackName];
      
      // Remove the script tag
      const scriptEl = document.getElementById('google-maps-api-check');
      if (scriptEl) {
        scriptEl.remove();
      }
      
      resolve({
        isValid: false,
        message: 'Google Maps API key validation timed out'
      });
    }, 5000);
    
    // Add the script to the page
    document.head.appendChild(script);
  });
}

// Add a diagnostic function to check API connectivity
export function diagnoseGoogleMapsConnectivity(): {
  isLoaded: boolean;
  isGoogleDefined: boolean;
  isMapsModuleDefined: boolean;
  hasMapConstructor: boolean;
  hasGeocoder: boolean;
  hasPlacesService: boolean;
  scriptElement: boolean;
  apiKey: string;
  apiKeyLength: number;
  apiStats: {
    placesRequests: number;
    geocodeRequests: number;
    directionsRequests: number;
    failedRequests: number;
    lastError: string | null;
  };
} {
  console.log('Running Google Maps API diagnostics...');
  
  const diagnosticResults = {
    isLoaded: false,
    isGoogleDefined: typeof window !== 'undefined' && !!window.google,
    isMapsModuleDefined: typeof window !== 'undefined' && !!window.google?.maps,
    hasMapConstructor: typeof window !== 'undefined' && !!window.google?.maps?.Map,
    hasGeocoder: typeof window !== 'undefined' && !!window.google?.maps?.Geocoder,
    hasPlacesService: typeof window !== 'undefined' && !!window.google?.maps?.places?.PlacesService,
    scriptElement: typeof document !== 'undefined' && !!document.getElementById('google-maps-script'),
    apiKey: GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.substring(0, 8) + '...' : 'NOT SET',
    apiKeyLength: GOOGLE_MAPS_API_KEY ? GOOGLE_MAPS_API_KEY.length : 0,
    apiStats: {
      placesRequests: 0,
      geocodeRequests: 0,
      directionsRequests: 0,
      failedRequests: 0,
      lastError: null as string | null
    }
  };
  
  diagnosticResults.isLoaded = diagnosticResults.isGoogleDefined && 
                              diagnosticResults.isMapsModuleDefined && 
                              diagnosticResults.hasMapConstructor;
  
  console.log('Google Maps Diagnostics:', diagnosticResults);
  
  // Override API methods to count API calls for diagnostic purposes
  if (diagnosticResults.isLoaded) {
    try {
      // Count Places API requests
      if (window.google.maps.places && window.google.maps.places.PlacesService) {
        const originalTextSearch = window.google.maps.places.PlacesService.prototype.textSearch;
        window.google.maps.places.PlacesService.prototype.textSearch = function(request: any, callback: any) {
          console.log('Places API request:', request);
          diagnosticResults.apiStats.placesRequests++;
          return originalTextSearch.call(this, request, (results: any, status: string, pagination: any) => {
            if (status !== 'OK') {
              diagnosticResults.apiStats.failedRequests++;
              diagnosticResults.apiStats.lastError = `Places API error: ${status}`;
              console.error('Places API error:', status);
            }
            callback(results, status, pagination);
          });
        };
      }
      
      // Count Geocoding API requests
      if (window.google.maps.Geocoder) {
        const originalGeocode = window.google.maps.Geocoder.prototype.geocode;
        window.google.maps.Geocoder.prototype.geocode = function(request: any, callback: any) {
          console.log('Geocoding API request:', request);
          diagnosticResults.apiStats.geocodeRequests++;
          return originalGeocode.call(this, request, (results: any, status: string) => {
            if (status !== 'OK') {
              diagnosticResults.apiStats.failedRequests++;
              diagnosticResults.apiStats.lastError = `Geocoding API error: ${status}`;
              console.error('Geocoding API error:', status);
            }
            callback(results, status);
          });
        };
      }
      
      // Count Directions API requests
      if (window.google.maps.DirectionsService) {
        const originalRoute = window.google.maps.DirectionsService.prototype.route;
        window.google.maps.DirectionsService.prototype.route = function(request: any, callback: any) {
          console.log('Directions API request:', request);
          diagnosticResults.apiStats.directionsRequests++;
          return originalRoute.call(this, request, (results: any, status: string) => {
            if (status !== 'OK') {
              diagnosticResults.apiStats.failedRequests++;
              diagnosticResults.apiStats.lastError = `Directions API error: ${status}`;
              console.error('Directions API error:', status);
            }
            callback(results, status);
          });
        };
      }
    } catch (e) {
      console.error('Error setting up API monitoring:', e);
    }
  }
  
  return diagnosticResults;
}

/**
 * Create markers for stops on a map
 * @param map The Google Map instance
 * @param stops Array of stops to create markers for
 * @param options Options for marker customization
 * @returns Array of created markers
 */
export function createStopMarkers(
  map: google.maps.Map,
  stops: StopItem[],
  options: {
    onMarkerDrag?: (stopId: string, position: { lat: number; lng: number; address: string }) => void;
  } = {}
): google.maps.Marker[] {
  // Return early if map is not valid
  if (!map) {
    console.error('Invalid map instance provided to createStopMarkers');
    return [];
  }

  const markers: google.maps.Marker[] = [];
  const bounds = new google.maps.LatLngBounds();
  let hasValidBounds = false;
  
  stops.forEach((stop, index) => {
    if (stop.lat && stop.lng) {
      const position = { lat: stop.lat, lng: stop.lng };
      bounds.extend(position);
      hasValidBounds = true;
      
      // Create custom marker
      const marker = new google.maps.Marker({
        position,
        map: map,
        title: stop.name,
        label: {
          text: (index + 1).toString(),
          color: '#ffffff',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: index === 0 ? '#10b981' : (index === stops.length - 1 ? '#ef4444' : '#4361ee'),
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#ffffff',
          scale: 12
        },
        draggable: !!options.onMarkerDrag
      });
      
      // Add info window with stop details
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${stop.name}</div>
            <div style="font-size: 12px; color: #666;">${stop.address}</div>
            ${stop.eta ? `<div style="font-size: 12px; margin-top: 4px;">ETA: ${stop.eta}</div>` : ''}
          </div>
        `
      });
      
      // Show info window on click
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      // Handle marker drag if callback provided
      if (options.onMarkerDrag) {
        marker.addListener('dragend', () => {
          const position = marker.getPosition();
          if (position) {
            const lat = position.lat();
            const lng = position.lng();
            
            // Get address from lat/lng
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
              if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                options.onMarkerDrag!(stop.id, { lat, lng, address });
              } else {
                options.onMarkerDrag!(stop.id, { lat, lng, address: 'Unknown location' });
              }
            });
          }
        });
      }
      
      markers.push(marker);
    }
  });
  
  // Fit bounds if we have at least one valid marker
  if (hasValidBounds && markers.length > 0) {
    try {
      map.fitBounds(bounds);
      
      // If only one marker, set zoom level
      if (markers.length === 1) {
        map.setZoom(15);
      }
    } catch (error) {
      console.error('Error fitting bounds to map:', error);
    }
  }
  
  return markers;
}

/**
 * Create a route between stops
 * @param map The Google Map instance
 * @param stops Array of stops
 * @returns Promise with route details
 */
export function createRoute(
  map: google.maps.Map,
  stops: StopItem[]
): Promise<{
  directionsRenderer: google.maps.DirectionsRenderer;
  response: google.maps.DirectionsResult;
}> {
  return new Promise((resolve, reject) => {
    // Return early if map is not valid
    if (!map) {
      reject(new Error('Invalid map instance provided to createRoute'));
      return;
    }
    
    // Need at least 2 stops for a route
    if (stops.length < 2) {
      reject(new Error('At least 2 stops with coordinates are required for a route'));
      return;
    }
    
    // Get valid stops that have lat/lng
    const validStops = stops.filter(stop => stop.lat && stop.lng);
    if (validStops.length < 2) {
      reject(new Error('At least 2 stops with valid coordinates are required for a route'));
      return;
    }
    
    try {
      // Create directions service and renderer
      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true, // We'll use our custom markers
        polylineOptions: {
          strokeColor: '#4361ee',
          strokeWeight: 5,
          strokeOpacity: 0.7
        }
      });
      
      // Create waypoints (all stops except first and last)
      const waypoints = validStops.slice(1, -1).map(stop => ({
        location: new google.maps.LatLng(stop.lat || 0, stop.lng || 0),
        stopover: true
      }));
      
      // Create request
      const request = {
        origin: new google.maps.LatLng(validStops[0].lat || 0, validStops[0].lng || 0),
        destination: new google.maps.LatLng(
          validStops[validStops.length - 1].lat || 0, 
          validStops[validStops.length - 1].lng || 0
        ),
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false
      };
      
      // Calculate route
      directionsService.route(request, (response, status) => {
        if (status === 'OK' && response) {
          directionsRenderer.setDirections(response);
          resolve({ directionsRenderer, response });
        } else {
          console.error('Directions request failed:', status);
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    } catch (error) {
      console.error('Error creating route:', error);
      reject(error);
    }
  });
} 