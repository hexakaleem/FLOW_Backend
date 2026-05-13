import { Types } from 'mongoose';
import type { BookingRequestDTO } from '@flow/shared';
import { AppError } from '../../lib/errors';
import { EventBus } from '../../events/EventBus';
import { LoadModel, ILoad } from './models/load.model';
import { BookingRequestModel, IBookingRequest } from './models/booking-request.model';
import { TruckService } from '../fleet';
import type { ITruck } from '../fleet/models/truck.model';

function validateTruckSpecsForLoad(truck: ITruck, load: ILoad): string | null {
  if (truck.type !== load.truckType) {
    return `Truck type "${truck.type}" does not match load requirement "${load.truckType}"`;
  }
  if (load.weight > 0 && truck.specs.maxWeight && truck.specs.maxWeight < load.weight) {
    return `Truck max weight (${truck.specs.maxWeight} lbs) cannot handle load weight (${load.weight} lbs)`;
  }
  if (load.requiresHazmat && !truck.specs.isHazmatCertified) {
    return 'Load requires a hazmat-certified truck';
  }
  if (load.requiresLiftgate && !truck.specs.hasLiftgate) {
    return 'Load requires a truck with liftgate';
  }
  if (load.maxVehicleLength && truck.specs.length && truck.specs.length > load.maxVehicleLength) {
    return `Truck length (${truck.specs.length}ft) exceeds load max length (${load.maxVehicleLength}ft)`;
  }
  if ((load.temperatureMin != null || load.temperatureMax != null) && truck.type !== 'reefer') {
    return 'Load requires a reefer truck for temperature-controlled transport';
  }
  return null;
}

