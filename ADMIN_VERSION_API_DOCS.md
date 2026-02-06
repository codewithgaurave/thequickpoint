# App Version Management API Documentation

## Base URL: `http://localhost:5000/api/app-version`

---

## 🔐 Authentication
Admin APIs require Bearer token in Authorization header:
```
Authorization: Bearer <admin_token>
```

**Admin Login:**
```http
POST /api/admin/login
Content-Type: application/json

{
  "adminId": "digicoders",
  "password": "digicoders"
}
```

---

## 📱 Public APIs (No Authentication)

### 1. Get Latest Version
```http
GET /api/app-version/latest?platform=android
```

**Query Parameters:**
- `platform` (optional): `android`, `ios`, `both`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "697fb47f9510643ff2e8dafb",
    "versionCode": 106,
    "versionName": "1.0.6",
    "platform": "both",
    "isForceUpdate": false,
    "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
    "releaseNotes": "Bug fixes and performance improvements",
    "isActive": true,
    "createdAt": "2026-02-01T20:15:59.413Z",
    "updatedAt": "2026-02-01T20:15:59.415Z"
  },
  "message": "Latest version retrieved successfully"
}
```

### 2. Check Update Required
```http
POST /api/app-version/check-update
Content-Type: application/json

{
  "currentVersionCode": 105,
  "platform": "android"
}
```

**Response:**
```json
{
  "updateRequired": true,
  "forceUpdate": false,
  "latestVersion": 106,
  "latestVersionName": "1.0.6",
  "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
  "releaseNotes": "Bug fixes and performance improvements",
  "message": "Update available"
}
```

### 3. Get Latest Save Info
```http
GET /api/app-version/latest-save?type=all
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "697f9c63b34787cf848b5bc1",
      "createdAt": "2026-02-01T18:33:07.428Z",
      "updatedAt": "2026-02-01T18:33:07.428Z",
      "type": "User"
    },
    "product": {
      "id": "6942410b662d2da0dddbd697",
      "createdAt": "2025-12-17T05:35:07.745Z",
      "updatedAt": "2026-01-16T09:01:48.485Z",
      "type": "Product"
    }
  },
  "timestamp": "2026-02-01T20:16:21.016Z",
  "message": "Latest save information retrieved successfully"
}
```

---

## 🔒 Admin APIs (Authentication Required)

### 4. Create New Version
```http
POST /api/app-version
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "versionCode": 107,
  "versionName": "1.0.7",
  "platform": "both",
  "isForceUpdate": false,
  "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
  "releaseNotes": "New features and bug fixes"
}
```

**Request Body:**
- `versionCode` (required): Numeric version code (e.g., 107)
- `versionName` (required): Display version (e.g., "1.0.7")
- `platform` (optional): `"android"`, `"ios"`, `"both"` (default: "both")
- `isForceUpdate` (optional): `true/false` (default: false)
- `downloadUrl` (optional): App store URL
- `releaseNotes` (optional): Update description

**Response:**
```json
{
  "success": true,
  "data": {
    "versionCode": 107,
    "versionName": "1.0.7",
    "platform": "both",
    "isForceUpdate": false,
    "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
    "releaseNotes": "New features and bug fixes",
    "isActive": true,
    "_id": "697fb47f9510643ff2e8dafb",
    "createdAt": "2026-02-01T20:15:59.413Z",
    "updatedAt": "2026-02-01T20:15:59.415Z"
  },
  "message": "Version created successfully"
}
```

### 5. Get All Versions
```http
GET /api/app-version/all?page=1&limit=10&platform=android
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `platform` (optional): Filter by platform

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "697fb47f9510643ff2e8dafb",
      "versionCode": 106,
      "versionName": "1.0.6",
      "platform": "both",
      "isForceUpdate": false,
      "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
      "releaseNotes": "Bug fixes and performance improvements",
      "isActive": true,
      "createdAt": "2026-02-01T20:15:59.413Z",
      "updatedAt": "2026-02-01T20:15:59.415Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalItems": 1,
    "itemsPerPage": 10
  },
  "message": "Versions retrieved successfully"
}
```

### 6. Update Version
```http
PUT /api/app-version/<version_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "isForceUpdate": true,
  "releaseNotes": "Critical security update - force update required"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "697fb47f9510643ff2e8dafb",
    "versionCode": 106,
    "versionName": "1.0.6",
    "platform": "both",
    "isForceUpdate": true,
    "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
    "releaseNotes": "Critical security update - force update required",
    "isActive": true,
    "createdAt": "2026-02-01T20:15:59.413Z",
    "updatedAt": "2026-02-01T20:25:30.123Z"
  },
  "message": "Version updated successfully"
}
```

### 7. Delete Version
```http
DELETE /api/app-version/<version_id>
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Version deleted successfully"
}
```

---

## 📋 Version Code Guidelines

**Version Code Mapping:**
- Version 1.0.0 = Code 100
- Version 1.0.1 = Code 101
- Version 1.0.5 = Code 105
- Version 1.0.6 = Code 106
- Version 1.1.0 = Code 110
- Version 2.0.0 = Code 200

**Platform Values:**
- `"android"` - Android only
- `"ios"` - iOS only  
- `"both"` - Both platforms

**Force Update:**
- `true` - Users must update to continue
- `false` - Optional update

---

## 🚨 Error Responses

**400 Bad Request:**
```json
{
  "message": "Version code and version name are required"
}
```

**401 Unauthorized:**
```json
{
  "message": "Missing auth token"
}
```

**409 Conflict:**
```json
{
  "message": "Version code already exists"
}
```

**404 Not Found:**
```json
{
  "message": "Version not found"
}
```

**500 Server Error:**
```json
{
  "message": "Server error",
  "error": "Error details"
}
```

---

## 🔧 Admin Panel Integration

**Step 1: Login**
```javascript
const loginResponse = await fetch('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    adminId: 'digicoders',
    password: 'digicoders'
  })
});
const { token } = await loginResponse.json();
```

**Step 2: Create Version**
```javascript
const createResponse = await fetch('/api/app-version', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    versionCode: 107,
    versionName: '1.0.7',
    platform: 'both',
    isForceUpdate: false,
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.quickpoint',
    releaseNotes: 'New features and improvements'
  })
});
```

**Step 3: Get All Versions**
```javascript
const versionsResponse = await fetch('/api/app-version/all?page=1&limit=10', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data, pagination } = await versionsResponse.json();
```