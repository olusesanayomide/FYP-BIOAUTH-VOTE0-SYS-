# Biometric Voting System

Secure student voting with WebAuthn biometric verification, institutional validation, and double voting prevention.

## 📋 Quick Links

**NEW TO THIS PROJECT?** Start here:
1. **[MANUAL_SETUP.md](MANUAL_SETUP.md)** ⭐ - Step-by-step setup guide (5 min read)
2. **[SETUP_REQUIREMENTS.md](SETUP_REQUIREMENTS.md)** - Complete requirements & configuration
3. **[FILES_SUMMARY.md](FILES_SUMMARY.md)** - What files were created and what needs updates
4. **[API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)** - Test all API endpoints with curl

**WANT DETAILS?**
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Comprehensive setup with architecture diagrams
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Production deployment guide
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference and troubleshooting

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free at https://supabase.com)
- Docker (optional, for MailHog email testing)

### Setup in 3 Steps

**1. Complete manual setup (follow [MANUAL_SETUP.md](MANUAL_SETUP.md))**
   - Create Supabase project
   - Run database schema
   - Configure email service
   - Generate encryption & JWT keys
   - Fill .env files

**2. Start backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Should see: ✅ Server running on http://localhost:3001

**3. Start frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   Should see: ✅ Ready at http://localhost:3000

## ✨ Features

✅ **Student Registration**
- Institutional database verification (school_students table)
- Email validation (@student.babcock.edu.ng)
- OTP email verification
- Password setup

✅ **Biometric Security**
- WebAuthn registration & authentication
- Encrypted credential storage
- Challenge-response protocol
- Replay attack prevention

✅ **Voting**
- Election management
- Biometric-verified voting
- Double voting prevention (DB + service level)
- Vote tracking and results

✅ **Security**
- 256-bit AES encryption
- bcryptjs password hashing
- JWT authentication
- CORS protection
- Rate limiting
- Audit logging

## 🏗️ Architecture

```
Frontend (React/Next.js - Port 3000)
    ↓ HTTP/REST ↑
Backend (Express/TypeScript - Port 3001)
    ↓ SQL ↑
Database (Supabase PostgreSQL)
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── services/
│   │   ├── api.ts - HTTP client with JWT injection
│   │   ├── authService.ts - Registration, OTP, login, biometric
│   │   └── votingService.ts - Elections, voting, results
│   ├── context/
│   │   └── AuthContext.tsx - User auth state management
│   ├── app/
│   │   ├── page.tsx - Landing page
│   │   ├── layout.tsx - Root layout with providers
│   │   ├── register/ - Registration page
│   │   └── login/ - Login page
│   └── pages/
│       ├── Register.tsx - Backend-integrated register
│       └── Login.tsx - Backend-integrated login
├── .env.local - Frontend config (API URL)
└── MANUAL_SETUP.md - Setup instructions

backend/
├── src/
│   ├── index.ts - Express server
│   ├── config/supabase.ts - Database client
│   ├── middleware/
│   │   ├── auth.ts - JWT verification
│   │   └── errorHandler.ts - Error handling
│   ├── routes/
│   │   ├── auth.ts - Auth endpoints (8)
│   │   ├── voting.ts - Voting endpoints (6)
│   │   └── admin.ts - Admin endpoints (6)
│   ├── services/ - Business logic
│   └── utils/
│       ├── encryption.ts - AES-256
│       ├── email.ts - OTP sending
│       └── jwt.ts - Token generation
├── scripts/
│   └── schema.sql - Database initialization
├── .env - Backend config (Supabase, email, keys)
├── package.json - Dependencies
└── README.md - Backend documentation
```

## 🔐 Security Features

- **Double Voting Prevention**: UNIQUE DB constraints + service validation
- **Biometric Security**: W3C WebAuthn standard with counter validation
- **Password Security**: bcryptjs with salt, minimum 8 chars
- **OTP Security**: 6-digit code, 10-min expiration, rate limited
- **Encryption**: AES-256-CBC with random IV
- **API Security**: CORS, Helmet headers, rate limiting
- **Audit Logging**: All actions tracked with timestamp & user

## 📊 Database Schema

