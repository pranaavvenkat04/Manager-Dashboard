// Constants for calculating timing
export const AVERAGE_SPEED_KMH = 30; // Average bus speed in km/h
export const STOP_DWELL_TIME = 2; // Average time spent at each stop in minutes

/**
 * Adds minutes to a time string in "HH:MM AM/PM" format
 * @param timeStr Time string in format "HH:MM AM/PM"
 * @param minutes Minutes to add
 * @returns New time string in "HH:MM AM/PM" format
 */
export const addMinutesToTime = (timeStr: string, minutes: number): string => {
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

/**
 * Calculates estimated travel time between two points
 * @param lat1 Latitude of point 1
 * @param lng1 Longitude of point 1
 * @param lat2 Latitude of point 2
 * @param lng2 Longitude of point 2
 * @returns Estimated travel time in minutes
 */
export const calculateTravelTime = (
  lat1: number | null,
  lng1: number | null,
  lat2: number | null,
  lng2: number | null
): number => {
  // If coordinates are missing, use an average distance
  if (!lat1 || !lng1 || !lat2 || !lng2) {
    // Return a random value between 2-5 minutes
    return 2 + Math.random() * 3;
  }

  // Simple distance calculation using Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  // Calculate time in hours: distance / speed
  const timeHours = distanceKm / AVERAGE_SPEED_KMH;
  
  // Convert to minutes
  return timeHours * 60;
};

/**
 * Creates a mock distance between two stops
 * @returns Distance in kilometers (random between 2-5km)
 */
export const getMockDistance = (): number => {
  return 2 + Math.random() * 3;
};

/**
 * Formats minutes as hours and minutes
 * @param minutes Total minutes
 * @returns Formatted string (e.g., "1h 30m")
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return `${hours}h ${mins}m`;
};