# API Testing Guide

This guide provides curl examples for testing all backend endpoints.

## Prerequisites

- Backend running on http://localhost:3001
- curl installed (or use Postman)
- Sample student data in database

## Test Data

```
Matric Number: U2023/123456
Email: john.doe@student.babcock.edu.ng
Full Name: John Doe
```

---

## Authentication Endpoints

### 1. Register Student

**Endpoint**: `POST /auth/register`

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "matricNumber": "U2023/123456",
    "email": "john.doe@student.babcock.edu.ng"
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Student registered successfully. OTP sent to email.",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@student.babcock.edu.ng"
  }
}
```

### 2. Resend OTP

**Endpoint**: `POST /auth/resend-otp`

```bash
curl -X POST http://localhost:3001/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@student.babcock.edu.ng"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "OTP resent successfully"
}
```

### 3. Verify OTP and Set Password

**Endpoint**: `POST /auth/verify-otp`

```bash
curl -X POST http://localhost:3001/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "otpCode": "123456",
    "password": "SecurePassword123!"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@student.babcock.edu.ng"
  }
}
```

### 4. Login with Matric Number

**Endpoint**: `POST /auth/login`

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "matricNumber": "U2023/123456",
    "password": "SecurePassword123!"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@student.babcock.edu.ng",
    "matricNumber": "U2023/123456",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 604800
  }
}
```

**Save the accessToken** for authenticated requests:
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 5. Get WebAuthn Registration Options

**Endpoint**: `GET /auth/webauthn/registration-options`

**Authentication**: Required (Bearer token)

```bash
curl -X GET http://localhost:3001/auth/webauthn/registration-options \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "challenge": "Y2hhbGxlbmdl...",
    "rp": {
      "name": "Biometric Voting System",
      "id": "localhost"
    },
    "user": {
      "id": "dXNlcmlk...",
      "name": "john.doe@student.babcock.edu.ng",
      "displayName": "John Doe"
    },
    "pubKeyCredParams": [
      {
        "alg": -7,
        "type": "public-key"
      }
    ],
    "timeout": 60000,
    "attestation": "direct",
    "authenticatorSelection": {
      "authenticatorAttachment": "platform",
      "userVerification": "preferred"
    }
  }
}
```

### 6. Verify WebAuthn Registration

**Endpoint**: `POST /auth/webauthn/verify-registration`

**Authentication**: Required (Bearer token)

```bash
curl -X POST http://localhost:3001/auth/webauthn/verify-registration \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "attestationObject": "o2NmbXRm...",
    "clientDataJSON": "eyJjaGFsbGVuZ2U6...",
    "clientExtensionResults": {}
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Biometric registered successfully",
  "data": {
    "credentialId": "cHJlYXRobA==",
    "webauthnRegistered": true
  }
}
```

### 7. Get WebAuthn Authentication Options (for voting)

**Endpoint**: `GET /auth/webauthn/authentication-options`

**Authentication**: Required (Bearer token)

```bash
curl -X GET http://localhost:3001/auth/webauthn/authentication-options \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "challenge": "YXV0aGNoYWxs...",
    "timeout": 60000,
    "rpId": "localhost",
    "allowCredentials": [
      {
        "id": "cHJlYXRobA==",
        "type": "public-key",
        "transports": ["internal"]
      }
    ],
    "userVerification": "preferred"
  }
}
```

### 8. Verify WebAuthn Authentication

**Endpoint**: `POST /auth/webauthn/verify-authentication`

**Authentication**: Required (Bearer token)

```bash
curl -X POST http://localhost:3001/auth/webauthn/verify-authentication \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assertionObject": "o2NhdXRoRGF0YV...",
    "clientDataJSON": "eyJjaGFsbGVuZ2U..."
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Biometric verification successful",
  "data": {
    "verified": true,
    "newSignatureCount": 2
  }
}
```

---

## Voting Endpoints

### 1. Get All Elections

**Endpoint**: `GET /voting/elections`

**Authentication**: Required (Bearer token)

```bash
curl -X GET http://localhost:3001/voting/elections \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "election-1",
      "title": "Student Union Election 2024",
      "description": "Vote for your student union representatives",
      "startDate": "2024-02-15T00:00:00Z",
      "endDate": "2024-02-20T23:59:59Z",
      "status": "active",
      "positions": [
        {
          "id": "president",
          "title": "President",
          "candidates": [
            {
              "id": "candidate-1",
              "name": "Jane Smith",
              "platform": "Improve campus facilities"
            },
            {
              "id": "candidate-2",
              "name": "Bob Johnson",
              "platform": "Support student welfare"
            }
          ]
        }
      ]
    }
  ]
}
```

