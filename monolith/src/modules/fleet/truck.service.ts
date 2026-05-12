import axios from 'axios';
import { Types } from 'mongoose';
import { isValidVin, buildPaginationQuery, encodeCursor } from '@flow/shared';
import type { CreateTruckDTO, UpdateTruckDTO, TruckType } from '@flow/shared';
import { config } from '../../config';
import { AppError } from '../../lib/errors';
import { TruckModel, ITruck } from './models/truck.model';

export class TruckService {
  static async createTruck(orgId: string, dto: CreateTruckDTO, userRole?: string): Promise<ITruck> {
    const duplicate = await TruckModel.findOne({
      orgId,
      plateNumber: dto.plateNumber,
      plateState: dto.plateState,
    });

    if (duplicate) {
      throw AppError.conflict(
        'DUPLICATE_TRUCK',
        'A truck with this plate and state already exists',
      );
    }

    if (dto.vin && !isValidVin(dto.vin)) {
      throw AppError.badRequest('INVALID_VIN', 'The provided VIN is not valid');
    }

    if (userRole === 'independent_driver' || userRole === 'driver') {
      const activeCount = await TruckModel.countDocuments({
        orgId,
        status: { $nin: ['decommissioned', 'removed'] },
      });

      if (activeCount >= 1) {
        throw AppError.conflict(
          'TRUCK_LIMIT_REACHED',
          'Independent drivers can register only one truck',
        );
      }
    }

    const truck = await TruckModel.create({
      orgId,
      plateNumber: dto.plateNumber,
      plateState: dto.plateState,
      internalId: dto.internalId,
      type: dto.type as TruckType,
      vin: dto.vin ?? null,
      year: dto.year ?? null,
      make: dto.make ?? null,
      vehicleModel: dto.vehicleModel ?? null,
      insurancePolicy: (dto as any).insurancePolicy ?? null,
      insuranceCarrier: (dto as any).insuranceCarrier ?? null,
      insuranceExpiry: (dto as any).insuranceExpiry ? new Date((dto as any).insuranceExpiry) : null,
      registrationNumber: (dto as any).registrationNumber ?? null,
      registrationExpiry: (dto as any).registrationExpiry
        ? new Date((dto as any).registrationExpiry)
        : null,
      inspectionExpiry: (dto as any).inspectionExpiry
        ? new Date((dto as any).inspectionExpiry)
        : null,
      photos: (dto as any).photos ?? [],
      specs: {
        maxWeight: dto.specs?.maxWeight ?? null,
        length: dto.specs?.length ?? null,
        hasLiftgate: dto.specs?.hasLiftgate ?? false,
        isHazmatCertified: dto.specs?.isHazmatCertified ?? false,
      },
    });

    return truck;
  }

  static async getTruckById(truckId: string, orgId: string): Promise<ITruck | null> {
    return TruckModel.findOne({ _id: truckId, orgId });
  }

  static async listTrucks(
    orgId: string,
    filters?: { status?: string; type?: string; cursor?: string; limit?: number },
  ) {
    const { cursorFilter, limit } = buildPaginationQuery(filters?.cursor, filters?.limit);

    const query: Record<string, unknown> = { orgId, ...cursorFilter };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    const trucks = await TruckModel.find(query)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .lean();

    const hasMore = trucks.length > limit;
    const results = hasMore ? trucks.slice(0, limit) : trucks;

    const lastTruck = results[results.length - 1];

    return {
      trucks: results,
      meta: {
        cursor: lastTruck ? encodeCursor((lastTruck._id as Types.ObjectId).toString()) : null,
        total: results.length,
        hasMore,
      },
    };
  }

