import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { LoadService } from './load.service';
import { BookingService } from './booking.service';
import { CounterOfferService } from './counter-offer.service';
import { TruckRequestService } from './truck-request.service';

export class LoadsController {
  // ---------------------------------------------------------------------------
  // CREATE LOAD (broker only)
  // ---------------------------------------------------------------------------
  static async createLoad(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const load = await LoadService.createLoad(companyId, userId, req.body);
      const body: ApiResponse = { success: true, data: load };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // LIST LOADS (broker + carrier)
  // ---------------------------------------------------------------------------
  static async listLoads(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const role = req.auth!.role;
      const result = await LoadService.listLoads(companyId, req.query as any, userId, role);
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // GET LOAD BY ID
  // ---------------------------------------------------------------------------
  static async getLoad(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const role = req.auth!.role;
      const load = await LoadService.getLoadById(req.params.id, companyId, userId, role);
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // UPDATE LOAD (broker only, draft and posted)
  // ---------------------------------------------------------------------------
  static async updateLoad(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const load = await LoadService.updateLoad(req.params.id, companyId, req.body);
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // POST LOAD (draft → posted)
  // ---------------------------------------------------------------------------
  static async postLoad(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const load = await LoadService.postLoad(req.params.id, companyId, userId);
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // CANCEL LOAD (broker only)
  // ---------------------------------------------------------------------------
  static async cancelLoad(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const load = await LoadService.cancelLoad(
        req.params.id,
        companyId,
        userId,
        req.body.reason,
        req.body.note,
      );
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // DELETE DRAFT (broker only)
  // ---------------------------------------------------------------------------
  static async deleteDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      await LoadService.deleteDraft(req.params.id, companyId);
      const body: ApiResponse = { success: true, data: null };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // LIST TEMPLATES (broker only — stub, returns empty for now)
  // ---------------------------------------------------------------------------
  static async listTemplates(req: Request, res: Response, next: NextFunction) {
    try {
      // Templates stored in user preferences / separate collection in future.
      // For now, return empty array so the endpoint is functional.
      const body: ApiResponse = { success: true, data: { templates: [] } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // SAVE AS TEMPLATE (broker only — stub)
  // ---------------------------------------------------------------------------
  static async saveAsTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const body: ApiResponse = { success: true, data: null };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSITION STATUS
  // ---------------------------------------------------------------------------
  static async transitionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const load = await LoadService.transitionStatus(
        req.params.id,
        companyId,
        req.body.status,
        userId,
        req.body.note,
      );
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // ASSIGN TRUCK
  // ---------------------------------------------------------------------------
  static async assignTruck(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const load = await LoadService.assignTruck(
        req.params.id,
        companyId,
        req.body.truckId,
        req.body.driverId,
      );
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // REQUEST BOOKING (carrier / independent driver)
  // ---------------------------------------------------------------------------
  static async requestBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const companyId = req.auth!.companyId || '';
      const booking = await BookingService.requestBooking(
        req.params.id,
        userId,
        companyId,
        req.body,
      );
      const body: ApiResponse = { success: true, data: booking };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // CONFIRM BOOKING (broker only)
  // ---------------------------------------------------------------------------
  static async confirmBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const load = await BookingService.confirmBooking(
        req.params.id,
        companyId,
        req.body.requestId,
        userId,
      );
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // DENY BOOKING (broker only)
  // ---------------------------------------------------------------------------
  static async denyBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const request = await BookingService.denyBooking(
        req.params.id,
        companyId,
        req.body.requestId,
        userId,
        req.body.reason,
      );
      const body: ApiResponse = { success: true, data: request };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // LIST BOOKING REQUESTS (broker only)
  // ---------------------------------------------------------------------------
  static async listBookingRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const requests = await BookingService.listBookingRequests(req.params.id, companyId);
      const body: ApiResponse = { success: true, data: requests };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // CANCEL BOOKING (carrier / independent driver cancels own pending booking)
  // ---------------------------------------------------------------------------
  static async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const companyId = req.auth!.companyId || '';
      const result = await BookingService.cancelBookingRequest(
        req.params.id,
        req.params.bookingId,
        userId,
        companyId,
      );
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // SUBMIT COUNTER OFFER
  // ---------------------------------------------------------------------------
  static async submitCounterOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const counterOffer = await CounterOfferService.submitCounter(req.params.id, userId, req.body);
      const body: ApiResponse = { success: true, data: counterOffer };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // ACCEPT COUNTER OFFER
  // ---------------------------------------------------------------------------
  static async acceptCounterOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const load = await CounterOfferService.acceptCounter(
        req.params.id,
        req.params.offerId,
        userId,
      );
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // CREATE TRUCK REQUEST
  // ---------------------------------------------------------------------------
  static async createTruckRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const companyId = req.auth!.companyId || '';
      const truckRequest = await TruckRequestService.createTruckRequest(
        req.params.id,
        userId,
        companyId,
        req.body,
      );
      const body: ApiResponse = { success: true, data: truckRequest };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // CONFIRM TRUCK REQUEST
  // ---------------------------------------------------------------------------
  static async confirmTruckRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const companyId = req.auth!.companyId || '';
      const load = await TruckRequestService.confirmTruckRequest(
        req.params.id,
        companyId,
        req.params.reqId,
        userId,
      );
      const body: ApiResponse = { success: true, data: load };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // DENY TRUCK REQUEST
  // ---------------------------------------------------------------------------
  static async denyTruckRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const companyId = req.auth!.companyId || '';
      const request = await TruckRequestService.denyTruckRequest(
        req.params.id,
        companyId,
        req.params.reqId,
        userId,
        req.body.reason,
      );
      const body: ApiResponse = { success: true, data: request };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  // ---------------------------------------------------------------------------
  // GET SUMMARY
  // ---------------------------------------------------------------------------
  static async getSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const role = req.auth!.role;
      const summary = await LoadService.getSummary(companyId, userId, role);
      const body: ApiResponse = { success: true, data: summary };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
