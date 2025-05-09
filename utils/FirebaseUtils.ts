// Mock Firebase Timestamp implementation
import { collection, addDoc, setDoc, doc, getDoc, getDocs, deleteDoc, updateDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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
   * Firestore data conversion for routes
   */
  export const routeConverter = {
    // Convert from Firestore data to app data
    fromFirestore: (data: any) => {
      // Convert timestamps to dates
      let schedule = null;
      
      if (data.schedule) {
        // Convert effectiveDates timestamps to Date objects
        const effectiveDates = {
          startDate: data.schedule.effective_dates.start_date.toDate ? 
            data.schedule.effective_dates.start_date.toDate() : 
            new Date(data.schedule.effective_dates.start_date.seconds * 1000),
          endDate: data.schedule.effective_dates.end_date ? 
            (data.schedule.effective_dates.end_date.toDate ? 
              data.schedule.effective_dates.end_date.toDate() : 
              new Date(data.schedule.effective_dates.end_date.seconds * 1000)) : 
            undefined
        };
        
        // Convert exceptions timestamps to Date objects
        const exceptions = data.schedule.exceptions ? 
          data.schedule.exceptions.map((exc: any) => ({
            date: exc.date.toDate ? exc.date.toDate() : new Date(exc.date.seconds * 1000),
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
        title: data.title || data.name,
        route_code: data.route_code || '',
        routeCode: data.route_code || '',
        routeKey: data.route_code || '',
        description: data.description || '',
        schoolId: data.school_id,
        assignedDriverId: data.assigned_driver_id || '',
        assigned_driver_id: data.assigned_driver_id || '',
        startTime: data.start_time,
        start_time: data.start_time,
        endTime: data.end_time,
        end_time: data.end_time,
        stops: data.stops || [],
        estimatedDuration: data.estimated_duration || 0,
        estimated_duration: data.estimated_duration || 0,
        schedule: schedule,
        active: data.active !== undefined ? data.active : true,
        soft_delete: data.soft_delete || false
      };
    },
    
    // Convert from app data to Firestore data
    toFirestore: (data: any) => {
      console.log('ENTERING toFirestore, input data keys:', Object.keys(data));
      console.log('Important fields:', {
        route_code: data.route_code,
        routeCode: data.routeCode,
        routeKey: data.routeKey,
        title: data.title,
        name: data.name
      });
      
      // Log the soft_delete flag specifically to help with debugging
      console.log('SOFT DELETE STATUS:', {
        soft_delete: data.soft_delete,
        value: data.soft_delete === true ? 'true' : (data.soft_delete === false ? 'false' : 'undefined/null')
      });
      
      // Convert dates to timestamps
      let schedule = null;
      
      if (data.schedule) {
        // Convert Date objects to timestamps
        const effectiveDates = {
          start_date: data.schedule.effectiveDates.startDate ? 
            FirestoreTimestamp.fromDate(data.schedule.effectiveDates.startDate) : 
            FirestoreTimestamp.now(),
          end_date: data.schedule.effectiveDates.endDate ? 
            FirestoreTimestamp.fromDate(data.schedule.effectiveDates.endDate) : null
        };
        
        // Convert exception Date objects to timestamps
        const exceptions = data.schedule.exceptions ? 
          data.schedule.exceptions.map((exc: any) => ({
            date: FirestoreTimestamp.fromDate(exc.date),
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
      
      // Create a stops array with just the IDs for the main route document
      const stopIds = Array.isArray(data.stops) ? data.stops.map((stop: any) => stop.id) : [];
      
      // Debug the incoming data to see what fields are available
      console.log('CONVERTING TO FIRESTORE, INCOMING DATA:', {
        title: data.title,
        name: data.name,
        route_code: data.route_code || data.routeCode || data.route_key || data.routeKey,
        soft_delete: data.soft_delete
      });
      
      // Create return object with all fields
      const firestoreData = {
        route_code: data.route_code || data.routeCode || data.route_key || data.routeKey || '', // Use route_code exclusively
        title: data.title || data.name || '',
        name: data.name || data.title || '', // Keep for backward compatibility
        description: data.description || '', // Include route description
        school_id: data.schoolId || data.school_id || 'school1',
        assigned_driver_id: data.assignedDriverId || data.assigned_driver_id || null,
        start_time: data.startTime || data.start_time,
        end_time: data.endTime || data.end_time,
        stops_count: stopIds.length,
        estimated_duration: data.estimatedDuration || data.estimated_duration || 0,
        schedule: schedule,
        active: data.active !== undefined ? data.active : true,
        soft_delete: data.soft_delete === true, // Ensure this is explicitly a boolean
        created_at: data.created_at || FirestoreTimestamp.now(),
        updated_at: FirestoreTimestamp.now()
      };
      
      // Log the final soft_delete value for debugging
      console.log('FIRESTORE DATA soft_delete:', firestoreData.soft_delete);
      
      return firestoreData;
    }
  };
  
  /**
   * Interface for stop data to prevent type errors
   */
  interface StopData {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    eta: string;
    order?: number;
  }
  
  /**
   * Firebase methods for routes
   */
  export const routesFirebaseMethods = {
    // Add a new route
    addRoute: async (routeData: any, schoolId: string): Promise<string> => {
      try {
        // Add schoolId to the routeData
        routeData.schoolId = schoolId;
        
        // Add debug logging
        console.log('Adding route with data:', JSON.stringify({
          title: routeData.title,
          name: routeData.name,
          route_code: routeData.route_code || routeData.routeCode, 
          stops_count: routeData.stops ? routeData.stops.length : 0,
          schoolId: schoolId
        }, null, 2));
        
        // Convert to Firestore format
        const firestoreData = routeConverter.toFirestore(routeData);
        
        // Add more debug logging to see what's being saved to Firestore
        console.log('Firestore data to be saved:', JSON.stringify({
          title: firestoreData.title,
          name: firestoreData.name,
          route_code: firestoreData.route_code
        }, null, 2));
        
        // Add the route document to Firestore
        const routesCollectionRef = collection(db, 'Schools', schoolId, 'Routes');
        const routeDocRef = await addDoc(routesCollectionRef, firestoreData);
        const routeId = routeDocRef.id;
        
        console.log(`Created route document with ID: ${routeId}`);
        
        // Add each stop as a document in the Stops subcollection
        if (Array.isArray(routeData.stops) && routeData.stops.length > 0) {
          console.log(`Adding ${routeData.stops.length} stops to route ${routeId}`);
          
          const stopsCollectionRef = collection(db, 'Schools', schoolId, 'Routes', routeId, 'Stops');
          
          // Add each stop as a separate document
          await Promise.all(routeData.stops.map(async (stop: any, index: number) => {
            const stopData = {
              name: stop.name,
              address: stop.address,
              latitude: stop.lat || stop.latitude || 0,
              longitude: stop.lng || stop.longitude || 0,
              order: index,
              eta: stop.eta || '',
              status: true,
              created_at: FirestoreTimestamp.now(),
              created_by: 'system'
            };
            
            // Use the stop's ID if provided, otherwise generate one
            const stopId = stop.id || `stop-${Date.now()}-${index}`;
            console.log(`Adding stop ${index+1}/${routeData.stops.length}: ${stopId} - ${stop.name}`);
            
            await setDoc(doc(stopsCollectionRef, stopId), stopData);
            console.log(`Successfully added stop: ${stopId}`);
          }));
          
          console.log(`All ${routeData.stops.length} stops successfully added to route ${routeId}`);
        } else {
          console.warn('No stops provided with route data');
        }
        
        return routeId;
      } catch (error: any) {
        console.error('Error adding route:', error);
        throw new Error(`Failed to add route: ${error.message}`);
      }
    },
    
    // Update an existing route
    updateRoute: async (routeId: string, routeData: any, schoolId: string): Promise<void> => {
      try {
        // Add schoolId to the routeData
        routeData.schoolId = schoolId;
        
        // Add debug logging
        console.log('Updating route with ID:', routeId);
        console.log('Update data:', JSON.stringify({
          name: routeData.name,
          stops_count: routeData.stops ? routeData.stops.length : 0,
          soft_delete: routeData.soft_delete || false
        }));
        
        // Convert to Firestore format
        const firestoreData = routeConverter.toFirestore(routeData);
        
        // Get reference to the route document
        const routeDocRef = doc(db, 'Schools', schoolId, 'Routes', routeId);
        
        // Update the route document
        await updateDoc(routeDocRef, firestoreData);
        console.log(`Updated route document with ID: ${routeId}`);
        
        // If this is a soft delete, don't update the stops
        if (routeData.soft_delete) {
          console.log(`Route ${routeId} was soft deleted, skipping stop updates`);
          return;
        }
        
        // Update the stops
        if (Array.isArray(routeData.stops) && routeData.stops.length > 0) {
          console.log(`Updating ${routeData.stops.length} stops for route ${routeId}`);
          
          const stopsCollectionRef = collection(db, 'Schools', schoolId, 'Routes', routeId, 'Stops');
          
          // Get existing stops
          const existingStopsSnapshot = await getDocs(stopsCollectionRef);
          const existingStopsMap = new Map();
          
          existingStopsSnapshot.forEach(stopDoc => {
            existingStopsMap.set(stopDoc.id, stopDoc.data());
          });
          
          // Update each stop
          await Promise.all(routeData.stops.map(async (stop: any, index: number) => {
            const stopData: {
              name: string;
              address: string;
              latitude: number;
              longitude: number;
              order: number;
              eta: string;
              status: boolean;
              updated_at: any;
              created_at?: any;
              created_by?: string;
            } = {
              name: stop.name,
              address: stop.address,
              latitude: stop.lat || stop.latitude || 0,
              longitude: stop.lng || stop.longitude || 0,
              order: index,
              eta: stop.eta || '',
              status: true,
              updated_at: FirestoreTimestamp.now()
            };
            
            // Use the stop's ID if provided, otherwise generate one
            const stopId = stop.id || `stop-${Date.now()}-${index}`;
            
            const stopDocRef = doc(stopsCollectionRef, stopId);
            
            if (existingStopsMap.has(stopId)) {
              // Update existing stop
              await updateDoc(stopDocRef, stopData);
              console.log(`Updated stop: ${stopId}`);
              
              // Remove from map to track which ones to delete
              existingStopsMap.delete(stopId);
            } else {
              // Add new stop
              stopData.created_at = FirestoreTimestamp.now();
              stopData.created_by = 'system';
              
              await setDoc(stopDocRef, stopData);
              console.log(`Added new stop: ${stopId}`);
            }
          }));
          
          // Delete stops that are no longer in the route
          // Skip this if it's a soft delete operation
          if (!routeData.soft_delete) {
            await Promise.all(Array.from(existingStopsMap.keys()).map(async (stopId) => {
              const stopDocRef = doc(stopsCollectionRef, stopId.toString());
              await deleteDoc(stopDocRef);
              console.log(`Deleted removed stop: ${stopId}`);
            }));
          }
          
          console.log(`All ${routeData.stops.length} stops successfully updated for route ${routeId}`);
        } else {
          console.warn('No stops provided with route update data');
        }
      } catch (error: any) {
        console.error('Error updating route:', error);
        throw new Error(`Failed to update route: ${error.message}`);
      }
    },
    
    // Delete a route
    deleteRoute: async (routeId: string, schoolId: string): Promise<void> => {
      try {
        // First delete all stops in the Stops subcollection
        const stopsCollectionRef = collection(db, 'Schools', schoolId, 'Routes', routeId, 'Stops');
        const stopsSnapshot = await getDocs(stopsCollectionRef);
        
        await Promise.all(stopsSnapshot.docs.map(async (doc) => {
          await deleteDoc(doc.ref);
        }));
        
        // Then delete the route document
        const routeDocRef = doc(db, 'Schools', schoolId, 'Routes', routeId);
        await deleteDoc(routeDocRef);
      } catch (error: any) {
        console.error('Error deleting route:', error);
        throw new Error(`Failed to delete route: ${error.message}`);
      }
    },
    
    // Get a single route with stops
    getRoute: async (routeId: string, schoolId: string): Promise<any> => {
      try {
        // Get the route document
        const routeDocRef = doc(db, 'Schools', schoolId, 'Routes', routeId);
        const routeDoc = await getDoc(routeDocRef);
        
        if (!routeDoc.exists()) {
          throw new Error(`Route with ID ${routeId} not found`);
        }
        
        // Get all stops for this route
        const stopsCollectionRef = collection(db, 'Schools', schoolId, 'Routes', routeId, 'Stops');
        const stopsSnapshot = await getDocs(stopsCollectionRef);
        
        if (stopsSnapshot.empty) {
          console.log(`No stops found for route ${routeId}`);
        }
        
        // Convert Firestore document to route object
        const routeData = routeDoc.data();
        const routeObject = {
          ...routeConverter.fromFirestore(routeData),
          id: routeId,
          soft_delete: routeData.soft_delete || false
        };
        
        // Add stops to the route object
        const stops: StopData[] = [];
        
        stopsSnapshot.forEach((doc) => {
          const stopData = doc.data();
          stops.push({
            id: doc.id,
            name: stopData.name || '',
            address: stopData.address || '',
            lat: stopData.latitude || 0,
            lng: stopData.longitude || 0,
            eta: stopData.eta || '',
            order: stopData.order || 0
          });
        });
        
        // Sort stops by order
        stops.sort((a, b) => (a.order || 0) - (b.order || 0));
        
        // Add stops to route object
        routeObject.stops = stops;
        
        return routeObject;
      } catch (error: any) {
        console.error('Error getting route:', error);
        throw new Error(`Failed to get route: ${error.message}`);
      }
    }
  };