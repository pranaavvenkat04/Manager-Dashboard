// Mock Timestamp implementation
export class MockTimestamp {
  seconds: number;
  nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  toDate(): Date {
    return new Date(this.seconds * 1000);
  }

  toMillis(): number {
    return this.seconds * 1000;
  }

  isEqual(other: MockTimestamp): boolean {
    return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
  }

  static now(): MockTimestamp {
    const now = new Date();
    return new MockTimestamp(
      Math.floor(now.getTime() / 1000),
      (now.getTime() % 1000) * 1000000
    );
  }

  static fromDate(date: Date): MockTimestamp {
    return new MockTimestamp(
      Math.floor(date.getTime() / 1000),
      (date.getTime() % 1000) * 1000000
    );
  }

  static fromMillis(milliseconds: number): MockTimestamp {
    return new MockTimestamp(
      Math.floor(milliseconds / 1000),
      (milliseconds % 1000) * 1000000
    );
  }
}

import type { 
  School, 
  Route, 
  Stop,
  Schedule,
  Exception,
  Manager, 
  User, 
  Driver, 
  Vehicle,
  ActiveTrip,
  CompletedTrip,
  ChangeLogEntry,
  FavoriteEntry,
  RouteHistoryEntry
} from '../types/TransportTypes';

// Helper function to create mock timestamps
const createMockTimestamp = (date: Date = new Date()): MockTimestamp => {
  return MockTimestamp.fromDate(date);
};

