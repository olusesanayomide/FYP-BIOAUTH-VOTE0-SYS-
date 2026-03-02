# Biometric Voting System - Complete Setup Guide

This guide covers the complete setup of the biometric voting system with both frontend and backend.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Prerequisites](#prerequisites)
3. [Database Setup](#database-setup)
4. [Backend Setup](#backend-setup)
5. [Frontend Setup](#frontend-setup)
6. [Running Locally](#running-locally)
7. [API Integration](#api-integration)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/Next.js)                 │
│                  Port 3000                                   │
│  - Student Registration (with email validation)              │
│  - Login (matric number + password)                          │
│  - Voting Interface                                          │
│  - WebAuthn Biometric Integration                            │
└────────────────┬──────────────────────────────────────────────┘
                 │ HTTP/HTTPS
                 │
┌────────────────▼──────────────────────────────────────────────┐
│                     Backend (Express/Node.js)                 │
│                  Port 3001                                   │
│  - Authentication Service (OTP, JWT)                         │
│  - Voting Service (Double voting prevention)                 │
│  - WebAuthn Service (Biometric verification)                 │
│  - Admin Service (Elections, audit logs)                     │
└────────────────┬──────────────────────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────────────────┐
│                     Supabase (PostgreSQL)                     │
│  - school_students (institutional records)                   │
│  - users (authentication)                                    │
│  - authenticators (encrypted WebAuthn credentials)           │
│  - elections, positions, candidates                          │
│  - votes (with double voting prevention)                     │
│  - audit_logs (security tracking)                            │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Software

- Node.js 18+ (https://nodejs.org)
- npm 9+ or Yarn
- PostgreSQL client tools (psql) or Supabase CLI
- Git
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Required Accounts

- Supabase account (https://supabase.com) - FREE tier available
- SMTP server for sending OTPs (can use Mailtrap or similar for dev)

### Required Ports

- Frontend: 3000
- Backend: 3001
- Email dev server: 1025 (optional, for testing)

## Database Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com and sign up
2. Click "New Project"
3. Fill in project name, database password
4. Select region closest to you
5. Wait for project to initialize (2-5 minutes)

### Step 2: Get Connection Details

1. Go to Project Settings → API
2. Copy:
   - Project URL → SUPABASE_URL
   - Anon key → SUPABASE_ANON_KEY
   - Service Role key → SUPABASE_SERVICE_ROLE_KEY

### Step 3: Initialize Database Schema

1. In Supabase Dashboard, go to SQL Editor
2. Click "New Query"
3. Open `backend/scripts/schema.sql` from this project
4. Copy entire content and paste into SQL editor
5. Click "Run"
6. Verify all tables are created successfully

### Step 4: Add Sample Data (Optional)

The schema.sql already includes sample school students. You can add more:

```sql
INSERT INTO school_students (matric_no, email, full_name, department) VALUES
('U2023/123456', 'john.doe@student.babcock.edu.ng', 'John Doe', 'Computer Science'),
('U2023/123457', 'jane.smith@student.babcock.edu.ng', 'Jane Smith', 'Engineering'),
('U2023/123458', 'bob.johnson@student.babcock.edu.ng', 'Bob Johnson', 'Business');
```

## Backend Setup

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
# Backend Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration (from Step 2 above)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-use-random-string
JWT_EXPIRATION=7d

## Email/OTP Configuration

This project supports two delivery methods for OTP and transactional emails:

- Resend (recommended for production) — uses `RESEND_API_KEY` to call the Resend API.
- SMTP (fallback / local development) — uses `SMTP_*` settings (MailHog, Mailtrap, etc.).

Set one of the following in your backend `.env` file.

Option A — Resend (recommended):

```env
# Use Resend API for email delivery
RESEND_API_KEY=re_xxx_your_resend_api_key_here
RESEND_FROM=noreply@securevote.edu
```

Notes:
- Resend provides higher deliverability and simplifies sending without running an SMTP server.
- If `RESEND_API_KEY` is present the backend will call Resend; otherwise it will fall back to SMTP.

Option B — SMTP (development fallback):

```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-mailtrap-username
SMTP_PASSWORD=your-mailtrap-password
SMTP_FROM=noreply@securevote.edu
# Or for MailHog: SMTP_HOST=localhost, SMTP_PORT=1025
```

# WebAuthn Configuration
RP_ID=localhost
RP_NAME=Biometric Voting System
ORIGIN=http://localhost:3000

# Encryption Configuration
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Step 4: Generate Encryption Key

```bash
# macOS/Linux
openssl rand -hex 32

# Windows (Git Bash or PowerShell)
[Convert]::ToHexString((1..32|ForEach-Object{Get-Random -Maximum 256}))
```

Copy the output and paste into ENCRYPTION_KEY in .env

### Step 5: Verify Connection

```bash
npm run typecheck
```

### Step 6: Start Backend

```bash
npm run dev
```

You should see:
```
╔══════════════════════════════════════════════════════════╗
║     Biometric Voting System Backend Server Started       ║
╠══════════════════════════════════════════════════════════╣
║ Server is running on http://localhost:3001                  ║
║ Environment: development                  ║
║ API Documentation: http://localhost:3001/api             ║
║ Health Check: http://localhost:3001/health               ║
╚══════════════════════════════════════════════════════════╝
```

Test health endpoint:
```bash
curl http://localhost:3001/health
```

## Frontend Setup

### Step 1: Navigate to Frontend Directory

```bash
cd ../frontend
```

(or from project root)

```bash
cd frontend
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment (if needed)

The frontend already has a default API URL. Update if your backend is on a different URL:

In `src/config/api.ts` or similar (create if doesn't exist):

```typescript
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### Step 4: Start Frontend Development Server

```bash
npm run dev
```

You should see:
```
> frontend@0.0.1 dev
> next dev

  ▲ Next.js 15.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in XXXms
```

Visit http://localhost:3000 in your browser.

## Running Locally

### Setup for First Time

```bash
# Terminal 1: Start Backend
cd backend
npm install
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm install
npm run dev

# Terminal 3 (Optional): Email testing with MailHog
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
# Then visit http://localhost:8025 to see sent emails
```

### Daily Development

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### Testing the Complete Flow

1. **Register a Student**
   - Go to http://localhost:3000/register
   - Use test data from database:
     - Full Name: John Doe
     - Matric Number: U2023/123456
     - Email: john.doe@student.babcock.edu.ng
   - Check email for OTP (http://localhost:8025 if using MailHog)
   - Enter OTP and create password
   - Click "Proceed to Login"

2. **Login (Passwordless Biometric)**
  - Go to http://localhost:3000/login
  - Enter your Matric Number or registered email (e.g. U2023/123456)
  - The app will prompt for biometric verification (finger/iris/face) using WebAuthn
  - Place your finger or look into the camera to authenticate; no password is required

3. **Register Biometric**
   - After login, you'll be prompted to register biometric
   - Follow on-screen instructions (varies by device)
   - System will simulate biometric enrollment in development

4. **Vote**
   - Navigate to voting section
   - Select an election (admin must create one first)
   - Select candidates for each position
   - Verify biometric
   - Submit vote

## API Integration

### Frontend Integration Steps

1. Create an API client service (`src/services/api.ts`):

```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

2. Create Auth Service (`src/services/authService.ts`):

```typescript
import apiClient from './api';

export const registerStudent = (data: {
  fullName: string;
  matricNumber: string;
  email: string;
}) => apiClient.post('/auth/register', data);

export const verifyOtp = (data: {
  userId: string;
  otpCode: string;
  password: string;
}) => apiClient.post('/auth/verify-otp', data);

export const login = (data: {
  matricNumber: string;
  password: string;
}) => apiClient.post('/auth/login', data);

// ... other auth endpoints
```

3. Use in components:

```typescript
import { registerStudent } from '@/services/authService';

const handleRegister = async () => {
  try {
    const response = await registerStudent({
      fullName,
      matricNumber,
      email,
    });
    setUserId(response.data.userId);
    // Move to OTP step
  } catch (error) {
    setError(error.response?.data?.error || 'Registration failed');
  }
};
```

## Deployment

### Production Checklist

- [ ] Update .env with production values
- [ ] Set NODE_ENV=production
- [ ] Generate strong JWT_SECRET
- [ ] Update CORS_ORIGIN to production URL
- [ ] Configure SMTP with production email provider
- [ ] Update RP_ID and ORIGIN for WebAuthn
- [ ] Enable HTTPS
- [ ] Set up SSL certificates
- [ ] Configure database backups
- [ ] Review security settings
- [ ] Set up monitoring and logging
- [ ] Test complete workflow

### Deploying Backend

#### Option 1: Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set SUPABASE_URL=xxx
heroku config:set SUPABASE_SERVICE_ROLE_KEY=xxx
# ... set other env vars

# Deploy
git push heroku main
```

#### Option 2: Railway, Render, or DigitalOcean

Follow similar steps with their CLI tools.

### Deploying Frontend

#### Option 1: Vercel (Recommended for Next.js)

```bash
npm install -g vercel
vercel
```

#### Option 2: Netlify

```bash
npm run build
# Deploy 'out' or '.next' directory
```

## Troubleshooting

### Backend Won't Start

**Error**: "Missing Supabase environment variables"
- **Solution**: Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

**Error**: "ENCRYPTION_KEY must be a 32-byte hex string"
- **Solution**: Generate new key with `openssl rand -hex 32`

### OTP Not Received

**Problem**: Email not arriving
- **Solution**: 
  - Check SMTP configuration
  - Verify email address is correct
  - Check spam/junk folder
  - Use MailHog (http://localhost:8025) to verify

### WebAuthn/Biometric Issues

**Error**: "Biometric registration verification failed"
- **Solution**: 
  - Ensure RP_ID matches your domain
  - Check ORIGIN matches frontend URL
  - Try in Chrome (best WebAuthn support)

**Error**: "Authenticator not found"
- **Solution**: User must first register biometric before voting

### Double Voting Issues

**Error**: "You have already voted in this election"
- **Solution**: This is expected behavior. Double voting is prevented by design.

### CORS Errors

**Error**: "Access to XMLHttpRequest has been blocked by CORS policy"
- **Solution**: Update CORS_ORIGIN in backend .env to match your frontend URL

### Database Connection Issues

**Error**: "Error: connect ECONNREFUSED 127.0.0.1:5432"
- **Solution**: 
  - Verify Supabase project is running
  - Check SUPABASE_URL is correct
  - Verify internet connection

## Support & Documentation

- API Documentation: http://localhost:3001/api (when server is running)
- Health Check: http://localhost:3001/health
- Supabase Docs: https://supabase.com/docs
- WebAuthn Spec: https://www.w3.org/TR/webauthn-2/
- Next.js Docs: https://nextjs.org/docs

## Security Notes

1. **Never commit .env files** - Add to .gitignore
2. **Change JWT_SECRET** in production to a random string
3. **Use HTTPS** in production
4. **Rotate ENCRYPTION_KEY** periodically
5. **Monitor audit logs** regularly
6. **Keep dependencies updated** - run `npm audit fix`

## Additional Notes

- OTP expires after 10 minutes
- Rate limiting: 5 login attempts per 15 minutes
- WebAuthn counter prevents replay attacks
- All votes are encrypted and logged
- Double voting is impossible by design

---

**Last Updated**: February 15, 2026
**Version**: 1.0.0
