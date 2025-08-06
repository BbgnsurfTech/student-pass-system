"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const rateLimiter_1 = require("../middleware/rateLimiter");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
// POST /api/v1/auth/register - Register new user
router.post('/register', rateLimiter_1.authRateLimiter, authController.register);
// POST /api/v1/auth/login - User login
router.post('/login', rateLimiter_1.authRateLimiter, authController.login);
// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', authController.refreshToken);
// POST /api/v1/auth/logout - User logout
router.post('/logout', auth_1.authenticateToken, authController.logout);
// POST /api/v1/auth/forgot-password - Request password reset
router.post('/forgot-password', rateLimiter_1.passwordResetRateLimiter, authController.forgotPassword);
// POST /api/v1/auth/reset-password - Reset password
router.post('/reset-password', rateLimiter_1.passwordResetRateLimiter, authController.resetPassword);
// POST /api/v1/auth/change-password - Change password (authenticated)
router.post('/change-password', auth_1.authenticateToken, authController.changePassword);
// GET /api/v1/auth/profile - Get current user profile
router.get('/profile', auth_1.authenticateToken, authController.getProfile);
// PUT /api/v1/auth/profile - Update current user profile
router.put('/profile', auth_1.authenticateToken, authController.updateProfile);
// POST /api/v1/auth/verify-email - Verify email address
router.post('/verify-email', authController.verifyEmail);
// POST /api/v1/auth/resend-verification - Resend email verification
router.post('/resend-verification', rateLimiter_1.authRateLimiter, authController.resendVerification);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map