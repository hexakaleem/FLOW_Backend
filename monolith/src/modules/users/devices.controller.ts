import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { DeviceModel } from './models/device.model';

export class DevicesController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const { platform, fcmToken, deviceId } = req.body;

      if (!platform || !fcmToken || !deviceId) {
        res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'platform, fcmToken, and deviceId are required' },
        });
        return;
      }

      if (platform !== 'ios' && platform !== 'android') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_PLATFORM', message: 'platform must be ios or android' },
        });
        return;
      }

      await DeviceModel.findOneAndUpdate(
        { userId, deviceId },
        { userId, platform, fcmToken, deviceId, active: true },
        { upsert: true, new: true },
      );

      const body: ApiResponse = { success: true, data: { registered: true } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async unregister(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.auth!.userId;
      const { deviceId } = req.body;

      await DeviceModel.findOneAndUpdate(
        { userId, deviceId },
        { active: false },
      );

      const body: ApiResponse = { success: true, data: { unregistered: true } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}
