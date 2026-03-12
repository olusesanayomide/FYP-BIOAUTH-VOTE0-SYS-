import { Router, Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { authLimiter } from '../middleware/rateLimiting';
import * as authService from '../services/authService';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

// Helper to send consistent API envelope
const sendResponse = (res: Response, status: number, result: any) => {
  if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'success') && typeof result.success === 'boolean') {
    return res.status(status).json(result);
  }
  return res.status(status).json({ success: true, data: result });
};

/**
 * POST /auth/register
 * Register a new student
 */
router.post('/register', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, matricNumber, email } = req.body;

    if (!fullName || !matricNumber || !email) {
      throw new ApiError(400, 'Missing required fields', 'MISSING_FIELDS');
    }

    const result = await authService.registerStudent({
      fullName,
      matricNumber,
      email,
    });

    sendResponse(res, 201, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/resend-otp
 * Resend OTP to user email
 */
router.post('/resend-otp', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      throw new ApiError(400, 'Missing userId', 'MISSING_FIELDS');
    }

    const result = await authService.resendOtp(userId);
    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/verify-otp-only
 * Verify OTP without setting password (Step 2 of registration)
 */
router.post('/verify-otp-only', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, otpCode } = req.body;

    if (!userId || !otpCode) {
      throw new ApiError(400, 'Missing required fields', 'MISSING_FIELDS');
    }

    const result = await authService.verifyOtpOnly({
      userId,
      otpCode,
    });

    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/verify-otp
 * Verify OTP and complete registration
 */
router.post('/verify-otp', authLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, otpCode } = req.body;

    if (!userId || !otpCode) {
      throw new ApiError(400, 'Missing required fields', 'MISSING_FIELDS');
    }

    const result = await authService.verifyOtpAndCompleteRegistration({
      userId,
      otpCode,
    });

    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/webauthn/registration-options
 * Get WebAuthn registration challenge
 */
router.get('/webauthn/registration-options', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }

    const options = await authService.getWebauthnRegistrationOptions(req.user.id);
    sendResponse(res, 200, options);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/webauthn/verify-registration
 * Verify WebAuthn registration response
 */
router.post('/webauthn/verify-registration', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }

    const { response } = req.body;

    if (!response) {
      throw new ApiError(400, 'Missing response', 'MISSING_FIELDS');
    }

    const result = await authService.verifyWebauthnRegistration(req.user.id, response);
    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/webauthn/authentication-options
 * Get WebAuthn authentication challenge (for voting)
 */
router.get('/webauthn/authentication-options', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }

    const options = await authService.getWebauthnAuthenticationOptions(req.user.id);
    sendResponse(res, 200, options);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/webauthn/verify-authentication
 * Verify WebAuthn authentication response (for voting)
 */
router.post('/webauthn/verify-authentication', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }

    const { response } = req.body;

    if (!response) {
      throw new ApiError(400, 'Missing response', 'MISSING_FIELDS');
    }

    const result = await authService.verifyWebauthnAuthentication(req.user.id, response);
    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * PUBLIC WebAuthn endpoints (passwordless login)
 * These endpoints allow an unauthenticated user to start a biometric login
 * by providing an identifier (matric number or email). They return the
 * challenge/options and verify the assertion, issuing a JWT on success.
 */

// POST /auth/webauthn/authentication-options/public
router.post('/webauthn/authentication-options/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      throw new ApiError(400, 'Missing identifier (matric number or email)', 'MISSING_FIELDS');
    }

    const options = await authService.getWebauthnAuthenticationOptionsPublic(identifier);
    res.status(200).json({ success: true, data: options });
  } catch (error) {
    next(error);
  }
});

// POST /auth/webauthn/verify-authentication/public
router.post('/webauthn/verify-authentication/public', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, response } = req.body;

    if (!identifier || !response) {
      throw new ApiError(400, 'Missing identifier or response', 'MISSING_FIELDS');
    }

    const result = await authService.verifyWebauthnAuthenticationPublic(identifier, response, req.ip, req.get('user-agent'));
    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login/request-otp
 * Request a one-time password (OTP) as a fallback for passwordless login
 * Body: { identifier: string } // matric_no or email
 */
