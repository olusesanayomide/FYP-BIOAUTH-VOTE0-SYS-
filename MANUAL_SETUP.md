# ⭐ MANUAL SETUP - REQUIRED BEFORE RUNNING

## CRITICAL: DO THESE FIRST

### Step 1: Supabase Database ⭐⭐⭐ MOST IMPORTANT

**What to do:**
1. Go to https://supabase.com
2. Click "Sign Up"
3. Sign up with email
4. Create new project:
   - Project name: `biometric-voting`
   - Password: Create strong password
   - Region: Select closest to you
   - Click "Create"
5. Wait 2-5 minutes for initialization
6. Go to Project Settings (gear icon) → API
7. Copy these three values to notepad:
   ```
   Project URL (SUPABASE_URL):
   ____________________________________
   
   Anon Key (SUPABASE_ANON_KEY):
   ____________________________________
   
   Service Role Key (SUPABASE_SERVICE_ROLE_KEY):
   ____________________________________
   ```

**Where to paste:**
- Open: `backend/.env`
- Paste above values in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

---

### Step 2: Database Schema ⭐⭐⭐ CRITICAL

**What to do:**
1. In Supabase Dashboard, find "SQL Editor" on left menu
2. Click "New Query"
3. Copy ALL content from: `backend/scripts/schema.sql`
4. Paste into SQL Editor
5. Click "Run"
6. Wait for "Success" message

**What was created:**
- 9 database tables
- Indexes for performance
- Sample test data:
  - Student: U2023/123456 / john.doe@student.babcock.edu.ng
  - Student: U2023/123457 / jane.smith@student.babcock.edu.ng

---

### Step 3: Email Service ⭐⭐⭐ FOR OTP

**Choose ONE:**

#### Option A: MailHog (Development - Easiest)
```bash
# Install Docker from https://docker.com
# Then run:
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Add to backend/.env:
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
```

#### Option B: Resend (Production - Recommended)
1. Go to https://resend.com
2. Sign up
3. Go to API Keys
4. Copy your API key

```env
SMTP_HOST=smtp.resend.co
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=sk-re_xxxxxxxxxxx
```

#### Option C: Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

---

### Step 4: Generate Encryption Key ⭐⭐⭐ FOR SECURITY

**Run this command in terminal:**

**macOS/Linux:**
```bash
openssl rand -hex 32
```

**Windows PowerShell:**
```powershell
[System.Convert]::ToHexString((1..32|ForEach-Object{Get-Random -Maximum 256}))
```

**You'll get output like:**
```
a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2
```

**Add to backend/.env as:**
```env
ENCRYPTION_KEY=a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2
```

---

### Step 5: Generate JWT Secret ⭐⭐⭐ FOR AUTHENTICATION

**Run this command in terminal:**

**macOS/Linux:**
```bash
openssl rand -base64 32
```

**Windows PowerShell:**
```powershell
[System.Convert]::ToBase64String((1..32|ForEach-Object{Get-Random -Maximum 256}))
```

**You'll get output like:**
```
rZ9k7mN2pQ8xL3jW6yV1uT4sP9qA2bC5dE8fG1hJ4kL7mN0oP3qR6sT9uV2wX5
```

**Add to backend/.env as:**
```env
JWT_SECRET=rZ9k7mN2pQ8xL3jW6yV1uT4sP9qA2bC5dE8fG1hJ4kL7mN0oP3qR6sT9uV2wX5
```

---

### Step 6: Fill backend/.env File ⭐⭐⭐ COMPLETE CONFIGURATION

**Open:** `backend/.env`

**Fill in ALL these values:**

```env
# ===== SERVER =====
PORT=3001
NODE_ENV=development

# ===== SUPABASE (from Step 1) =====
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# ===== SECURITY (from Steps 4 & 5) =====
JWT_SECRET=rZ9k7mN2pQ8xL3jW6yV1uT4sP9qA2bC5dE8fG1hJ4kL7mN0oP3qR6sT9uV2wX5
JWT_EXPIRATION=7d
ENCRYPTION_KEY=a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2c3d4e5f6789a1b2

# ===== EMAIL (from Step 3 - choose one) =====
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
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

---

### Step 7: Verify Frontend .env.local ⭐ IMPORTANT

**File:** `frontend/.env.local`

Should look like:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Biometric Voting System
NEXT_PUBLIC_UNIVERSITY_NAME=Babcock University
```