  static async updateTruck(truckId: string, orgId: string, dto: UpdateTruckDTO): Promise<ITruck> {
    const truck = await TruckModel.findOne({ _id: truckId, orgId });

    if (!truck) {
      throw AppError.notFound('Truck', truckId);
    }

    if (dto.vin !== undefined && truck.vin && dto.vin !== truck.vin) {
      throw AppError.badRequest('VIN_IMMUTABLE', 'VIN cannot be changed after registration');
    }

    if (dto.plateNumber !== undefined) truck.plateNumber = dto.plateNumber;
    if (dto.plateState !== undefined) truck.plateState = dto.plateState;
    if (dto.internalId !== undefined) truck.internalId = dto.internalId;
    if (dto.type !== undefined) truck.type = dto.type as TruckType;
    if (dto.year !== undefined) truck.year = dto.year;
    if (dto.make !== undefined) truck.make = dto.make;
    if (dto.vehicleModel !== undefined) truck.vehicleModel = dto.vehicleModel;

    if (dto.vin !== undefined) {
      truck.vin = dto.vin;
    }

    if (dto.specs) {
      if (dto.specs.maxWeight !== undefined) truck.specs.maxWeight = dto.specs.maxWeight;
      if (dto.specs.length !== undefined) truck.specs.length = dto.specs.length;
      if (dto.specs.hasLiftgate !== undefined) truck.specs.hasLiftgate = dto.specs.hasLiftgate;
      if (dto.specs.isHazmatCertified !== undefined)
        truck.specs.isHazmatCertified = dto.specs.isHazmatCertified;
    }

    // New fields: insurance, registration, inspection, photos
    const dtoAny = dto as any;
    if (dtoAny.insurancePolicy !== undefined) truck.insurancePolicy = dtoAny.insurancePolicy;
    if (dtoAny.insuranceCarrier !== undefined) truck.insuranceCarrier = dtoAny.insuranceCarrier;
    if (dtoAny.insuranceExpiry !== undefined)
      truck.insuranceExpiry = dtoAny.insuranceExpiry ? new Date(dtoAny.insuranceExpiry) : null;
    if (dtoAny.registrationNumber !== undefined)
      truck.registrationNumber = dtoAny.registrationNumber;
    if (dtoAny.registrationExpiry !== undefined)
      truck.registrationExpiry = dtoAny.registrationExpiry
        ? new Date(dtoAny.registrationExpiry)
        : null;
    if (dtoAny.inspectionExpiry !== undefined)
      truck.inspectionExpiry = dtoAny.inspectionExpiry ? new Date(dtoAny.inspectionExpiry) : null;
    if (dtoAny.photos !== undefined) truck.photos = dtoAny.photos;

    await truck.save();

    return truck;
  }

  static async decommissionTruck(truckId: string, orgId: string): Promise<ITruck> {
    const truck = await TruckModel.findOne({ _id: truckId, orgId });

    if (!truck) {
      throw AppError.notFound('Truck', truckId);
    }

    if (truck.status === 'in_transit') {
      throw AppError.badRequest(
        'TRUCK_IN_TRANSIT',
        'Cannot decommission a truck that is in transit',
      );
    }

    truck.status = 'removed';
    await truck.save();

    return truck;
  }

  /**
   * Standalone VIN decode — decodes a VIN via NHTSA API without requiring a truck record.
   * Used by the frontend during the Add Vehicle flow BEFORE creating the truck.
   */
  static async standaloneVinDecode(vin: string): Promise<{
    make: string;
    model: string;
    year: number;
    engine: string;
  }> {
    if (!isValidVin(vin)) {
      throw AppError.badRequest('INVALID_VIN', 'The provided VIN is not valid');
    }

    try {
      const response = await axios.get(`${config.external.nhtsaVinUrl}/vehicles/decodevin/${vin}`, {
        params: { format: 'json' },
      });

      const results = response.data?.Results ?? [];

      const findValue = (variable: string): string =>
        results.find((r: { Variable: string }) => r.Variable === variable)?.Value ?? '';

      return {
        make: findValue('Make'),
        model: findValue('Model'),
        year: parseInt(findValue('Model Year'), 10) || new Date().getFullYear(),
        engine: findValue('Engine Model'),
      };
    } catch {
      throw new AppError(502, 'VIN_DECODE_FAILED', 'Failed to decode VIN from NHTSA API');
    }
  }

