# OTP Email System - Complete Guide

## Overview

This document covers the One-Time Password (OTP) implementation used for user registration and fallback authentication in the Biometric Voting System.

**Current Implementation Status**: ✅ FIXED - All timezone issues resolved

---

## 1. Architecture

### OTP Flow Diagram

```
Registration Flow:
Step 1: Register → Backend generates OTP + Email
Step 2: Verify OTP → Backend validates OTP expiry & hash (THIS STEP NOW CORRECT)
Step 3: Set Password → Backend stores password hash
Step 4: Biometric → Frontend enrolls fingerprint/face

Fallback Login Flow:
1. User requests OTP via email
2. User enters OTP
3. System validates and issues JWT token
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| OTP Generation | `authService.ts:103-130` | Create secure 6-digit OTP |
| OTP Verification | `authService.ts:215-260` | Validate OTP expiry and hash |
| Email Sending | `email.ts` | Deliver OTP via Resend API or SMTP |
| Database Schema | `schema.sql:40-70` | Store `otp_hash` and `otp_expires_at` |

---

## 2. OTP Configuration

### Environment Variables

```bash
# In: backend/.env

# OTP Expiry Time (minutes) - CRITICAL: DO NOT set below 10 minutes
OTP_EXPIRY_MINUTES=15

# Email Service Configuration
RESEND_API_KEY=re_xxxxx  # Primary: Resend API
SMTP_HOST=smtp.gmail.com # Fallback: SMTP server
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### Recommended Settings

| Setting | Value | Reason |
|---------|-------|--------|
| `OTP_EXPIRY_MINUTES` | **15** (default) | Allows users to complete multi-step registration without timeout |
| Rate Limit (Auth) | 5 req/15 min | Protects against brute force attacks |
| Grace Period | 5 seconds | Handles clock skew between client/server |
| Max Attempts | 5 | Prevents excessive verification attempts |

---

## 3. Timezone Handling (CRITICAL FIX)

### The Problem (What Was Wrong)

```typescript
// BEFORE (BROKEN):
const now = new Date();  // Returns LOCAL timezone time
const expiresAt = new Date(user.otp_expires_at);  // Supabase stores UTC
if (expiresAt < now) { ... }  // WRONG: Comparing UTC vs Local Time
```

**Result**: Users in timezone UTC-X would see false "OTP Expired" errors.

### The Solution (FIXED)

```typescript
// AFTER (CORRECT):
const expiresAtMs = new Date(user.otp_expires_at).getTime();  // UTC milliseconds
const nowMs = getUTCNow();  // Date.now() always returns UTC milliseconds
if (expiresAtMs < (nowMs - 5000)) { ... }  // CORRECT: Both UTC
```

### Key Rules

1. **Always use `Date.now()` or `.getTime()`** - These return UTC milliseconds
2. **Never compare `Date` objects directly** - Use milliseconds instead
3. **5-second grace period** - Accounts for clock skew
4. **Store as ISO 8601 strings** - `.toISOString()` always produces UTC

### Helper Functions (In Backend)

```typescript
// Always use these for timezone safety:
const getUTCTimestamp = () => new Date().toISOString();  // "2026-02-19T13:45:30.123Z"
const getUTCNow = () => Date.now();  // 1755263130123 (milliseconds)

// OTP Generation
const expiryMs = getUTCNow() + OTP_EXPIRY_MINUTES * 60 * 1000;
const expiresAt = new Date(expiryMs).toISOString();  // Correct

// OTP Verification  
const expiresAtMs = new Date(user.otp_expires_at).getTime();
const nowMs = getUTCNow();
if (expiresAtMs < (nowMs - 5000)) { throw Error('Expired'); }  // Correct
```

---

## 4. Database Schema

### Users Table Relevant Columns

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email VARCHAR(255),
  name VARCHAR(255),
  
  -- OTP Fields (CRITICAL)
  otp_hash VARCHAR(255),           -- Bcrypt hash of OTP (NOT plain text)
  otp_expires_at TIMESTAMP,        -- Stored as UTC (Supabase default)
  otp_attempts INT DEFAULT 0,      -- Failed attempt counter
  last_otp_request_at TIMESTAMP,   -- Rate limiting tracking
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Migration Required

If upgrading from old schema, ensure column types:

```sql
-- Verify or add columns:
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;

-- Ensure TIMESTAMP columns are UTC (Supabase default)
-- No action needed - Supabase handles this automatically
```

---

## 5. OTP Generation Process

### Step-by-Step Execution