9 tables in Supabase PostgreSQL:
- `school_students` - Institutional records
- `users` - User accounts with matric_no FK
- `authenticators` - Encrypted WebAuthn credentials
- `elections` - Voting events
- `positions` - Election positions
- `candidates` - Position candidates
- `votes` - Cast votes (UNIQUE constraint)
- `voter_records` - Participation tracking (UNIQUE constraint)
- `audit_logs` - Security audit trail

## 📡 API Endpoints

**Authentication (8 endpoints)**
- POST /auth/register - Register student
- POST /auth/resend-otp - Resend OTP
- POST /auth/verify-otp - Verify OTP & set password
- POST /auth/login - Login with JWT
- GET /auth/webauthn/registration-options - Biometric registration challenge
- POST /auth/webauthn/verify-registration - Store biometric
- GET /auth/webauthn/authentication-options - Biometric voting challenge
- POST /auth/webauthn/verify-authentication - Verify biometric for voting

**Voting (6 endpoints)**
- GET /voting/elections - Get elections
- GET /voting/elections/:id - Get election details
- POST /voting/eligibility - Check if eligible
- POST /voting/submit - Submit vote with biometric
- GET /voting/results/:id - Get results
- GET /voting/history - Get user's voting history

**Admin (6 endpoints)**
- GET /admin/audit-logs - View audit trail
- GET /admin/users - List users
- POST /admin/elections - Create election
- PUT /admin/elections/:id - Update election
- DELETE /admin/elections/:id - Delete election
- GET /admin/dashboard - Dashboard stats

## 🧪 Testing

See [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) for:
- curl examples for all endpoints
- Request/response samples
- Error handling examples
- Testing scripts

## ⚙️ Configuration Files

### Backend: backend/.env
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
JWT_SECRET=xxx
ENCRYPTION_KEY=xxx
SMTP_HOST=localhost
# ... 10+ more variables
```

### Frontend: frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Biometric Voting System
NEXT_PUBLIC_UNIVERSITY_NAME=Babcock University
```

## 🚢 Deployment

See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for production deployment:
- Security audit checklist
- Nginx reverse proxy setup
- SSL certificate configuration
- Monitoring & logging setup
- Incident response procedures

## 🐛 Troubleshooting

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for quick fixes:
- Backend won't start
- OTP not received
- CORS errors
- Connection issues
- Password reset

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [MANUAL_SETUP.md](MANUAL_SETUP.md) | 7-step setup guide (START HERE) |
| [SETUP_REQUIREMENTS.md](SETUP_REQUIREMENTS.md) | Detailed requirements & config |
| [FILES_SUMMARY.md](FILES_SUMMARY.md) | Files created & status |
| [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md) | API testing with curl |
| [SETUP_GUIDE.md](SETUP_GUIDE.md) | Comprehensive setup guide |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Production deployment |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | Quick lookup & troubleshooting |

## 🎯 Next Steps

1. **First time?** → Read [MANUAL_SETUP.md](MANUAL_SETUP.md)
2. **Need details?** → Read [SETUP_REQUIREMENTS.md](SETUP_REQUIREMENTS.md)
3. **Want to test?** → Read [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)
4. **Ready for production?** → Read [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

## 📝 Default Test Data

After running schema.sql, available student accounts:

| Matric Number | Email | Password |
|---------------|-------|----------|
| U2023/123456 | john.doe@student.babcock.edu.ng | (set during registration) |
| U2023/123457 | jane.smith@student.babcock.edu.ng | (set during registration) |

## 💡 Key Features

- **Institutional Integration**: Validates against school_students table
- **OTP Verification**: Email-based one-time password
- **Biometric Binding**: WebAuthn for identity verification
- **Double Voting Prevention**: Multiple layers of protection
- **Audit Trail**: Complete logging of all actions
- **Encrypted Storage**: Sensitive data encrypted at rest
- **Rate Limiting**: Protection against abuse
- **Error Recovery**: Graceful error handling
- **Mobile Ready**: Responsive design
- **Accessible**: WCAG compliant

## ✅ Status

**Backend**: ✅ Complete and tested
**Frontend (Registration)**: ✅ Complete and tested
**Frontend (Other Pages)**: ⚠️ Need backend integration
**Database**: ✅ Schema ready
**Documentation**: ✅ Comprehensive

## 📄 License

Private project for Babcock University

## 🙋 Support

**Setup Issues?** → See [MANUAL_SETUP.md](MANUAL_SETUP.md)
**API Issues?** → See [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)
**Code Issues?** → Check backend logs and browser console

- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
