import type { TruckRequestDTO } from '@flow/shared';
import { AppError } from '../../lib/errors';
import { LoadModel, ILoad } from './models/load.model';
import { TruckRequestModel, ITruckRequest } from './models/truck-request.model';
import { TruckService } from '../fleet';

export class TruckRequestService {
  /**
   * Creates a truck request — used by a broker who needs a carrier's truck
   * for a specific load (outbound request to a carrier).
   */
  static async createTruckRequest(
    loadId: string,
    userId: string,
    orgId: string,
    dto: TruckRequestDTO,
  ): Promise<ITruckRequest> {
    const load = await LoadModel.findOne({ _id: loadId, orgId });

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    if (load.status !== 'created' && load.status !== 'posted') {
      throw AppError.badRequest(
        'LOAD_NOT_AVAILABLE',
        `Cannot request a truck for a load in status "${load.status}"`,
      );
    }

    // Validate the truck exists and belongs to the target carrier org
    const truck = await TruckService.getTruckById(dto.truckId, dto.carrierOrgId);

    if (!truck) {
      throw AppError.notFound('Truck', dto.truckId);
    }

    const existingRequest = await TruckRequestModel.findOne({
      loadId: load._id,
      truckId: dto.truckId,
      status: 'pending',
    });

    if (existingRequest) {
      throw AppError.conflict(
        'DUPLICATE_TRUCK_REQUEST',
        'A pending truck request already exists for this truck on this load',
      );
    }

    const truckRequest = await TruckRequestModel.create({
      loadId: load._id,
      requestedBy: userId,
      truckId: dto.truckId,
      carrierOrgId: dto.carrierOrgId,
      offeredRate: dto.offeredRate,
      status: 'pending',
    });

    return truckRequest;
  }

  /**
   * Confirms a truck request — the carrier accepts the broker's request,
   * assigning the truck to the load and transitioning it to "booked".
   */
  static async confirmTruckRequest(
    loadId: string,
    carrierOrgId: string,
    requestId: string,
    userId: string,
  ): Promise<ILoad> {
    const load = await LoadModel.findById(loadId);

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    if (load.status !== 'posted' && load.status !== 'created') {
      throw AppError.badRequest(
        'LOAD_NOT_AVAILABLE',
        `Cannot confirm truck request for load in status "${load.status}"`,
      );
    }

    const request = await TruckRequestModel.findOne({
      _id: requestId,
      loadId,
      carrierOrgId,
    });

    if (!request) {
      throw AppError.notFound('Truck request', requestId);
    }

    if (request.status !== 'pending') {
      throw AppError.badRequest(
        'REQUEST_NOT_PENDING',
        'Only pending truck requests can be confirmed',
      );
    }

    const truck = await TruckService.getTruckById(request.truckId.toString(), carrierOrgId);

    if (!truck) {
      throw AppError.notFound('Truck', request.truckId.toString());
    }

    request.status = 'accepted';
    request.respondedBy = userId;
    request.respondedAt = new Date();
    await request.save();

    // Deny all other pending truck requests for this load
    await TruckRequestModel.updateMany(
      {
        loadId,
        _id: { $ne: request._id },
        status: 'pending',
      },
      { status: 'cancelled' },
    );

    load.status = 'booked';
    load.assignedTruckId = request.truckId;
    load.assignedAt = new Date();

    if (truck.assignedDriverId) {
      load.assignedDriverId = truck.assignedDriverId.toString();
    }

    load.statusHistory.push({
      status: 'booked',
      changedBy: userId,
      changedAt: new Date(),
      note: `Booked via truck request confirmation: ${requestId}`,
    });

    await load.save();

    await TruckService.setTruckInTransit(request.truckId.toString(), carrierOrgId, loadId);

    return load;
  }

  /**
   * Denies a truck request — the carrier declines the broker's request.
   */
  static async denyTruckRequest(
    loadId: string,
    carrierOrgId: string,
    requestId: string,
    userId: string,
    reason?: string,
  ): Promise<ITruckRequest> {
    const load = await LoadModel.findById(loadId);

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    const request = await TruckRequestModel.findOne({
      _id: requestId,
      loadId,
      carrierOrgId,
    });

    if (!request) {
      throw AppError.notFound('Truck request', requestId);
    }

    if (request.status !== 'pending') {
      throw AppError.badRequest('REQUEST_NOT_PENDING', 'Only pending truck requests can be denied');
    }

    request.status = 'denied';
    request.respondedBy = userId;
    request.respondedAt = new Date();
    await request.save();

    return request;
  }
}