### 2. Get Election by ID

**Endpoint**: `GET /voting/elections/:electionId`

**Authentication**: Required (Bearer token)

```bash
curl -X GET http://localhost:3001/voting/elections/election-1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response**: Same as single election object from above

### 3. Check Voting Eligibility

**Endpoint**: `POST /voting/eligibility`

**Authentication**: Required (Bearer token)

```bash
curl -X POST http://localhost:3001/voting/eligibility \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "electionId": "election-1"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "hasVoted": false,
    "webauthnRegistered": true,
    "message": "You are eligible to vote"
  }
}
```

### 4. Submit Vote

**Endpoint**: `POST /voting/submit`

**Authentication**: Required (Bearer token)

**Note**: Must have previously verified WebAuthn credentials

```bash
curl -X POST http://localhost:3001/voting/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "electionId": "election-1",
    "votes": [
      {
        "positionId": "president",
        "candidateId": "candidate-1"
      },
      {
        "positionId": "vice_president",
        "candidateId": "candidate-3"
      }
    ],
    "webauthnVerificationProof": {
      "assertionObject": "o2NhdXRoRGF0YV...",
      "clientDataJSON": "eyJjaGFsbGVuZ2U..."
    }
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Vote submitted successfully",
  "data": {
    "voteId": "vote-12345",
    "electionId": "election-1",
    "timestamp": "2024-02-15T14:30:00Z",
    "voteCount": 2
  }
}
```

### 5. Get Voting Results

**Endpoint**: `GET /voting/results/:electionId`

**Authentication**: Required (Bearer token)

```bash
curl -X GET http://localhost:3001/voting/results/election-1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "electionId": "election-1",
    "positions": [
      {
        "positionId": "president",
        "positionTitle": "President",
        "candidates": [
          {
            "candidateId": "candidate-1",
            "name": "Jane Smith",
            "voteCount": 45
          },
          {
            "candidateId": "candidate-2",
            "name": "Bob Johnson",
            "voteCount": 38
          }
        ],
        "totalVotes": 83
      }
    ]
  }
}
```

### 6. Get User Voting History

**Endpoint**: `GET /voting/history`

**Authentication**: Required (Bearer token)

```bash
curl -X GET http://localhost:3001/voting/history \
  -H "Authorization: Bearer $TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "electionId": "election-1",
      "electionTitle": "Student Union Election 2024",
      "votedAt": "2024-02-15T14:30:00Z",
      "voteCount": 2
    }
  ]
}
```

---

## Admin Endpoints

### Authenticate as Admin

First login and get token as admin user:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "matricNumber": "ADMIN001",
    "password": "AdminPassword123!"
  }'
```

Then use the admin token for the following endpoints.

### 1. Get Audit Logs

**Endpoint**: `GET /admin/audit-logs`

**Authentication**: Admin required

```bash
curl -X GET "http://localhost:3001/admin/audit-logs?limit=50&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log-1",
        "action": "user_registered",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "description": "User registered successfully",
        "timestamp": "2024-02-15T10:00:00Z"
      },
      {
        "id": "log-2",
        "action": "vote_submitted",
        "userId": "550e8400-e29b-41d4-a716-446655440000",
        "description": "Vote submitted for election-1",
        "timestamp": "2024-02-15T14:30:00Z"
      }
    ],
    "total": 250
  }
}
```

### 2. Get All Users

**Endpoint**: `GET /admin/users`

**Authentication**: Admin required

```bash
curl -X GET "http://localhost:3001/admin/users?limit=50&offset=0" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "john.doe@student.babcock.edu.ng",
        "matricNumber": "U2023/123456",
        "webauthnRegistered": true,
        "createdAt": "2024-02-15T10:00:00Z"
      }
    ],
    "total": 125
  }
}
```

### 3. Create Election

**Endpoint**: `POST /admin/elections`

**Authentication**: Admin required

