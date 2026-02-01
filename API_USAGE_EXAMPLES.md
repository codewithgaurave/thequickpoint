# App Version API Usage Examples

## Base URL: `http://localhost:5000/api/app-version`

## Public APIs (No Authentication Required)

### 1. Get Latest Version
```
GET /api/app-version/latest?platform=android
```

Response:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "versionCode": 12,
    "versionName": "1.2.0",
    "platform": "android",
    "isForceUpdate": false,
    "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
    "releaseNotes": "Bug fixes and improvements",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "message": "Latest version retrieved successfully"
}
```

### 2. Check Update Required
```
POST /api/app-version/check-update
Content-Type: application/json

{
  "currentVersionCode": 10,
  "platform": "android"
}
```

Response:
```json
{
  "updateRequired": true,
  "forceUpdate": false,
  "latestVersion": 12,
  "latestVersionName": "1.2.0",
  "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
  "releaseNotes": "Bug fixes and improvements",
  "message": "Update available"
}
```

### 3. Get Latest Save Info
```
GET /api/app-version/latest-save?type=all
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "type": "User"
    },
    "product": {
      "id": "...",
      "createdAt": "2024-01-15T09:15:00.000Z",
      "updatedAt": "2024-01-15T09:15:00.000Z",
      "type": "Product"
    }
  },
  "timestamp": "2024-01-15T10:35:00.000Z",
  "message": "Latest save information retrieved successfully"
}
```

## Admin APIs (Authentication Required)

### 4. Create New Version
```
POST /api/app-version
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "versionCode": 13,
  "versionName": "1.3.0",
  "platform": "both",
  "isForceUpdate": true,
  "downloadUrl": "https://play.google.com/store/apps/details?id=com.quickpoint",
  "releaseNotes": "Major update with new features"
}
```

### 5. Get All Versions
```
GET /api/app-version/all?page=1&limit=10&platform=android
Authorization: Bearer <admin_token>
```

### 6. Update Version
```
PUT /api/app-version/<version_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "isForceUpdate": true,
  "releaseNotes": "Updated release notes"
}
```

### 7. Delete Version
```
DELETE /api/app-version/<version_id>
Authorization: Bearer <admin_token>
```

## Usage in Flutter App

```dart
// Check for updates
Future<void> checkForUpdates() async {
  final response = await http.post(
    Uri.parse('$baseUrl/api/app-version/check-update'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'currentVersionCode': 10,
      'platform': 'android'
    }),
  );
  
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    if (data['updateRequired']) {
      // Show update dialog
      if (data['forceUpdate']) {
        // Force update - don't allow app to continue
      } else {
        // Optional update
      }
    }
  }
}

// Get latest save info
Future<void> getLatestSaveInfo() async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/app-version/latest-save'),
  );
  
  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    // Use latest save information
    print('Latest saves: ${data['data']}');
  }
}
```