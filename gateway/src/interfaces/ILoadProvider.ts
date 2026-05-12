export interface ILoadProvider {
  createLoad(orgId: string, dto: Record<string, unknown>): Promise<unknown>;
  getLoadById(loadId: string): Promise<unknown>;
  listLoads(orgId: string, filters?: Record<string, unknown>): Promise<unknown>;
  updateLoad(loadId: string, orgId: string, dto: Record<string, unknown>): Promise<unknown>;
  transitionStatus(loadId: string, orgId: string, status: string, note?: string): Promise<unknown>;
  assignTruck(loadId: string, orgId: string, truckId: string, driverId: string): Promise<unknown>;
  requestBooking(loadId: string, dto: Record<string, unknown>): Promise<unknown>;
  confirmBooking(loadId: string, orgId: string, requestId: string): Promise<unknown>;
  denyBooking(loadId: string, orgId: string, requestId: string, reason?: string): Promise<unknown>;
  listBookingRequests(loadId: string, orgId: string): Promise<unknown>;
  submitCounter(loadId: string, dto: Record<string, unknown>): Promise<unknown>;
  acceptCounter(loadId: string, offerId: string): Promise<unknown>;
  searchLoads(filters: Record<string, unknown>): Promise<unknown>;
  searchTrucks(filters: Record<string, unknown>): Promise<unknown>;
  saveSearch(dto: Record<string, unknown>): Promise<unknown>;
  listSavedSearches(): Promise<unknown>;
  deleteSavedSearch(searchId: string): Promise<void>;
  setPreferredLane(dto: Record<string, unknown>): Promise<unknown>;
  listPreferredLanes(): Promise<unknown>;
  deletePreferredLane(laneId: string): Promise<void>;
}
