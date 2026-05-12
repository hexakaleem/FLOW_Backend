import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { TruckService } from './truck.service';
import { TrailerService } from './trailer.service';
import { ComplianceService } from './compliance.service';
import { redis } from '../../lib/redis';

export class FleetController {
  static async createTruck(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userRole = req.auth!.role;
      const truck = await TruckService.createTruck(companyId, req.body, userRole);
      const body: ApiResponse = { success: true, data: truck };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getTruck(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const truck = await TruckService.getTruckById(req.params.id, companyId);
      const body: ApiResponse = { success: true, data: truck };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listTrucks(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const result = await TruckService.listTrucks(companyId, req.query as any);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async updateTruck(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const truck = await TruckService.updateTruck(req.params.id, companyId, req.body);
      const body: ApiResponse = { success: true, data: truck };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async decommissionTruck(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const truck = await TruckService.decommissionTruck(req.params.id, companyId);
      const body: ApiResponse = { success: true, data: truck };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async decodeVin(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const truck = await TruckService.decodeVin(req.params.id, companyId, req.body.vin);
      const body: ApiResponse = { success: true, data: truck };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async standaloneVinDecode(req: Request, res: Response, next: NextFunction) {
    try {
      const vin = req.params.vin;
      const result = await TruckService.standaloneVinDecode(vin);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async assignDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const truck = await TruckService.assignDriver(
        req.params.id,
        companyId,
        req.body.driverId,
        req.body.driverName,
      );
      const body: ApiResponse = { success: true, data: truck };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async assignGps(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const truck = await TruckService.assignGpsDevice(req.params.id, companyId, req.body.deviceId);
      const body: ApiResponse = { success: true, data: truck };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async createTrailer(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const trailer = await TrailerService.createTrailer(companyId, req.body);
      const body: ApiResponse = { success: true, data: trailer };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listTrailers(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const trailers = await TrailerService.listTrailers(companyId);
      const body: ApiResponse = { success: true, data: trailers };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async assignTrailerToTruck(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const trailer = await TrailerService.assignToTruck(
        req.params.id,
        companyId,
        req.body.truckId,
      );
      const body: ApiResponse = { success: true, data: trailer };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getAvailableTrucks(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const trucks = await TruckService.getAvailableTrucks(companyId, req.query as any);
      const body: ApiResponse = { success: true, data: trucks };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getCompliance(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const daysAhead = req.query.daysAhead ? parseInt(req.query.daysAhead as string, 10) : 30;
      const records = await ComplianceService.getComplianceRecords(companyId, daysAhead);
      const body: ApiResponse = { success: true, data: records };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async updateCompliance(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const record = await ComplianceService.upsertCompliance(companyId, req.params.driverId, {
        ...req.body,
        cdlExpiryDate: req.body.cdlExpiryDate ? new Date(req.body.cdlExpiryDate) : undefined,
        medicalCardExpiryDate: req.body.medicalCardExpiryDate
          ? new Date(req.body.medicalCardExpiryDate)
          : undefined,
      });
      const body: ApiResponse = { success: true, data: record };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async updateDriverLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const { lat, lng } = req.body;

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        res.status(400).json({ success: false, error: { code: 'INVALID_COORDS', message: 'lat and lng are required' } });
        return;
      }

      await redis.geoadd('drivers:locations', lng, lat, userId);
      // Set a TTL so stale driver locations auto-expire (optional but recommended)
      // Redis GEO does not support TTL natively; we can use a separate key or periodic cleanup.

      res.status(200).json({ success: true, data: { updated: true } });
    } catch (err) {
      next(err);
    }
  }
}
