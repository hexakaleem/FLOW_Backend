export interface CreateTruckDTO {
  plateNumber: string;
  plateState: string;
  internalId: string;
  type: string;
  vin?: string;
  year?: number;
  make?: string;
  vehicleModel?: string;
  specs?: {
    maxWeight?: number;
    length?: number;
    hasLiftgate?: boolean;
    isHazmatCertified?: boolean;
  };
}

export interface UpdateTruckDTO {
  plateNumber?: string;
  plateState?: string;
  internalId?: string;
  type?: string;
  vin?: string;
  year?: number;
  make?: string;
  vehicleModel?: string;
  specs?: {
    maxWeight?: number;
    length?: number;
    hasLiftgate?: boolean;
    isHazmatCertified?: boolean;
  };
}

export interface AssignDriverDTO {
  driverId: string;
  effectiveFrom?: string;
}

export interface AssignGpsDTO {
  deviceId: string;
}

export interface CreateTrailerDTO {
  type: string;
  length: number;
  capacity: number;
  plateNumber: string;
}

export interface AssignTrailerDTO {
  truckId: string;
}
