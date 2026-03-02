# Quick Reference Card

## Common Commands

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Generate Encryption Key
```bash
openssl rand -hex 32
```

### Database Connection
1. Go to Supabase dashboard
2. Copy project URL and API keys
3. Paste into backend/.env

---

## Environment Variables

### Backend (.env)
```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=a1b2c3d4...
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-username
SMTP_PASSWORD=your-password
RP_ID=localhost
ORIGIN=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

---

## API Quick Test

### Register
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "matricNumber": "U2023/123456",
    "email": "john.doe@student.babcock.edu.ng"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "matricNumber": "U2023/123456",
    "password": "Password123!"
  }'
```

### Get Elections
```bash
curl -X GET http://localhost:3001/voting/elections \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Health Check
```bash
curl http://localhost:3001/health
```

---

## Default Test Data

| Field | Value |
|-------|-------|
| Matric Number | U2023/123456 |
| Email | john.doe@student.babcock.edu.ng |
| Full Name | John Doe |

---

## Key URLs

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://localhost:3000 | 3000 |
| Backend | http://localhost:3001 | 3001 |
| MailHog | http://localhost:8025 | 8025 |
| Supabase | https://app.supabase.com | - |

---

## Database Tables

1. **school_students** - Student records
2. **users** - User accounts
3. **authenticators** - WebAuthn credentials
4. **elections** - Voting events
5. **positions** - Positions in elections
6. **candidates** - Candidates
7. **votes** - Cast votes
8. **voter_records** - Voting history
9. **audit_logs** - Audit trail
10. **admin** - Administrators

---

## Key Features

✅ Student registration  
✅ OTP verification  
✅ Password login  
✅ WebAuthn biometric  
✅ Secure voting  
✅ Double voting prevention  
✅ Election management  
✅ Audit logging  
✅ Admin dashboard  

---

## Security

- 🔒 AES-256 encryption
- 🔒 bcryptjs password hashing
- 🔒 JWT tokens (7-day expiry)
- 🔒 Rate limiting
- 🔒 HTTPS/SSL
- 🔒 CORS protection
- 🔒 SQL injection prevention
- 🔒 CSRF protection

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| OTP Send/Resend | 1 | Per minute |
| Login | 5 | Per 15 mins |
| General API | 100 | Per 15 mins |

---

## Helpful Files

| File | Purpose |
|------|---------|
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Complete setup |
| [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) | API testing |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Production |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Overview |

---

## Troubleshooting

**OTP not received?**  
→ Check MailHog at http://localhost:8025

**WebAuthn fails?**  
→ Use Chrome/Edge, check RP_ID

**Connection error?**  
→ Verify .env credentials

**CORS error?**  
→ Check CORS_ORIGIN in .env

---

## Architecture

```
Frontend (React/Next.js)
        ↓ HTTP/REST
Backend (Express/TypeScript)
        ↓ SQL/Raw Queries
Database (Supabase PostgreSQL)
```

---

## Endpoints Summary

| Category | Count | Auth? |
|----------|-------|-------|
| Auth | 8 | Mixed |
| Voting | 6 | Required |
| Admin | 6 | Admin Only |
| System | 2 | Optional |
| **Total** | **22** | - |

---

## Getting Started (5 Steps)

1. **Setup Supabase**
   - Create account at supabase.com
   - Create project
   - Copy credentials

2. **Setup Backend**
   - `cd backend && npm install`
   - Copy .env.example to .env
   - Paste Supabase credentials
   - Run `npm run dev`

3. **Setup Frontend**
   - `cd frontend && npm install`
   - Run `npm run dev`

4. **Initialize Database**
   - Run schema.sql in Supabase

5. **Test Flow**
   - Register student
   - Verify OTP
   - Login
   - Enroll biometric
   - Vote

---

**Quick Start Time**: ~15 minutes  
**Production Setup Time**: ~2 hours  
**Full Testing**: ~1 day  

