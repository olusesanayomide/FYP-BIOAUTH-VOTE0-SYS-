# Biometric Voting System - Backend

A secure, production-ready backend for a biometric voting system built with Node.js, Express, TypeScript, and Supabase.

## Features

✅ **Student Registration & Verification**
- Institutional email domain validation (@student.babcock.edu.ng)
- Verify students against school_students table
- OTP-based email verification
- Rate-limited OTP resend

✅ **Secure Authentication**
- Matric number + password login
- JWT token generation and validation
- Audit logging for all authentication events

✅ **WebAuthn/Biometric Voting**
- Biometric credential enrollment during registration
- Encrypted storage of WebAuthn credentials (AES-256-CBC)
- Biometric verification for vote submission
- Replay attack prevention with counter validation

✅ **Voting System**
- Double voting prevention (per election & per position)
- Election eligibility verification
- Vote submission with WebAuthn verification proof
- Voting history tracking
- Real-time voting results

✅ **Admin Management**
- Election creation and management
- User management
- Audit log viewing
- Dashboard statistics

✅ **Security**
- Rate limiting (OTP spam prevention)
- CORS protection
- Helmet.js security headers
- Encrypted sensitive data
- Comprehensive audit logging

## Project Structure

```
backend/
├── src/
│   ├── index.ts                 # Main server file
│   ├── config/
│   │   └── supabase.ts          # Supabase client configuration
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication middleware
│   │   └── errorHandler.ts      # Global error handler
│   ├── routes/
│   │   ├── auth.ts              # Authentication endpoints
│   │   ├── voting.ts            # Voting endpoints
│   │   └── admin.ts             # Admin endpoints
│   ├── services/
│   │   ├── authService.ts       # Authentication business logic
│   │   ├── votingService.ts     # Voting business logic
│   │   └── adminService.ts      # Admin business logic
│   └── utils/
│       ├── encryption.ts        # Data encryption/decryption
│       ├── email.ts             # Email sending (OTP)
│       └── jwt.ts               # JWT token generation
├── scripts/
│   └── schema.sql              # Database schema initialization
├── .env.example                # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

### 1. Clone/Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
# Backend Server Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=7d

# Email/OTP Configuration
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@securevote.edu

# WebAuthn Configuration
RP_ID=localhost
RP_NAME=Biometric Voting System
ORIGIN=http://localhost:3000

# Encryption Configuration
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-32-byte-hex-key-here

# CORS
CORS_ORIGIN=http://localhost:3000
```

### 4. Initialize Database

1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor in Supabase Dashboard
3. Copy and run the contents of `scripts/schema.sql`

### 5. Generate Encryption Key

```bash
openssl rand -hex 32
```

Copy the output and add to `.env` as `ENCRYPTION_KEY`.

## Running the Server

### Development Mode (with hot reload)

```bash
npm run dev
```

The server will start on `http://localhost:3001`

### Production Build

```bash
npm run build
npm start
```

### Check Server Health

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## API Endpoints

### Authentication Endpoints

#### 1. Register Student

```http
POST /auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "matricNumber": "U2023/123456",
  "email": "john.doe@student.babcock.edu.ng"
}
```

Response (201):
```json
{
  "message": "Registration started. OTP sent to your email.",
  "userId": "abc123",
  "requiresOtp": true
}
```

#### 2. Resend OTP

```http
POST /auth/resend-otp
Content-Type: application/json

{
  "userId": "abc123"
}
```

Response (200):
```json
{
  "message": "OTP resent to your email"
}
```

#### 3. Verify OTP & Set Password

```http
POST /auth/verify-otp
Content-Type: application/json

{
  "userId": "abc123",
  "otpCode": "123456",
  "password": "SecurePassword123!"
}
```

Response (200):
```json
{
  "message": "Registration complete. You can now login."
}
```

#### 4. Login

```http
POST /auth/login
Content-Type: application/json

{
  "matricNumber": "U2023/123456",
  "password": "SecurePassword123!"
}
```

Response (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "abc123",
    "email": "john.doe@student.babcock.edu.ng",
    "matricNumber": "U2023/123456",
    "name": "John Doe",
    "webauthnRegistered": false
  }
}
```

#### 5. Get WebAuthn Registration Options

```http
GET /auth/webauthn/registration-options
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200):
```json
{
  "challenge": "...",
  "rp": { "name": "Biometric Voting System", "id": "localhost" },
  "user": { "id": "...", "name": "john.doe@student.babcock.edu.ng", "displayName": "John Doe" },
  "pubKeyCredParams": [{ "alg": -7, "type": "public-key" }],
  ...
}
```

#### 6. Verify WebAuthn Registration

```http
POST /auth/webauthn/verify-registration
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "response": {
    "id": "...",
    "rawId": "...",
    "response": {
      "clientDataJSON": "...",
      "attestationObject": "...",
      "transports": ["internal"]
    },
    "type": "public-key"
  }
}
```

Response (200):
```json
{
  "message": "Biometric registration successful. You can now vote securely."
}
```

#### 7. Get WebAuthn Authentication Options (for Voting)

