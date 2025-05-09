import { FieldErrors, RouteData, StopItem, RouteSchedule } from '../types/RouteTypes';

/**
 * Validates if an address string has a valid format
 * @param address Address string to validate
 * @returns Boolean indicating if address is valid
 */
export const isValidAddress = (address: string): boolean => {
  // Valid address should have street number, street name, city, state (optional), and zip (optional)
  // For example: "123 Main St, New York, NY 10001"
  return address.trim().length > 10 && 
    address.includes(' ') &&
    (address.includes(',') || address.includes(' '));
};

/**
 * Validates the entire route form
 * @param routeName Route name
 * @param routeKey Route key/ID
 * @param startTime Start time
 * @param endTime End time
 * @param stops Array of stops
 * @param schedule Optional route schedule
 * @returns Object with validation result and errors
 */
export const validateRouteForm = (
  routeName: string,
  routeKey: string,
  startTime: string,
  endTime: string,
  stops: StopItem[],
  schedule?: RouteSchedule
): { isValid: boolean; errors: string[]; fieldErrors: FieldErrors } => {
  const errors: string[] = [];
  const fieldErrors: FieldErrors = {};
  let isValid = true;
  
  if (!routeName.trim()) {
    errors.push('Route name is required');
    fieldErrors.routeName = 'Required';
    isValid = false;
  }
  
  if (!routeKey.trim()) {
    errors.push('Route key is required');
    fieldErrors.routeKey = 'Required';
    isValid = false;
  }
  
  if (!startTime.trim()) {
    errors.push('Start time is required');
    fieldErrors.startTime = 'Required';
    isValid = false;
  }
  
  if (!endTime.trim()) {
    errors.push('End time is required');
    fieldErrors.endTime = 'Required';
    isValid = false;
  }
  
  if (stops.length < 2) {
    errors.push('At least two stops are required for a valid route');
    fieldErrors.stops = 'At least 2 stops required';
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
  
  // Validate schedule if provided
  if (schedule) {
    // Validate operating days - must have at least one day selected
    if (schedule.operatingDays.length === 0) {
      errors.push('At least one operating day must be selected');
      fieldErrors.operatingDays = 'At least one day required';
      isValid = false;
    }
    
    // Validate effective start date
    if (!schedule.effectiveDates.startDate) {
      errors.push('Schedule start date is required');
      fieldErrors.effectiveDates = 'Start date required';
      isValid = false;
    }
    
    // Validate end date is after start date
    if (schedule.effectiveDates.endDate && 
        schedule.effectiveDates.startDate && 
        schedule.effectiveDates.endDate < schedule.effectiveDates.startDate) {
      errors.push('End date must be after start date');
      fieldErrors.effectiveDates = 'Invalid date range';
      isValid = false;
    }
    
    // Validate exceptions have valid dates
    schedule.exceptions.forEach((exception, index) => {
      if (!exception.date) {
        errors.push(`Exception #${index + 1} is missing a date`);
        isValid = false;
      }
    });
  }
  
  return { isValid, errors, fieldErrors };
};

/**
 * Highlights text matches in search results
 * @param text Original text
 * @param query Search query to highlight
 * @returns Either the original text or an array of parts with highlight flags
 */
export const highlightMatch = (text: string, query: string) => {
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
  const parts: { text: string; highlight: boolean }[] = [];
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