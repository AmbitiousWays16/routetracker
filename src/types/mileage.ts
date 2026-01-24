export interface Trip {
  id: string;
  date: string;
  fromAddress: string;
  toAddress: string;
  businessPurpose: string;
  program: string;
  miles: number;
  routeUrl?: string;
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
