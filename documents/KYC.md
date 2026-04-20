# KYC Management System - Complete Implementation Guide

## Overview
This is a production-ready KYC (Know Your Customer) verification system for vendor onboarding at Urban Cap. The system implements a three-model architecture (User, Profile, KYC) with immutable audit trails and compliance-ready workflows.

---

## Table of Contents
1. [Architecture](#architecture)
2. [Setup & Installation](#setup--installation)
3. [File Structure](#file-structure)
4. [API Endpoints](#api-endpoints)
5. [Vendor Journey](#vendor-journey)
6. [Admin Workflow](#admin-workflow)
7. [Cron Jobs](#cron-jobs)
8. [Security Features](#security-features)
9. [Testing](#testing)

---

## Architecture

### Three-Model Separation
```
User (Authentication)
  └─── Profile (User Info)
  └─── KYC (Verification & Compliance)
```

**Why this separation?**
- **User**: Minimal auth fields (email, password, status)
- **Profile**: Public info, preferences, completion tracking
- **KYC**: Sensitive compliance data with immutable audit trail

### KYC Status Flow
```
INCOMPLETE → PENDING → UNDER_REVIEW → APPROVED/REJECTED
                                    ↓
                                 EXPIRED (after 1 year)
```

## File Structure
```
backend/
├── models/
│   └── kycSchema.js          # KYC Mongoose model with enums
├── services/
│   └── kycService.js         # Business logic layer
├── controllers/
│   └── kycController.js      # Request handlers
├── routes/
│   └── kycRoutes.js          # API route definitions
├── middleware/
│   ├── auth.js               # protect & authorize middleware
│   └── kycValidation.js      # Input validation rules
└── utils/
    └── emailService.js       # Email notifications
```

---

## API Endpoints

### Vendor Endpoints

#### 1. Create KYC Record
```http
POST /api/kyc/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "companyName": "Tech Solutions Pvt Ltd",
  "gstNumber": "22AABCT1234G1Z5",
  "panNumber": "ABCDE1234F",
  "businessAddress": {
    "street": "123 MG Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "pinCode": "560001"
  }
}
```

#### 2. Get KYC Status
```http
GET /api/kyc/status
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "exists": true,
    "status": "PENDING",
    "isActive": false,
    "documentSummary": {
      "total": 4,
      "requiredCount": 4,
      "uploadedRequired": 4,
      "missing": [],
      "isComplete": true
    }
  }
}
```

#### 3. Add Document
```http
POST /api/kyc/documents
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "AADHAAR",
  "url": "https://s3.amazonaws.com/docs/aadhaar.pdf"
}
```

#### 4. Submit KYC for Review
```http
POST /api/kyc/submit
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "KYC submitted successfully. You will be notified once it's reviewed."
}
```

### Admin Endpoints

#### 1. Get Pending KYCs
```http
GET /api/kyc/admin/pending?page=1&limit=10
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

#### 2. Move to Review
```http
POST /api/kyc/admin/{kycId}/review
Authorization: Bearer {admin_token}
```

#### 3. Approve KYC
```http
POST /api/kyc/admin/{kycId}/approve
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "comments": "All documents verified successfully"
}
```

#### 4. Reject KYC
```http
POST /api/kyc/admin/{kycId}/reject
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "reason": "GST certificate is expired. Please upload a valid certificate."
}
```

#### 5. Search KYCs
```http
GET /api/kyc/admin/search?status=APPROVED&companyName=Tech&page=1
Authorization: Bearer {admin_token}
```

#### 6. Get KYC Statistics
```http
GET /api/kyc/admin/stats
Authorization: Bearer {admin_token}

Response:
{
  "success": true,
  "data": {
    "incomplete": 12,
    "pending": 8,
    "underReview": 3,
    "approved": 45,
    "rejected": 5,
    "expired": 2,
    "expiringSoon": 7,
    "total": 75
  }
}
```

---

## Vendor Journey

### Step-by-Step Flow
```
1. REGISTER
   POST /api/auth/register
   → User record created
   → Empty Profile auto-created
   ↓

2. LOGIN
   POST /api/auth/login
   → Returns JWT token
   ↓

3. COMPLETE PROFILE
   PUT /api/users/{userId}/profile
   → Must reach 100% completion
   → Required: firstName, lastName, phone, companyName, gstNumber
   ↓

4. CREATE KYC
   POST /api/kyc/create
   → Status: INCOMPLETE
   ↓

5. UPLOAD DOCUMENTS
   POST /api/kyc/documents (repeat for each doc)
   → AADHAAR
   → PAN
   → GST_CERTIFICATE
   → CANCELLED_CHEQUE
   ↓

6. SUBMIT KYC
   POST /api/kyc/submit
   → Status changes to PENDING
   → Vendor waits for admin review
   ↓

7. ADMIN APPROVAL
   (Admin approves)
   → Status: APPROVED
   → Vendor gets full platform access
```

### Access Control (Middleware)
```javascript
// middleware/vendorAccessGuard.js

async function vendorAccessGuard(req, res, next) {
  const user = await User.findById(req.userId)
    .populate('profile')
    .populate('kyc');

  // Gate 1: Email verification
  if (!user.isEmailVerified) {
    return res.status(403).json({ 
      stage: 'VERIFY_EMAIL'
    });
  }

  // Gate 2: Profile completion
  if (user.profile.completionPercentage < 100) {
    return res.status(403).json({ 
      stage: 'COMPLETE_PROFILE'
    });
  }

  // Gate 3: KYC approval
  if (!user.kyc || user.kyc.status !== 'APPROVED') {
    return res.status(403).json({ 
      stage: 'KYC_PENDING',
      kycStatus: user.kyc ? user.kyc.status : 'INCOMPLETE'
    });
  }

  next(); // All checks passed
}

// Apply to protected routes
router.get('/vendor/dashboard', vendorAccessGuard, getDashboard);
```

---

## Admin Workflow

### KYC Review Process
```
1. Admin sees pending queue
   GET /api/kyc/admin/pending
   ↓

2. Admin picks up a KYC
   POST /api/kyc/admin/{kycId}/review
   → Status: UNDER_REVIEW
   ↓

3. Admin reviews documents
   - Opens each document URL
   - Verifies against GST/PAN databases
   ↓

4a. ALL GOOD → Approve
    POST /api/kyc/admin/{kycId}/approve
    → Status: APPROVED
    → Profile.isVerified = true
    → expiryDate = +1 year
    
4b. ISSUE FOUND → Reject
    POST /api/kyc/admin/{kycId}/reject
    → Status: REJECTED
    → Vendor sees rejection reason
    → Can resubmit after fixes
```

---

<!-- ## Cron Jobs

### Daily Tasks

#### 1. Mark Expired KYCs (2:00 AM)
```javascript
// Runs: Every day at 2:00 AM
// Purpose: Auto-expire KYCs past their 1-year validity
```

#### 2. Send Expiry Reminders (9:00 AM)
```javascript
// Runs: Every day at 9:00 AM
// Purpose: Email vendors 30 days before expiry
```

#### 3. Send Urgent Reminders (9:00 AM)
```javascript
// Runs: Every day at 9:00 AM
// Purpose: Email vendors 7 days before expiry
```

### Weekly Tasks

#### 4. Weekly KYC Report (Monday 8:00 AM)
```javascript
// Runs: Every Monday at 8:00 AM
// Purpose: Send KYC stats report to admin
```

### Manual Trigger (for testing)
```javascript
const { CronManager } = require('./cron/kycCronJobs');

// Run specific job manually
await CronManager.runManually('markExpired');
await CronManager.runManually('expiryReminders');
``` -->

---

## Security Features

### 1. **Immutable Audit Trail**
Every status change is logged in `verificationHistory`:
```javascript
// ❌ BLOCKED - Direct status update
kyc.status = "APPROVED"; // Throws error!

// ✅ CORRECT - Use methods
await kyc.approve(adminId, comments);
// Automatically logs: action, admin, timestamp, comments
```

### 2. **Status Protection**
Pre-save hook prevents tampering:
```javascript
KYCSchema.pre("save", function (next) {
  if (this.isModified("status") && !this.$__statusChangeAllowed) {
    return next(new Error("Use provided methods"));
  }
  next();
});
```

### 3. **Document Validation**
- GST: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z][Z]{1}[0-9A-Z]{1}$/`
- PAN: `/^[A-Z]{5}[0-9]{4}[A-Z]$/`
- PIN: `/^\d{6}$/`

### 4. **Admin Tracking**
Every approval/rejection includes `performedBy: adminId`

### 5. **Input Validation**
Express-validator on all endpoints with detailed error messages

---

## Testing

### Unit Tests (Jest)
```javascript
// tests/kyc.test.js

describe('KYC Service', () => {
  test('should create KYC record', async () => {
    const kyc = await kycService.createKYCRecord(userId, kycData);
    expect(kyc.status).toBe(KYC_STATUS.INCOMPLETE);
  });

  test('should reject direct status update', async () => {
    const kyc = await KYC.findById(kycId);
    kyc.status = KYC_STATUS.APPROVED;
    await expect(kyc.save()).rejects.toThrow();
  });

  test('should submit KYC only when documents complete', async () => {
    await expect(kycService.submitKYC(userId)).rejects.toThrow('Missing required documents');
  });
});
```

### Integration Tests (Postman/Supertest)
```javascript
const request = require('supertest');
const app = require('../app');

describe('POST /api/kyc/submit', () => {
  it('should submit KYC successfully', async () => {
    const res = await request(app)
      .post('/api/kyc/submit')
      .set('Authorization', `Bearer ${vendorToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
```

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `KYC record already exists` | Vendor tried to create duplicate | Use `GET /api/kyc/status` first |
| `Missing required documents` | Submitted without all docs | Upload all 4 required docs |
| `Cannot update KYC in APPROVED status` | Vendor tried to edit after approval | KYC is locked after approval |
| `Only UNDER_REVIEW can be approved` | Wrong status transition | Follow the status flow |
| `Rejection reason is required` | Admin rejected without reason | Always provide rejection reason |

---

## Production Checklist

- [ ] MongoDB indexes created (userId, status, expiryDate, submittedAt)
- [ ] Environment variables set
- [ ] Cron jobs enabled in production
- [ ] Email service configured
- [ ] S3/Cloudinary for document storage
- [ ] Rate limiting on endpoints
- [ ] HTTPS enabled
- [ ] Admin panel for KYC review
- [ ] Backup strategy for KYC data
- [ ] Compliance documentation ready

---

### Data Retention
- Keep REJECTED KYCs for 90 days
- Archive EXPIRED KYCs after 2 years
- Backup `verificationHistory` monthly

**Last Updated**: 2026-01-31  
**Version**: 1.0  
**Contact**: devakash20606@gmail.com