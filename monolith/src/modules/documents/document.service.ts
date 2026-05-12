import { AppError } from '../../lib/errors';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { DocumentModel, IDocument, DocumentType } from './models/document.model';

interface UploadDocumentParams {
  orgId: string;
  userId: string;
  loadId: string | null;
  type: DocumentType;
  file: { buffer: Buffer; originalname: string; mimetype: string };
  metadata?: Record<string, unknown>;
  notes?: string | null;
}

interface ListFilters {
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class DocumentService {
  static async uploadDocument(params: UploadDocumentParams): Promise<IDocument> {
    const { orgId, userId, loadId, type, file, metadata, notes } = params;

    const validTypes: string[] = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.mimetype)) {
      throw AppError.badRequest(
        'INVALID_FILE_TYPE',
        `Invalid file type: ${file.mimetype}. Allowed: PDF, JPEG, PNG, WEBP, DOC, DOCX`,
      );
    }

    if (file.buffer.length > 50 * 1024 * 1024) {
      throw AppError.badRequest('FILE_TOO_LARGE', 'File size must be less than 50MB');
    }

    const folder = loadId ? `flow/loads/${loadId}` : `flow/documents/${orgId}`;
    const uploadResult = await uploadToCloudinary(file.buffer, {
      folder,
      publicId: `${type}_${Date.now()}`,
    });

    const doc = await DocumentModel.create({
      orgId,
      userId,
      loadId,
      type,
      fileUrl: uploadResult.url,
      publicId: uploadResult.publicId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.buffer.length,
      status: 'pending',
      metadata: metadata || {},
      notes: notes || null,
    });

    return doc;
  }

  static async listDocuments(orgId: string, loadId: string | null, filters: ListFilters) {
    const { type, status, page = 1, limit = 20 } = filters;

    const query: Record<string, unknown> = { orgId };
    if (loadId) query.loadId = loadId;
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      DocumentModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      DocumentModel.countDocuments(query),
    ]);

    return {
      data: docs,
      meta: { page, limit, total, hasMore: skip + docs.length < total },
    };
  }

  static async getDocument(documentId: string, orgId: string) {
    const doc = await DocumentModel.findOne({ _id: documentId, orgId }).lean();
    if (!doc) {
      throw AppError.notFound('Document', documentId);
    }
    return doc;
  }

  static async deleteDocument(documentId: string, orgId: string): Promise<void> {
    const doc = await DocumentModel.findOne({ _id: documentId, orgId });
    if (!doc) {
      throw AppError.notFound('Document', documentId);
    }
    await DocumentModel.deleteOne({ _id: documentId, orgId });
  }

  static async updateDocumentStatus(
    documentId: string,
    orgId: string,
    status: 'approved' | 'rejected',
    reviewerId: string,
  ): Promise<IDocument> {
    const doc = await DocumentModel.findOne({ _id: documentId, orgId });
    if (!doc) {
      throw AppError.notFound('Document', documentId);
    }

    doc.status = status;
    doc.metadata = { ...doc.metadata, reviewedBy: reviewerId, reviewedAt: new Date().toISOString() };
    await doc.save();

    return doc;
  }
}