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
