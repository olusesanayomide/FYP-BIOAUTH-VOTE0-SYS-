import express, { Express, Request, Response, NextFunction } from 'express';
import dns from 'node:dns';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import votingRoutes from './routes/voting';
import adminRoutes from './routes/admin';
import { errorHandler } from './middleware/errorHandler';
import { globalLimiter } from './middleware/rateLimiting';

// Fix Node 18+ undici Supabase IPv6 ConnectTimeoutError
dns.setDefaultResultOrder('ipv4first');

// Load environment variables
dotenv.config();

// Keep TLS certificate verification enabled by default.
// Only allow explicit insecure override in local development for debugging.
if (process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_TLS === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('[SECURITY] TLS certificate verification is disabled (development override).');
}

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Trust the first proxy in front of Express (like ngrok or Vercel)
app.set('trust proxy', 1);

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  process.env.CORS_ORIGIN?.trim()
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const isAllowed = allowedOrigins.includes(origin) ||
        origin.includes('ngrok-free.dev') ||
        process.env.NODE_ENV === 'development'; // Be permissive in dev

      if (isAllowed) {
        callback(null, true);
      } else {
        console.warn(`[CORS REJECTED] Origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rate limiting - prevent spam and brute force
app.use(globalLimiter);

// ============================================
// Routes
// ============================================

// Root health check (Fix for "Endpoint not found" on base URL)
app.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'Server is running',
    message: 'Biometric Voting System API',
    timestamp: new Date().toISOString(),
    documentation: '/api'
  });
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Biometric Voting System Backend API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /auth/register',
        resendOtp: 'POST /auth/resend-otp',
        verifyOtp: 'POST /auth/verify-otp',
        login: 'POST /auth/login',
        webauthnRegistrationOptions: 'GET /auth/webauthn/registration-options',
        webauthnVerifyRegistration: 'POST /auth/webauthn/verify-registration',
        webauthnAuthenticationOptions: 'GET /auth/webauthn/authentication-options',
        webauthnVerifyAuthentication: 'POST /auth/webauthn/verify-authentication',
      },
      voting: {
        getElections: 'GET /voting/elections',
        getElectionById: 'GET /voting/elections/:id',
        checkEligibility: 'POST /voting/eligibility',
        submitVote: 'POST /voting/submit',
        getResults: 'GET /voting/results/:electionId',
        getHistory: 'GET /voting/history',
      },
      admin: {
        createElection: 'POST /admin/elections',
        updateElection: 'PUT /admin/elections/:id',
        deleteElection: 'DELETE /admin/elections/:id',
        getAuditLogs: 'GET /admin/audit-logs',
        getUsers: 'GET /admin/users',
      },
    },
  });
});

// Auth routes
app.use('/auth', authRoutes);

// Voting routes
app.use('/voting', votingRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     Biometric Voting System Backend Server Started       ║
╠══════════════════════════════════════════════════════════╣
║ Server is running on http://localhost:${PORT}                  ║
║ Environment: ${process.env.NODE_ENV || 'development'}                  ║
║ API Documentation: http://localhost:${PORT}/api             ║
║ Health Check: http://localhost:${PORT}/health               ║
╚══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

export default app;
