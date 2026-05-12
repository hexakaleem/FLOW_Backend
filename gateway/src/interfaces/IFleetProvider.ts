import { CreateTruckDTO, UpdateTruckDTO, AssignDriverDTO, CreateTrailerDTO } from '@flow/shared';

export interface IFleetProvider {
  createTruck(orgId: string, dto: CreateTruckDTO): Promise<unknown>;
  getTruckById(truckId: string): Promise<unknown>;
  listTrucks(orgId: string, filters?: Record<string, unknown>): Promise<unknown>;
  updateTruck(truckId: string, orgId: string, dto: UpdateTruckDTO): Promise<unknown>;
  decommissionTruck(truckId: string, orgId: string): Promise<void>;
  decodeVin(truckId: string, vin: string): Promise<unknown>;
  assignDriver(truckId: string, orgId: string, dto: AssignDriverDTO): Promise<unknown>;
  assignGpsDevice(truckId: string, orgId: string, deviceId: string): Promise<unknown>;
  createTrailer(orgId: string, dto: CreateTrailerDTO): Promise<unknown>;
  listTrailers(orgId: string): Promise<unknown>;
  assignTrailerToTruck(trailerId: string, orgId: string, truckId: string): Promise<unknown>;
  getComplianceRecords(orgId: string, daysAhead?: number): Promise<unknown>;
  upsertCompliance(orgId: string, driverId: string, dto: Record<string, unknown>): Promise<unknown>;
  getAvailableTrucks(orgId: string, filters?: Record<string, unknown>): Promise<unknown>;
}
