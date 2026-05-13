import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import { authenticate, requirePermission } from '../middleware/auth';
import { config } from '../config';
import { forwardToMonolith } from '../lib/proxy';

const router = Router();

// Multer memory storage for file uploads (max 50 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * POST /documents/upload — multipart/form-data
 *
 * The standard JSON proxy (forwardToMonolith) cannot relay multipart bodies.
 * Instead we receive the file via multer in the gateway, then re-send it to
 * the monolith using the `form-data` package so the monolith's own multer
 * middleware can process it.
 */
router.post(
  '/upload',
  authenticate,
  requirePermission('documents.upload'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        res.status(400).json({
          success: false,
          error: { code: 'NO_FILE', message: 'File is required' },
        });
        return;
      }

      // Build multipart form to forward to monolith
      const form = new FormData();
      form.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      // Forward text fields from the body
      if (req.body.type) form.append('type', req.body.type);
      if (req.body.loadId) form.append('loadId', req.body.loadId);
      if (req.body.notes) form.append('notes', req.body.notes);
      if (req.body.metadata) {
        const meta = typeof req.body.metadata === 'string'
          ? req.body.metadata
          : JSON.stringify(req.body.metadata);
        form.append('metadata', meta);
      }

      // Auth context headers for the monolith's verifyJWT / rbac
      const user = (req as any).user;
      const headers: Record<string, string> = {
        'X-Internal-Key': config.internalApiKey,
        ...form.getHeaders(),
      };
      if (user) {
        headers['X-User-Id'] = user.userId;
        headers['X-User-Org-Id'] = user.orgId || '';
        headers['X-User-Role'] = user.role;
        headers['X-User-Verified'] = String(!!user.verified);
      }

      const response = await axios.post(
        `${config.monolithUrl}/documents/upload`,
        form,
        { headers, maxBodyLength: 60 * 1024 * 1024 },
      );

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      const axiosError = error as { response?: { status: number; data: unknown } };
      if (axiosError.response) {
        res.status(axiosError.response.status).json(axiosError.response.data);
        return;
      }
      next(error);
    }
  },
);

// Other document endpoints — standard JSON proxy
router.get('/', authenticate, requirePermission('documents.view'), forwardToMonolith);
router.get('/:id', authenticate, requirePermission('documents.view'), forwardToMonolith);
router.delete('/:id', authenticate, requirePermission('documents.upload'), forwardToMonolith);
router.patch('/:id/status', authenticate, requirePermission('documents.upload'), forwardToMonolith);

export { router as documentRoutes };
