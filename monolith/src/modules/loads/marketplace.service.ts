import { Types } from "mongoose";
import type { MarketplaceFilters, SavedSearchDTO, PreferredLaneDTO } from "@flow/shared";
import { buildPaginationQuery } from "@flow/shared";
import { AppError } from "../../lib/errors";
import { sendEmail } from "../../lib/email";
import { notificationQueue } from "../../queues/notification.queue";
import { LoadModel, ILoad } from "./models/load.model";
import { SavedSearchModel, ISavedSearch } from "./models/saved-search.model";
import {
  PreferredLaneModel,
  IPreferredLane,
} from "./models/preferred-lane.model";
import {
  BookingRequestModel,
  IBookingRequest,
} from "./models/booking-request.model";
import { TruckService } from "../fleet";

export class MarketplaceService {
  static async searchLoads(
    filters: MarketplaceFilters,
    userId: string,
    userOrgId: string,
    verified: boolean,
  ): Promise<{ loads: ILoad[]; meta: Record<string, unknown> }> {
    const { cursorFilter, limit } = buildPaginationQuery(filters.cursor, filters.limit);

    const query: Record<string, unknown> = {
      status: 'posted',
      isPublic: true,
      orgId: { $ne: userOrgId },
      ...cursorFilter,
    };

    if (!verified) {
      query.requireVerifiedCarrier = false;
    }

    if (filters.originLat !== undefined && filters.originLng !== undefined && filters.originRadius !== undefined) {
      query['origin.coordinates'] = {
        $geoWithin: {
          $centerSphere: [[filters.originLng, filters.originLat], filters.originRadius / 3963.2],
        },
      };
    } else {
      if (filters.originState) {
        query['origin.state'] = filters.originState.toUpperCase();
      }
      if (filters.originCity) {
        query['origin.city'] = { $regex: filters.originCity, $options: 'i' };
      }
    }

    if (filters.destLat !== undefined && filters.destLng !== undefined && filters.destRadius !== undefined) {
      query['destination.coordinates'] = {
        $geoWithin: {
          $centerSphere: [[filters.destLng, filters.destLat], filters.destRadius / 3963.2],
        },
      };
    } else {
      if (filters.destState) {
        query['destination.state'] = filters.destState.toUpperCase();
      }
      if (filters.destCity) {
        query['destination.city'] = { $regex: filters.destCity, $options: 'i' };
      }
    }

    if (filters.truckType) {
      query.truckType = filters.truckType;
    }

    // Rate range filter
    if (filters.minRate !== undefined || filters.maxRate !== undefined) {
      query.rate = {};
      if (filters.minRate !== undefined) {
        (query.rate as Record<string, unknown>).$gte = filters.minRate;
      }
      if (filters.maxRate !== undefined) {
        (query.rate as Record<string, unknown>).$lte = filters.maxRate;
      }
    }

    // Weight range filter
    if (filters.minWeight !== undefined || filters.maxWeight !== undefined) {
      query.weight = {};
      if (filters.minWeight !== undefined) {
        (query.weight as Record<string, unknown>).$gte = filters.minWeight;
      }
      if (filters.maxWeight !== undefined) {
        (query.weight as Record<string, unknown>).$lte = filters.maxWeight;
      }
    }

    if (filters.maxDistance !== undefined) {
      query.estimatedDistance = { $lte: filters.maxDistance };
    }

    if (filters.search) {
      const searchRegex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { 'origin.city': searchRegex },
        { 'origin.state': searchRegex },
        { 'origin.address': searchRegex },
        { 'destination.city': searchRegex },
        { 'destination.state': searchRegex },
        { 'destination.address': searchRegex },
        { commodity: searchRegex },
        { truckType: searchRegex },
      ];
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

    const sortField = filters.sort || 'createdAt';
    const sortDir = filters.sortDir === 'asc' ? 1 : -1;

    const sortMap: Record<string, string> = {
      rate: 'rate',
      distance: 'estimatedDistance',
      postedAt: 'createdAt',
      pickupDate: 'pickupDate',
    };

    const mongoSortField = sortMap[sortField] || 'createdAt';

    const loads = await LoadModel.find(query)
      .sort({ [mongoSortField]: sortDir })
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

  static async searchTrucks(orgId: string, filters: { type?: string }): Promise<unknown> {
    return TruckService.getAvailableTrucks(orgId, filters);
  }

  static async saveSearch(userId: string, dto: SavedSearchDTO): Promise<ISavedSearch> {
    const count = await SavedSearchModel.countDocuments({
      userId: userId,
    });

    if (count >= 10) {
      throw AppError.badRequest('LIMIT_EXCEEDED', 'Maximum 10 saved searches per user');
    }

    return SavedSearchModel.create({
      userId: userId,
      name: dto.name,
      filters: dto.filters,
      alertEnabled: dto.alertEnabled ?? false,
      alertChannels: dto.alertChannels ?? [],
    });
  }

  static async listSavedSearches(userId: string): Promise<ISavedSearch[]> {
    return SavedSearchModel.find({ userId: userId });
  }

  static async deleteSavedSearch(userId: string, searchId: string): Promise<void> {
    const result = await SavedSearchModel.findOneAndDelete({
      _id: searchId,
      userId: userId,
    });

    if (!result) {
      throw AppError.notFound('Saved search', searchId);
    }
  }

  static async setPreferredLane(userId: string, dto: PreferredLaneDTO): Promise<IPreferredLane> {
    if (dto.originState === dto.destinationState) {
      throw AppError.badRequest('INVALID_LANE', 'Origin and destination states must be different');
    }

    const count = await PreferredLaneModel.countDocuments({
      userId: userId,
    });

    if (count >= 20) {
      throw AppError.badRequest('LIMIT_EXCEEDED', 'Maximum 20 preferred lanes per user');
    }

    return PreferredLaneModel.create({
      userId: userId,
      originState: dto.originState.toUpperCase(),
      destinationState: dto.destinationState.toUpperCase(),
      minRatePerMile: dto.minRatePerMile ?? null,
      minRatePerTrip: dto.minRatePerTrip ?? null,
      maxDistance: dto.maxDistance ?? null,
      truckTypes: dto.truckTypes ?? [],
      alertEnabled: dto.alertEnabled ?? true,
    });
  }

  static async listPreferredLanes(userId: string): Promise<IPreferredLane[]> {
    return PreferredLaneModel.find({ userId: userId });
  }

  static async deletePreferredLane(userId: string, laneId: string): Promise<void> {
    const result = await PreferredLaneModel.findOneAndDelete({
      _id: laneId,
      userId: userId,
    });

    if (!result) {
      throw AppError.notFound('Preferred lane', laneId);
    }
  }

  static async checkLaneMatches(load: ILoad): Promise<void> {
    const lanes = await PreferredLaneModel.find({
      originState: load.origin.state,
      destinationState: load.destination.state,
      $or: [{ truckTypes: { $size: 0 } }, { truckTypes: load.truckType }],
    });

    for (const lane of lanes) {
      const minRate = lane.minRatePerTrip ?? 0;
      if (lane.minRatePerMile && load.rate) {
        const ratePerMile = load.rate / (load.estimatedDistance || 1);
        if (ratePerMile < lane.minRatePerMile) continue;
      }
      if (lane.minRatePerTrip && load.rate < lane.minRatePerTrip) continue;
      if (lane.maxDistance && load.estimatedDistance && load.estimatedDistance > lane.maxDistance) continue;

      notificationQueue.add('inapp', {
        type: 'inapp:lane-match',
        payload: {
          userId: lane.userId.toString(),
          loadId: load._id.toString(),
          origin: { city: load.origin.city, state: load.origin.state, lat: load.origin.lat, lng: load.origin.lng },
          destination: { city: load.destination.city, state: load.destination.state },
          rate: load.rate,
          rateType: load.rateType,
          truckType: load.truckType,
          weight: load.weight,
          pickupDate: load.pickupDate.toISOString(),
        },
      }).catch(() => {});
    }
  }

  static async checkSavedSearchMatches(load: ILoad): Promise<void> {
    const searches = await SavedSearchModel.find({ alertEnabled: true });

    for (const search of searches) {
      const f = search.filters;

      if (f.origin?.city && load.origin.city !== f.origin.city) continue;
      if (f.origin?.state && load.origin.state !== f.origin.state) continue;
      if (f.destination?.city && load.destination.city !== f.destination.city) continue;
      if (f.destination?.state && load.destination.state !== f.destination.state) continue;
      if (f.truckType && load.truckType !== f.truckType) continue;

      if (f.minRate !== undefined && load.rate < f.minRate) continue;

      if (
        f.maxDistance !== undefined &&
        load.estimatedDistance &&
        load.estimatedDistance > f.maxDistance
      )
        continue;

      if (f.minWeight !== undefined && load.weight < f.minWeight) continue;
      if (f.maxWeight !== undefined && load.weight > f.maxWeight) continue;

      if (f.pickupDateStart && load.pickupDate < f.pickupDateStart) continue;
      if (f.pickupDateEnd && load.pickupDate > f.pickupDateEnd) continue;

      notificationQueue.add('inapp', {
        type: 'inapp:search-match',
        payload: {
          userId: search.userId.toString(),
          searchId: search._id.toString(),
          loadId: load._id.toString(),
          origin: { city: load.origin.city, state: load.origin.state, lat: load.origin.lat, lng: load.origin.lng },
          destination: { city: load.destination.city, state: load.destination.state },
          rate: load.rate,
          truckType: load.truckType,
          weight: load.weight,
          pickupDate: load.pickupDate.toISOString(),
        },
      }).catch(() => {});
    }
  }

  static async listMyBookings(orgId: string): Promise<any[]> {
    // 1. Find bookings where the org is the carrier
    const carrierBookings = await BookingRequestModel.find({ carrierOrgId: orgId })
      .sort({ createdAt: -1 })
      .lean();

    // 2. Find loads owned by this org to find bookings made BY OTHERS on this org's loads (for Brokers)
    const myLoads = await LoadModel.find({ orgId }).select('_id').lean();
    const myLoadIds = myLoads.map(l => l._id.toString());
    
    const brokerBookings = await BookingRequestModel.find({ 
      loadId: { $in: myLoadIds },
      carrierOrgId: { $ne: orgId } // Don't duplicate if they booked their own load (not likely)
    })
      .sort({ createdAt: -1 })
      .lean();

    // Combine them
    const allBookings = [...carrierBookings, ...brokerBookings];
    if (allBookings.length === 0) return [];

    const loadIds = [...new Set(allBookings.map((b) => b.loadId))];
    const loads = await LoadModel.find({ _id: { $in: loadIds } }).lean();

    return allBookings.map((b) => {
      const load = loads.find((l) => l._id.toString() === b.loadId.toString());
      return {
        ...b,
        loadDetails: load,
      };
    });
  }
}