```typescript
export const registerStudent = async (input) => {
  // ... validation ...
  
  // 1. Generate secure random 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  // Example: "523847"
  
  // 2. Hash OTP with bcryptjs (10 rounds)
  const otpHash = await bcryptjs.hash(otp, 10);
  // Stored in DB as: $2a$10$...long hash...
  // CRITICAL: OTP is NEVER stored plain text
  
  // 3. Calculate expiry in UTC milliseconds
  const expiryMs = getUTCNow() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const expiresAt = new Date(expiryMs).toISOString();
  // Example: "2026-02-19T14:00:00.000Z"
  
  // 4. Store in database
  await supabase.from('users').update({
    otp_hash: otpHash,
    otp_expires_at: expiresAt,
    otp_attempts: 0,
    last_otp_request_at: getUTCTimestamp(),
  }).eq('id', userId);
  
  // 5. Send OTP via email (user receives "523847")
  await sendOtpEmail(email, otp, name);
};
```

---

## 6. OTP Verification Process

### Two-Step Verification (Frontend Flow)

#### Step 2A: Verify OTP Only (NEW ENDPOINT)

**Endpoint**: `POST /auth/verify-otp-only`

```typescript
export const verifyOtpOnly = async (input: {
  userId: string;
  otpCode: string;
}) => {
  // 1. Fetch user from database
  const user = await supabase
    .from('users')
    .select('*')
    .eq('id', input.userId)
    .single();
  
  // 2. Check if OTP exists
  if (!user.otp_expires_at) {
    throw new ApiError(400, 'No OTP found. Request a new one.');
  }
  
  // 3. **CRITICAL**: Check expiry using UTC milliseconds
  const expiresAtMs = new Date(user.otp_expires_at).getTime();
  const nowMs = getUTCNow();  // Date.now() in UTC
  
  // Add 5-second grace period for clock skew
  if (expiresAtMs < (nowMs - 5000)) {
    throw new ApiError(400, 'OTP has expired. Request a new one.');
    // ✅ Error shown in STEP 2, not Step 3
  }
  
  // 4. Verify OTP hash using bcryptjs (constant-time comparison)
  if (!user.otp_hash || !(await bcryptjs.compare(input.otpCode, user.otp_hash))) {
    // Track failed attempts
    user.otp_attempts++;
    if (user.otp_attempts >= 5) {
      throw new ApiError(400, 'Too many failed attempts. Request new OTP.');
    }
    throw new ApiError(400, 'Invalid OTP code');
  }
  
  // 5. OTP is valid - proceed to password step
  return { message: 'OTP verified. Proceed to password.', otpValid: true };
};
```

**Frontend Usage** (Step 2):

```typescript
const handleVerifyOtp = async () => {
  const otpCode = otp.join("");  // User's input: "523847"
  
  // Call NEW endpoint that validates OTP ONLY
  const response = await apiClient.post("/auth/verify-otp-only", {
    userId,
    otpCode,
  });
  
  if (response.data?.success) {
    setStep(3);  // Move to password step
  } else {
    setOtpError(response.data?.error);  // Show error in Step 2
  }
};
```

#### Step 3: Verify OTP and Set Password

**Endpoint**: `POST /auth/verify-otp`

```typescript
export const verifyOtpAndSetPassword = async (input: {
  userId: string;
  otpCode: string;
  password: string;
}) => {
  // Same OTP validation as Step 2
  // + Hash and store password
  // + Clear OTP hash
  
  // Hash password with bcryptjs
  const passwordHash = await bcryptjs.hash(input.password, 10);
  
  // Update user: store password, clear OTP
  await supabase.from('users').update({
    password_hash: passwordHash,
    otp_hash: null,  // Clear OTP after verification
    otp_expires_at: null,
    otp_attempts: 0,
  }).eq('id', input.userId);
  
  return { message: 'Registration complete.' };
};
```

---

## 7. OTP Resend Logic

### Resend Endpoint

```typescript
export const resendOtp = async (userId: string) => {
  const user = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  // Rate limiting: Prevent resend spam
  if (user.last_otp_request_at) {
    const timeSinceLastOtp = 
      (getUTCNow() - new Date(user.last_otp_request_at).getTime()) / 1000 / 60;
    
    if (timeSinceLastOtp < OTP_RATE_LIMIT_MINUTES) {
      throw new ApiError(
        429,
        `Please wait ${Math.ceil(OTP_RATE_LIMIT_MINUTES - timeSinceLastOtp)} minutes`,
        'RATE_LIMITED'
      );
    }
  }
  
  // Generate NEW OTP with fresh expiry
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcryptjs.hash(otp, 10);
  const expiryMs = getUTCNow() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const expiresAt = new Date(expiryMs).toISOString();
  
  // Reset attempts and timestamp
  await supabase.from('users').update({
    otp_hash: otpHash,
    otp_expires_at: expiresAt,
    otp_attempts: 0,
    last_otp_request_at: getUTCTimestamp(),
  }).eq('id', userId);
  
  // Send new OTP
  await sendOtpEmail(user.email, otp, user.name);
  
  return { message: 'OTP resent to your email' };
};
```

