# Super Admin - Quick Reference Guide

## 🔐 Super Admin Credentials (Hardcoded)

- **Username:** `admin`
- **Password:** `root`

---

## 📋 Step-by-Step Postman Testing

### **Step 1: Login as Super Admin**

**Endpoint:**
```
POST http://localhost:5000/api/v1/auth/login
```

**Body:**
```json
{
  "username": "admin",
  "password": "root"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "_id": "...",
      "username": "admin",
      "role": "superAdmin",
      "profile": {
        "name": "Super Administrator",
        "societyName": "System",
        "address": "System",
        "contactPerson": "Super Administrator"
      },
      "isActive": true
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**⚠️ Copy the `accessToken` for next steps!**

---

### **Step 2: Create a Manager**

**Endpoint:**
```
POST http://localhost:5000/api/v1/auth/create-manager
```

**Headers:**
```
Authorization: Bearer <superAdmin_accessToken>
Content-Type: application/json
```

**Body:**
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

**Expected Response:**
```json
{
  "success": true,
  "message": "Manager created successfully.",
  "data": {
    "_id": "...",
    "mobileNumber": "9998887776",
    "role": "manager",
    "profile": {
      "name": "Manager User",
      "societyName": "Admin Office",
      "address": "Admin Office Address",
      "contactPerson": "Manager User"
    },
    "isActive": true
  }
}
```

---

### **Step 3: Create a Fuel Manager**

**Endpoint:**
```
POST http://localhost:5000/api/v1/auth/create-manager
```

**Headers:**
```
Authorization: Bearer <superAdmin_accessToken>
Content-Type: application/json
```

**Body:**
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

**Expected Response:**
```json
{
  "success": true,
  "message": "Fuel Manager created successfully.",
  "data": {
    "_id": "...",
    "mobileNumber": "9998887775",
    "role": "fuelManager",
    "profile": {
      "name": "Fuel Manager",
      "societyName": "Fuel Station",
      "address": "Fuel Station Address",
      "contactPerson": "Fuel Manager"
    },
    "isActive": true
  }
}
```

---

### **Step 4: Login as Manager**

**Endpoint:**
```
POST http://localhost:5000/api/v1/auth/login
```

**Body:**
```json
{
  "mobileNumber": "9998887776",
  "password": "ManagerPass123"
}
```

**⚠️ Save this `accessToken` for Queue/Receipt operations!**

---

### **Step 5: Login as Fuel Manager**

**Endpoint:**
```
POST http://localhost:5000/api/v1/auth/login
```

**Body:**
```json
{
  "mobileNumber": "9998887775",
  "password": "FuelPass123"
}
```

**⚠️ Save this `accessToken` for Diesel operations!**

---

## 🚫 Important Restrictions

### **What Super Admin CAN Do:**
✅ Login with `admin` / `root`
✅ Create Manager accounts
✅ Create Fuel Manager accounts
✅ View their own profile

### **What Super Admin CANNOT Do:**
❌ Submit water tanker requests
✅ Only Super Admin can create managers
❌ Manage queue
❌ Assign tankers
❌ Complete requests
❌ Manage receipts
❌ Record diesel fillings

### **What Regular Users CANNOT Do:**
❌ Members cannot create managers
❌ Managers cannot create managers
❌ Fuel Managers cannot create managers
❌ No one except Super Admin can access `/create-manager` endpoint

---

## 🔍 Testing Authorization (Should Fail)

### **Test 1: Member trying to create Manager**

```
POST http://localhost:5000/api/v1/auth/create-manager
Authorization: Bearer <member_accessToken>
Body: { ... manager data ... }
```

**Expected Error (403):**
```json
{
  "success": false,
  "message": "Unauthorized. Only Super Admin can create managers."
}
```

### **Test 2: Manager trying to create Manager**

```
POST http://localhost:5000/api/v1/auth/create-manager
Authorization: Bearer <manager_accessToken>
Body: { ... manager data ... }
```

**Expected Error (403):**
```json
{
  "success": false,
  "message": "Access denied. Required role(s): superAdmin."
}
```

---

## 📊 Role Hierarchy

```
superAdmin (admin/root)
    ↓ creates
manager / fuelManager
    ↓ manages
member (public registration)
```

---

## 🎯 Key Points

1. **Super Admin credentials are hardcoded** in `src/config/constants.js`
2. **First Super Admin login** auto-creates the account in database
3. **Public registration** still works - anyone can register as `member`
4. **Only Super Admin** can create `manager` and `fuelManager` roles
5. **All authorization** is enforced via middleware
6. **Passwords** are hashed with bcrypt (12 rounds)

---

## 🛠️ Files Modified

- ✅ `src/config/constants.js` - Added SUPER_ADMIN role and credentials
- ✅ `src/models/user.model.js` - Added username field, made mobileNumber optional
- ✅ `src/services/auth.service.js` - Added Super Admin login and create manager logic
- ✅ `src/controllers/auth.controller.js` - Added createManager endpoint
- ✅ `src/routes/auth.routes.js` - Added /create-manager route with superAdmin auth
- ✅ `src/validators/auth.validator.js` - Added createManagerValidator
- ✅ `API_ENDPOINTS.md` - Complete documentation with examples

---

## 🚀 Quick Test Commands

```bash
# 1. Start the server
npm start

# 2. Login as Super Admin (Postman)
POST http://localhost:5000/api/v1/auth/login
Body: { "username": "admin", "password": "root" }

# 3. Create Manager (Postman - use token from step 2)
POST http://localhost:5000/api/v1/auth/create-manager
# See body examples above
```

---
