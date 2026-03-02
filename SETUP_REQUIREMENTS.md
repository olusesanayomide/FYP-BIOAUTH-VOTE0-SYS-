# Biometric Voting System - Complete Setup & Requirements

**Last Updated:** February 15, 2026  
**Status:** ✅ All files created and ready for integration  

---

## 📋 MANUAL SETUP REQUIREMENTS

### Your Actions Required (Before Running)

#### 1. **SUPABASE SETUP** ⭐ CRITICAL

- [ ] Create account at https://supabase.com (FREE tier available)
- [ ] Create new project
- [ ] Copy these credentials to `backend/.env`:
  ```
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_ANON_KEY=eyJhbGc...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
  ```
- [ ] In Supabase SQL Editor, run `backend/scripts/schema.sql`
- [ ] Add test students to `school_students` table:
  ```sql
  INSERT INTO school_students (matric_no, email, full_name, department) VALUES
  ('U2023/123456', 'john.doe@student.babcock.edu.ng', 'John Doe', 'Computer Science'),
  ('U2023/123457', 'jane.smith@student.babcock.edu.ng', 'Jane Smith', 'Engineering');
  ```

#### 2. **EMAIL SERVICE SETUP** ⭐ CRITICAL

**Option A: Development (MailHog - Recommended for Testing)**
```bash
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
# Access at http://localhost:8025 to see emails
```

Then in `backend/.env`:
```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@securevote.edu
```

**Option B: Production (Resend.com - Recommended)**
1. Go to https://resend.com and create account
2. Get API key
3. In `backend/.env`:
```env
SMTP_HOST=smtp.resend.co
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your-resend-api-key
SMTP_FROM=onboarding@resend.dev
```

**Option C: Gmail SMTP**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
```

#### 3. **GENERATE ENCRYPTION KEY** ⭐ CRITICAL

Run one of these commands and copy output to `backend/.env` as `ENCRYPTION_KEY`:

**macOS/Linux:**
```bash
openssl rand -hex 32
```

**Windows (PowerShell):**
```powershell
[System.Convert]::ToHexString((1..32|ForEach-Object{Get-Random -Maximum 256}))
```

Example output:
```env
ENCRYPTION_KEY=a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b
```

#### 4. **JWT SECRET** ⭐ CRITICAL

Generate a random secret for JWT (use any random string, 32+ characters):

```bash
# macOS/Linux
openssl rand -base64 32

# Windows
[System.Convert]::ToBase64String((1..32|ForEach-Object{Get-Random -Maximum 256}))
```

Add to `backend/.env`:
```env
JWT_SECRET=your-generated-secret-here
```

#### 5. **CONFIGURE BACKEND .env**

Copy `backend/.env.example` to `backend/.env` and fill in ALL values:

```env
# ===== SERVER CONFIGURATION =====
PORT=3001
NODE_ENV=development

# ===== SUPABASE (Get from Supabase Dashboard) =====
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# ===== SECURITY =====
JWT_SECRET=your-generated-jwt-secret-here
JWT_EXPIRATION=7d
ENCRYPTION_KEY=your-generated-32-byte-hex-key

# ===== EMAIL/OTP (Choose one option) =====
# Option 1: MailHog (development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=

# Option 2: Resend (production)
# SMTP_HOST=smtp.resend.co
# SMTP_PORT=587
# SMTP_USER=resend
# SMTP_PASSWORD=your-resend-api-key

SMTP_FROM=noreply@securevote.edu
SMTP_SECURE=false

# ===== WEBAUTHN =====
RP_ID=localhost
RP_NAME=Biometric Voting System
ORIGIN=http://localhost:3000

# ===== CORS =====
CORS_ORIGIN=http://localhost:3000

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 6. **CONFIGURE FRONTEND .env.local**

File: `frontend/.env.local` (already created, verify contents)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Biometric Voting System
NEXT_PUBLIC_UNIVERSITY_NAME=Babcock University
```

---

## 📁 Project Structure & New Files Created

### Frontend Files Created/Updated

```
src/
├── services/
│   ├── api.ts ✅ NEW - HTTP client with interceptors
│   ├── authService.ts ✅ NEW - Registration, OTP, biometric
│   └── votingService.ts ✅ NEW - Elections, voting, results
├── context/
│   └── AuthContext.tsx ✅ NEW - User auth state management
└── pages/
    └── Register.tsx ✅ UPDATED - Full backend integration

