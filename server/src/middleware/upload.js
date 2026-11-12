import multer from 'multer';
import ApiError from '../utils/ApiError.js';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ['image/jpeg', 'image/png'];

// The file is kept in memory (at most 5 MB), checked, and then saved to the database by the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => (ALLOWED.includes(file.mimetype) ? cb(null, true) : cb(new ApiError(415, 'Only JPG, JPEG or PNG images are allowed'))),
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
