# Production Deployment Checklist

Use this checklist to ensure your biometric voting system is ready for production deployment.

## Pre-Deployment Review

### Security Audit

- [ ] **JWT Secret** - Changed to a strong random string (not development value)
  ```bash
  # Generate: 
  openssl rand -base64 32
  ```

- [ ] **Encryption Key** - Using production-grade key (32 bytes)
  ```bash
  # Verify length:
  echo -n "$ENCRYPTION_KEY" | wc -c  # Should be 64 hex chars (32 bytes)
  ```

- [ ] **Database Credentials** - Using separate database for production
  - Production SUPABASE_URL ≠ Development SUPABASE_URL
  - SERVICE_ROLE_KEY stored securely (not in version control)
  - ANON_KEY with restricted permissions

- [ ] **CORS Configuration** - Locked down to production domain only
  ```env
  CORS_ORIGIN=https://yourdomain.com
  ```

- [ ] **WebAuthn Configuration** - Updated for production domain
  ```env
  RP_ID=yourdomain.com
  ORIGIN=https://yourdomain.com
  ```

- [ ] **SMTP Configuration** - Production email service configured
  - Not using development credentials
  - Verified email from address
  - SMTP_HOST, SMTP_USER, SMTP_PASSWORD verified

- [ ] **Environment Variables** - No sensitive data in code
  - All secrets in .env file
  - .env added to .gitignore
  - .env.example has no real values

### Code Review

- [ ] **Error Handling** - No stack traces exposed in production
  ```typescript
  // ✅ Good
  res.status(500).json({ error: 'Internal server error' });
  
  // ❌ Bad
  res.status(500).json({ error: err.stack });
  ```

- [ ] **Logging** - Sensitive data not logged
  - Passwords never logged
  - Credit card data never logged
  - OTP codes logged only with hash

- [ ] **Dependencies** - All packages up to date and security audited
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **Input Validation** - All user inputs validated
  - Email format validated
  - Matric number format validated
  - OTP code length checked
  - Vote data validated

- [ ] **Rate Limiting** - Enabled for all endpoints
  - OTP rate limit: 1 per minute
  - Login rate limit: 5 per 15 minutes
  - General API rate limit: 100 per 15 minutes

- [ ] **HTTPS** - Only HTTPS allowed in production
  ```javascript
  // Enforce HTTPS redirect
  if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }
  ```

- [ ] **SQL Injection** - All database queries use parameterized queries
  - ✅ All Supabase queries use prepared statements
  - ❌ No string concatenation in SQL

- [ ] **CSRF Protection** - Implemented if needed
  - Verify if frontend sends CSRF token
  - Backend validates CSRF token

### Database Audit

- [ ] **Backups Configured** - Automated daily backups enabled
  ```sql
  -- Verify backup settings in Supabase:
  -- Settings → Database → Backups
  ```

- [ ] **Encryption at Rest** - Database encryption enabled
  - [ ] Supabase has encryption at rest enabled by default ✅

- [ ] **User Permissions** - Database users have least privilege
  ```sql
  -- Create read-only role for app
  CREATE ROLE app_user WITH LOGIN PASSWORD 'strong_password';
  GRANT CONNECT ON DATABASE your_db TO app_user;
  GRANT USAGE ON SCHEMA public TO app_user;
  GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
  ```

- [ ] **Row-Level Security (RLS)** - Policies configured
  - [ ] Users can only see their own votes
  - [ ] Users can only vote once per election
  - [ ] Admins can see all data

- [ ] **Indexes** - Database indexes optimized for queries
  ```sql
  -- Verify key indexes exist:
  SELECT indexname FROM pg_indexes WHERE tablename = 'votes';
  ```

### Frontend Configuration

- [ ] **API URLs** - Point to production backend
  ```typescript
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.yourdomain.com';
  ```

- [ ] **API Keys** - No hardcoded API keys
  - Use environment variables
  - Rotate regularly

- [ ] **Error Pages** - User-friendly error messages
  - No technical details exposed
  - Clear instructions for common errors

- [ ] **Build Optimization** - Production build tested
  ```bash
  npm run build
  npm run start
  ```

## Deployment Steps

### Step 1: Prepare Backend Server

```bash
# On your production server
cd /var/www/biometric-voting-backend

# Clone repository
git clone <your-repo-url> .

# Install dependencies
npm install --production

# Build TypeScript
npm run build

# Create .env with production values
nano .env  # Edit with production credentials
```

### Step 2: Configure Environment

```bash
# Set up systemd service for backend
sudo nano /etc/systemd/system/voting-backend.service
```

```ini
[Unit]
Description=Biometric Voting System Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/biometric-voting-backend
ExecStart=/usr/bin/node /var/www/biometric-voting-backend/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable voting-backend
sudo systemctl start voting-backend

# Check status
sudo systemctl status voting-backend
```