```http
GET /auth/webauthn/authentication-options
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200):
```json
{
  "challenge": "...",
  "allowCredentials": [...],
  "userVerification": "preferred",
  "rpId": "localhost"
}
```

#### 8. Verify WebAuthn Authentication (for Voting)

```http
POST /auth/webauthn/verify-authentication
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "response": {
    "id": "...",
    "rawId": "...",
    "response": {
      "clientDataJSON": "...",
      "authenticatorData": "...",
      "signature": "..."
    },
    "type": "public-key"
  }
}
```

Response (200):
```json
{
  "verified": true,
  "message": "Biometric verification successful. Proceed to vote."
}
```

### Voting Endpoints

#### 1. Get Elections

```http
GET /voting/elections
```

Response (200):
```json
[
  {
    "id": "election123",
    "title": "Students' Union President 2024",
    "status": "ONGOING",
    "positions": [...]
  }
]
```

#### 2. Get Election Details

```http
GET /voting/elections/{electionId}
```

#### 3. Check Voting Eligibility

```http
POST /voting/eligibility
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "electionId": "election123"
}
```

Response (200):
```json
{
  "eligible": true,
  "electionTitle": "Students' Union President 2024",
  "userType": "STUDENT"
}
```

#### 4. Submit Vote (Requires WebAuthn Verification)

```http
POST /voting/submit
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "electionId": "election123",
  "positionId": "position123",
  "candidateId": "candidate123"
}
```

Response (201):
```json
{
  "message": "Vote recorded successfully",
  "voteId": "vote123",
  "position": "President",
  "candidate": "John Smith",
  "timestamp": "2024-01-15T09:45:00Z"
}
```

#### 5. Get Voting Results

```http
GET /voting/results/{electionId}
```

Response (200):
```json
{
  "electionTitle": "Students' Union President 2024",
  "totalVotes": 245,
  "results": [
    {
      "positionId": "pos123",
      "positionName": "President",
      "candidates": [
        { "candidateId": "cand123", "candidateName": "John Smith", "voteCount": 145 }
      ]
    }
  ]
}
```

#### 6. Get User's Voting History

```http
GET /voting/history
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response (200):
```json
{
  "votes": [
    {
      "voteId": "vote123",
      "election": { "id": "election123", "title": "..." },
      "position": { "id": "pos123", "name": "President" },
      "candidate": { "id": "cand123", "name": "John Smith" },
      "votedAt": "2024-01-15T09:45:00Z",
      "webauthnVerified": true
    }
  ]
}
```

### Admin Endpoints

#### 1. Get Audit Logs

```http
GET /admin/audit-logs?limit=100&offset=0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2. Get All Users

```http
GET /admin/users?limit=100&offset=0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Create Election

```http
POST /admin/elections
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "title": "Students' Union President 2024",
  "description": "Vote for your preferred candidate",
  "eligibleTypes": ["STUDENT"],
  "startTime": "2024-01-15T09:00:00Z",
  "endTime": "2024-01-15T17:00:00Z"
}
```

#### 4. Get Dashboard Statistics

```http
GET /admin/dashboard
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

Common error codes:
- `INVALID_EMAIL_DOMAIN` - Email doesn't end with @student.babcock.edu.ng
- `STUDENT_NOT_FOUND` - Matric number not in institutional records
- `USER_EXISTS` - User already registered
- `INVALID_OTP` - OTP code mismatch
- `OTP_EXPIRED` - OTP time limit exceeded
- `RATE_LIMITED` - Too many requests (try again later)
- `ALREADY_VOTED` - User already voted in this election
- `DOUBLE_VOTE_DETECTED` - Double voting attempt detected
- `NOT_AUTHENTICATED` - Missing or invalid JWT token

## Security Best Practices

1. **Encryption Key Generation**
   ```bash
   openssl rand -hex 32
   ```

2. **Rate Limiting**
   - OTP requests: 1 per minute per user
   - General API: 100 requests per 15 minutes

3. **WebAuthn Security**
   - Counter validation prevents replay attacks
   - Encrypted public key storage
   - Challenge-response mechanism

4. **Double Voting Prevention**
   - Unique constraint on (voter_id, election_id, position_id)
   - Separate voter_records tracking

5. **Audit Logging**
   - All authentication events logged
   - All votes logged with WebAuthn verification proof
   - IP address and user agent tracking

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| PORT | Server port | No | 3001 |
| NODE_ENV | Environment | No | development |
| SUPABASE_URL | Supabase project URL | Yes | https://xxx.supabase.co |
| SUPABASE_SERVICE_ROLE_KEY | Service role key | Yes | eyJhbGc... |
| JWT_SECRET | Secret for JWT signing | Yes | your-secret-key |
| ENCRYPTION_KEY | 32-byte hex encryption key | Yes | a1b2c3... |
| SMTP_HOST | Email server host | No | localhost |
| SMTP_PORT | Email server port | No | 1025 |
| RP_ID | WebAuthn RP ID | No | localhost |
| CORS_ORIGIN | Frontend origin | No | http://localhost:3000 |

## Development Tips

### Testing with Postman

1. Import `API_COLLECTION.postman_json` (to be created)
2. Set `{{base_url}}` to `http://localhost:3001`
3. Use environment variables for tokens

### Debugging

Enable more verbose logging:
```bash
DEBUG=* npm run dev
```

### Database Inspection

Use Supabase Dashboard SQL Editor to inspect tables and data.

## Troubleshooting

### "Missing Supabase environment variables"
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

### "ENCRYPTION_KEY must be a 32-byte hex string"
- Generate new key: `openssl rand -hex 32`

### "OTP not received"
- Check SMTP configuration
- Verify email address format

### "Biometric verification failed"
- Ensure RP_ID matches configuration
- Check ORIGIN matches frontend URL

## License

MIT