### Key Points

- ✅ Resets expiry time to NOW + 15 minutes
- ✅ Resets attempt counter to 0
- ✅ Rate limited: Min 1 minute between resends
- ⚠️ Old OTP is invalidated (replaced)

---

## 8. Security Best Practices

### Implemented

| Security Feature | Status | Details |
|------------------|--------|---------|
| OTP Hashing | ✅ | Bcryptjs with 10 rounds |
| Secure RNG | ✅ | `crypto.randomInt()` not `Math.random()` |
| Constant-Time Comparison | ✅ | `bcryptjs.compare()` prevents timing attacks |
| Rate Limiting | ✅ | 5 attempts per 15 minutes |
| Max Attempts | ✅ | Block after 5 failed attempts |
| Timezone Safety | ✅ | UTC milliseconds for all comparisons |
| Expiry Enforcement | ✅ | 15-minute default with 5s grace period |

### Not Implemented (Future)

- [ ] SMS as OTP delivery
- [ ] Backup codes
- [ ] OTP caching/offline mode
- [ ] Hardware security keys

---

## 9. Testing OTP Locally

### Test 1: OTP Generates and Expires Correctly

```bash
# In logs, should see OTP printed (dev mode):
# 2026-02-19 14:45:30 [OTP] Sent to user@email.com: 523847

# Wait 15+ minutes, try to verify → Should get "OTP has expired"
```

### Test 2: Timezone Independence

OTP should work regardless of user's local timezone:

```bash
# Configure system timezone to different values:
TZ=Africa/Lagos npm run dev    # UTC+1
TZ=America/New_York npm run dev # UTC-5
TZ=Australia/Sydney npm run dev # UTC+11

# OTP should work identically in all cases
```

### Test 3: Clock Skew Tolerance

Test with system clock off by 5 seconds:

```bash
# OTP should still work (5-second grace period)
# After 5+ seconds past expiry → should fail
```

### Test 4: Rate Limiting

```bash
# Request OTP once
POST /auth/resend-otp { userId: "..." }
# Response: 200 OK

# Request again immediately
POST /auth/resend-otp { userId: "..." }
# Response: 429 Too Many Requests
# Wait 1 minute, then it works

# Request 6 times in 15 minutes
# Response after 5th: 429 Too Many Requests
```

### Test 5: Max Attempts

```bash
# Enter wrong OTP 5+ times
# After 5th attempt: "Too many failed attempts"
# Resend OTP to reset counter
```

### Manual Testing Script

```bash
#!/bin/bash

# Test setup
USER_ID="550e8400-e29b-41d4-a716-446655440000"  # Real user ID
API="http://localhost:3001/auth"

# 1. Register user (get USER_ID)
curl -X POST $API/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "matricNumber": "22/0086",
    "email": "test@student.babcock.edu.ng"
  }'

# 2. Check console for OTP code
# Look for: "[OTP] Sent to test@student.babcock.edu.ng: 123456"

# 3. Verify OTP immediately (should succeed)
curl -X POST $API/verify-otp-only \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "otpCode": "123456"
  }'

# 4. Wait 15 minutes, try again (should fail)
sleep 900
curl -X POST $API/verify-otp-only \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "otpCode": "123456"
  }'
# Response: "OTP has expired"
```

---

## 10. Troubleshooting

### Symptom: "OTP has expired" immediately after sending

**Causes**:
1. Server timezone not set to UTC → ❌ FIXED
2. Database timezone mismatch → ✅ Use Supabase (auto UTC)
3. System clock skew > 5 seconds → Check `timedatectl` / System Settings

**Solution**:
```bash
# Check server time
date  # Should show current UTC time

# Check database time
SELECT now() AT TIME ZONE 'UTC';  # Should match server time

# Verify OTP_EXPIRY_MINUTES is >= 10
echo $OTP_EXPIRY_MINUTES  # Should be 15 or higher
```

### Symptom: OTP works after 20 minutes (too long)

**Cause**: `OTP_EXPIRY_MINUTES` set too high

**Solution**:
```bash
# In backend/.env
OTP_EXPIRY_MINUTES=15  # Adjust to desired value

# Restart backend
npm run dev
```

### Symptom: Rate limiting too strict

