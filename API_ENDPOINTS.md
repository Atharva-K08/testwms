# Water Tanker API - Complete Endpoint Guide

**Base URL:** `http://localhost:5000`  
**API Version:** `v1`  
**Content-Type:** `application/json`

---

## 📋 Table of Contents
1. [Health Check](#1-health-check)
2. [Authentication](#2-authentication)
3. [Request Management](#3-request-management)
4. [Queue Management](#4-queue-management)
5. [Receipt Management](#5-receipt-management)

---

## 1. Health Check

### 1.1 Check Server Status
**Endpoint:** `GET /health`

**Request:**
```
GET http://localhost:5000/health
```

**Response (200):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-04-08T10:30:00.000Z"
}
```

---

## 2. Authentication

### 2.1 Register New User (Member)
**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json
```

**Body:**
```json
{
  "mobileNumber": "9876543210",
  "password": "Password123",
  "profile": {
    "name": "John Doe",
    "societyName": "Green Valley Society",
    "address": "123 Main Street, Apt 4B",
    "contactPerson": "John Doe"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "user": {
      "_id": "69d61bf4c46959fd22ffeea9",
      "mobileNumber": "9876543210",
      "role": "member",
      "profile": {
        "name": "John Doe",
        "societyName": "Green Valley Society",
        "address": "123 Main Street, Apt 4B",
        "contactPerson": "John Doe"
      },
      "isActive": true,
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ Validation Rules:**
- `mobileNumber`: Exactly 10 digits, numeric only
- `password`: Minimum 6 characters, at least 1 uppercase letter, 1 number
- All `profile` fields are required

**Error Response (400):**
```json
{
  "success": false,
  "message": "Request validation failed.",
  "errors": [
    {
      "field": "mobileNumber",
      "message": "Mobile number must be exactly 10 digits."
    },
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter."
    }
  ]
}
```

---

### 2.2 Login
**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json
```

**Body:**
```json
{
  "mobileNumber": "9876543210",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "_id": "69d61bf4c46959fd22ffeea9",
      "mobileNumber": "9876543210",
      "role": "member",
      "profile": {
        "name": "John Doe",
        "societyName": "Green Valley Society",
        "address": "123 Main Street, Apt 4B",
        "contactPerson": "John Doe"
      },
      "isActive": true,
      "lastLoginAt": "2026-04-08T10:30:00.000Z",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ Note:** Copy the `accessToken` and use it in the Authorization header for authenticated endpoints:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid mobile number or password."
}
```

---

### 2.3 Refresh Access Token
**Endpoint:** `POST /api/v1/auth/refresh`

**Request:**
```
POST http://localhost:5000/api/v1/auth/refresh
Content-Type: application/json
```

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token."
}
```

---

### 2.4 Get Current User Profile
**Endpoint:** `GET /api/v1/auth/profile`

**Request:**
```
GET http://localhost:5000/api/v1/auth/profile
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile fetched.",
  "data": {
    "user": {
      "_id": "69d61bf4c46959fd22ffeea9",
      "mobileNumber": "9876543210",
      "role": "member",
      "profile": {
        "name": "John Doe",
        "societyName": "Green Valley Society",
        "address": "123 Main Street, Apt 4B",
        "contactPerson": "John Doe"
      },
      "isActive": true,
      "lastLoginAt": "2026-04-08T10:30:00.000Z",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

---

## 3. Request Management

### 3.1 Submit Water Tanker Request (Member)
**Endpoint:** `POST /api/v1/requests`  
**Role Required:** `member`

**Request:**
```
POST http://localhost:5000/api/v1/requests
Authorization: Bearer <memberAccessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "notes": "Need water tanker for building maintenance on April 15th"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Water tanker request submitted successfully.",
  "data": {
    "request": {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": "69d61bf4c46959fd22ffeea9",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "Need water tanker for building maintenance on April 15th",
      "status": "pending",
      "queuePosition": 1,
      "tankerAssignment": null,
      "assignedAt": null,
      "assignedBy": null,
      "completedAt": null,
      "cancelledAt": null,
      "cancelReason": "",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    }
  }
}
```

**⚠️ Notes:**
- `notes` field is optional (max 500 characters)
- User profile details are automatically copied from the authenticated user
- `queuePosition` is auto-assigned sequentially
- Initial status is always `"pending"`

---

### 3.2 Get My Requests (Member)
**Endpoint:** `GET /api/v1/requests/my`  
**Role Required:** `member`

**Request:**
```
GET http://localhost:5000/api/v1/requests/my?page=1&limit=10
Authorization: Bearer <memberAccessToken>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response (200):**
```json
{
  "success": true,
  "message": "Requests fetched.",
  "data": [
    {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": "69d61bf4c46959fd22ffeea9",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "Need water tanker for building maintenance",
      "status": "pending",
      "queuePosition": 1,
      "tankerAssignment": null,
      "assignedAt": null,
      "assignedBy": null,
      "completedAt": null,
      "cancelledAt": null,
      "cancelReason": "",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```

---

### 3.3 Get Request By ID
**Endpoint:** `GET /api/v1/requests/:id`  
**Role Required:** Any authenticated user

**Request:**
```
GET http://localhost:5000/api/v1/requests/69d61bf4c46959fd22ffeeaa
Authorization: Bearer <accessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request fetched.",
  "data": {
    "request": {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": "69d61bf4c46959fd22ffeea9",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "Need water tanker for building maintenance",
      "status": "pending",
      "queuePosition": 1,
      "tankerAssignment": null,
      "assignedAt": null,
      "assignedBy": null,
      "completedAt": null,
      "cancelledAt": null,
      "cancelReason": "",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Request not found."
}
```

---

### 3.4 Get All Requests (Manager)
**Endpoint:** `GET /api/v1/requests`  
**Role Required:** `manager`

**Request:**
```
GET http://localhost:5000/api/v1/requests?status=pending&page=1&limit=20
Authorization: Bearer <managerAccessToken>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `status` (optional): Filter by status (`pending`, `assigned`, `completed`, `cancelled`)

**Response (200):**
```json
{
  "success": true,
  "message": "Requests fetched.",
  "data": [
    {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": "69d61bf4c46959fd22ffeea9",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "Need water tanker for building maintenance",
      "status": "pending",
      "queuePosition": 1,
      "tankerAssignment": null,
      "assignedAt": null,
      "assignedBy": null,
      "completedAt": null,
      "cancelledAt": null,
      "cancelReason": "",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    },
    {
      "_id": "69d61bf4c46959fd22ffeeab",
      "userId": "69d61bf4c46959fd22ffeea9",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "",
      "status": "assigned",
      "queuePosition": 2,
      "tankerAssignment": {
        "tankerNumber": "WT-1234",
        "driverName": "Mike Johnson",
        "driverMobile": "9876543210"
      },
      "assignedAt": "2026-04-08T11:00:00.000Z",
      "assignedBy": "69d61bf4c46959fd22ffeea0",
      "completedAt": null,
      "cancelledAt": null,
      "cancelReason": "",
      "createdAt": "2026-04-08T10:35:00.000Z",
      "updatedAt": "2026-04-08T11:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 2
}
```

---

### 3.5 Cancel Request
**Endpoint:** `PATCH /api/v1/requests/:id/cancel`  
**Role Required:** Any authenticated user (member or manager)

**Request:**
```
PATCH http://localhost:5000/api/v1/requests/69d61bf4c46959fd22ffeeaa/cancel
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "cancelReason": "No longer needed"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request cancelled.",
  "data": {
    "request": {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": "69d61bf4c46959fd22ffeea9",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "Need water tanker for building maintenance",
      "status": "cancelled",
      "queuePosition": 1,
      "tankerAssignment": null,
      "assignedAt": null,
      "assignedBy": null,
      "completedAt": null,
      "cancelledAt": "2026-04-08T12:00:00.000Z",
      "cancelReason": "No longer needed",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T12:00:00.000Z"
    }
  }
}
```

**⚠️ Notes:**
- `cancelReason` is optional (max 300 characters)
- Can only cancel requests that are not already completed

---

## 4. Queue Management

**⚠️ All queue endpoints require `manager` role**

### 4.1 Get Pending Queue
**Endpoint:** `GET /api/v1/queue`  
**Role Required:** `manager`

**Request:**
```
GET http://localhost:5000/api/v1/queue?page=1&limit=20
Authorization: Bearer <managerAccessToken>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response (200):**
```json
{
  "success": true,
  "message": "Queue fetched.",
  "data": [
    {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": {
        "_id": "69d61bf4c46959fd22ffeea9",
        "mobileNumber": "9876543210",
        "profile": {
          "name": "John Doe",
          "societyName": "Green Valley Society",
          "address": "123 Main Street, Apt 4B",
          "contactPerson": "John Doe"
        }
      },
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "Need water tanker for building maintenance",
      "status": "pending",
      "queuePosition": 1,
      "tankerAssignment": null,
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

---

### 4.2 Peek Next in Queue
**Endpoint:** `GET /api/v1/queue/next`  
**Role Required:** `manager`

**Request:**
```
GET http://localhost:5000/api/v1/queue/next
Authorization: Bearer <managerAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Next request in queue.",
  "data": {
    "request": {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": {
        "_id": "69d61bf4c46959fd22ffeea9",
        "mobileNumber": "9876543210",
        "profile": {
          "name": "John Doe",
          "societyName": "Green Valley Society",
          "address": "123 Main Street, Apt 4B",
          "contactPerson": "John Doe"
        }
      },
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "",
      "status": "pending",
      "queuePosition": 1,
      "tankerAssignment": null,
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T10:30:00.000Z"
    }
  }
}
```

**Response (200) - Empty Queue:**
```json
{
  "success": true,
  "message": "Queue is empty.",
  "data": {
    "request": null
  }
}
```

---

### 4.3 Assign Tanker to Request
**Endpoint:** `PATCH /api/v1/queue/:id/assign`  
**Role Required:** `manager`

**Request:**
```
PATCH http://localhost:5000/api/v1/queue/69d61bf4c46959fd22ffeeaa/assign
Authorization: Bearer <managerAccessToken>
Content-Type: application/json
```

**Body:**
```json
{
  "tankerNumber": "WT-1234",
  "driverName": "Mike Johnson",
  "driverMobile": "9876543210"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Tanker assigned successfully.",
  "data": {
    "request": {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": {
        "_id": "69d61bf4c46959fd22ffeea9",
        "mobileNumber": "9876543210",
        "profile": {
          "name": "John Doe",
          "societyName": "Green Valley Society",
          "address": "123 Main Street, Apt 4B",
          "contactPerson": "John Doe"
        }
      },
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "Need water tanker for building maintenance",
      "status": "assigned",
      "queuePosition": 1,
      "tankerAssignment": {
        "tankerNumber": "WT-1234",
        "driverName": "Mike Johnson",
        "driverMobile": "9876543210"
      },
      "assignedAt": "2026-04-08T11:00:00.000Z",
      "assignedBy": "69d61bf4c46959fd22ffeea0",
      "completedAt": null,
      "cancelledAt": null,
      "cancelReason": "",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T11:00:00.000Z"
    }
  }
}
```

**⚠️ Validation Rules:**
- `tankerNumber`: Required, max 20 characters
- `driverName`: Required, max 100 characters
- `driverMobile`: Required, exactly 10 digits, numeric only

**Error Response (409):**
```json
{
  "success": false,
  "message": "Request could not be assigned. It may already be assigned or does not exist."
}
```

**⚠️ Important Notes:**
- Request must be in `"pending"` status
- Once assigned, status changes to `"assigned"`
- Cannot assign the same request twice
- `assignedBy` stores the manager's user ID

---

### 4.4 Complete Request
**Endpoint:** `PATCH /api/v1/queue/:id/complete`  
**Role Required:** `manager`

**Request:**
```
PATCH http://localhost:5000/api/v1/queue/69d61bf4c46959fd22ffeeaa/complete
Authorization: Bearer <managerAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Request marked as completed.",
  "data": {
    "request": {
      "_id": "69d61bf4c46959fd22ffeeaa",
      "userId": "69d61bf4c46959fd22ffeea9",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "notes": "Need water tanker for building maintenance",
      "status": "completed",
      "queuePosition": 1,
      "tankerAssignment": {
        "tankerNumber": "WT-1234",
        "driverName": "Mike Johnson",
        "driverMobile": "9876543210"
      },
      "assignedAt": "2026-04-08T11:00:00.000Z",
      "assignedBy": "69d61bf4c46959fd22ffeea0",
      "completedAt": "2026-04-08T14:30:00.000Z",
      "cancelledAt": null,
      "cancelReason": "",
      "createdAt": "2026-04-08T10:30:00.000Z",
      "updatedAt": "2026-04-08T14:30:00.000Z"
    }
  }
}
```

**⚠️ Important Notes:**
- Request must be in `"assigned"` status
- Once completed, status changes to `"completed"`
- `completedAt` timestamp is automatically set

**Error Response (404):**
```json
{
  "success": false,
  "message": "Request not found or not in assigned state."
}
```

---

## 5. Receipt Management

**⚠️ All receipt endpoints require `manager` role**

### 5.1 Get All Receipts
**Endpoint:** `GET /api/v1/receipts`  
**Role Required:** `manager`

**Request:**
```
GET http://localhost:5000/api/v1/receipts?page=1&limit=20
Authorization: Bearer <managerAccessToken>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page

**Response (200):**
```json
{
  "success": true,
  "message": "Receipts fetched.",
  "data": [
    {
      "_id": "69d61bf4c46959fd22ffeeac",
      "receiptNumber": "WTR-20260408-0001",
      "requestId": "69d61bf4c46959fd22ffeeaa",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "tankerNumber": "WT-1234",
      "driverName": "Mike Johnson",
      "driverMobile": "9876543210",
      "queuePosition": 1,
      "generatedBy": "69d61bf4c46959fd22ffeea0",
      "generatedAt": "2026-04-08T15:00:00.000Z",
      "printedAt": null,
      "printCount": 0,
      "createdAt": "2026-04-08T15:00:00.000Z",
      "updatedAt": "2026-04-08T15:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

---

### 5.2 Generate Receipt
**Endpoint:** `POST /api/v1/receipts/request/:requestId`  
**Role Required:** `manager`

**Request:**
```
POST http://localhost:5000/api/v1/receipts/request/69d61bf4c46959fd22ffeeaa
Authorization: Bearer <managerAccessToken>
```

**⚠️ Important:**
- Request must exist and have a tanker assigned (`status: "assigned"` or `"completed"`)
- One receipt per request (unique constraint)
- Receipt number is auto-generated with format: `{PREFIX}-{DATE}-{SEQUENCE}`

**Response (201):**
```json
{
  "success": true,
  "message": "Receipt generated successfully.",
  "data": {
    "receipt": {
      "_id": "69d61bf4c46959fd22ffeeac",
      "receiptNumber": "WTR-20260408-0001",
      "requestId": "69d61bf4c46959fd22ffeeaa",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "tankerNumber": "WT-1234",
      "driverName": "Mike Johnson",
      "driverMobile": "9876543210",
      "queuePosition": 1,
      "generatedBy": "69d61bf4c46959fd22ffeea0",
      "generatedAt": "2026-04-08T15:00:00.000Z",
      "printedAt": null,
      "printCount": 0,
      "createdAt": "2026-04-08T15:00:00.000Z",
      "updatedAt": "2026-04-08T15:00:00.000Z"
    }
  }
}
```

**Error Response (409):**
```json
{
  "success": false,
  "message": "A receipt already exists for this request."
}
```

---

### 5.3 Get Receipt by Request ID
**Endpoint:** `GET /api/v1/receipts/request/:requestId`  
**Role Required:** `manager`

**Request:**
```
GET http://localhost:5000/api/v1/receipts/request/69d61bf4c46959fd22ffeeaa
Authorization: Bearer <managerAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Receipt fetched.",
  "data": {
    "receipt": {
      "_id": "69d61bf4c46959fd22ffeeac",
      "receiptNumber": "WTR-20260408-0001",
      "requestId": "69d61bf4c46959fd22ffeeaa",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "tankerNumber": "WT-1234",
      "driverName": "Mike Johnson",
      "driverMobile": "9876543210",
      "queuePosition": 1,
      "generatedBy": {
        "_id": "69d61bf4c46959fd22ffeea0",
        "mobileNumber": "9876543211",
        "role": "manager",
        "profile": {
          "name": "Manager User",
          "societyName": "Office",
          "address": "Admin Office",
          "contactPerson": "Manager User"
        }
      },
      "generatedAt": "2026-04-08T15:00:00.000Z",
      "printedAt": null,
      "printCount": 0,
      "createdAt": "2026-04-08T15:00:00.000Z",
      "updatedAt": "2026-04-08T15:00:00.000Z"
    }
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Receipt not found for this request."
}
```

---

### 5.4 Mark Receipt as Printed
**Endpoint:** `PATCH /api/v1/receipts/:id/printed`  
**Role Required:** `manager`

**Request:**
```
PATCH http://localhost:5000/api/v1/receipts/69d61bf4c46959fd22ffeeac/printed
Authorization: Bearer <managerAccessToken>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Receipt marked as printed.",
  "data": {
    "receipt": {
      "_id": "69d61bf4c46959fd22ffeeac",
      "receiptNumber": "WTR-20260408-0001",
      "requestId": "69d61bf4c46959fd22ffeeaa",
      "societyName": "Green Valley Society",
      "address": "123 Main Street, Apt 4B",
      "contactPerson": "John Doe",
      "mobileNumber": "9876543210",
      "tankerNumber": "WT-1234",
      "driverName": "Mike Johnson",
      "driverMobile": "9876543210",
      "queuePosition": 1,
      "generatedBy": "69d61bf4c46959fd22ffeea0",
      "generatedAt": "2026-04-08T15:00:00.000Z",
      "printedAt": "2026-04-08T15:30:00.000Z",
      "printCount": 1,
      "createdAt": "2026-04-08T15:00:00.000Z",
      "updatedAt": "2026-04-08T15:30:00.000Z"
    }
  }
}
```

**⚠️ Notes:**
- Each time you call this endpoint, `printCount` increments by 1
- `printedAt` is updated to the current timestamp

---

## 📊 Complete Workflow Example

Here's the typical sequence for testing all endpoints:

### **Step 1: Register a Member**
```bash
POST /api/v1/auth/register
```

### **Step 2: Login as Member**
```bash
POST /api/v1/auth/login
# Save the accessToken
```

### **Step 3: Member Submits a Request**
```bash
POST /api/v1/requests
Authorization: Bearer <member_token>
```

### **Step 4: Promote User to Manager**
```bash
node src/utils/promote-to-manager.js
```

### **Step 5: Login as Manager**
```bash
POST /api/v1/auth/login
# Save the new accessToken with manager role
```

### **Step 6: View All Requests**
```bash
GET /api/v1/requests
Authorization: Bearer <manager_token>
# Copy the request ID from response
```

### **Step 7: View Pending Queue**
```bash
GET /api/v1/queue
Authorization: Bearer <manager_token>
```

### **Step 8: Assign Tanker**
```bash
PATCH /api/v1/queue/{requestId}/assign
Authorization: Bearer <manager_token>
Body: { "tankerNumber": "WT-1234", "driverName": "Mike", "driverMobile": "9876543210" }
```

### **Step 9: Complete Request**
```bash
PATCH /api/v1/queue/{requestId}/complete
Authorization: Bearer <manager_token>
```

### **Step 10: Generate Receipt**
```bash
POST /api/v1/receipts/request/{requestId}
Authorization: Bearer <manager_token>
```

### **Step 11: Mark Receipt as Printed**
```bash
PATCH /api/v1/receipts/{receiptId}/printed
Authorization: Bearer <manager_token>
```

---

## 🔑 Role Summary

| Role | Permissions |
|------|-------------|
| **member** | Register, Login, Submit requests, View own requests, Cancel requests |
| **manager** | All member permissions + View all requests, Manage queue, Assign tankers, Complete requests, Generate/manage receipts |

---

## 🚨 Common Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden (Wrong Role)
```json
{
  "success": false,
  "message": "Access denied. Required role(s): manager."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Request not found."
}
```

### 400 Validation Error
```json
{
  "success": false,
  "message": "Request validation failed.",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation message here"
    }
  ]
}
```

### 429 Rate Limit Exceeded
```json
{
  "success": false,
  "message": "Too many requests, please try again later."
}
```
