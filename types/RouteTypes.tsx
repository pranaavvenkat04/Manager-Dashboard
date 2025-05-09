// Types for Route Modal Components

// Stop item interface
export interface StopItem {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  eta?: string; // Estimated time of arrival
  // Fields for backward compatibility with TransportTypes
  latitude?: number;
  longitude?: number;
  order?: number;
  status?: boolean;
  routeId?: string;
  created_by?: string;
  created_at?: string;
  soft_delete?: boolean;
}

// Driver interface
export interface Driver {
  id: string;
  name: string;
}

// Address result interface
export interface AddressResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

// Schedule exception interface
export interface ScheduleException {
  date: Date;
  type: 'no_service' | 'special_service';
  reason?: string;
}

// Schedule interface
export interface RouteSchedule {
  operatingDays: number[]; // 0-6 for Sunday-Saturday
  exceptions: ScheduleException[];
  effectiveDates: {
    startDate: Date;
    endDate?: Date;
  };
}

// Route data interface
export interface RouteData {
  id?: string;
  // Compatibility with old names
  routeCode?: string;
  title?: string;
  // New names from TransportTypes
  route_key?: string;
  route_code?: string;
  name?: string;
  description?: string;
  // Common fields
  interval?: number;
  stopsCount?: number;
  stops_count?: number;
  active?: boolean;
  // School reference
  schoolId?: string;
  school_id?: string;
  // Driver reference
  assignedDriverId?: string;
  assigned_driver_id?: string;
  // Time fields
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  estimatedDuration?: number;
  estimated_duration?: number;
  // Metadata
  created_by?: string;
  created_at?: string;
  updated_by?: string;
  updated_at?: string;
  deleted_by?: string;
  deleted_at?: string;
  soft_delete?: boolean;
  // Sub collections
  stops?: StopItem[];
  schedule?: RouteSchedule;
}

// Field errors interface
export interface FieldErrors {
  routeName?: string;
  routeKey?: string;
  startTime?: string;
  endTime?: string;
  stops?: string;
  operatingDays?: string; // Added for schedule
  effectiveDates?: string; // Added for schedule
}

// Type guard for StopItem
export const isStopItem = (item: any): item is StopItem => {
  return item && 
    typeof item === 'object' && 
    'id' in item && 
    'name' in item && 
    'address' in item;
};

// Modal props interfaces
export interface AddRouteModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (routeData: RouteData) => void;
}

export interface RouteDetailsFormProps {
  routeName: string;
  setRouteName: (name: string) => void;
  routeKey: string;
  setRouteKey: (key: string) => void;
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  calculatedEndTime: string;
  estimatedDuration: number;
  drivers: Driver[];
  selectedDriver: string;
  setSelectedDriver: (id: string) => void;
  fieldErrors: FieldErrors;
  setFieldErrors: (errors: FieldErrors) => void;
  routeDescription?: string;
  setRouteDescription?: (text: string) => void;
  isRouteKeyEditable?: boolean;
}

export interface RouteScheduleFormProps {
  schedule: RouteSchedule;
  setSchedule: (schedule: RouteSchedule) => void;
  fieldErrors: FieldErrors;
  setFieldErrors: (errors: FieldErrors) => void;
}

export interface AddressSearchProps {
  onSelectAddress: (result: AddressResult) => void;
  fieldErrors: FieldErrors;
}

export interface StopItemProps {
  stop: StopItem;
  index: number;
  total: number;
  onEdit: (id: string, field: 'name' | 'address', value: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export interface StopsListProps {
  stops: StopItem[];
  onEdit: (id: string, field: 'name' | 'address', value: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  fieldErrors: FieldErrors;
}

export interface RouteMapProps {
  stops: StopItem[];
  estimatedDuration: number;
  onStopDrag?: (stopId: string, update: { lat: number; lng: number; address: string }) => void;
  onMapClick?: (newStop: StopItem) => void;
}
