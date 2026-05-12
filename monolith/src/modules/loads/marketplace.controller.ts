import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { MarketplaceService } from './marketplace.service';

export class MarketplaceController {
  static async searchLoads(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const companyId = req.auth!.companyId || '';
      const verified = req.auth!.verified === true;
      const result = await MarketplaceService.searchLoads(
        req.query as any,
        userId,
        companyId,
        verified,
      );
      const body: ApiResponse = { success: true, data: result };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async searchTrucks(req: Request, res: Response, next: NextFunction) {
    try {
      const companyId = req.auth!.companyId || '';
      const trucks = await MarketplaceService.searchTrucks(companyId, req.query as any);
      const body: ApiResponse = { success: true, data: trucks };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async saveSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const search = await MarketplaceService.saveSearch(userId, req.body);
      const body: ApiResponse = { success: true, data: search };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listSavedSearches(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const searches = await MarketplaceService.listSavedSearches(userId);
      const body: ApiResponse = { success: true, data: searches };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async deleteSavedSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      await MarketplaceService.deleteSavedSearch(userId, req.params.id);
      const body: ApiResponse = { success: true, data: null };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async setPreferredLane(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const lane = await MarketplaceService.setPreferredLane(userId, req.body);
      const body: ApiResponse = { success: true, data: lane };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listPreferredLanes(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const lanes = await MarketplaceService.listPreferredLanes(userId);
      const body: ApiResponse = { success: true, data: lanes };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async deletePreferredLane(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      await MarketplaceService.deletePreferredLane(userId, req.params.id);
      const body: ApiResponse = { success: true, data: null };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
