"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const auth_1 = require("../middleware/auth");
const rateLimiter_1 = require("../middleware/rateLimiter");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
const uploadController = new upload_controller_1.UploadController();
// All upload routes require authentication and rate limiting
router.use((0, auth_1.requireAuth)());
router.use(rateLimiter_1.uploadRateLimiter);
// POST /api/v1/uploads/document - Upload document
router.post('/document', upload_1.upload.single('document'), uploadController.uploadDocument);
// POST /api/v1/uploads/photo - Upload photo
router.post('/photo', upload_1.upload.single('photo'), uploadController.uploadPhoto);
// POST /api/v1/uploads/multiple - Upload multiple files
router.post('/multiple', upload_1.upload.array('files', 5), uploadController.uploadMultiple);
// GET /api/v1/uploads/:filename - Get uploaded file
router.get('/:filename', uploadController.getFile);
// DELETE /api/v1/uploads/:filename - Delete uploaded file
router.delete('/:filename', (0, auth_1.requireAuth)({ roles: ['super_admin', 'school_admin', 'staff'] }), uploadController.deleteFile);
exports.default = router;
//# sourceMappingURL=upload.routes.js.map