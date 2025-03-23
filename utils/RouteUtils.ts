import { StopItem } from '../types/RouteTypes';
import { AVERAGE_SPEED_KMH, STOP_DWELL_TIME, addMinutesToTime, getMockDistance } from './TimeUtils';

/**
 * Generates a random route key
 * @returns Random route key string in format "RT1234"
 */
export const generateRandomRouteKey = (): string => {
  return `RT${1000 + Math.floor(Math.random() * 9000)}`;
};

/**
 * Calculates route timings for all stops
 * @param stops Array of stops
 * @param startTime Start time string in format "HH:MM AM/PM"
 * @returns Object with calculated values
 */
export const calculateRouteTimings = (stops: StopItem[], startTime: string): {
  updatedStops: StopItem[];
  totalDuration: number;
  calculatedEndTime: string;
} => {
  let totalDuration = 0;
  
  // Calculate time between stops based on distances
  // In a real implementation, this would use Google Directions API
  
  // Create updated stops with ETAs
  let currentTime = startTime;
  const updatedStops = stops.map((stop, index) => {
    // First stop has ETA of start time
    if (index === 0) {
      return { ...stop, eta: startTime };
    }
    
    // For other stops, calculate based on previous stop
    // Get mock distance between stops
    const mockDistanceKm = getMockDistance();
    
    // Time to travel from previous stop (hours) = distance / speed
    const travelTimeHours = mockDistanceKm / AVERAGE_SPEED_KMH;
    
    // Convert to minutes
    const travelTimeMinutes = Math.round(travelTimeHours * 60);
    
    // Add dwell time at previous stop
    const totalTimeFromPreviousStop = travelTimeMinutes + STOP_DWELL_TIME;
    
    // Add to total duration
    totalDuration += totalTimeFromPreviousStop;
    
    // Calculate ETA
    currentTime = addMinutesToTime(currentTime, totalTimeFromPreviousStop);
    
    return { ...stop, eta: currentTime };
  });
  
  // Calculate end time
  const calculatedEndTime = addMinutesToTime(startTime, totalDuration);
  
  return {
    updatedStops,
    totalDuration,
    calculatedEndTime
  };
};

/**
 * Mock function to fetch driver data
 * In a real implementation, this would fetch from Firebase
 * @returns Promise resolving to array of drivers
 */
export const fetchDrivers = (): Promise<{ id: string; name: string; }[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'unassigned', name: 'Unassigned' },
        { id: 'driver1', name: 'Driver 1' },
        { id: 'driver2', name: 'Driver 2' },
        { id: 'driver3', name: 'Driver 3' },
        { id: 'driver4', name: 'Driver 4' },
        { id: 'driver5', name: 'Driver 5' }
      ]);
    }, 300);
  });
};