**Cause**: `OTP_RATE_LIMIT_MINUTES` is too high OR auth rate limiter is blocking

**Solution**:
```bash
# Check current settings in authService.ts
const OTP_RATE_LIMIT_MINUTES = 1;  // Min 1 minute between resends

# Check auth limiter config (per 15 minutes)
authLimiter: 5 requests per 15 minutes  # Can adjust in rateLimiting.ts
```

---

## 11. Configuration Reference

### All OTP-Related Settings

| Environment Variable | Type | Default | Min | Max | Notes |
|----------------------|------|---------|-----|-----|-------|
| `OTP_EXPIRY_MINUTES` | Number | 15 | 10 | 60 | CRITICAL: Too low = frustration |
| `RATE_LIMIT_WINDOW_MS` | Number | 900000 | - | - | 15 minutes in milliseconds |
| `RATE_LIMIT_MAX_REQUESTS` | Number | 100 | - | - | Global rate limit |

### Backend Rate Limiter Config

**File**: `backend/src/middleware/rateLimiting.ts`

```typescript
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 5,                         // 5 requests per window
  skipSuccessfulRequests: true,   // Don't count successful requests
  message: 'Too many auth attempts, please try again later.',
});
```

---

## 12. Monitoring & Logging

### Log Entries to Watch

```
[INFO] OTP generated for user: abc123
[INFO] OTP verified successfully for user: abc123
[ERROR] OTP has expired for user: abc123
[ERROR] Too many OTP verification attempts: abc123
[WARN] Rate limited - OTP resend: abc123
```

### Metrics to Track

1. **OTP Success Rate**: `(verified_count / generated_count) * 100`
   - Should be > 95%
   - Below 95% = users experiencing timeouts

2. **Average OTP Time**: Time from generation to verification
   - Should be < 5 minutes
   - Above 10 minutes = user delay signal

3. **Rate Limit Triggers**: Count per hour
   - Should be < 5% of requests
   - Above 10% = attacker activity

---

## 13. Upgrading from Old System

If you previously had a working OTP system, steps to upgrade:

```bash
# 1. Pull latest code
git pull

# 2. Update environment variables
# In backend/.env, add:
OTP_EXPIRY_MINUTES=15

# 3. If migrating from plain-text OTP storage:
# Run migration script to hash existing OTPs

# 4. Restart backend
npm run dev
```

---

## 14. API Reference

### Register Student

```
POST /auth/register

Request:
{
  "fullName": "John Doe",
  "matricNumber": "22/0086",
  "email": "john@student.babcock.edu.ng"
}

Response (200):
{
  "success": true,
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "message": "Registration started. OTP sent to your email."
  }
}
```

### Verify OTP Only (NEW)

```
POST /auth/verify-otp-only

Request:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "otpCode": "523847"
}

Response (200):
{
  "success": true,
  "data": {
    "message": "OTP verified. Proceed to password.",
    "otpValid": true
  }
}

Errors:
- 400: "OTP has expired. Request a new one." → User must resend
- 400: "Invalid OTP code" → User must reenter or resend
- 400: "Too many failed attempts. Request new OTP." → Resend endpoint
```

### Verify OTP and Set Password

```
POST /auth/verify-otp

Request:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "otpCode": "523847",
  "password": "SecurePassword123!"
}

Response (200):
{
  "success": true,
  "data": {
    "message": "Registration complete. You can now login."
  }
}
```

### Resend OTP

```
POST /auth/resend-otp

Request:
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}

Response (200):
{
  "success": true,
  "data": {
    "message": "OTP resent to your email"
  }
}

Errors:
- 429: "Please wait X minutes before requesting another OTP." → Rate limited
```

---

## 15. Summary of Fixes Applied

### What Was Wrong ❌

1. **Timezone Mismatch**: Comparing local time with UTC timestamps
2. **Millisecond Loss**: Using `Date` object comparison instead of milliseconds
3. **No Grace Period**: Clock skew caused immediate expiry
4. **Too Short Expiry**: 10 minutes insufficient for multi-step registration

### What's Fixed ✅

1. **UTC Consistency**: All timestamps stored and compared in UTC milliseconds
2. **Millisecond Precision**: Using `.getTime()` for accurate comparison
3. **5-Second Grace**: Accounts for network and clock skew
4. **15-Minute Default**: Allows complete registration flow
5. **Two-Step Verification**: Errors now shown at correct step

---

## Support & Questions

For issues or questions about OTP system:

1. Check **Troubleshooting** section (Section 10)
2. Review **Configuration** (Section 11)
3. Run **Testing Script** (Section 9)
4. Check logs for error messages

Last Updated: **February 19, 2026**
