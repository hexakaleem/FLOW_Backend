import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { DocumentController } from './document.controller';
import { checkPermission } from '../../middleware/rbac';

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPEG, PNG, WEBP, DOC, and DOCX files are allowed'));
    }
  },
});

export const documentRoutes = Router();

documentRoutes.post(
  '/upload',
  checkPermission('documents.upload'),
  documentUpload.single('file'),
  DocumentController.uploadDocument,
);

documentRoutes.get(
  '/',
  checkPermission('documents.view'),
  DocumentController.listDocuments,
);

documentRoutes.get(
  '/:id',
  checkPermission('documents.view'),
  DocumentController.getDocument,
);

documentRoutes.delete(
  '/:id',
  checkPermission('documents.upload'),
  DocumentController.deleteDocument,
);

documentRoutes.patch(
  '/:id/status',
  checkPermission('documents.upload'),
  DocumentController.updateStatus,
);