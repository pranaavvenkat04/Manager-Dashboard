// Re-export mockDb as schoolService
export * from './mockData';

import { mockDb } from './mockData';
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

// School Operations
export const createSchool = async (schoolData: Omit<School, 'id'>) => {
  return mockDb.createSchool(schoolData);
};

export const getSchool = async (schoolId: string) => {
  return mockDb.getSchool(schoolId);
};

export const updateSchool = async (schoolId: string, data: Partial<School>) => {
  return mockDb.updateSchool(schoolId, data);
};

export const deleteSchool = async (schoolId: string, deletedBy: string) => {
  return mockDb.deleteSchool(schoolId, deletedBy);
};

// Route Operations
export const createRoute = async (schoolId: string, routeData: Omit<Route, 'id'>) => {
  return mockDb.createRoute(schoolId, routeData);
};

export const getRoutesBySchool = async (schoolId: string) => {
  return mockDb.getRoutesBySchool(schoolId);
};

// Stop Operations
export const createStop = async (routeId: string, stopData: Omit<Stop, 'id'>) => {
  return mockDb.createStop(routeId, stopData);
};

export const getStopsByRoute = async (routeId: string) => {
  return mockDb.getStopsByRoute(routeId);
};

// Schedule Operations
export const createSchedule = async (routeId: string, scheduleData: Omit<Schedule, 'id'>) => {
  return mockDb.createSchedule(routeId, scheduleData);
};

export const getSchedulesByRoute = async (routeId: string) => {
  return mockDb.getSchedulesByRoute(routeId);
};

// Exception Operations
export const createException = async (routeId: string, exceptionData: Omit<Exception, 'id'>) => {
  return mockDb.createException(routeId, exceptionData);
};

export const getExceptionsByRoute = async (routeId: string) => {
  return mockDb.getExceptionsByRoute(routeId);
};

// Manager Operations
export const createManager = async (schoolId: string, managerData: Omit<Manager, 'id'>) => {
  return mockDb.createManager(schoolId, managerData);
};

// User Operations
export const createUser = async (schoolId: string, userData: Omit<User, 'id'>) => {
  return mockDb.createUser(schoolId, userData);
};

// Driver Operations
export const createDriver = async (schoolId: string, driverData: Omit<Driver, 'id'>) => {
  return mockDb.createDriver(schoolId, driverData);
};

// Vehicle Operations
export const createVehicle = async (schoolId: string, vehicleData: Omit<Vehicle, 'id'>) => {
  return mockDb.createVehicle(schoolId, vehicleData);
};

// Active Trip Operations
export const createActiveTrip = async (schoolId: string, tripData: Omit<ActiveTrip, 'id'>) => {
  return mockDb.createActiveTrip(schoolId, tripData);
};

// Completed Trip Operations
export const createCompletedTrip = async (schoolId: string, tripData: Omit<CompletedTrip, 'id'>) => {
  return mockDb.createCompletedTrip(schoolId, tripData);
};

// Change Log Operations
export const addChangeLog = async (managerId: string, change: string) => {
  return mockDb.addChangeLog(managerId, change);
};

// Favorites Operations
export const addFavorite = async (userId: string, routeId: string) => {
  return mockDb.addFavorite(userId, routeId);
};

// Route History Operations
export const addRouteHistory = async (driverId: string, historyData: Omit<RouteHistoryEntry, 'id'>) => {
  return mockDb.addRouteHistory(driverId, historyData);
}; 