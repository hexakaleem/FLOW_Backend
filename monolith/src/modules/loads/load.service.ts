import axios from 'axios';
import { Types } from 'mongoose';
import type { CreateLoadDTO, UpdateLoadDTO, LoadFilters, LoadStatus } from '@flow/shared';
import { buildPaginationQuery } from '@flow/shared';
import { config } from '../../config';
import { AppError } from '../../lib/errors';
import { sendEmail } from '../../lib/email';
import { EventBus } from '../../events/EventBus';
import { validateTransition } from './status-machine';
import { LoadModel, ILoad } from './models/load.model';
import { TruckService } from '../fleet';
import { MarketplaceService } from './marketplace.service';
import { MatchingService } from './matching.service';
import { reverseGeocode } from '../../lib/geocoding';

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

async function geocodeAddress(
  address: string,
  city: string,
  state: string,
): Promise<{ lat: number; lng: number }> {
  const query = encodeURIComponent(`${address}, ${city}, ${state}`);
  const url = `${config.external.nominatimUrl}/search?q=${query}&format=json&limit=1`;

  const response = await axios.get(url, {
    headers: { 'User-Agent': 'FlowLoads/1.0' },
  });

  const results = response.data as Array<{ lat: string; lon: string }>;

  if (!results || results.length === 0) {
    throw AppError.badRequest(
      'GEOCODE_FAILED',
      `Could not geocode address: ${address}, ${city}, ${state}`,
    );
  }

  return {
    lat: parseFloat(results[0].lat),
    lng: parseFloat(results[0].lon),
  };
}

export class LoadService {
  // ---------------------------------------------------------------------------
  // CREATE LOAD (always starts as draft)
  // ---------------------------------------------------------------------------
  static async createLoad(orgId: string, userId: string, dto: CreateLoadDTO): Promise<ILoad> {
    const pickupDate = new Date(dto.pickupDate);
    const deliveryDate = new Date(dto.deliveryDate);
    const now = new Date();

    if (pickupDate <= now) {
      throw AppError.badRequest('INVALID_PICKUP_DATE', 'Pickup date must be in the future');
    }

    if (deliveryDate <= pickupDate) {
      throw AppError.badRequest('INVALID_DELIVERY_DATE', 'Delivery date must be after pickup date');
    }

    if (dto.weight <= 0) {
      throw AppError.badRequest('INVALID_WEIGHT', 'Weight must be greater than 0');
    }

    if (dto.rate <= 0) {
      throw AppError.badRequest('INVALID_RATE', 'Rate must be greater than 0');
    }

    if (!dto.shipperName || !dto.shipperPhone || !dto.shipperEmail) {
      throw AppError.badRequest(
        'MISSING_SHIPPER_INFO',
        'Shipper name, phone, and email are required',
      );
    }

    const originCoords =
      dto.origin.lat != null && dto.origin.lng != null
        ? { lat: dto.origin.lat, lng: dto.origin.lng }
        : await geocodeAddress(dto.origin.address, dto.origin.city, dto.origin.state);

    const destCoords =
      dto.destination.lat != null && dto.destination.lng != null
        ? { lat: dto.destination.lat, lng: dto.destination.lng }
        : await geocodeAddress(dto.destination.address, dto.destination.city, dto.destination.state);

    const estimatedDistance = haversineDistance(
      originCoords.lat,
      originCoords.lng,
      destCoords.lat,
      destCoords.lng,
    );

    // Always start as draft. User explicitly calls postLoad to publish.
    const initialStatus = 'draft';

    const load = await LoadModel.create({
      orgId: orgId,
      createdBy: userId,
      shipperName: dto.shipperName,
      shipperPhone: dto.shipperPhone,
      shipperEmail: dto.shipperEmail,
      referenceNumber: dto.referenceNumber ?? null,
      origin: {
        address: dto.origin.address,
        city: dto.origin.city,
        state: dto.origin.state,
        zip: dto.origin.zip,
        lat: originCoords.lat,
        lng: originCoords.lng,
        coordinates: [originCoords.lng, originCoords.lat],
        contactName: dto.origin.contactName,
        contactPhone: dto.origin.contactPhone,
      },
      destination: {
        address: dto.destination.address,
        city: dto.destination.city,
        state: dto.destination.state,
        zip: dto.destination.zip,
        lat: destCoords.lat,
        lng: destCoords.lng,
        coordinates: [destCoords.lng, destCoords.lat],
        contactName: dto.destination.contactName,
        contactPhone: dto.destination.contactPhone,
      },
      pickupDate,
      deliveryDate,
      weight: dto.weight,
      truckType: dto.truckType,
      commodity: dto.commodity ?? null,
      rate: dto.rate,
      rateType: dto.rateType,
      specialRequirements: dto.specialRequirements ?? null,
      isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
      requireVerifiedCarrier: dto.requireVerifiedCarrier ?? false,
      requiresHazmat: dto.requiresHazmat ?? false,
      requiresLiftgate: dto.requiresLiftgate ?? false,
      maxVehicleLength: dto.maxVehicleLength ?? null,
      temperatureMin: dto.temperatureMin ?? null,
      temperatureMax: dto.temperatureMax ?? null,
      status: initialStatus,
      statusHistory: [
        {
          status: 'draft',
          changedBy: userId,
          changedAt: new Date(),
          note: null,
        },
      ],
      estimatedDistance,
    });

    return load;
  }

