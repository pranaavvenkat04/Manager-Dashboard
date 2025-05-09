import { StopItem } from '../types/RouteTypes';
import { AVERAGE_SPEED_KMH, STOP_DWELL_TIME, addMinutesToTime, getMockDistance } from './TimeUtils';
import { calculateRouteTimingsWithGoogleAPI } from '@/utils/GoogleMapsUtils';
import { db, getCurrentSchool, Timestamp } from '@/utils/firebase';
import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

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
 * @returns Promise with calculated values
 */
export const calculateRouteTimings = async (stops: StopItem[], startTime: string): Promise<{
  updatedStops: StopItem[];
  totalDuration: number;
  calculatedEndTime: string;
  polylinePath?: string;
}> => {
  // Use the Google Maps API for route timing calculations
  try {
    return await calculateRouteTimingsWithGoogleAPI(stops, startTime);
  } catch (error) {
    console.error('Failed to calculate route timings with Google API, falling back to basic calculation:', error);
    return calculateBasicRouteTimings(stops, startTime);
  }
};

/**
 * Basic fallback method to calculate route timings if Google API fails
 */
export const calculateBasicRouteTimings = (stops: StopItem[], startTime: string): {
  updatedStops: StopItem[];
  totalDuration: number;
  calculatedEndTime: string;
} => {
  let totalDuration = 0;
  
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
 * Fetch drivers from Firebase
 * @returns Promise resolving to array of drivers with id and name
 */
export const fetchDrivers = async (): Promise<{ id: string; name: string; }[]> => {
  try {
    const schoolId = await getCurrentSchool();
    if (!schoolId) {
      console.log('No school ID available');
      return [{ id: 'unassigned', name: 'Unassigned' }];
    }
    
    // Query to get non-deleted drivers from current school
    const driversRef = collection(db, 'Schools', schoolId, 'Drivers');
    // Use consistent approach to exclude soft-deleted records
    const q = query(driversRef, where('soft_delete', '!=', true));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('No drivers found');
      return [{ id: 'unassigned', name: 'Unassigned' }];
    }
    
    // Map the driver documents to the required format
    const driversData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unnamed Driver'
      };
    });
    
    // Add the unassigned option at the top
    return [
      { id: '', name: 'Unassigned' },
      ...driversData
    ];
  } catch (error) {
    console.error('Error fetching drivers:', error);
    return [{ id: '', name: 'Unassigned' }];
  }
};

/**
 * Update a driver's assigned routes
 * @param driverId The ID of the driver to update
 * @param routeId The ID of the route being assigned
 * @param previousDriverId The ID of the previous driver (if any)
 * @returns Promise resolving when the update is complete
 */
export const updateDriverRoutes = async (
  driverId: string, 
  routeId: string, 
  previousDriverId?: string
): Promise<void> => {
  try {
    const schoolId = await getCurrentSchool();
    if (!schoolId) {
      console.error('No school ID available for updating driver routes');
      return;
    }
    
    console.log(`Updating driver routes: Assigning route ${routeId} to driver ${driverId}`);
    
    // If there was a previous driver, remove the route from their routes array
    if (previousDriverId && previousDriverId !== '' && previousDriverId !== driverId) {
      const prevDriverRef = doc(db, 'Schools', schoolId, 'Drivers', previousDriverId);
      const prevDriverDoc = await getDoc(prevDriverRef);
      
      if (prevDriverDoc.exists()) {
        console.log(`Removing route ${routeId} from previous driver ${previousDriverId}`);
        await updateDoc(prevDriverRef, {
          routes: arrayRemove(routeId),
          updated_at: Timestamp.now()
        });
      }
    }
    
    // If a new driver is assigned (not empty/unassigned), add the route to their routes array
    if (driverId && driverId !== '') {
      const driverRef = doc(db, 'Schools', schoolId, 'Drivers', driverId);
      const driverDoc = await getDoc(driverRef);
      
      if (driverDoc.exists()) {
        console.log(`Adding route ${routeId} to driver ${driverId}`);
        await updateDoc(driverRef, {
          routes: arrayUnion(routeId),
          updated_at: Timestamp.now()
        });
      } else {
        console.error(`Driver document with ID ${driverId} not found`);
      }
    }
  } catch (error) {
    console.error('Error updating driver routes:', error);
    throw error;
  }
};