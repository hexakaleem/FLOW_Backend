import path from 'path';
import fs from 'fs';
import { v4 as uuidV4 } from 'uuid';
import { config } from '../config';

interface UploadOptions {
  folder: string;
  publicId?: string;
}

interface UploadResult {
  url: string;
  publicId: string;
}

// ── Local fallback ──────────────────────────────────────────────────────────
// When CLOUDINARY_URL is not configured, files are saved to the local
// `uploads/` directory and served via the static middleware mounted in index.ts.
// This allows file upload to work out of the box in development without
// requiring a Cloudinary account.

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

function ensureUploadsDir(subfolder: string): string {
  const dir = path.join(UPLOADS_DIR, subfolder);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function saveLocally(
  fileBuffer: Buffer,
  options: UploadOptions,
  originalExtension?: string,
): UploadResult {
  const dir = ensureUploadsDir(options.folder);
  const id = options.publicId || uuidV4();
  const ext = originalExtension || '.bin';
  const filename = `${id}${ext}`;
  const filePath = path.join(dir, filename);

  fs.writeFileSync(filePath, fileBuffer);

  // Build the URL relative to the static mount point. The monolith's
  // index.ts serves /uploads/* as static assets.
  const relativePath = path.relative(UPLOADS_DIR, filePath).replace(/\\/g, '/');
  const url = `/uploads/${relativePath}`;

  return { url, publicId: `${options.folder}/${id}` };
}

// ── Cloudinary (production) ─────────────────────────────────────────────────

let cloudinaryConfigured = false;

if (config.cloudinary.url && config.cloudinary.url !== '') {
  try {
    // Lazy import so the app still starts when cloudinary npm package is
    // missing (which should not happen, but let's be safe).
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({ url: config.cloudinary.url, secure: true });
    cloudinaryConfigured = true;
  } catch {
    console.warn('[UPLOAD] cloudinary package not found — falling back to local storage');
  }
}

function uploadToCloudinaryRemote(
  fileBuffer: Buffer,
  options: UploadOptions,
): Promise<UploadResult> {
  const { v2: cloudinary } = require('cloudinary');

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: 'auto',
      },
      (error: any, result: any) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      },
    );
    uploadStream.end(fileBuffer);
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Uploads a file buffer.
 * • When CLOUDINARY_URL is set → uploads to Cloudinary CDN.
 * • Otherwise → saves to local `uploads/` directory (dev/demo friendly).
 */
export function uploadToCloudinary(
  fileBuffer: Buffer,
  options: UploadOptions,
  mimeType?: string,
): Promise<UploadResult> {
  if (cloudinaryConfigured) {
    return uploadToCloudinaryRemote(fileBuffer, options);
  }

  // Local fallback — synchronous but wrapped in a promise for API compat.
  const extMap: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };
  const ext = mimeType ? extMap[mimeType] || '.bin' : '.bin';

  const result = saveLocally(fileBuffer, options, ext);
  console.log(`[UPLOAD] File saved locally: ${result.url}`);
  return Promise.resolve(result);
}

export function generateSignedUrl(publicId: string, _ttlSeconds = 3600): string {
  if (cloudinaryConfigured) {
    const { v2: cloudinary } = require('cloudinary');
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + _ttlSeconds,
    });
  }

  // For local storage, the publicId IS the relative path.
  return `/uploads/${publicId}`;
}
