import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const EXT_BY_TYPE = { 'image/jpeg': '.jpg', 'image/png': '.png' };

const storage = multer.diskStorage({
  destination: uploadsDir,
  // The stored name is random and the extension comes from the checked type, never from the user's file name.
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${EXT_BY_TYPE[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXT_BY_TYPE[file.mimetype]) return cb(null, true);
    cb(new ApiError(415, 'Only JPG, JPEG or PNG images are allowed'));
  },
});

// Accepts one optional file in the form field "image" and turns upload problems into clean API errors.
export const uploadImage = (req, res, next) =>
  upload.single('image')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(new ApiError(413, 'Image is too large (maximum 5 MB)'));
      return next(new ApiError(400, 'Invalid upload: send at most one image in the field "image"'));
    }
    next(err);
  });
