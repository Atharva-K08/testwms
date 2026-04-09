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
6. [Diesel Filling Management](#6-diesel-filling-management)

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

**⚠️ Important:**

- This endpoint is **public** - anyone can register
- Registered users always get `member` role by default
- Manager and Fuel Manager accounts can **only** be created by Super Admin

---

### 2.2 Login (All Roles)

**Endpoint:** `POST /api/v1/auth/login`

**Request:**

```
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json
```

**Body (Regular User - Mobile Number):**

```json
{
  "mobileNumber": "9876543210",
  "password": "Password123"
}
```

**Body (Super Admin - Username):**

```json
{
  "username": "admin",
  "password": "root"
}
```

**Response (200) - Super Admin:**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "_id": "69d74a1b55680221be2120a1",
      "username": "admin",
      "role": "superAdmin",
      "profile": {
        "name": "Super Administrator",
        "societyName": "System",
        "address": "System",
        "contactPerson": "Super Administrator"
      },
      "isActive": true,
      "lastLoginAt": "2026-04-09T10:30:00.000Z",
      "createdAt": "2026-04-09T10:30:00.000Z",
      "updatedAt": "2026-04-09T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (200) - Member:**

```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "_id": "69d74004c67ab2ee91e9fced",
      "mobileNumber": "9876543210",
      "role": "member",
      "profile": {
        "name": "John Doe",
        "societyName": "Green Valley Society",
        "address": "123 Main Street, Apt 4B",
        "contactPerson": "John Doe"
      },
      "isActive": true,
      "lastLoginAt": "2026-04-09T10:30:00.000Z",
      "createdAt": "2026-04-09T06:00:00.000Z",
      "updatedAt": "2026-04-09T10:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**⚠️ Login Rules:**

- **Members/Managers/FuelManagers**: Login with `mobileNumber` + `password`
- **Super Admin**: Login with `username: admin` + `password: root` (hardcoded)
- On first Super Admin login, the account is auto-created in the database
- Copy the `accessToken` and use it in the Authorization header:
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

### 2.3 Create Manager or Fuel Manager (Super Admin Only)

**Endpoint:** `POST /api/v1/auth/create-manager`
**Role Required:** `superAdmin`

**Request:**

```
POST http://localhost:5000/api/v1/auth/create-manager
Authorization: Bearer <superAdminAccessToken>
Content-Type: application/json
```

**Body (Create Manager):**

```json
{
  "mobileNumber": "9998887776",
  "password": "ManagerPass123",
  "role": "manager",
  "profile": {
    "name": "Manager User",
    "societyName": "Admin Office",
    "address": "Admin Office Address",
    "contactPerson": "Manager User"
  }
}
```

**Body (Create Fuel Manager):**

```json
{
  "mobileNumber": "9998887775",
  "password": "FuelPass123",
  "role": "fuelManager",
  "profile": {
    "name": "Fuel Manager",
    "societyName": "Fuel Station",
    "address": "Fuel Station Address",
    "contactPerson": "Fuel Manager"
  }
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Manager created successfully.",
  "data": {
    "_id": "69d74b2c55680221be2120b2",
    "mobileNumber": "9998887776",
    "role": "manager",
    "profile": {
      "name": "Manager User",
      "societyName": "Admin Office",
      "address": "Admin Office Address",
      "contactPerson": "Manager User"
    },
    "isActive": true,
    "createdAt": "2026-04-09T10:35:00.000Z",
    "updatedAt": "2026-04-09T10:35:00.000Z"
  }
}
```

**⚠️ Important Rules:**

- **Only Super Admin** can call this endpoint
- `role` must be either `"manager"` or `"fuelManager"`
- `mobileNumber`: Exactly 10 digits, numeric only
- `password`: Minimum 6 characters, at least 1 uppercase letter, 1 number
- All `profile` fields are required
- Cannot create duplicate mobile numbers

**Error Response (403) - Not Super Admin:**

```json
{
  "success": false,
  "message": "Unauthorized. Only Super Admin can create managers."
}
```

**Error Response (400) - Invalid Role:**

```json
{
  "success": false,
  "message": "Request validation failed.",
  "errors": [
    {
      "field": "role",
      "message": "Role must be either manager or fuelManager."
    }
  ]
}
```

---

### 2.4 Refresh Access Token

````

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
````

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

## 6. Diesel Filling Management

**⚠️ All diesel filling endpoints require `fuelManager` role**

### 6.1 Record Diesel Filling

**Endpoint:** `POST /api/v1/diesel-fillings`
**Role Required:** `fuelManager`

**Request:**

```
POST http://localhost:5000/api/v1/diesel-fillings
Authorization: Bearer <fuelManagerAccessToken>
Content-Type: application/json
```

**Body:**

```json
{
  "tankerNumber": "WT-1234",
  "dateTime": "2026-04-08T10:00:00.000Z",
  "dieselAmount": 5000,
  "liters": 150
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "Diesel filling recorded successfully",
  "data": {
    "_id": "69d61bf4c46959fd22ffeead",
    "tankerNumber": "WT-1234",
    "dateTime": "2026-04-08T10:00:00.000Z",
    "dieselAmount": 5000,
    "liters": 150,
    "filledBy": "69d61bf4c46959fd22ffeea0",
    "tripsSinceLastFill": 12,
    "lastFillingDate": "2026-04-05T08:00:00.000Z",
    "createdAt": "2026-04-08T10:00:00.000Z",
    "updatedAt": "2026-04-08T10:00:00.000Z"
  }
}
```

**⚠️ Important Notes:**

- `tankerNumber`: Required, max 20 characters
- `dateTime`: Optional (defaults to current time if not provided), ISO 8601 format
- `dieselAmount`: Required, must be non-negative (e.g., cost in currency)
- `liters`: Required, must be non-negative (volume of diesel)
- The system automatically calculates:
  - `tripsSinceLastFill`: Number of completed trips by this tanker since the last diesel filling
  - `lastFillingDate`: Date of the previous diesel filling for this tanker

**Validation Error (400):**

```json
{
  "success": false,
  "message": "Request validation failed.",
  "errors": [
    {
      "field": "tankerNumber",
      "message": "Tanker number is required."
    },
    {
      "field": "liters",
      "message": "Liters must be a non-negative number."
    }
  ]
}
```

---

### 6.2 Get All Diesel Fillings

**Endpoint:** `GET /api/v1/diesel-fillings`
**Role Required:** `fuelManager`

**Request:**

```
GET http://localhost:5000/api/v1/diesel-fillings?page=1&limit=20&tankerNumber=WT-1234&startDate=2026-04-01T00:00:00.000Z&endDate=2026-04-30T23:59:59.000Z
Authorization: Bearer <fuelManagerAccessToken>
```

**Query Parameters:**

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `tankerNumber` (optional): Filter by specific tanker
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)

**Response (200):**

```json
{
  "success": true,
  "message": "Diesel fillings retrieved successfully",
  "data": [
    {
      "_id": "69d73f7cc67ab2ee91e9fcea",
      "tankerNumber": "WT-1234",
      "dateTime": "2026-04-09T10:00:00.000Z",
      "dieselAmount": 5000,
      "liters": 150,
      "filledBy": {
        "_id": "69d73cbc564ef77154956101",
        "mobileNumber": "9998887776",
        "role": "fuelManager",
        "profile": {
          "name": "Fuel Manager"
        }
      },
      "tripsSinceLastFill": 0,
      "lastFillingDate": null,
      "createdAt": "2026-04-09T05:56:12.724Z",
      "updatedAt": "2026-04-09T05:56:12.724Z",
      "__v": 0
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 6.3 Get Diesel Filling by ID

**Endpoint:** `GET /api/v1/diesel-fillings/:id`
**Role Required:** `fuelManager`

**Request:**

```
GET http://localhost:5000/api/v1/diesel-fillings/69d73f7cc67ab2ee91e9fcea
Authorization: Bearer <fuelManagerAccessToken>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Diesel filling retrieved successfully",
  "data": {
    "_id": "69d73f7cc67ab2ee91e9fcea",
    "tankerNumber": "WT-1234",
    "dateTime": "2026-04-09T10:00:00.000Z",
    "dieselAmount": 5000,
    "liters": 150,
    "filledBy": {
      "_id": "69d73cbc564ef77154956101",
      "mobileNumber": "9998887776",
      "role": "fuelManager",
      "profile": {
        "name": "Fuel Manager"
      }
    },
    "tripsSinceLastFill": 0,
    "lastFillingDate": null,
    "createdAt": "2026-04-09T05:56:12.724Z",
    "updatedAt": "2026-04-09T05:56:12.724Z",
    "__v": 0
  }
}
```

---

### 6.4 Update Diesel Filling

**Endpoint:** `PUT /api/v1/diesel-fillings/:id`
**Role Required:** `fuelManager`

**Request:**

```
PUT http://localhost:5000/api/v1/diesel-fillings/69d73f7cc67ab2ee91e9fcea
Authorization: Bearer <fuelManagerAccessToken>
Content-Type: application/json
```

**Body (all fields optional):**

```json
{
  "dieselAmount": 5500,
  "liters": 160
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Diesel filling updated successfully",
  "data": {
    "_id": "69d73f7cc67ab2ee91e9fcea",
    "tankerNumber": "WT-1234",
    "dateTime": "2026-04-09T10:00:00.000Z",
    "dieselAmount": 5500,
    "liters": 160,
    "filledBy": "69d73cbc564ef77154956101",
    "tripsSinceLastFill": 0,
    "lastFillingDate": null,
    "createdAt": "2026-04-09T05:56:12.724Z",
    "updatedAt": "2026-04-09T06:30:00.000Z",
    "__v": 0
  }
}
```

---

### 6.5 Delete Diesel Filling

**Endpoint:** `DELETE /api/v1/diesel-fillings/:id`
**Role Required:** `fuelManager`

**Request:**

```
DELETE http://localhost:5000/api/v1/diesel-fillings/69d73f7cc67ab2ee91e9fcea
Authorization: Bearer <fuelManagerAccessToken>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Diesel filling deleted successfully"
}
```

---

### 6.6 Generate Diesel Report (with Trip Analysis)

**Endpoint:** `GET /api/v1/diesel-fillings/report`
**Role Required:** `fuelManager`

**Request:**

```
GET http://localhost:5000/api/v1/diesel-fillings/report?page=1&limit=20&tankerNumber=WT-1234&startDate=2026-04-01T00:00:00.000Z&endDate=2026-04-30T23:59:59.000Z
Authorization: Bearer <fuelManagerAccessToken>
```

**Query Parameters:**

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `tankerNumber` (optional): Filter by specific tanker
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)

**Response (200):**

```json
{
  "success": true,
  "message": "Diesel report generated successfully",
  "data": [
    {
      "_id": "69d7473555680221be21205c",
      "tankerNumber": "WT-1234",
      "dateTime": "2026-04-09T10:00:00.000Z",
      "dieselAmount": 5000,
      "liters": 150,
      "filledBy": {
        "_id": "69d73cbc564ef77154956101",
        "mobileNumber": "9998887776",
        "role": "fuelManager",
        "profile": {
          "name": "Fuel Manager"
        }
      },
      "tripsSinceLastFill": 0,
      "lastFillingDate": "2026-04-09T10:00:00.000Z",
      "createdAt": "2026-04-09T06:29:09.984Z",
      "updatedAt": "2026-04-09T06:29:09.984Z",
      "__v": 0,
      "trips": [
        {
          "completedAt": "2026-04-09T06:26:48.365Z",
          "societyName": "Green Valley Society",
          "address": "123 Main Street, Apt 4B",
          "tankerNumber": "WT-12345"
        }
      ],
      "tripCount": 1
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

**⚠️ Notes:**

- This endpoint provides detailed trip breakdown for each diesel filling
- `trips` array contains all completed trips between last diesel filling and current filling
- `tripCount` matches `tripsSinceLastFill` for verification

---

### 6.7 Get Tanker Diesel Summary

**Endpoint:** `GET /api/v1/diesel-fillings/summary/:tankerNumber`
**Role Required:** `fuelManager`

**Request:**

```
GET http://localhost:5000/api/v1/diesel-fillings/summary/WT-1234
Authorization: Bearer <fuelManagerAccessToken>
```

**Response (200):**

```json
{
  "success": true,
  "message": "Tanker diesel summary retrieved successfully",
  "data": {
    "tankerNumber": "WT-1234",
    "totalFillings": 2,
    "totalDieselAmount": 10000,
    "totalLiters": 300,
    "totalTripsRecorded": 0,
    "totalCompletedTrips": 1,
    "averageLitersPerTrip": 0,
    "lastFillingDate": "2026-04-09T10:00:00.000Z",
    "firstFillingDate": "2026-04-09T10:00:00.000Z"
  }
}
```

**⚠️ Notes:**

- `totalTripsRecorded`: Sum of all `tripsSinceLastFill` values from diesel entries
- `totalCompletedTrips`: Actual count of completed requests for this tanker from the database
- `averageLitersPerTrip`: Calculated as totalLiters / totalTripsRecorded (shows 0 if no trips recorded)
- Useful for fuel efficiency analysis

---

## 📊 Complete Workflow Example

Here's the typical sequence for testing all endpoints:

### **Step 1: Login as Super Admin (First Time)**

```bash
POST /api/v1/auth/login
Body: { "username": "admin", "password": "root" }
# Save the superAdmin accessToken
```

### **Step 2: Create a Manager (Super Admin)**

```bash
POST /api/v1/auth/create-manager
Authorization: Bearer <superAdmin_token>
Body: {
  "mobileNumber": "9998887776",
  "password": "ManagerPass123",
  "role": "manager",
  "profile": {
    "name": "Manager User",
    "societyName": "Admin Office",
    "address": "Admin Office",
    "contactPerson": "Manager User"
  }
}
```

### **Step 3: Create a Fuel Manager (Super Admin)**

```bash
POST /api/v1/auth/create-manager
Authorization: Bearer <superAdmin_token>
Body: {
  "mobileNumber": "9998887775",
  "password": "FuelPass123",
  "role": "fuelManager",
  "profile": {
    "name": "Fuel Manager",
    "societyName": "Fuel Station",
    "address": "Fuel Station",
    "contactPerson": "Fuel Manager"
  }
}
```

### **Step 4: Register a Member (Public)**

```bash
POST /api/v1/auth/register
```

### **Step 5: Login as Member**

```bash
POST /api/v1/auth/login
# Save the member accessToken
```

### **Step 6: Member Submits a Request**

```bash
POST /api/v1/requests
Authorization: Bearer <member_token>
```

### **Step 7: Login as Manager**

```bash
POST /api/v1/auth/login
Body: { "mobileNumber": "9998887776", "password": "ManagerPass123" }
# Save the manager accessToken
```

### **Step 8: View All Requests**

```bash
GET /api/v1/requests
Authorization: Bearer <manager_token>
# Copy the request ID from response
```

### **Step 9: View Pending Queue**

```bash
GET /api/v1/queue
Authorization: Bearer <manager_token>
```

### **Step 10: Assign Tanker**

```bash
PATCH /api/v1/queue/{requestId}/assign
Authorization: Bearer <manager_token>
Body: { "tankerNumber": "WT-1234", "driverName": "Mike", "driverMobile": "9876543210" }
```

### **Step 11: Complete Request**

```bash
PATCH /api/v1/queue/{requestId}/complete
Authorization: Bearer <manager_token>
```

### **Step 12: Generate Receipt**

```bash
POST /api/v1/receipts/request/{requestId}
Authorization: Bearer <manager_token>
```

### **Step 13: Login as Fuel Manager**

```bash
POST /api/v1/auth/login
Body: { "mobileNumber": "9998887775", "password": "FuelPass123" }
# Save the fuelManager accessToken
```

### **Step 14: Record Diesel Filling**

```bash
POST /api/v1/diesel-fillings
Authorization: Bearer <fuelManager_token>
Body: { "tankerNumber": "WT-1234", "dieselAmount": 5000, "liters": 150 }
```

### **Step 15: Mark Receipt as Printed**

```bash
PATCH /api/v1/receipts/{receiptId}/printed
Authorization: Bearer <manager_token>
```

---

## 🔑 Role Summary

| Role            | Permissions                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------- |
| **superAdmin**  | Login with hardcoded credentials (`admin`/`root`), Create Manager and Fuel Manager accounts                           |
| **member**      | Register, Login, Submit requests, View own requests, Cancel requests                                                  |
| **manager**     | All member permissions + View all requests, Manage queue, Assign tankers, Complete requests, Generate/manage receipts |
| **fuelManager** | Record diesel fillings, View diesel data, Generate diesel reports, View tanker summaries                              |

**⚠️ Important Role Hierarchy:**

- **superAdmin**: Only creates managers, cannot do regular user actions
- **member**: Public registration, limited to own requests
- **manager**: Created by superAdmin, full request/queue/receipt control
- **fuelManager**: Created by superAdmin, diesel management only

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