.env.local ✅ NEW - Frontend configuration
```

### Backend Files (Existing)

```
backend/
├── src/
│   ├── index.ts - Express server
│   ├── config/supabase.ts - Database client
│   ├── middleware/
│   │   ├── auth.ts - JWT verification
│   │   └── errorHandler.ts - Error handling
│   ├── routes/
│   │   ├── auth.ts - Registration, OTP, login, biometric
│   │   ├── voting.ts - Elections, voting, results
│   │   └── admin.ts - Admin endpoints
│   ├── services/
│   │   ├── authService.ts - Auth business logic
│   │   ├── votingService.ts - Voting logic
│   │   └── adminService.ts - Admin logic
│   └── utils/
│       ├── encryption.ts - AES-256 encryption
│       ├── email.ts - OTP email sending
│       └── jwt.ts - JWT generation
└── scripts/
    └── schema.sql - Database initialization
```

---

## 🚀 Quick Start (After Setup)

### Terminal 1 - Email Service (if using MailHog)
```bash
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

### Terminal 2 - Backend
```bash
cd backend
npm install  # If not done yet
npm run dev
# Should see:
# ✅ Server running on http://localhost:3001
# ✅ API Documentation: http://localhost:3001/api
```

### Terminal 3 - Frontend
```bash
cd frontend
npm install  # If not done yet
npm run dev
# Should see:
# ✅ Ready in XXXms
# ✅ http://localhost:3000
```

### Terminal 4 - Monitor Backend Logs
```bash
cd backend
# Watch for "[AUTH]", "[VOTING]", "[ERROR]" logs
tail -f backend-logs.txt  # Or check console in Terminal 2
```

---

## 🧪 Test the Complete Flow

### 1. Navigate to Registration
- Open http://localhost:3000/register
- Fill form with test data:
  - Full Name: John Doe
  - Matric Number: U2023/123456
  - Email: john.doe@student.babcock.edu.ng

### 2. Get OTP
- Check MailHog at http://localhost:8025
- Copy 6-digit OTP code
- Enter in form

### 3. Set Password
- Create password (8+ characters)
- Confirm password

### 4. Enroll Biometric
- Click "Grant Permission"
- Wait for biometric scan (simulated)
- Should complete and redirect to login

### 5. Login
- Go to http://localhost:3000/login
- Matric: U2023/123456
- Password: (from step 3)
- Should see voting interface

### 6. Vote
- Select an election (admin must create one)
- Select candidates
- Verify with biometric
- Submit vote

---

## 📊 Database Schema Overview

### Key Tables

**school_students**
- Source of truth for student identity
- Populated by admin/institution
- Used to verify registration
- Fields: matric_no, email, full_name, department, enrollment_date

**users**
- Created after successful registration
- Stores: matric_no (FK), email, password_hash, webauthn_registered
- One user per matric number

**authenticators**
- Stores WebAuthn credentials (encrypted)
- Fields: credential_id, public_key_encrypted, public_key_iv, counter, created_at
- Prevents replay attacks with counter

**elections**
- Voting events
- Fields: title, description, startDate, endDate, status

**positions**
- Positions in elections (President, VP, etc)
- Foreign key to elections

**candidates**
- Candidates for positions
- Foreign key to positions

**votes**
- Individual votes recorded
- ⚠️ UNIQUE(voter_id, election_id, position_id) - Prevents double voting
- Encrypted vote data

**voter_records**
- Tracks participation
- ⚠️ UNIQUE(user_id, election_id) - One vote per election
- Timestamp of voting

**audit_logs**
- Security audit trail
- Logs: registration, OTP verification, login, votes
- NOT editable after creation

---

## 🔐 Security Features Implemented

✅ **Double Voting Prevention**
- Database UNIQUE constraints
- Service-level checks
- Audit logging

✅ **Biometric Security**
- WebAuthn standard (W3C spec)
- Challenge-response protocol
- Counter for replay prevention
- Encrypted public key storage (AES-256)

✅ **Password Security**
- bcryptjs with salt rounds
- Minimum 8 characters enforced
- Never logged

✅ **OTP Security**
- 6-digit random code
- 10-minute expiration
- Rate limited (1 per minute)
- Email verification

✅ **Encryption**
- AES-256-CBC for WebAuthn credentials
- Random IV for each encryption
- Encryption key in environment

✅ **Authentication**
- JWT tokens (7-day expiration)
- Bearer token in Authorization header
- Automatic refresh handling

✅ **API Security**
- CORS protection
- Helmet security headers
- Rate limiting on all endpoints
- Input validation on all fields

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module 'express'"
**Solution:** Run `npm install` in backend folder
```bash
cd backend
npm install
```

### Issue: "Missing Supabase environment variables"
**Solution:** Fill ALL values in `backend/.env`, especially:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

### Issue: "OTP not received"
**Solution:** 
1. Check MailHog: http://localhost:8025
2. If using SMTP, verify credentials
3. Check backend logs for errors
4. Make sure email is valid

### Issue: "Biometric verification failed"
**Solution:**
- Ensure RP_ID matches your domain
- Try in Chrome (best WebAuthn support)
- Check backend logs for specific error

