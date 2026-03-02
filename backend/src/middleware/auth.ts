import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase';
import { ApiError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    matricNumber: string;
    name: string;
    role?: string;
  };
}

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 * Attaches user info to req.user
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    console.log(`[AUTH] Token verified: sub=${decoded.sub}, role=${decoded.role}`);

    // Check if user is suspended (Only for non-admin users)
    if (decoded.role !== 'admin') {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('status')
        .eq('id', decoded.sub)
        .single();

      if (user && user.status === 'SUSPENDED') {
        throw new ApiError(403, 'Your account has been suspended. Please contact the administrator.', 'ACCOUNT_SUSPENDED');
      }
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      matricNumber: decoded.matricNumber,
      name: decoded.name,
      role: decoded.role,
    };

    next();
  } catch (error: any) {
    console.error(`[AUTH ERROR] ${error.message}`, {
      stack: error.stack,
      path: req.path,
      method: req.method
    });

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    res.status(500).json({
      error: 'Authentication failed',
    });
  }
};

/**
 * Admin Role Middleware
 * Must be used AFTER authMiddleware
 * Ensures the authenticated user has the 'admin' role
 */
export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
      code: 'FORBIDDEN',
    });
  }
  next();
};