```bash
curl -X POST http://localhost:3001/admin/elections \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Student Union Election 2024",
    "description": "Vote for your student union representatives",
    "startDate": "2024-02-15T00:00:00Z",
    "endDate": "2024-02-20T23:59:59Z",
    "positions": [
      {
        "title": "President",
        "candidates": [
          {
            "name": "Jane Smith",
            "platform": "Improve campus facilities"
          },
          {
            "name": "Bob Johnson",
            "platform": "Support student welfare"
          }
        ]
      },
      {
        "title": "Vice President",
        "candidates": [
          {
            "name": "Alice Williams",
            "platform": "Enhance academic support"
          }
        ]
      }
    ]
  }'
```

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Election created successfully",
  "data": {
    "electionId": "election-2",
    "title": "Student Union Election 2024",
    "status": "created"
  }
}
```

### 4. Update Election

**Endpoint**: `PUT /admin/elections/:electionId`

**Authentication**: Admin required

```bash
curl -X PUT http://localhost:3001/admin/elections/election-1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Election Title",
    "endDate": "2024-02-25T23:59:59Z"
  }'
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Election updated successfully"
}
```

### 5. Delete Election

**Endpoint**: `DELETE /admin/elections/:electionId`

**Authentication**: Admin required

```bash
curl -X DELETE http://localhost:3001/admin/elections/election-1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Election deleted successfully"
}
```

### 6. Get Dashboard Statistics

**Endpoint**: `GET /admin/dashboard`

**Authentication**: Admin required

```bash
curl -X GET http://localhost:3001/admin/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "totalUsers": 125,
    "registeredWithBiometric": 98,
    "totalElections": 3,
    "totalVotesCast": 456,
    "activeElections": 1,
    "adminUsers": 2
  }
}
```

---

## Health & Status Endpoints

### 1. Health Check

**Endpoint**: `GET /health`

**Authentication**: Not required

```bash
curl http://localhost:3001/health
```

**Response** (200 OK):
```json
{
  "status": "ok",
  "timestamp": "2024-02-15T14:30:00Z",
  "version": "1.0.0"
}
```

### 2. API Documentation

**Endpoint**: `GET /api`

**Authentication**: Not required

```bash
curl http://localhost:3001/api
```

Returns HTML documentation page.

---

## Error Examples

### 400 Bad Request

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "matricNumber": "U2023/123456"
    # Missing password
  }'
```

**Response** (400 Bad Request):
```json
{
  "success": false,
  "error": "Validation error: password is required"
}
```

### 401 Unauthorized

```bash
curl -X GET http://localhost:3001/voting/elections
# Missing Authorization header
```

**Response** (401 Unauthorized):
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 409 Conflict (Double Voting)

```bash
curl -X POST http://localhost:3001/voting/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "electionId": "election-1",
    "votes": [{"positionId": "president", "candidateId": "candidate-1"}],
    "webauthnVerificationProof": {...}
  }'
# User has already voted in this election
```

**Response** (409 Conflict):
```json
{
  "success": false,
  "error": "You have already voted in this election"
}
```

---

## Testing Script

Save as `test-api.sh`:

```bash
#!/bin/bash

API="http://localhost:3001"
MATRIC="U2023/123456"
EMAIL="john.doe@student.babcock.edu.ng"
PASSWORD="TestPassword123!"

echo "Testing Biometric Voting System API"
echo "===================================="
echo ""

# Test health check
echo "1. Testing health check..."
curl -s $API/health | jq '.'

# Register
echo "2. Registering student..."
REGISTER=$(curl -s -X POST $API/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"fullName\":\"John Doe\",\"matricNumber\":\"$MATRIC\",\"email\":\"$EMAIL\"}")
  
USERID=$(echo $REGISTER | jq -r '.data.userId')
echo $REGISTER | jq '.'

# OTP (in real scenario, check email)
echo "3. Verifying OTP (use code from email)..."
read -p "Enter OTP code: " OTP

VERIFY=$(curl -s -X POST $API/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"$USERID\",\"otpCode\":\"$OTP\",\"password\":\"$PASSWORD\"}")
echo $VERIFY | jq '.'

# Login
echo "4. Logging in..."
LOGIN=$(curl -s -X POST $API/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"matricNumber\":\"$MATRIC\",\"password\":\"$PASSWORD\"}")
  
TOKEN=$(echo $LOGIN | jq -r '.data.accessToken')
echo $LOGIN | jq '.'

# Get elections
echo "5. Fetching elections..."
curl -s -X GET $API/voting/elections \
  -H "Authorization: Bearer $TOKEN" | jq '.'

echo ""
echo "Testing complete!"
```

Run with:
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Postman Collection

You can also import this as a Postman collection by saving as JSON and importing.

---

**Tips**:
- Save tokens in environment variables for easier testing
- Use `jq` to format JSON output prettily
- Check `http://localhost:8025` (MailHog) for testing OTP emails
- All timestamps are in ISO 8601 format (UTC)
- Rate limits reset after 15 minutes