  static async decodeVin(truckId: string, orgId: string, vin: string): Promise<ITruck> {
    if (!isValidVin(vin)) {
      throw AppError.badRequest('INVALID_VIN', 'The provided VIN is not valid');
    }

    let decodedData: { Make: string; Model: string; ModelYear: string; EngineModel: string };

    try {
      const response = await axios.get(`${config.external.nhtsaVinUrl}/vehicles/decodevin/${vin}`, {
        params: { format: 'json' },
      });

      const results = response.data?.Results ?? [];

      const findValue = (variable: string): string =>
        results.find((r: { Variable: string }) => r.Variable === variable)?.Value ?? '';

      decodedData = {
        Make: findValue('Make'),
        Model: findValue('Model'),
        ModelYear: findValue('Model Year'),
        EngineModel: findValue('Engine Model'),
      };
    } catch {
      throw new AppError(502, 'VIN_DECODE_FAILED', 'Failed to decode VIN from NHTSA API');
    }

    const truck = await TruckModel.findOne({ _id: truckId, orgId });

    if (!truck) {
      throw AppError.notFound('Truck', truckId);
    }

    if (decodedData.Make) truck.make = decodedData.Make;
    if (decodedData.Model) truck.vehicleModel = decodedData.Model;
    if (decodedData.ModelYear) truck.year = parseInt(decodedData.ModelYear, 10);
    if (decodedData.EngineModel) truck.engineType = decodedData.EngineModel;

    await truck.save();

    return truck;
  }

  static async assignDriver(
    truckId: string,
    orgId: string,
    driverId: string | null,
    driverName?: string,
  ): Promise<ITruck> {
    const truck = await TruckModel.findOne({ _id: truckId, orgId });

    if (!truck) {
      throw AppError.notFound('Truck', truckId);
    }

    // Unassign flow: driverId is null/empty
    if (!driverId || driverId === '') {
      truck.assignedDriverId = null;
      truck.assignedDriverName = null;
      truck.driverAssignedAt = null;
      truck.status = 'available';
      await truck.save();
      return truck;
    }

    // Assign flow
    if (truck.status === 'in_transit' || truck.status === 'removed') {
      throw AppError.badRequest(
        'INVALID_TRUCK_STATUS',
        `Cannot assign a driver to a truck with status "${truck.status}"`,
      );
    }

    if (truck.assignedDriverId && truck.assignedDriverId.toString() !== driverId) {
      truck.assignedDriverId = null;
      truck.assignedDriverName = null;
      truck.driverAssignedAt = null;
    }

    await TruckModel.updateMany(
      { orgId, assignedDriverId: driverId, _id: { $ne: truck._id } },
      {
        assignedDriverId: null,
        assignedDriverName: null,
        driverAssignedAt: null,
        status: 'available',
      },
    );

    truck.assignedDriverId = driverId;
    truck.assignedDriverName = driverName ?? null;
    truck.driverAssignedAt = new Date();
    truck.status = 'assigned';

    await truck.save();

    return truck;
  }

  static async assignGpsDevice(truckId: string, orgId: string, deviceId: string): Promise<ITruck> {
    const truck = await TruckModel.findOne({ _id: truckId, orgId });

    if (!truck) {
      throw AppError.notFound('Truck', truckId);
    }

    await TruckModel.updateMany(
      { orgId, gpsDeviceId: deviceId, _id: { $ne: truck._id } },
      { gpsDeviceId: null },
    );

    truck.gpsDeviceId = deviceId;
    await truck.save();

    return truck;
  }

  static async getAvailableTrucks(orgId: string, filters?: { type?: string }): Promise<ITruck[]> {
    const query: Record<string, unknown> = {
      orgId,
      status: { $in: ['available', 'assigned'] },
    };

    if (filters?.type) {
      query.type = filters.type;
    }

    return TruckModel.find(query);
  }

  static async validateTruckOwnership(truckId: string, orgId: string): Promise<boolean> {
    const exists = await TruckModel.exists({ _id: truckId, orgId });
    return !!exists;
  }

  static async setTruckInTransit(
    truckId: string,
    orgId: string,
    activeLoadId?: string,
  ): Promise<ITruck | null> {
    const update: Record<string, unknown> = { status: 'in_transit' };

    if (activeLoadId) {
      update.activeLoadId = new Types.ObjectId(activeLoadId);
    }

    return TruckModel.findOneAndUpdate({ _id: truckId, orgId }, update, { new: true });
  }

  static async setTruckAvailable(truckId: string, orgId: string): Promise<ITruck | null> {
    return TruckModel.findOneAndUpdate(
      { _id: truckId, orgId },
      { status: 'available', activeLoadId: null },
      { new: true },
    );
  }
}