  // ---------------------------------------------------------------------------
  // GET LOAD BY ID (scoped by orgId)
  // ---------------------------------------------------------------------------
  static async getLoadById(
    loadId: string,
    orgId?: string,
    userId?: string,
    role?: string,
  ): Promise<ILoad | null> {
    if (!Types.ObjectId.isValid(loadId)) {
      throw AppError.notFound('Load', loadId);
    }
    const query: Record<string, unknown> = { _id: new Types.ObjectId(loadId) };

    if (orgId && role !== 'admin') {
      // If it's a broker, they must own it.
      // If it's a carrier/driver, they can see it if they own it, are assigned to it, or it's public.
      if (role === 'broker') {
        query.orgId = orgId;
      } else {
        query.$or = [{ orgId: orgId }, { assignedDriverId: userId }, { isPublic: true }];
      }
    }
    return LoadModel.findOne(query);
  }

  // ---------------------------------------------------------------------------
  // LIST LOADS (scoped by orgId, with filters)
  // ---------------------------------------------------------------------------
  static async listLoads(
    orgId: string,
    filters: LoadFilters,
    userId?: string,
    role?: string,
  ): Promise<{ loads: ILoad[]; meta: Record<string, unknown> }> {
    const { cursorFilter, limit } = buildPaginationQuery(filters.cursor, filters.limit);

    const query: Record<string, unknown> = {
      ...cursorFilter,
    };

    if (role === 'broker') {
      query.orgId = orgId;
    } else if (role === 'carrier' || role === 'independent_driver') {
      query.$or = [{ orgId: orgId }, { assignedDriverId: userId }];
    } else if (role !== 'admin') {
      query.orgId = orgId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.truckType) {
      query.truckType = filters.truckType;
    }

    if (filters.pickupDateStart || filters.pickupDateEnd) {
      query.pickupDate = {};
      if (filters.pickupDateStart) {
        (query.pickupDate as Record<string, unknown>).$gte = new Date(filters.pickupDateStart);
      }
      if (filters.pickupDateEnd) {
        (query.pickupDate as Record<string, unknown>).$lte = new Date(filters.pickupDateEnd);
      }
    }

    if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
      query.weight = {};
      if (filters.minWeight !== undefined) {
        (query.weight as Record<string, unknown>).$gte = filters.minWeight;
      }
      if (filters.maxWeight !== undefined) {
        (query.weight as Record<string, unknown>).$lte = filters.maxWeight;
      }
    }

    // Handle single pickupDate from frontend (maps to a single-day range)
    if ((filters as Record<string, unknown>).pickupDate) {
      const d = new Date((filters as Record<string, unknown>).pickupDate as string);
      query.pickupDate = { $gte: d, $lt: new Date(d.getTime() + 86400000) };
    }