✅ This file is already created, just verify the API URL

---

## NOW YOU'RE READY TO RUN!

### Terminal 1: Email Service (if using MailHog)
```bash
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

### Terminal 2: Backend
```bash
cd backend
npm install
npm run dev
```

You should see:
```
✅ Server running on http://localhost:3001
✅ API Documentation: http://localhost:3001/api
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
✅ Ready in XXXms
✅ http://localhost:3000
```

---

## TEST IT

### Register
1. Go to http://localhost:3000/register
2. Fill:
   - Full Name: John Doe
   - Matric: U2023/123456
   - Email: john.doe@student.babcock.edu.ng
3. Click Continue
4. Check MailHog (http://localhost:8025) for OTP
5. Enter OTP code
6. Create password
7. Enroll biometric (click "Grant Permission")
8. Done!

### Login
1. Go to http://localhost:3000/login
2. Matric: U2023/123456
3. Password: (what you set)
4. Login successful

---

## COMMON MISTAKES TO AVOID

❌ **WRONG:** Using `@` symbol in Supabase key
✅ **RIGHT:** Copy the ENTIRE key including "eyJhbGc..." part

❌ **WRONG:** Forgetting to run schema.sql
✅ **RIGHT:** Run SQL script before registering

❌ **WRONG:** Using http://localhost when frontend is at localhost
✅ **RIGHT:** Update CORS_ORIGIN to match

❌ **WRONG:** Leaving .env fields empty
✅ **RIGHT:** Fill ALL required fields

❌ **WRONG:** Starting frontend before backend
✅ **RIGHT:** Start backend FIRST, then frontend

---

## WHAT EACH SETUP DOES

| Setup | Purpose | If Missing |
|-------|---------|-----------|
| Supabase | Database storage | "Cannot connect to database" |
| Schema.sql | Create tables | "Table does not exist" |
| Email Service | Send OTP | "Email not received" |
| Encryption Key | Security | "Cannot decrypt credentials" |
| JWT Secret | Authentication | "Invalid token" |
| .env files | Configuration | "Environment variable not found" |

---

## VERIFICATION CHECKLIST

After all steps:

- [ ] Supabase project created
- [ ] Schema.sql executed successfully
- [ ] Email service running (docker or configured)
- [ ] Encryption key generated and in .env
- [ ] JWT secret generated and in .env
- [ ] backend/.env file completely filled
- [ ] frontend/.env.local has correct API URL
- [ ] npm install completed in backend
- [ ] npm install completed in frontend
- [ ] No "undefined" or "missing" in .env files

---

## IF SOMETHING GOES WRONG

### Backend won't start
```bash
# Check .env is complete
cat backend/.env | grep "SUPABASE_URL"  # Should show value, not empty

# Check Supabase credentials are correct
# Try connecting manually at https://app.supabase.com

# Check port 3001 isn't in use
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows
```

### OTP not received
```
# Check MailHog: http://localhost:8025
# Should show incoming email with OTP code

# Or check backend console for:
# "[EMAIL]" logs with OTP value
```

### Frontend can't connect to backend
```
# Verify backend is running:
curl http://localhost:3001/health

# Check frontend .env.local:
cat frontend/.env.local | grep "NEXT_PUBLIC_API_URL"

# Should output: NEXT_PUBLIC_API_URL=http://localhost:3001
```

### "Email must end with @student.babcock.edu.ng"
```
This is correct! Only Babcock student emails allowed.
Test with: john.doe@student.babcock.edu.ng
```

---

## SUPPORT & NEXT STEPS

1. ✅ Complete all 7 steps above
2. ✅ Start all 3 terminals
3. ✅ Test registration flow
4. ✅ Read: `FILES_SUMMARY.md` for what was created
5. ✅ Read: `API_TESTING_GUIDE.md` for testing endpoints

**Everything else is automatic!** The system handles:
- Registration validation ✅
- OTP generation & sending ✅
- Password hashing ✅
- Biometric enrollment ✅
- Double voting prevention ✅
- Audit logging ✅

---

## IMPORTANT NOTES

⭐ **Backup your .env file** - Contains sensitive keys
⭐ **Never commit .env to git** - Already in .gitignore
⭐ **Keep encryption key safe** - Used to decrypt credentials
⭐ **Change JWT_SECRET in production** - Don't use generated one

---

**You're all set! Start with Step 1 and follow through Step 7.** 

Good luck! 🚀