// Mock data
export const mockData = {
  schools: [
    {
      id: 'C001',
      name: 'Central High School',
      address: '123 Main St, City, State',
      schoolCode: 'CHS001',
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    },
    {
      id: 'C002',
      name: 'North High School',
      address: '456 North Ave, City, State',
      schoolCode: 'NHS001',
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as School[],

  routes: [
    {
      id: 'R001',
      route_key: 'RT001',
      name: 'Morning Route 1',
      description: 'Main morning route for Central High',
      school_id: 'C001',
      active: true,
      assigned_driver_id: 'D001',
      start_time: '08:00 AM',
      end_time: '09:15 AM',
      estimated_duration: 75,
      stops_count: 5,
      created_by: 'admin',
      created_at: createMockTimestamp(),
      updated_by: 'admin',
      updated_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as Route[],

  stops: [
    {
      id: 'S001',
      name: 'Main Street Stop',
      address: '123 Main Street, City, State',
      location: {
        latitude: 40.7128,
        longitude: -74.0060
      },
      sequence: 1,
      eta: '08:15 AM',
      dwell_time: 2,
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as Stop[],

  schedules: [
    {
      id: 'SCH001',
      operating_days: [1, 2, 3, 4, 5], // Monday to Friday
      effective_dates: {
        start_date: createMockTimestamp(),
        end_date: createMockTimestamp(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) // 90 days from now
      },
      active: true,
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as Schedule[],

  exceptions: [
    {
      id: 'EX001',
      date: createMockTimestamp(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), // 14 days from now
      type: 'no_service',
      reason: 'School Holiday',
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as Exception[],

  managers: [
    {
      id: 'M001',
      fullName: 'John Manager',
      email: 'john@school.com',
      address: '789 Manager St, City, State',
      phoneNumber: '555-0123',
      schoolId: 'C001',
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as Manager[],

  users: [
    {
      id: 'U001',
      fullName: 'Alice Student',
      email: 'alice@school.com',
      address: '101 Student Ave, City, State',
      phoneNumber: '555-0124',
      routes: ['R001'],
      registration_key: 'S001',
      school_id: 'C001',
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as User[],

  drivers: [
    {
      id: 'D001',
      fullName: 'Bob Driver',
      email: 'bob@school.com',
      phoneNumber: '555-0125',
      address: '202 Driver Rd, City, State',
      liveLatitude: 40.7128,
      liveLongitude: -74.0060,
      occupancy: 'light',
      assigned_vehicle_id: 'V001',
      school_id: 'C001',
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as Driver[],

  vehicles: [
    {
      id: 'V001',
      make: 'Ford',
      model: 'Transit',
      year: 2020,
      licensePlate: 'ABC123',
      registration: 'REG001',
      capacity: 30,
      inspectionInfo: 'Last inspected: 2023-12-01',
      in_use: false,
      operational: true,
      school_id: 'C001',
      created_by: 'admin',
      created_at: createMockTimestamp(),
      soft_delete: false
    }
  ] as Vehicle[],

  activeTrips: [
    {
      id: 'AT001',
      latitude: 40.7128,
      longitude: -74.0060,
      currentStopId: 'S001',
      nextStopId: 'S002',
      driverId: 'D001',
      vehicleId: 'V001',
      routeId: 'R001',
      startTime: createMockTimestamp(),
      status: 'in_progress',
      studentsOnBoard: [
        {
          studentId: 'U001',
          boardedAt: createMockTimestamp(),
          boardedAtStopId: 'S001',
          status: 'active'
        }
      ],
      school_id: 'C001',
      created_at: createMockTimestamp()
    }
  ] as ActiveTrip[],

  completedTrips: [
    {
      id: 'CT001',
      driverId: 'D001',
      vehicleId: 'V001',
      routeId: 'R001',
      startTime: createMockTimestamp(new Date(Date.now() - 3600000)),
      endTime: createMockTimestamp(),
      completedStopIds: ['S001', 'S002', 'S003'],
      status: 'completed',
      studentsServiced: 15,
      totalDistance: 25.5,
      school_id: 'C001',
      created_at: createMockTimestamp()
    }
  ] as CompletedTrip[],

  changeLog: [
    {
      id: 'CL001',
      managerId: 'M001',
      changeMade: 'Created new route RT001',
      timestamp: createMockTimestamp()
    }
  ] as ChangeLogEntry[],

  favorites: [
    {
      id: 'F001',
      userId: 'U001',
      routeId: 'R001',
      addedAt: createMockTimestamp()
    }
  ] as FavoriteEntry[],

  routeHistory: [
    {
      id: 'RH001',
      driverId: 'D001',
      routeId: 'R001',
      stops: ['S001', 'S002', 'S003'],
      timestamp: createMockTimestamp(),
      elapsedTime: 3600
    }
  ] as RouteHistoryEntry[]
};

// Mock database operations
export const mockDb = {
  // School operations
  createSchool: async (schoolData: Omit<School, 'id'>): Promise<string> => {
    const newId = `C${String(mockData.schools.length + 1).padStart(3, '0')}`;
    mockData.schools.push({
      ...schoolData,
      id: newId,
      created_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  getSchool: async (schoolId: string): Promise<School | null> => {
    return mockData.schools.find(s => s.id === schoolId && !s.soft_delete) || null;
  },

  updateSchool: async (schoolId: string, data: Partial<School>): Promise<void> => {
    const index = mockData.schools.findIndex(s => s.id === schoolId);
    if (index !== -1) {
      mockData.schools[index] = { 
        ...mockData.schools[index], 
        ...data,
        updated_at: createMockTimestamp(),
        updated_by: data.updated_by || mockData.schools[index].created_by
      };
    }
  },

  deleteSchool: async (schoolId: string, deletedBy: string): Promise<void> => {
    const index = mockData.schools.findIndex(s => s.id === schoolId);
    if (index !== -1) {
      mockData.schools[index] = {
        ...mockData.schools[index],
        soft_delete: true,
        deleted_by: deletedBy,
        deleted_at: createMockTimestamp()
      };
    }
  },

  // Route operations
  createRoute: async (schoolId: string, routeData: Omit<Route, 'id'>): Promise<string> => {
    const newId = `R${String(mockData.routes.length + 1).padStart(3, '0')}`;
    mockData.routes.push({
      ...routeData,
      id: newId,
      school_id: schoolId,
      created_at: createMockTimestamp(),
      updated_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  getRoutesBySchool: async (schoolId: string): Promise<Route[]> => {
    return mockData.routes.filter(r => r.school_id === schoolId && !r.soft_delete);
  },

  // Stop operations
  createStop: async (routeId: string, stopData: Omit<Stop, 'id'>): Promise<string> => {
    const newId = `S${String(mockData.stops.length + 1).padStart(3, '0')}`;
    mockData.stops.push({
      ...stopData,
      id: newId,
      created_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  getStopsByRoute: async (routeId: string): Promise<Stop[]> => {
    return mockData.stops.filter(s => !s.soft_delete);
  },

  // Schedule operations
  createSchedule: async (routeId: string, scheduleData: Omit<Schedule, 'id'>): Promise<string> => {
    const newId = `SCH${String(mockData.schedules.length + 1).padStart(3, '0')}`;
    mockData.schedules.push({
      ...scheduleData,
      id: newId,
      created_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  getSchedulesByRoute: async (routeId: string): Promise<Schedule[]> => {
    return mockData.schedules.filter(s => !s.soft_delete);
  },

  // Exception operations
  createException: async (routeId: string, exceptionData: Omit<Exception, 'id'>): Promise<string> => {
    const newId = `EX${String(mockData.exceptions.length + 1).padStart(3, '0')}`;
    mockData.exceptions.push({
      ...exceptionData,
      id: newId,
      created_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  getExceptionsByRoute: async (routeId: string): Promise<Exception[]> => {
    return mockData.exceptions.filter(e => !e.soft_delete);
  },

  // Manager operations
  createManager: async (schoolId: string, managerData: Omit<Manager, 'id'>): Promise<string> => {
    const newId = `M${String(mockData.managers.length + 1).padStart(3, '0')}`;
    mockData.managers.push({
      ...managerData,
      id: newId,
      schoolId,
      created_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  // User operations
  createUser: async (schoolId: string, userData: Omit<User, 'id'>): Promise<string> => {
    const newId = `U${String(mockData.users.length + 1).padStart(3, '0')}`;
    mockData.users.push({
      ...userData,
      id: newId,
      school_id: schoolId,
      created_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  // Driver operations
  createDriver: async (schoolId: string, driverData: Omit<Driver, 'id'>): Promise<string> => {
    const newId = `D${String(mockData.drivers.length + 1).padStart(3, '0')}`;
    mockData.drivers.push({
      ...driverData,
      id: newId,
      school_id: schoolId,
      created_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  // Vehicle operations
  createVehicle: async (schoolId: string, vehicleData: Omit<Vehicle, 'id'>): Promise<string> => {
    const newId = `V${String(mockData.vehicles.length + 1).padStart(3, '0')}`;
    mockData.vehicles.push({
      ...vehicleData,
      id: newId,
      school_id: schoolId,
      created_at: createMockTimestamp(),
      soft_delete: false
    });
    return newId;
  },

  // Active Trip operations
  createActiveTrip: async (schoolId: string, tripData: Omit<ActiveTrip, 'id'>): Promise<string> => {
    const newId = `AT${String(mockData.activeTrips.length + 1).padStart(3, '0')}`;
    mockData.activeTrips.push({
      ...tripData,
      id: newId,
      school_id: schoolId,
      created_at: createMockTimestamp()
    });
    return newId;
  },

  // Completed Trip operations
  createCompletedTrip: async (schoolId: string, tripData: Omit<CompletedTrip, 'id'>): Promise<string> => {
    const newId = `CT${String(mockData.completedTrips.length + 1).padStart(3, '0')}`;
    mockData.completedTrips.push({
      ...tripData,
      id: newId,
      school_id: schoolId,
      created_at: createMockTimestamp()
    });
    return newId;
  },

  // Change Log operations
  addChangeLog: async (managerId: string, change: string): Promise<string> => {
    const newId = `CL${String(mockData.changeLog.length + 1).padStart(3, '0')}`;
    mockData.changeLog.push({
      id: newId,
      managerId,
      changeMade: change,
      timestamp: createMockTimestamp()
    });
    return newId;
  },

  // Favorites operations
  addFavorite: async (userId: string, routeId: string): Promise<string> => {
    const newId = `F${String(mockData.favorites.length + 1).padStart(3, '0')}`;
    mockData.favorites.push({
      id: newId,
      userId,
      routeId,
      addedAt: createMockTimestamp()
    });
    return newId;
  },

  // Route History operations
  addRouteHistory: async (driverId: string, historyData: Omit<RouteHistoryEntry, 'id'>): Promise<string> => {
    const newId = `RH${String(mockData.routeHistory.length + 1).padStart(3, '0')}`;
    mockData.routeHistory.push({
      ...historyData,
      id: newId,
      driverId,
      timestamp: createMockTimestamp()
    });
    return newId;
  }
}; 