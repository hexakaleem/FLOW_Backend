import { CreateTruckDTO, UpdateTruckDTO, AssignDriverDTO, CreateTrailerDTO } from '@flow/shared';
import { BaseAdapter } from './BaseAdapter';
import { IFleetProvider } from '../interfaces/IFleetProvider';

export class FleetAdapter extends BaseAdapter implements IFleetProvider {
  async createTruck(orgId: string, dto: CreateTruckDTO): Promise<unknown> {
    return this.post('/fleet/trucks', { ...dto, orgId });
  }

  async getTruckById(truckId: string): Promise<unknown> {
    return this.get(`/fleet/trucks/${truckId}`);
  }

  async listTrucks(orgId: string, filters?: Record<string, unknown>): Promise<unknown> {
    return this.get('/fleet/trucks', { ...filters, orgId });
  }

  async updateTruck(truckId: string, orgId: string, dto: UpdateTruckDTO): Promise<unknown> {
    return this.patch(`/fleet/trucks/${truckId}`, { ...dto, orgId });
  }

  async decommissionTruck(truckId: string, orgId: string): Promise<void> {
    return this.delete(`/fleet/trucks/${truckId}?orgId=${orgId}`);
  }

  async decodeVin(truckId: string, vin: string): Promise<unknown> {
    return this.post(`/fleet/trucks/${truckId}/decode-vin`, { vin });
  }

  async assignDriver(truckId: string, orgId: string, dto: AssignDriverDTO): Promise<unknown> {
    return this.post(`/fleet/trucks/${truckId}/assign-driver`, { ...dto, orgId });
  }

  async assignGpsDevice(truckId: string, orgId: string, deviceId: string): Promise<unknown> {
    return this.post(`/fleet/trucks/${truckId}/assign-gps`, { deviceId, orgId });
  }

  async createTrailer(orgId: string, dto: CreateTrailerDTO): Promise<unknown> {
    return this.post('/fleet/trailers', { ...dto, orgId });
  }

  async listTrailers(orgId: string): Promise<unknown> {
    return this.get('/fleet/trailers', { orgId });
  }

  async assignTrailerToTruck(trailerId: string, orgId: string, truckId: string): Promise<unknown> {
    return this.post(`/fleet/trailers/${trailerId}/assign`, { truckId, orgId });
  }

  async getComplianceRecords(orgId: string, daysAhead?: number): Promise<unknown> {
    return this.get('/fleet/compliance', { orgId, daysAhead });
  }

  async upsertCompliance(orgId: string, driverId: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.post('/fleet/compliance', { ...dto, orgId, driverId });
  }

  async getAvailableTrucks(orgId: string, filters?: Record<string, unknown>): Promise<unknown> {
    return this.get('/fleet/trucks/available', { ...filters, orgId });
  }
}