router.post('/login/request-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      throw new ApiError(400, 'Missing identifier (matric number or email)', 'MISSING_FIELDS');
    }

    const result = await authService.requestLoginOtp(identifier);
    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login/verify-otp
 * Verify OTP and issue JWT for passwordless fallback
 * Body: { identifier: string, otp: string }
 */
router.post('/login/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, otp } = req.body;

    if (!identifier || !otp) {
      throw new ApiError(400, 'Missing identifier or otp', 'MISSING_FIELDS');
    }

    const result = await authService.verifyLoginOtp(identifier, otp, req.ip, req.get('user-agent'));
    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/admin-login
 * Admin login endpoint with email/password and RBAC check
 * Body: { email: string, password: string }
 */
router.post('/admin-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Missing email or password', 'MISSING_FIELDS');
    }

    const result = await authService.adminLogin(email, password, req.ip, req.get('user-agent'));
    sendResponse(res, 200, result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /auth/me
 * Get current user profile and session status
 */
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'User not authenticated', 'NOT_AUTHENTICATED');
    }

    // Fetch fresh user data from database based on role
    let user;
    let queryError;

    if (req.user.role === 'admin') {
      const { data: admin, error } = await supabase
        .from('admin')
        .select('id, email, username, can_manage_elections, can_manage_users, can_manage_candidates, can_view_audit_logs')
        .eq('id', req.user.id)
        .single();

      user = admin ? {
        id: admin.id,
        email: admin.email,
        name: admin.username,
        role: 'admin',
        permissions: {
          manageElections: admin.can_manage_elections,
          manageUsers: admin.can_manage_users,
          manageCandidates: admin.can_manage_candidates,
          viewAuditLogs: admin.can_view_audit_logs
        }
      } : null;
      queryError = error;
    } else {
      const { data: voter, error } = await supabase
        .from('users')
        .select('id, email, matric_no, name, role, biometric_status, registration_completed')
        .eq('id', req.user.id)
        .single();

      let lastLoginAt: string | null = null;
      let lastLoginIp: string | null = null;
      let lastLoginUserAgent: string | null = null;
      if (voter) {
        const { data: loginLogs } = await supabase
          .from('audit_logs')
          .select('created_at, ip_address, user_agent, action')
          .eq('user_id', voter.id)
          .in('action', ['WEBAUTHN_LOGIN_SUCCESS', 'LOGIN_OTP_SUCCESS'])
          .order('created_at', { ascending: false })
          .limit(1);

        if (loginLogs && loginLogs[0]) {
          lastLoginAt = loginLogs[0].created_at || null;
          lastLoginIp = loginLogs[0].ip_address || null;
          lastLoginUserAgent = loginLogs[0].user_agent || null;
        }
      }

      user = voter ? {
        id: voter.id,
        email: voter.email,
        matricNumber: voter.matric_no,
        name: voter.name,
        role: voter.role,
        biometricStatus: voter.biometric_status,
        registrationCompleted: voter.registration_completed,
        last_login_at: lastLoginAt,
        last_login_ip: lastLoginIp,
        last_login_user_agent: lastLoginUserAgent
      } : null;
      queryError = error;
    }

    if (queryError || !user) {
      throw new ApiError(404, 'User profile not found', 'USER_NOT_FOUND');
    }

    sendResponse(res, 200, user);
  } catch (error) {
    next(error);
  }
});

export default router;

/**
 * POST /auth/test-otp
 * Test endpoint to verify OTP email sending (development only)
 * Returns OTP and sends test email
 */
router.post('/test-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new ApiError(400, 'Email required', 'MISSING_FIELDS');
    }

    if (process.env.NODE_ENV !== 'development') {
      throw new ApiError(403, 'Test endpoint only available in development', 'FORBIDDEN');
    }

    // Generate test OTP
    const otp = require('crypto').randomInt(100000, 999999).toString();

    // Send test email
    const { sendOtpEmail } = require('../utils/email');
    await sendOtpEmail(email, otp, 'Test User');

    res.json({
      success: true,
      data: {
        message: 'Test OTP sent',
        otp: otp,
        email: email,
        expiresIn: '10 minutes'
      }
    });
  } catch (error) {
    next(error);
  }
});

