interface LoadAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
  contactName: string;
  contactPhone: string;
}

export interface CreateLoadDTO {
  shipperName: string;
  shipperPhone: string;
  shipperEmail: string;
  referenceNumber?: string | null;
  origin: LoadAddress;
  destination: LoadAddress;
  pickupDate: string;
  deliveryDate: string;
  weight: number;
  truckType: string;
  rate: number;
  rateType: string;
  isPublic?: boolean;
  specialRequirements?: string;
  commodity?: string;
  rateNegotiable?: boolean;
  requireVerifiedCarrier?: boolean;
  internalNotes?: string;
  requiresHazmat?: boolean;
  requiresLiftgate?: boolean;
  maxVehicleLength?: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
}

export type UpdateLoadDTO = Partial<Omit<CreateLoadDTO, 'rate' | 'rateType'>> & {
  rate?: number;
  rateType?: string;
  requiresHazmat?: boolean;
  requiresLiftgate?: boolean;
  maxVehicleLength?: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
};

export interface LoadFilters {
  status?: string;
  truckType?: string;
  pickupDateStart?: string;
  pickupDateEnd?: string;
  pickupDate?: string;
  search?: string;
  minWeight?: number;
  maxWeight?: number;
  cursor?: string;
  limit?: number;
}

export interface MarketplaceFilters {
  originCity?: string;
  originState?: string;
  destCity?: string;
  destState?: string;
  truckType?: string;
  minRate?: number;
  maxRate?: number;
  minWeight?: number;
  maxWeight?: number;
  maxDistance?: number;
  pickupDateStart?: string;
  pickupDateEnd?: string;
  search?: string;
  sort?: 'rate' | 'distance' | 'postedAt' | 'pickupDate';
  sortDir?: 'asc' | 'desc';
  cursor?: string;
  limit?: number;
}

export interface BookingRequestDTO {
  truckId: string;
  driverId: string;
  proposedRate?: number;
}

export interface CounterOfferDTO {
  proposedRate: number;
  note?: string;
  bookingRequestId?: string;
}

export interface TruckRequestDTO {
  truckId: string;
  carrierOrgId: string;
  offeredRate: number;
}

export interface SavedSearchDTO {
  name: string;
  filters: Record<string, unknown>;
  alertEnabled?: boolean;
  alertChannels?: string[];
}

export interface PreferredLaneDTO {
  originState: string;
  destinationState: string;
  minRatePerMile?: number;
  minRatePerTrip?: number;
  maxDistance?: number;
  truckTypes?: string[];
  alertEnabled?: boolean;
}

export interface MatchingTruckResult {
  truckId: string;
  plateNumber: string;
  truckType: string;
  carrierOrgId: string;
  driverId: string;
  distance: number;
  matchScore: number;
  specs: {
    maxWeight: number | null;
    length: number | null;
    hasLiftgate: boolean;
    isHazmatCertified: boolean;
  };
  currentLocation: {
    city: string;
    state: string;
    lat: number;
    lng: number;
  } | null;
}
