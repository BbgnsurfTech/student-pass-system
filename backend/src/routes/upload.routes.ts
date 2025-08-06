import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth';
import { uploadRateLimiter } from '../middleware/rateLimiter';
import { upload } from '../middleware/upload';

const router = Router();
const uploadController = new UploadController();

// All upload routes require authentication and rate limiting
router.use(requireAuth());
router.use(uploadRateLimiter);

// POST /api/v1/uploads/document - Upload document
router.post('/document', upload.single('document'), uploadController.uploadDocument);

// POST /api/v1/uploads/photo - Upload photo
router.post('/photo', upload.single('photo'), uploadController.uploadPhoto);

// POST /api/v1/uploads/multiple - Upload multiple files
router.post('/multiple', upload.array('files', 5), uploadController.uploadMultiple);

// GET /api/v1/uploads/:filename - Get uploaded file
router.get('/:filename', uploadController.getFile);

// DELETE /api/v1/uploads/:filename - Delete uploaded file
router.delete('/:filename', requireAuth({ roles: ['super_admin', 'school_admin', 'staff'] }), uploadController.deleteFile);

export default router;