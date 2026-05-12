import { Request, Response, NextFunction } from 'express';
import type { ApiResponse } from '@flow/shared';
import { DocumentService } from './document.service';
import { DOCUMENT_TYPES } from './models/document.model';

export class DocumentController {
  static async uploadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.auth!.companyId || '';
      const userId = req.auth!.userId;
      const { loadId, type, metadata, notes } = req.body;
      const file = (req as any).file;

      if (!file) {
        res.status(400).json({ success: false, error: { code: 'NO_FILE', message: 'File is required' } });
        return;
      }

      if (!type || !DOCUMENT_TYPES.includes(type)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TYPE', message: `Type must be one of: ${DOCUMENT_TYPES.join(', ')}` },
        });
        return;
      }

      const doc = await DocumentService.uploadDocument({
        orgId,
        userId,
        loadId: loadId || null,
        type,
        file: { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype },
        metadata: metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : undefined,
        notes: notes || null,
      });

      const body: ApiResponse = { success: true, data: doc };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.auth!.companyId || '';
      const loadId = (req.query.loadId as string) || null;
      const result = await DocumentService.listDocuments(orgId, loadId, req.query as any);
      const body: ApiResponse = {
        success: true,
        data: result.data,
        meta: {
          timestamp: new Date().toISOString(),
          total: result.meta.total,
          hasMore: result.meta.hasMore,
        },
      };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async getDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.auth!.companyId || '';
      const doc = await DocumentService.getDocument(req.params.id, orgId);
      const body: ApiResponse = { success: true, data: doc };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async deleteDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.auth!.companyId || '';
      await DocumentService.deleteDocument(req.params.id, orgId);
      const body: ApiResponse = { success: true, data: { deleted: true } };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.auth!.companyId || '';
      const reviewerId = req.auth!.userId;
      const { status } = req.body;

      if (status !== 'approved' && status !== 'rejected') {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_STATUS', message: 'Status must be approved or rejected' },
        });
        return;
      }

      const doc = await DocumentService.updateDocumentStatus(req.params.id, orgId, status, reviewerId);
      const body: ApiResponse = { success: true, data: doc };
      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  }
}