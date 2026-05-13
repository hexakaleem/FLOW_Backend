import { redis, redisPub } from '../../lib/redis';
import { reverseGeocode } from '../../lib/geocoding';
import { TruckModel, ITruck } from '../fleet/models/truck.model';
import type { ILoad } from './models/load.model';

const MATCH_RADIUS_MI = 50;
const MAX_RADIUS_MI = 200;
const RADIUS_STEP_MI = 50;
const MAX_RESULTS = 20;

interface TruckMatch {
  truckId: string;
  plateNumber: string;
  truckType: string;
  carrierOrgId: string;
  driverId: string | null;
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

interface GeoResult {
  truckId: string;
  distance: number;
}

export class MatchingService {
  static async matchTrucksForLoad(load: ILoad): Promise<TruckMatch[]> {
    const originLat = load.origin.lat;
    const originLng = load.origin.lng;

    let radius = MATCH_RADIUS_MI;
    let nearbyGeo: GeoResult[] = [];

    while (radius <= MAX_RADIUS_MI) {
      nearbyGeo = await MatchingService.fetchNearbyTrucks(originLng, originLat, radius);
      if (nearbyGeo.length > 0 || radius >= MAX_RADIUS_MI) break;
      radius += RADIUS_STEP_MI;
    }

    if (nearbyGeo.length === 0) return [];

    const truckIds = nearbyGeo.map((g) => g.truckId);
    const distanceMap = new Map(nearbyGeo.map((g) => [g.truckId, g.distance]));

    const trucks = await TruckModel.find({
      _id: { $in: truckIds },
      status: { $in: ['available', 'assigned'] },
    }).lean() as unknown as ITruck[];

    const matches: TruckMatch[] = [];

    for (const truck of trucks) {
      const truckId = truck._id.toString();
      if (!MatchingService.passesHardFilters(load, truck)) continue;

      const distance = distanceMap.get(truckId) ?? radius;
      const score = MatchingService.calculateScore(load, truck, distance);

      let location: TruckMatch['currentLocation'] = null;
      const geoData = await redis.geopos('trucks:locations', truckId);
      if (geoData && Array.isArray(geoData) && geoData[0]) {
        const [lng, lat] = geoData[0] as [string, string];
        const rev = await reverseGeocode(parseFloat(lat), parseFloat(lng));
        location = {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          city: rev?.city || '',
          state: rev?.state || '',
        };
      }

      matches.push({
        truckId,
        plateNumber: truck.plateNumber,
        truckType: truck.type,
        carrierOrgId: truck.orgId,
        driverId: truck.assignedDriverId,
        distance,
        matchScore: score,
        specs: {
          maxWeight: truck.specs.maxWeight,
          length: truck.specs.length,
          hasLiftgate: truck.specs.hasLiftgate,
          isHazmatCertified: truck.specs.isHazmatCertified,
        },
        currentLocation: location,
      });
    }

    matches.sort((a, b) => b.matchScore - a.matchScore);

    if (matches.length > 0) {
      const topMatches = matches.slice(0, MAX_RESULTS);
      await MatchingService.broadcastMatches(load._id.toString(), load, topMatches);
      return topMatches;
    }

    return [];
  }

  static async getMatchingTrucksForLoad(load: ILoad): Promise<TruckMatch[]> {
    return MatchingService.matchTrucksForLoad(load);
  }

  private static async fetchNearbyTrucks(lng: number, lat: number, radiusMi: number): Promise<GeoResult[]> {
    try {
      const results: unknown = await redis.georadius(
        'trucks:locations',
        lng,
        lat,
        radiusMi,
        'mi',
        'WITHDIST',
        'ASC',
      );

      if (!Array.isArray(results) || results.length === 0) return [];

      return results.map((item) => {
        if (Array.isArray(item)) {
          return { truckId: String(item[0]), distance: Number(item[1]) };
        }
        return { truckId: String(item), distance: 0 };
      });
    } catch {
      return [];
    }
  }

  private static passesHardFilters(load: ILoad, truck: ITruck): boolean {
    if (truck.type !== load.truckType) return false;

    if (load.weight > 0 && truck.specs.maxWeight && truck.specs.maxWeight < load.weight) {
      return false;
    }

    if (load.requiresHazmat && !truck.specs.isHazmatCertified) return false;
    if (load.requiresLiftgate && !truck.specs.hasLiftgate) return false;

    if (
      load.maxVehicleLength &&
      truck.specs.length &&
      truck.specs.length > load.maxVehicleLength
    ) {
      return false;
    }

    if (load.temperatureMin != null || load.temperatureMax != null) {
      if (truck.type !== 'reefer') return false;
    }

    return true;
  }

  private static calculateScore(_load: ILoad, truck: ITruck, distance: number): number {
    let score = 0;
    let weights = 0;

    const proximityScore = Math.max(0, 1 - distance / MAX_RADIUS_MI);
    score += proximityScore * 0.35;
    weights += 0.35;

    if (truck.specs.maxWeight && truck.specs.maxWeight > 0) {
      const capacityRatio = Math.min(1, truck.specs.maxWeight / Math.max(1, (_load as any).weight || 1));
      score += capacityRatio * 0.25;
      weights += 0.25;
    }

    if (truck.insuranceExpiry && truck.insuranceExpiry > new Date()) {
      score += 0.15;
    }
    weights += 0.15;

    if (truck.assignedDriverId) {
      score += 0.15;
    }
    weights += 0.15;

    if (truck.specs.hasLiftgate) score += 0.05;
    if (truck.specs.isHazmatCertified) score += 0.05;
    weights += 0.1;

    return weights > 0 ? Math.round(score / weights * 100) / 100 : 0;
  }

  private static async broadcastMatches(
    loadId: string,
    load: ILoad,
    matches: TruckMatch[],
  ): Promise<void> {
    const driverIds = matches
      .filter((m) => m.driverId)
      .map((m) => m.driverId!);

    if (driverIds.length === 0) return;

    const rooms = driverIds.map((id) => `driver:${id}`);

    await redisPub.publish(
      'flow:delivery-events',
      JSON.stringify({
        type: 'socket:emit',
        rooms,
        event: 'load:nearby',
        payload: {
          loadId,
          origin: { city: load.origin.city, state: load.origin.state, lat: load.origin.lat, lng: load.origin.lng },
          destination: { city: load.destination.city, state: load.destination.state },
          truckType: load.truckType,
          rate: load.rate,
          rateType: load.rateType,
          pickupDate: load.pickupDate.toISOString(),
          weight: load.weight,
          requiresHazmat: load.requiresHazmat,
          requiresLiftgate: load.requiresLiftgate,
        },
      }),
    );

    console.log(
      `[MATCHER] matched ${matches.length} trucks, notified ${driverIds.length} drivers for load ${loadId}`,
    );
  }
}