### Issue: "CORS error" in browser console
**Solution:** Update CORS_ORIGIN in `backend/.env` to match frontend URL

### Issue: Backend won't start
**Solution:**
```bash
# Check what's on port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill process or change PORT in .env
```

---

## 📝 Development Workflow

### Code Changes

**Backend**
```bash
cd backend
npm run dev  # Auto-reloads on file changes
```

**Frontend**
```bash
cd frontend
npm run dev  # Next.js hot reload
```

### TypeScript Checking

```bash
# Backend
cd backend
npm run typecheck

# Frontend (Next.js built-in)
# Errors shown during `npm run dev`
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

---

## 📈 Performance Tips

1. **Database Indexes** - Already included in schema.sql
2. **Rate Limiting** - Prevents abuse and DDoS
3. **JWT Caching** - Token stored in localStorage, no DB lookup per request
4. **Encryption Caching** - Keys generated once at startup
5. **Query Optimization** - Use SELECT only needed columns

---

## 🚢 Deployment Checklist

Before production:

- [ ] Change JWT_SECRET to strong random value
- [ ] Change ENCRYPTION_KEY to strong random value
- [ ] Update CORS_ORIGIN to production domain
- [ ] Update RP_ID and ORIGIN for WebAuthn
- [ ] Enable HTTPS (https:// not http://)
- [ ] Use production email service (Resend/SendGrid)
- [ ] Set NODE_ENV=production
- [ ] Run database backups
- [ ] Set up monitoring/logging
- [ ] Test complete flow in staging
- [ ] Configure SSL certificates

---

## 📞 API Endpoints Reference

### Authentication Endpoints
- `POST /auth/register` - Register student
- `POST /auth/resend-otp` - Resend OTP
- `POST /auth/verify-otp` - Verify OTP and set password
- `POST /auth/login` - Login with matric + password
- `GET /auth/webauthn/registration-options` - Get biometric registration
- `POST /auth/webauthn/verify-registration` - Register biometric
- `GET /auth/webauthn/authentication-options` - Get biometric for voting
- `POST /auth/webauthn/verify-authentication` - Verify biometric

### Voting Endpoints
- `GET /voting/elections` - Get all elections
- `GET /voting/elections/:electionId` - Get election details
- `POST /voting/eligibility` - Check voting eligibility
- `POST /voting/submit` - Submit vote with biometric
- `GET /voting/results/:electionId` - Get results
- `GET /voting/history` - Get user's voting history

### Admin Endpoints (auth required)
- `GET /admin/audit-logs` - View audit logs
- `GET /admin/users` - View all users
- `POST /admin/elections` - Create election
- `PUT /admin/elections/:electionId` - Update election
- `DELETE /admin/elections/:electionId` - Delete election
- `GET /admin/dashboard` - Dashboard statistics

---

## 📚 Additional Resources

- **WebAuthn**: https://www.w3.org/TR/webauthn-2/
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Express.js**: https://expressjs.com/
- **JWT**: https://jwt.io/
- **bcryptjs**: https://github.com/dcodeIO/bcrypt.js

---

## ✨ Features Summary

### Implemented ✅
- Student registration with institutional verification
- OTP email verification (rate limited)
- Password-based login with JWT
- WebAuthn biometric enrollment
- WebAuthn biometric voting verification
- Double voting prevention (DB + service level)
- Encrypted credential storage
- Audit logging
- Role-based access (admin endpoints)
- Rate limiting
- CORS security
- Input validation
- Error handling

### For Frontend To Build
- Landing page with login/register buttons
- User profile page
- Election voting interface
- Results viewing page
- Admin dashboard

---

## 🎯 Next Steps

1. **Complete Setup**
   - [ ] Create Supabase account and project
   - [ ] Configure all .env files
   - [ ] Run database schema
   - [ ] Set up email service

2. **Test Locally**
   - [ ] Start backend: `npm run dev`
   - [ ] Start frontend: `npm run dev`
   - [ ] Test registration flow
   - [ ] Test OTP verification
   - [ ] Test biometric enrollment
   - [ ] Test login
   - [ ] Test voting (create election in admin)

3. **Extend Frontend**
   - [ ] Create Login page
   - [ ] Create Voting interface
   - [ ] Create Results page
   - [ ] Create Admin dashboard

4. **Production Deployment**
   - [ ] Set up production Supabase
   - [ ] Configure production email
   - [ ] Generate production keys
   - [ ] Deploy backend
   - [ ] Deploy frontend
   - [ ] Set up monitoring

---

**Questions?** Check the [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) for detailed endpoint examples and curl commands.

**Support:** All backend endpoints have detailed comments with MANUAL SETUP requirements marked with ⭐.