export class BookingService {
  static async requestBooking(
    loadId: string,
    carrierUserId: string,
    carrierOrgId: string,
    dto: BookingRequestDTO,
  ): Promise<IBookingRequest> {
    if (!Types.ObjectId.isValid(loadId)) {
      throw AppError.notFound('Load', loadId);
    }
    const load = await LoadModel.findById(new Types.ObjectId(loadId));

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    if (load.status !== 'posted' || !load.isPublic) {
      throw AppError.badRequest('LOAD_NOT_AVAILABLE', 'This load is not available for booking');
    }

    if (load.orgId.toString() === carrierOrgId) {
      throw AppError.badRequest('CANNOT_BOOK_OWN_LOAD', 'You cannot book your own load');
    }

    const ownsTruck = await TruckService.validateTruckOwnership(dto.truckId, carrierOrgId);

    if (!ownsTruck) {
      throw AppError.notFound('Truck', dto.truckId);
    }

    const truck = await TruckService.getTruckById(dto.truckId, carrierOrgId);
    if (!truck) {
      throw AppError.notFound('Truck', dto.truckId);
    }

    const specError = validateTruckSpecsForLoad(truck, load);
    if (specError) {
      throw AppError.badRequest('TRUCK_SPEC_MISMATCH', specError);
    }

    const existingRequest = await BookingRequestModel.findOne({
      loadId: load._id,
      carrierOrgId: carrierOrgId,
      status: 'pending',
    });

    if (existingRequest) {
      throw AppError.conflict(
        'DUPLICATE_BOOKING_REQUEST',
        'You already have a pending booking request for this load',
      );
    }

    const bookingRequest = await BookingRequestModel.create({
      loadId: load._id,
      carrierOrgId: carrierOrgId,
      carrierUserId: carrierUserId,
      truckId: dto.truckId,
      driverId: dto.driverId,
      proposedRate: dto.proposedRate ?? null,
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });

    load.bookingRequestCount += 1;
    await load.save();

    setImmediate(() => {
      EventBus.publish({
        type: 'booking:requested',
        payload: {
          bookingRequestId: bookingRequest._id.toString(),
          loadId: load._id.toString(),
          brokerUserId: load.createdBy.toString(),
          brokerOrgId: load.orgId.toString(),
          carrierUserId: carrierUserId,
          carrierOrgId: carrierOrgId,
          proposedRate: dto.proposedRate ?? null,
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    });

    return bookingRequest;
  }

  static async confirmBooking(
    loadId: string,
    orgId: string,
    requestId: string,
    userId: string,
  ): Promise<ILoad> {
    if (!Types.ObjectId.isValid(loadId)) {
      throw AppError.notFound('Load', loadId);
    }
    if (!Types.ObjectId.isValid(requestId)) {
      throw AppError.notFound('Booking request', requestId);
    }
    const load = await LoadModel.findOne({
      _id: new Types.ObjectId(loadId),
      orgId: orgId,
    });

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    if (load.status !== 'posted') {
      throw AppError.badRequest(
        'LOAD_NOT_AVAILABLE',
        `Cannot confirm booking for load in status "${load.status}"`,
      );
    }

    const request = await BookingRequestModel.findOne({
      _id: new Types.ObjectId(requestId),
      loadId: loadId,
    });

    if (!request) {
      throw AppError.notFound('Booking request', requestId);
    }

    if (request.status !== 'pending') {
      throw AppError.badRequest(
        'REQUEST_NOT_PENDING',
        'Only pending booking requests can be confirmed',
      );
    }

    const truck = await TruckService.getTruckById(
      request.truckId.toString(),
      request.carrierOrgId.toString(),
    );

    if (!truck) {
      throw AppError.notFound('Truck', request.truckId.toString());
    }

    if (
      truck.assignedDriverId &&
      truck.assignedDriverId.toString() !== request.driverId.toString()
    ) {
      throw AppError.conflict(
        'TRUCK_UNAVAILABLE',
        'The truck is no longer available with the requested driver',
      );
    }

    request.status = 'accepted';
    request.respondedBy = userId;
    request.respondedAt = new Date();
    await request.save();

    await BookingRequestModel.updateMany(
      {
        loadId: loadId,
        _id: { $ne: request._id },
        status: 'pending',
      },
      { status: 'cancelled' },
    );

    load.status = 'booked';
    load.assignedTruckId = request.truckId;
    load.assignedDriverId = request.driverId;
    load.assignedAt = new Date();
    load.confirmedBookingId = request._id.toString();

    load.statusHistory.push({
      status: 'booked',
      changedBy: userId.toString(),
      changedAt: new Date(),
      note: null,
    });

    await load.save();

    await TruckService.setTruckInTransit(
      request.truckId.toString(),
      request.carrierOrgId.toString(),
      loadId,
    );

    setImmediate(() => {
      EventBus.publish({
        type: 'booking:confirmed',
        payload: {
          loadId: load._id.toString(),
          bookingRequestId: request._id.toString(),
          brokerUserId: userId,
          carrierUserId: request.carrierUserId.toString(),
          carrierOrgId: request.carrierOrgId.toString(),
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    });

    return load;
  }

  static async denyBooking(
    loadId: string,
    orgId: string,
    requestId: string,
    userId: string,
    reason?: string,
  ): Promise<IBookingRequest> {
    if (!Types.ObjectId.isValid(loadId)) {
      throw AppError.notFound('Load', loadId);
    }
    if (!Types.ObjectId.isValid(requestId)) {
      throw AppError.notFound('Booking request', requestId);
    }
    const load = await LoadModel.findOne({
      _id: new Types.ObjectId(loadId),
      orgId: orgId,
    });

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    const request = await BookingRequestModel.findOne({
      _id: new Types.ObjectId(requestId),
      loadId: loadId,
    });

    if (!request) {
      throw AppError.notFound('Booking request', requestId);
    }

    if (request.status !== 'pending') {
      throw AppError.badRequest(
        'REQUEST_NOT_PENDING',
        'Only pending booking requests can be denied',
      );
    }

    request.status = 'denied';
    request.respondedBy = userId;
    request.respondedAt = new Date();
    request.denialReason = reason ?? null;
    await request.save();

    setImmediate(() => {
      EventBus.publish({
        type: 'booking:denied',
        payload: {
          loadId: load._id.toString(),
          bookingRequestId: request._id.toString(),
          brokerUserId: userId,
          carrierUserId: request.carrierUserId.toString(),
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    });

    return request;
  }

  static async cancelBookingRequest(
    loadId: string,
    bookingId: string,
    userId: string,
    orgId: string,
  ): Promise<IBookingRequest> {
    if (!Types.ObjectId.isValid(loadId)) {
      throw AppError.notFound('Load', loadId);
    }
    if (!Types.ObjectId.isValid(bookingId)) {
      throw AppError.notFound('Booking request', bookingId);
    }

    const load = await LoadModel.findById(new Types.ObjectId(loadId));

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    const request = await BookingRequestModel.findOne({
      _id: new Types.ObjectId(bookingId),
      loadId: loadId,
      carrierOrgId: orgId,
    });

    if (!request) {
      throw AppError.notFound('Booking request', bookingId);
    }

    if (request.carrierUserId.toString() !== userId) {
      throw AppError.forbidden('You can only cancel your own booking requests');
    }

    if (request.status !== 'pending') {
      throw AppError.badRequest(
        'REQUEST_NOT_PENDING',
        'Only pending booking requests can be cancelled',
      );
    }

    request.status = 'cancelled';
    await request.save();

    if (load.bookingRequestCount > 0) {
      load.bookingRequestCount -= 1;
      await load.save();
    }

    return request;
  }

  static async listBookingRequests(loadId: string, orgId: string): Promise<IBookingRequest[]> {
    if (!Types.ObjectId.isValid(loadId)) {
      throw AppError.notFound('Load', loadId);
    }
    const load = await LoadModel.findOne({
      _id: new Types.ObjectId(loadId),
      orgId: orgId,
    });

    if (!load) {
      throw AppError.notFound('Load', loadId);
    }

    return BookingRequestModel.find({ loadId: loadId });
  }

  static async listAllBookingRequests(orgId: string): Promise<any[]> {
    // 1. Get all load IDs for this organization
    const loads = await LoadModel.find({ orgId: orgId }, { _id: 1, title: 1, origin: 1, destination: 1, status: 1 });
    const loadIds = loads.map(l => l._id);

    // 2. Get all pending booking requests for these loads
    const requests = await BookingRequestModel.find({ 
      loadId: { $in: loadIds },
      status: 'pending'
    }).sort({ createdAt: -1 }).lean();

    // 3. Map load info back to requests
    return requests.map(req => ({
      ...req,
      load: loads.find(l => l._id.toString() === req.loadId.toString())
    }));
  }
}