### Step 3: Configure Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/voting-api
upstream voting_backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    
    # SSL security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # CORS headers
    add_header 'Access-Control-Allow-Origin' 'https://yourdomain.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    
    location / {
        proxy_pass http://voting_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable and test
sudo ln -s /etc/nginx/sites-available/voting-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4: Install SSL Certificate

```bash
# Using Let's Encrypt with Certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d api.yourdomain.com

# Set up auto-renewal
sudo certbot renew --dry-run
```

### Step 5: Deploy Frontend

```bash
# Build Next.js application
npm run build

# Deploy to Vercel, Netlify, or your own server
vercel --prod

# Or for self-hosted:
npm run build
pm2 start "npm start" --name voting-frontend
```

### Step 6: Test Production Deployment

```bash
# Test backend health
curl https://api.yourdomain.com/health

# Test HTTPS
curl -I https://api.yourdomain.com

# Test CORS
curl -H "Origin: https://yourdomain.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: X-Custom-Header" \
     -X OPTIONS https://api.yourdomain.com/auth/login
```

## Post-Deployment Verification

### Health Checks

- [ ] **Backend Health Check**
  ```bash
  curl https://api.yourdomain.com/health
  ```
  Should return `{"status":"ok"}`

- [ ] **Database Connection**
  - [ ] Can connect to Supabase
  - [ ] Can query tables
  - [ ] Backups are running

- [ ] **Email Service**
  - [ ] Send test OTP email
  - [ ] Verify email received
  - [ ] Check email formatting

- [ ] **Authentication Flow**
  - [ ] Register new student
  - [ ] Verify OTP
  - [ ] Login successfully
  - [ ] JWT token works

- [ ] **Frontend Functionality**
  - [ ] Page loads without errors
  - [ ] API calls work
  - [ ] Forms submit correctly

### Monitoring Setup

- [ ] **Error Tracking** - Set up Sentry or similar
  ```bash
  npm install @sentry/node
  ```
  
  ```typescript
  import * as Sentry from "@sentry/node";
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
  ```

- [ ] **Logging Service** - Set up ELK stack or LogRocket
  - [ ] Backend logs aggregated
  - [ ] Error logs monitored
  - [ ] Performance metrics tracked

- [ ] **Uptime Monitoring** - Set up monitoring service
  - [ ] Pingdom or similar
  - [ ] Health check endpoint monitored
  - [ ] Alerts configured

- [ ] **Performance Monitoring**
  - [ ] Page load time < 2s
  - [ ] API response time < 500ms
  - [ ] Database query time < 200ms

### Security Verification

- [ ] **SSL/TLS Test**
  ```bash
  # Test SSL configuration
  https://www.ssllabs.com/ssltest/
  ```

- [ ] **Security Headers**
  ```bash
  curl -I https://api.yourdomain.com | grep -i "x-"
  ```
  Should include:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security

- [ ] **Database Security**
  - [ ] No default credentials
  - [ ] Connection uses SSL
  - [ ] Firewall rules configured

- [ ] **API Security**
  - [ ] Rate limiting working
  - [ ] CORS correctly configured
  - [ ] JWT validation working

## Maintenance Schedule

### Daily
- [ ] Monitor error logs
- [ ] Check uptime status
- [ ] Review security alerts

### Weekly
- [ ] Review audit logs
- [ ] Check database performance
- [ ] Verify backups completed

### Monthly
- [ ] Update dependencies
  ```bash
  npm outdated
  npm update
  npm audit
  ```
- [ ] Review database disk usage
- [ ] Test backup restoration
- [ ] Update SSL certificates (if needed)

### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] User feedback review
- [ ] Capacity planning

## Rollback Plan

If issues occur in production:

### Immediate Actions
```bash
# Stop current deployment
sudo systemctl stop voting-backend

# Revert to previous version
git checkout <previous-commit>
npm install
npm run build

# Restart with previous version
sudo systemctl start voting-backend
```

### Data Recovery
- Restore from latest backup if data corruption occurs
- Supabase provides point-in-time recovery
- Keep 30-day backup retention

## Incident Response

### Security Breach
1. [ ] Stop the system immediately
2. [ ] Isolate affected database
3. [ ] Notify users
4. [ ] Review audit logs
5. [ ] Change all credentials
6. [ ] Apply security patches
7. [ ] Restore from backup
8. [ ] Verify system integrity
9. [ ] Gradual restoration

### Data Loss
1. [ ] Alert stakeholders
2. [ ] Stop write operations
3. [ ] Restore from latest backup
4. [ ] Verify data integrity
5. [ ] Re-enable system
6. [ ] Investigate root cause

### Performance Issues
1. [ ] Check database load
2. [ ] Review application logs
3. [ ] Analyze slow queries
4. [ ] Scale resources if needed
5. [ ] Optimize code/queries

## Compliance Checklist

- [ ] **Data Privacy** - GDPR compliant (if applicable)
  - [ ] User data properly encrypted
  - [ ] Right to deletion implemented
  - [ ] Data export capability

- [ ] **Audit Trail** - All actions logged
  - [ ] Who accessed what and when
  - [ ] All votes recorded immutably
  - [ ] Admin actions logged

- [ ] **Accessibility** - WCAG 2.1 AA compliant
  - [ ] Screen reader support
  - [ ] Keyboard navigation
  - [ ] Color contrast verified

- [ ] **Documentation**
  - [ ] API documentation updated
  - [ ] Database schema documented
  - [ ] Deployment procedure documented

## Sign-Off

- [ ] **Development Lead**: ___________________ Date: ______
- [ ] **Security Team**: ___________________ Date: ______
- [ ] **QA Lead**: ___________________ Date: ______
- [ ] **DevOps Lead**: ___________________ Date: ______

---

**Deployment Date**: ________________

**Production URL**: ________________

**Support Contact**: ________________

**Emergency Contact**: ________________

