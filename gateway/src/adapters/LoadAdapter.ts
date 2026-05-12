import { BaseAdapter } from './BaseAdapter';
import { ILoadProvider } from '../interfaces/ILoadProvider';

export class LoadAdapter extends BaseAdapter implements ILoadProvider {
  async createLoad(orgId: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.post('/loads', { ...dto, orgId });
  }

  async getLoadById(loadId: string): Promise<unknown> {
    return this.get(`/loads/${loadId}`);
  }

  async listLoads(orgId: string, filters?: Record<string, unknown>): Promise<unknown> {
    return this.get('/loads', { ...filters, orgId });
  }

  async updateLoad(loadId: string, orgId: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.patch(`/loads/${loadId}`, { ...dto, orgId });
  }

  async transitionStatus(loadId: string, orgId: string, status: string, note?: string): Promise<unknown> {
    return this.post(`/loads/${loadId}/transition`, { status, note, orgId });
  }

  async assignTruck(loadId: string, orgId: string, truckId: string, driverId: string): Promise<unknown> {
    return this.post(`/loads/${loadId}/assign-truck`, { truckId, driverId, orgId });
  }

  async requestBooking(loadId: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.post(`/loads/${loadId}/booking`, dto);
  }

  async confirmBooking(loadId: string, orgId: string, requestId: string): Promise<unknown> {
    return this.post(`/loads/${loadId}/booking/${requestId}/confirm`, { orgId });
  }

  async denyBooking(loadId: string, orgId: string, requestId: string, reason?: string): Promise<unknown> {
    return this.post(`/loads/${loadId}/booking/${requestId}/deny`, { orgId, reason });
  }

  async listBookingRequests(loadId: string, orgId: string): Promise<unknown> {
    return this.get(`/loads/${loadId}/booking`, { orgId });
  }

  async submitCounter(loadId: string, dto: Record<string, unknown>): Promise<unknown> {
    return this.post(`/loads/${loadId}/counter`, dto);
  }

  async acceptCounter(loadId: string, offerId: string): Promise<unknown> {
    return this.post(`/loads/${loadId}/counter/${offerId}/accept`, {});
  }

  async searchLoads(filters: Record<string, unknown>): Promise<unknown> {
    return this.get('/marketplace/search/loads', filters);
  }

  async searchTrucks(filters: Record<string, unknown>): Promise<unknown> {
    return this.get('/marketplace/search/trucks', filters);
  }

  async saveSearch(dto: Record<string, unknown>): Promise<unknown> {
    return this.post('/marketplace/searches', dto);
  }

  async listSavedSearches(): Promise<unknown> {
    return this.get('/marketplace/searches');
  }

  async deleteSavedSearch(searchId: string): Promise<void> {
    return this.delete(`/marketplace/searches/${searchId}`);
  }

  async setPreferredLane(dto: Record<string, unknown>): Promise<unknown> {
    return this.post('/marketplace/preferred-lanes', dto);
  }

  async listPreferredLanes(): Promise<unknown> {
    return this.get('/marketplace/preferred-lanes');
  }

  async deletePreferredLane(laneId: string): Promise<void> {
    return this.delete(`/marketplace/preferred-lanes/${laneId}`);
  }
}
