import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// POST /api/v1/auth/register - Register new user
router.post('/register', authRateLimiter, authController.register);

// POST /api/v1/auth/login - User login
router.post('/login', authRateLimiter, authController.login);

// POST /api/v1/auth/refresh - Refresh access token
router.post('/refresh', authController.refreshToken);

// POST /api/v1/auth/logout - User logout
router.post('/logout', authenticateToken, authController.logout);

// POST /api/v1/auth/forgot-password - Request password reset
router.post('/forgot-password', passwordResetRateLimiter, authController.forgotPassword);

// POST /api/v1/auth/reset-password - Reset password
router.post('/reset-password', passwordResetRateLimiter, authController.resetPassword);

// POST /api/v1/auth/change-password - Change password (authenticated)
router.post('/change-password', authenticateToken, authController.changePassword);

// GET /api/v1/auth/profile - Get current user profile
router.get('/profile', authenticateToken, authController.getProfile);

// PUT /api/v1/auth/profile - Update current user profile
router.put('/profile', authenticateToken, authController.updateProfile);

// POST /api/v1/auth/verify-email - Verify email address
router.post('/verify-email', authController.verifyEmail);

// POST /api/v1/auth/resend-verification - Resend email verification
router.post('/resend-verification', authRateLimiter, authController.resendVerification);

export default router;