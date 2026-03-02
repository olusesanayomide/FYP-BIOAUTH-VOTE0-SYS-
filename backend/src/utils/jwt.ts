import * as jwt from 'jsonwebtoken';
import { ApiError } from '../middleware/errorHandler';

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  matricNumber: string;
  name: string;
  role?: string;
}

/**
 * Generate JWT token
 */
export const generateToken = (payload: TokenPayload): string => {
  const secret = process.env.JWT_SECRET as string;
  if (!secret) {
    throw new ApiError(500, 'JWT secret not configured', 'JWT_SECRET_MISSING');
  }
  const expiresIn = (process.env.JWT_EXPIRATION || '7d') as jwt.SignOptions['expiresIn'];
  const options: jwt.SignOptions = {
    expiresIn,
    algorithm: 'HS256',
  };
  return jwt.sign(payload as any, secret, options);
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      throw new ApiError(500, 'JWT secret not configured', 'JWT_SECRET_MISSING');
    }
    return jwt.verify(token, secret) as TokenPayload;
  } catch (err: any) {
    throw err;
  }
};

/**
 * Decode JWT token without verification
 */
export const decodeToken = (token: string): TokenPayload => {
  const decoded = jwt.decode(token) as TokenPayload;
  return decoded;
};
