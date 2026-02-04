export interface RouteMapData {
  encodedPolyline: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface Trip {
  id: string;
  date: string;
  fromAddress: string;
  toAddress: string;
  businessPurpose: string;
  program: string;
  miles: number;
  routeUrl?: string;
  /** @deprecated Use routeMapData instead - staticMapUrl exposed API keys */
  staticMapUrl?: string;
  routeMapData?: RouteMapData;
  createdAt: Date;
}

export interface MileageVoucher {
  id: string;
  employeeName: string;
  month: string;
  year: number;
  trips: Trip[];
  totalMiles: number;
  submittedDate?: Date;
}

// GPS Tracking Types
export interface GPSCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  heading?: number;
  speed?: number; // meters per second
  timestamp: number;
}

export interface GPSTrackingState {
  isTracking: boolean;
  isPaused: boolean;
  coordinates: GPSCoordinate[];
  totalDistance: number; // meters
  totalDistanceMiles: number;
  currentSpeed: number; // m/s
  averageSpeed: number; // m/s
  startTime?: number;
  duration: number; // seconds
  error?: string;
}

export interface RouteData {
  routeId?: string;
  coordinates: GPSCoordinate[];
  totalDistanceMeters: number;
  totalDistanceMiles: number;
  startTime: number;
  endTime: number;
  duration: number;
  startAddress?: string;
  endAddress?: string;
}
