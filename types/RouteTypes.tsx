// Types for Route Modal Components

// Stop item interface
export interface StopItem {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  eta?: string; // Estimated time of arrival
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
  name: string;
  routeKey: string;
  startTime: string;
  endTime: string;
  stops: StopItem[];
  estimatedDuration?: number; // in minutes
  assignedDriverId?: string;
  schedule?: RouteSchedule; // Add schedule data
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
}
