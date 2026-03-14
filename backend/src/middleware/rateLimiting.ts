import rateLimit from 'express-rate-limit';

/**
 * Global rate limiter
 * 100 requests per 15 minutes
 */
export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth endpoints rate limiter
 * 5 requests per 15 minutes
 * Prevents brute force attacks on login/register/OTP endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
});