    // Full-text-ish search across location fields, commodity, and truck type
    if (filters.search) {
      const searchRegex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { 'origin.city': searchRegex },
        { 'destination.city': searchRegex },
        { 'origin.state': searchRegex },
        { 'destination.state': searchRegex },
        { commodity: searchRegex },
        { truckType: searchRegex },
      ];
    }

    const loads = await LoadModel.find(query)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();

    const hasMore = loads.length > limit;
    const results = hasMore ? loads.slice(0, limit) : loads;

    const lastLoad = results[results.length - 1];

    return {
      loads: results as unknown as ILoad[],
      meta: {
        cursor: lastLoad ? (lastLoad._id as Types.ObjectId).toString() : null,
        total: results.length,
        hasMore,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // POST LOAD (draft → posted)
  // ---------------------------------------------------------------------------
  static async postLoad(loadId: string, orgId: string, userId: string): Promise<ILoad> {
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

    if (load.status !== 'draft' && load.status !== 'created') {
      throw AppError.badRequest(
        'LOAD_NOT_POSTABLE',
        `Load is not postable in status "${load.status}". Only draft loads can be posted.`,
      );
    }

    validateTransition(load.status, 'posted');

    load.status = 'posted';
    load.statusHistory.push({
      status: 'posted',
      changedBy: userId,
      changedAt: new Date(),
      note: 'Load posted to marketplace',
    });

    await load.save();

    setImmediate(() => {
      MarketplaceService.checkLaneMatches(load).catch(() => {});
      MarketplaceService.checkSavedSearchMatches(load).catch(() => {});
      MatchingService.matchTrucksForLoad(load).catch(() => {});
    });

    setImmediate(() => {
      EventBus.publish({
        type: 'load:posted',
        payload: {
          loadId: load._id.toString(),
          orgId: load.orgId.toString(),
          createdBy: load.createdBy.toString(),
          origin: {
            address: load.origin.address,
            city: load.origin.city,
            state: load.origin.state,
            lat: load.origin.lat,
            lng: load.origin.lng,
          },
          destination: {
            city: load.destination.city,
            state: load.destination.state,
          },
          truckType: load.truckType,
          rate: load.rate,
          rateType: load.rateType,
          weight: load.weight,
          pickupDate: load.pickupDate.toISOString(),
          requireVerifiedCarrier: load.requireVerifiedCarrier,
          requiresHazmat: load.requiresHazmat,
          requiresLiftgate: load.requiresLiftgate,
          maxVehicleLength: load.maxVehicleLength,
          temperatureMin: load.temperatureMin,
          temperatureMax: load.temperatureMax,
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    });

    return load;
  }

  // ---------------------------------------------------------------------------
  // DELETE DRAFT (only drafts can be deleted)
  // ---------------------------------------------------------------------------
  static async deleteDraft(loadId: string, orgId: string): Promise<void> {
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

    if (load.status !== 'draft' && load.status !== 'created') {
      throw AppError.badRequest(
        'ONLY_DRAFT_DELETABLE',
        `Only draft loads can be deleted. Current status: "${load.status}"`,
      );
    }

    await LoadModel.deleteOne({ _id: load._id });
  }

  // ---------------------------------------------------------------------------
  // UPDATE LOAD (draft and posted only)
  // ---------------------------------------------------------------------------
  static async updateLoad(loadId: string, orgId: string, dto: UpdateLoadDTO): Promise<ILoad> {
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

    if (load.status !== 'draft' && load.status !== 'created' && load.status !== 'posted') {
      throw AppError.badRequest(
        'LOAD_NOT_EDITABLE',
        `Load is not editable in status "${load.status}"`,
      );
    }

    const updatableFields = [
      'weight',
      'truckType',
      'commodity',
      'specialRequirements',
      'isPublic',
      'requireVerifiedCarrier',
      'internalNotes',
      'rateNegotiable',
      'rate',
      'rateType',
      'requiresHazmat',
      'requiresLiftgate',
      'maxVehicleLength',
      'temperatureMin',
      'temperatureMax',
    ] as const;

    for (const field of updatableFields) {
      if (dto[field] !== undefined) {
        (load as unknown as Record<string, unknown>)[field] = dto[field];
      }
    }

    if (dto.pickupDate) {
      load.pickupDate = new Date(dto.pickupDate);
    }

    if (dto.deliveryDate) {
      load.deliveryDate = new Date(dto.deliveryDate);
    }

    if (dto.origin) {
      const oldOrigin = { ...load.origin };
      load.origin.address = dto.origin.address ?? load.origin.address;
      load.origin.city = dto.origin.city ?? load.origin.city;
      load.origin.state = dto.origin.state ?? load.origin.state;
      load.origin.zip = dto.origin.zip ?? load.origin.zip;
      load.origin.contactName = dto.origin.contactName ?? load.origin.contactName;
      load.origin.contactPhone = dto.origin.contactPhone ?? load.origin.contactPhone;

      if (dto.origin.address || dto.origin.city || dto.origin.state) {
        const coords = await geocodeAddress(load.origin.address, load.origin.city, load.origin.state);
        load.origin.lat = coords.lat;
        load.origin.lng = coords.lng;
        load.origin.coordinates = [coords.lng, coords.lat];
      }
    }

    if (dto.destination) {
      load.destination.address = dto.destination.address ?? load.destination.address;
      load.destination.city = dto.destination.city ?? load.destination.city;
      load.destination.state = dto.destination.state ?? load.destination.state;
      load.destination.zip = dto.destination.zip ?? load.destination.zip;
      load.destination.contactName = dto.destination.contactName ?? load.destination.contactName;
      load.destination.contactPhone = dto.destination.contactPhone ?? load.destination.contactPhone;

      if (dto.destination.address || dto.destination.city || dto.destination.state) {
        const coords = await geocodeAddress(load.destination.address, load.destination.city, load.destination.state);
        load.destination.lat = coords.lat;
        load.destination.lng = coords.lng;
        load.destination.coordinates = [coords.lng, coords.lat];
      }
    }

    if (dto.origin || dto.destination) {
      load.estimatedDistance = haversineDistance(
        load.origin.lat,
        load.origin.lng,
        load.destination.lat,
        load.destination.lng,
      );
    }

    await load.save();

    return load;
  }

  // ---------------------------------------------------------------------------
  // TRANSITION STATUS (generic status machine)
  // ---------------------------------------------------------------------------
  static async transitionStatus(
    loadId: string,
    orgId: string,
    newStatus: string,
    userId: string,
    note?: string,
  ): Promise<ILoad> {
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

    validateTransition(load.status, newStatus as typeof load.status);

    if (newStatus === 'booked' && !load.assignedTruckId) {
      throw AppError.badRequest('TRUCK_REQUIRED', 'A truck must be assigned before booking');
    }

    load.status = newStatus as typeof load.status;

    load.statusHistory.push({
      status: newStatus,
      changedBy: userId,
      changedAt: new Date(),
      note: note ?? null,
    });

    await load.save();

    // Release the assigned truck back to "available" when the load reaches
    // a terminal or post-delivery status. Without this, trucks stay stuck
    // in "in_transit" and can never be booked again.
    if (
      ['delivered', 'completed', 'cancelled'].includes(newStatus) &&
      load.assignedTruckId
    ) {
      setImmediate(() => {
        TruckService.setTruckAvailable(
          load.assignedTruckId!.toString(),
          load.orgId.toString(),
        ).catch((err) =>
          console.error(`[LOADS] Failed to release truck: ${err.message}`),
        );
      });
    }

    if (newStatus === 'posted') {
      setImmediate(() => {
        MarketplaceService.checkLaneMatches(load).catch(() => {});
        MarketplaceService.checkSavedSearchMatches(load).catch(() => {});
        MatchingService.matchTrucksForLoad(load).catch(() => {});
      });
    }

    setImmediate(() => {
      EventBus.publish({
        type: 'load:updated',
        payload: {
          loadId: load._id.toString(),
          orgId: load.orgId.toString(),
          status: load.status,
          changedBy: userId,
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    });

    return load;
  }

  // ---------------------------------------------------------------------------
  // ASSIGN TRUCK
  // ---------------------------------------------------------------------------
  static async assignTruck(
    loadId: string,
    orgId: string,
    truckId: string,
    driverId: string,
  ): Promise<ILoad> {
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

    if (load.status !== 'draft' && load.status !== 'created' && load.status !== 'posted') {
      throw AppError.badRequest(
        'LOAD_NOT_ASSIGNABLE',
        `Cannot assign truck to load in status "${load.status}"`,
      );
    }

    const truck = await TruckService.getTruckById(truckId, orgId);

    if (!truck) {
      throw AppError.notFound('Truck', truckId);
    }

    load.assignedTruckId = truckId;
    load.assignedDriverId = driverId;
    load.assignedAt = new Date();

    await load.save();

    return load;
  }

  // ---------------------------------------------------------------------------
  // CANCEL LOAD (only draft, posted, booked — NOT in_transit, delivered, completed)
  // ---------------------------------------------------------------------------
  static async cancelLoad(
    loadId: string,
    orgId: string,
    userId: string,
    reason?: string,
    note?: string,
  ): Promise<ILoad> {
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

    // Can only cancel draft, posted, or booked loads (NOT in_transit, delivered, completed)
    const cancellableStatuses = ['draft', 'created', 'posted', 'booked'];
    if (!cancellableStatuses.includes(load.status)) {
      throw AppError.badRequest(
        'LOAD_NOT_CANCELLABLE',
        `Load is not cancellable in status "${load.status}". Only draft, posted, or booked loads can be cancelled.`,
      );
    }

    validateTransition(load.status, 'cancelled');

    load.status = 'cancelled';

    load.statusHistory.push({
      status: 'cancelled',
      changedBy: userId,
      changedAt: new Date(),
      note: reason ? `Cancellation reason: ${reason}${note ? ` — ${note}` : ''}` : (note ?? null),
    });

    await load.save();

    // Release the assigned truck back to "available" if one was assigned
    if (load.assignedTruckId) {
      setImmediate(() => {
        TruckService.setTruckAvailable(
          load.assignedTruckId!.toString(),
          load.orgId.toString(),
        ).catch((err) =>
          console.error(`[LOADS] Failed to release truck on cancel: ${err.message}`),
        );
      });
    }

    // Emit load:updated event for cancellation
    setImmediate(() => {
      EventBus.publish({
        type: 'load:updated',
        payload: {
          loadId: load._id.toString(),
          orgId: load.orgId.toString(),
          status: 'cancelled',
          changedBy: userId,
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    });

    return load;
  }

  // ---------------------------------------------------------------------------
  // GET SUMMARY (aggregated stats)
  // ---------------------------------------------------------------------------
  static async getSummary(orgId: string, userId?: string, role?: string): Promise<any> {
    if (!orgId) {
      return {
        total: 0,
        active: 0,
        delivered: 0,
        booked: 0,
        revenue: 0,
        inTransit: 0,
      };
    }

    const match: Record<string, any> = {};
    if (role === 'broker') {
      match.orgId = orgId;
    } else if (role === 'carrier' || role === 'independent_driver') {
      match.$or = [{ orgId: orgId }, { assignedDriverId: userId }];
    } else {
      match.orgId = orgId;
    }

    const [counts, revenue] = await Promise.all([
      LoadModel.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      LoadModel.aggregate([
        { $match: { ...match, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$rate' } } },
      ]),
    ]);

    const stats: Record<string, number> = {
      total: 0,
      active: 0,
      delivered: 0,
      booked: 0,
      revenue: revenue[0]?.total || 0,
      inTransit: 0,
    };

    counts.forEach((c) => {
      stats.total += c.count;
      if (['posted', 'booked', 'in-transit'].includes(c._id)) {
        stats.active += c.count;
      }
      if (c._id === 'delivered') stats.delivered = c.count;
      if (c._id === 'booked') stats.booked = c.count;
      if (c._id === 'in-transit') stats.inTransit = c.count;
    });

    return stats;
  }
}
