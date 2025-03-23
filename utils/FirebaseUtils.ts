// Mock Firebase Timestamp implementation
export class Timestamp {
    seconds: number;
    nanoseconds: number;
  
    constructor(seconds: number, nanoseconds: number = 0) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }
  
    static now(): Timestamp {
      return Timestamp.fromDate(new Date());
    }
  
    static fromDate(date: Date): Timestamp {
      return new Timestamp(Math.floor(date.getTime() / 1000), (date.getTime() % 1000) * 1000000);
    }
  
    toDate(): Date {
      return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
    }
  
    // Used by Firebase for JSON serialization
    toJSON(): { seconds: number; nanoseconds: number } {
      return {
        seconds: this.seconds,
        nanoseconds: this.nanoseconds
      };
    }
  }
  
  /**
   * Converts a JavaScript Date to Firebase Timestamp
   * @param date JavaScript Date object
   * @returns Firebase Timestamp object
   */
  export const dateToTimestamp = (date: Date): Timestamp => {
    return Timestamp.fromDate(date);
  };
  
  /**
   * Converts a Firebase Timestamp to JavaScript Date
   * @param timestamp Firebase Timestamp object
   * @returns JavaScript Date object
   */
  export const timestampToDate = (timestamp: Timestamp): Date => {
    return timestamp.toDate();
  };
  
  /**
   * Formats a date to a readable string
   * @param date Date object or Firebase Timestamp
   * @returns Formatted date string
   */
  export const formatDate = (date: Date | Timestamp | null): string => {
    if (!date) return 'N/A';
    
    // Convert timestamp to date if needed
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  /**
   * Mock implementation of Firestore data conversion for routes
   */
  export const routeConverter = {
    // Convert from Firestore data to app data
    fromFirestore: (data: any) => {
      // Convert timestamps to dates
      let schedule = null;
      
      if (data.schedule) {
        // Convert effectiveDates timestamps to Date objects
        const effectiveDates = {
          startDate: data.schedule.effective_dates.start_date.toDate(),
          endDate: data.schedule.effective_dates.end_date ? 
            data.schedule.effective_dates.end_date.toDate() : undefined
        };
        
        // Convert exceptions timestamps to Date objects
        const exceptions = data.schedule.exceptions ? 
          data.schedule.exceptions.map((exc: any) => ({
            date: exc.date.toDate(),
            type: exc.type,
            reason: exc.reason || ''
          })) : [];
        
        schedule = {
          operatingDays: data.schedule.operating_days || [],
          exceptions: exceptions,
          effectiveDates: effectiveDates
        };
      }
      
      return {
        id: data.id,
        name: data.name,
        routeKey: data.route_key,
        schoolId: data.school_id,
        assignedDriverId: data.assigned_driver_id || '',
        startTime: data.start_time,
        endTime: data.end_time,
        stops: data.stops || [],
        schedule: schedule
      };
    },
    
    // Convert from app data to Firestore data
    toFirestore: (data: any) => {
      // Convert dates to timestamps
      let schedule = null;
      
      if (data.schedule) {
        // Convert Date objects to timestamps
        const effectiveDates = {
          start_date: dateToTimestamp(data.schedule.effectiveDates.startDate),
          end_date: data.schedule.effectiveDates.endDate ? 
            dateToTimestamp(data.schedule.effectiveDates.endDate) : null
        };
        
        // Convert exception Date objects to timestamps
        const exceptions = data.schedule.exceptions ? 
          data.schedule.exceptions.map((exc: any) => ({
            date: dateToTimestamp(exc.date),
            type: exc.type,
            reason: exc.reason || ''
          })) : [];
        
        // Create Firebase-compatible schedule object
        schedule = {
          operating_days: data.schedule.operatingDays || [],
          exceptions: data.schedule.exceptions ? 
            exceptions.map((exc: any) => ({
              date: exc.date,
              type: exc.type,
              reason: exc.reason || null
            })) : [],
          effective_dates: effectiveDates,
          no_service_dates: exceptions
            .filter((exc: any) => exc.type === 'no_service')
            .map((exc: any) => exc.date),
          special_service_dates: exceptions
            .filter((exc: any) => exc.type === 'special_service')
            .map((exc: any) => exc.date)
        };
      }
      
      return {
        route_key: data.routeKey,
        name: data.name,
        school_id: data.schoolId || 'school1',
        assigned_driver_id: data.assignedDriverId || null,
        start_time: data.startTime,
        end_time: data.endTime,
        stops: data.stops.map((stop: any) => stop.id),
        schedule: schedule
      };
    }
  };
  
  /**
   * Mock Firebase methods for routes
   */
  export const routesFirebaseMethods = {
    // Add a new route
    addRoute: async (routeData: any): Promise<string> => {
      // Convert to Firestore format
      const firestoreData = routeConverter.toFirestore(routeData);
      
      // Generate a mock document ID
      const docId = `route-${Date.now()}`;
      
      // In a real implementation, this would save to Firebase
      console.log('Adding route:', docId, firestoreData);
      
      // Return the document ID
      return docId;
    },
    
    // Update an existing route
    updateRoute: async (routeId: string, routeData: any): Promise<void> => {
      // Convert to Firestore format
      const firestoreData = routeConverter.toFirestore(routeData);
      
      // In a real implementation, this would update the document in Firebase
      console.log('Updating route:', routeId, firestoreData);
      
      // Return a resolved promise
      return Promise.resolve();
    },
    
    // Delete a route
    deleteRoute: async (routeId: string): Promise<void> => {
      // In a real implementation, this would delete the document from Firebase
      console.log('Deleting route:', routeId);
      
      // Return a resolved promise
      return Promise.resolve();
    },
    
    // Get a single route
    getRoute: async (routeId: string): Promise<any> => {
      // In a real implementation, this would fetch from Firebase
      // Here we'll return mock data
      const mockRoute = {
        id: routeId,
        route_key: `RT${1000 + parseInt(routeId.replace('route', ''))}`,
        name: `Route ${routeId.replace('route', '')}`,
        school_id: 'school1',
        assigned_driver_id: `driver${parseInt(routeId.replace('route', '')) % 3 + 1}`,
        start_time: '08:00 AM',
        end_time: '09:15 AM',
        stops: Array.from({ length: 5 }, (_, i) => `stop-${routeId}-${i+1}`),
        schedule: {
          operating_days: [1, 2, 3, 4, 5],
          exceptions: [
            {
              date: Timestamp.fromDate(new Date()),
              type: 'no_service',
              reason: 'Holiday'
            }
          ],
          effective_dates: {
            start_date: Timestamp.fromDate(new Date()),
            end_date: null
          }
        }
      };
      
      // Convert from Firestore format
      const routeWithId = {
        ...mockRoute,
        id: routeId  // This ensures id takes precedence over any id in mockRoute
      };
      return routeConverter.fromFirestore(routeWithId);
    }
  };