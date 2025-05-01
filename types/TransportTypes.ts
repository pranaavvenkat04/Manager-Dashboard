import { MockTimestamp } from '../utils/mockData';

// Base interface for common metadata fields
interface BaseMetadata {
  created_by: string;
  deleted_by?: string;
  created_at: MockTimestamp;
  deleted_at?: MockTimestamp;
  soft_delete: boolean;
  updated_by?: string;
  updated_at?: MockTimestamp;
}

// School Model
export interface School extends BaseMetadata {
  id: string; // School code starting with C
  name: string;
  address: string;
  schoolCode?: string;
}

// Route Model
export interface Route extends BaseMetadata {
  id: string;
  route_key: string;               // Unique identifying code (e.g., "RT1234")
  name: string;                    // Route name
  description: string;             // Optional description
  school_id: string;               // Reference to school
  active: boolean;                 // Whether route is currently active
  assigned_driver_id: string;      // Reference to driver
  start_time: string;              // Default start time (e.g., "08:00 AM")
  end_time: string;                // Default end time (e.g., "09:15 AM")
  estimated_duration: number;      // Minutes
  stops_count: number;             // Number of stops on route
}

// Stop Model
export interface Stop extends BaseMetadata {
  id: string;
  name: string;                // Stop name
  address: string;             // Full address
  location: {                  // GeoPoint
    latitude: number,
    longitude: number
  };
  sequence: number;            // Position in route (1, 2, 3...)
  eta: string;                 // Estimated time of arrival
  dwell_time: number;          // Minutes to wait at this stop
}

// Schedule Model
export interface Schedule extends BaseMetadata {
  id: string;
  operating_days: number[];    // Array of weekday numbers (0=Sunday, 1=Monday, etc.)
  effective_dates: {
    start_date: MockTimestamp,  // When this schedule begins
    end_date?: MockTimestamp    // When this schedule ends (optional)
  };
  active: boolean;             // Is this schedule active
}

// Exception Model
export interface Exception extends BaseMetadata {
  id: string;
  date: MockTimestamp;         // The exception date
  type: string;                // "no_service" or "special_service"
  reason: string;              // Optional explanation (e.g., "Holiday", "Snow day")
}

// Manager Model
export interface Manager extends BaseMetadata {
  id: string; // Hash ID
  fullName: string;
  email: string;
  address: string;
  phoneNumber: string;
  schoolId: string; // Added to track which school this manager belongs to
}

// Change Log Entry
export interface ChangeLogEntry {
  id: string; // Timestamp
  changeMade: string;
  managerId: string; // Added to track which manager made the change
  timestamp: MockTimestamp; // Added to track when the change was made
}

// User Model (Under Schools)
export interface User extends BaseMetadata {
  id: string; // Hash ID
  fullName: string;
  email: string;
  address: string;
  phoneNumber?: string;
  routes: string[]; // Array of route IDs
  registration_key: string; // Starts with S for student, C for college user
  school_id: string; // Added to track which school this user belongs to
}

// Favorites Entry
export interface FavoriteEntry {
  id: string; // Added to uniquely identify favorites
  routeId: string;
  addedAt: MockTimestamp;
  userId: string; // Added to track which user added this favorite
}

// Driver Model (Under Schools)
export interface Driver extends BaseMetadata {
  id: string; // Hash ID
  fullName: string;
  email: string;
  phoneNumber: string;
  address: string;
  liveLatitude: number;
  liveLongitude: number;
  occupancy: 'light' | 'medium' | 'heavy';
  assigned_vehicle_id: string;
  school_id: string; // Added to track which school this driver belongs to
}

// Route History Entry
export interface RouteHistoryEntry {
  id: string; // Added to uniquely identify history entries
  routeId: string;
  stops: string[];
  timestamp: MockTimestamp;
  elapsedTime: number;
  driverId: string; // Added to track which driver this history belongs to
}

// Vehicle Model (Under Schools)
export interface Vehicle extends BaseMetadata {
  id: string; // VIN
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  registration: string;
  capacity: number;
  inspectionInfo: string;
  in_use: boolean;
  operational: boolean;
  school_id: string; // Added to track which school this vehicle belongs to
}

// Student on Board Entry
export interface StudentOnBoard {
  studentId: string;
  boardedAt: MockTimestamp;
  boardedAtStopId: string;
  status: string;
}

// Active Trip Model
export interface ActiveTrip {
  id: string;
  latitude: number;
  longitude: number;
  currentStopId: string;
  nextStopId: string;
  driverId: string;
  vehicleId: string;
  routeId: string;
  startTime: MockTimestamp;
  status: 'in_progress';
  studentsOnBoard: StudentOnBoard[];
  school_id: string; // Added to track which school this trip belongs to
  created_at: MockTimestamp; // Added to track when the trip was created
}

// Completed Trip Model
export interface CompletedTrip {
  id: string;
  driverId: string;
  vehicleId: string;
  routeId: string;
  startTime: MockTimestamp;
  endTime: MockTimestamp;
  completedStopIds: string[];
  status: 'completed';
  studentsServiced: number;
  totalDistance: number;
  school_id: string; // Added to track which school this trip belongs to
  created_at: MockTimestamp; // Added to track when the trip was created
}

// Collection References
export interface SchoolCollections {
  activeTrips: ActiveTrip[];
  completedTrips: CompletedTrip[];
  drivers: Driver[];
  managers: Manager[];
  routes: Route[];
  users: User[];
  vehicles: Vehicle[];
}

export interface RouteCollections {
  stops: Stop[];
  schedule: Schedule[];
  exceptions: Exception[];
}

export interface ManagerCollections {
  changeLog: ChangeLogEntry[];
}

export interface UserCollections {
  favorites: FavoriteEntry[];
}

export interface DriverCollections {
  routeHistory: RouteHistoryEntry[];
} 