# FLOW Backend API Documentation

## Base URL

```
Production:  http://YOUR_EC2_IP:3000/api
Development: http://localhost:3000/api
```

## Authentication

All requests (except public auth routes) require:
```
Authorization: Bearer <accessToken>
```

**Token flow:**
1. `POST /auth/login` → returns `{ accessToken, refreshToken, user }`
2. Client stores `accessToken` in memory, sends in `Authorization` header
3. On 401, client calls `POST /auth/refresh` with cookie/body to get new `accessToken`

**Response format (all endpoints):**
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2025-01-01T00:00:00.000Z",
    "total": 100,
    "hasMore": true
  }
}
```

**Error format:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

---

## 1. Authentication (`/api/auth`)

### 1.1 Register
```
POST /api/auth/register
Auth: No
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password1",
  "role": "broker | carrier | independent_driver | company_driver",
  "firstName": "John",
  "lastName": "Doe"
}
```
**Response 201:**
```json
{ "success": true, "data": { "userId": "...", "email": "...", "role": "..." } }
```

### 1.2 Login
```
POST /api/auth/login
Auth: No
```
**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password1"
}
```
**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "abc123...",
    "user": {
      "id": "...",
      "email": "...",
      "role": "broker",
      "firstName": "John",
      "lastName": "Doe",
      "isOnboardingComplete": false
    }
  }
}
```

### 1.3 Refresh Token
```
POST /api/auth/refresh
Auth: No
```
**Body:** `{ "refreshToken": "abc123..." }` (or send as `refreshToken` cookie)
**Response 200:**
```json
{ "success": true, "data": { "accessToken": "eyJ...", "refreshToken": "new123..." } }
```

### 1.4 Logout
```
POST /api/auth/logout
Auth: Yes
```
**Response 200:**
```json
{ "success": true, "data": null }
```

### 1.5 Forgot Password
```
POST /api/auth/forgot-password
Auth: No
```
**Body:** `{ "email": "user@example.com" }`
**Response 200:** OTP sent to email (always returns success)

### 1.6 Reset Password
```
POST /api/auth/reset-password
Auth: No
```
**Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewPassword1"
}
```

### 1.7 Verify Email
```
POST /api/auth/verify-email
Auth: No
```
**Body:** `{ "token": "email-verification-token" }`

### 1.8 Token Introspect
```
POST /api/auth/introspect
Auth: No
```
**Body:** `{ "token": "eyJ..." }`
**Response:** Full JWT claims (userId, role, companyId, permissions, verified, isOnboardingComplete)

### 1.9 Get Current User
```
GET /api/auth/me
Auth: Yes
```
**Response:** Full user profile (minus password/refreshToken fields)

### 1.10 Change Password
```
POST /api/auth/change-password
Auth: Yes
```
**Body:**
```json
{
  "currentPassword": "old",
  "newPassword": "NewPassword1"
}
```

### 1.11 Verify Identity (Upload Documents)
```
POST /api/auth/verify-identity
Auth: Yes
```
**Content-Type:** `multipart/form-data`
**Fields:**
- `documents` — file field (multiple, max 5 files, each max 25MB, PDF/JPG/PNG only)
- `verificationMethod` — `"fmcsa"` (auto) or `"manual"` (admin review)

**Response:**
```json
{
  "success": true,
  "data": {
    "identityStatus": "submitted | approved | rejected",
    "identityVerified": false,
    "verificationMethod": "manual | fmcsa"
  }
}
```

### 1.12 Complete Onboarding Steps
```
PATCH /api/auth/onboarding/profile  — Profile info
PATCH /api/auth/onboarding/business — Company/MC/DOT details
PATCH /api/auth/onboarding/stripe   — Stripe account connection
PATCH /api/auth/onboarding/prefs   — Equipment & notification preferences
Auth: Yes
```
**Body (profile):** `{ "firstName": "John", "lastName": "Doe", "phone": "555-0123" }`
**Body (business):** `{ "companyName": "...", "mcNumber": "...", "dotNumber": "...", "address": {...} }`
**Body (stripe):** `{ "stripeAccountId": "acct_..." }`
**Body (prefs):** `{ "equipmentTypes": ["dry_van"], "notificationPreferences": {...} }`

---

## 2. Users (`/api/users`) — Auth Required

### 2.1 List Users
```
GET /api/users
```
**Query:** `?status=active&role=broker`

### 2.2 Get User Profile
```
GET /api/users/:id
```

### 2.3 Update Profile
```
PATCH /api/users/:id
```
**Body:** `{ "firstName": "...", "lastName": "...", "phone": "...", "timezone": "...", "avatar": "..." }`

### 2.4 Create Business Profile
```
POST /api/users/:id/business-profile
```

### 2.5 Get User Permissions
```
GET /api/users/:id/permissions
```
**Response:** `{ permissions: ["loads.view", "loads.book", ...] }`

### 2.6 Delete Account
```
DELETE /api/users/:id
```

---

## 3. Teams (`/api/teams`) — Auth Required

### 3.1 List Members
```
GET /api/teams
GET /api/teams/members
```

### 3.2 Invite Member
```
POST /api/teams/members
POST /api/teams/invite
```
**Body:** `{ "email": "driver@example.com", "roleId": "role-id" }`

### 3.3 Accept Invite (PUBLIC)
```
POST /api/teams/accept-invite
Auth: No
```
**Body:** `{ "token": "invite-token" }`

### 3.4 Update Member
```
PATCH /api/teams/members/:memberId
```
**Body:** `{ "roleId": "new-role-id" }`

### 3.5 Remove Member
```
DELETE /api/teams/members/:memberId
```

### 3.6 List Roles
```
GET /api/teams/roles
```

### 3.7 Create Role
```
POST /api/teams/roles
```
**Body:** `{ "name": "Dispatcher", "permissions": ["loads.view", "fleet.view"] }`

### 3.8 Update Role
```
PUT /api/teams/roles/:roleId
```
**Body:** `{ "permissions": ["loads.view", "loads.book"] }`

### 3.9 Delete Role
```
DELETE /api/teams/roles/:roleId
```
**Body:** `{ "reassignToRoleId": "..." }` (required if role has members)

---

## 4. Admin (`/api/admin`) — Auth Required + Admin Role

### 4.1 List Pending Verifications
```
GET /api/admin/verifications
Role: admin
```
**Query:** `?status=submitted&method=manual&page=1&limit=20`

### 4.2 Approve Identity
```
POST /api/admin/verifications/:userId/approve
Role: admin
```

### 4.3 Reject Identity
```
POST /api/admin/verifications/:userId/reject
Role: admin
```
**Body:** `{ "reason": "Documents unclear" }`

### 4.4 View User Documents
```
GET /api/admin/verifications/:userId/documents
Role: admin
```

### 4.5 List All Users
```
GET /api/admin/users
Role: admin
```
**Query:** `?status=suspended&role=carrier&page=1&limit=20`

### 4.6 Suspend User
```
POST /api/admin/users/:userId/suspend
Role: admin
```

### 4.7 Reactivate User
```
POST /api/admin/users/:userId/reactivate
Role: admin
```

---

## 5. Loads (`/api/loads`) — Auth Required

### 5.1 Create Load
```
POST /api/loads
Role: broker
```
**Body:**
```json
{
  "shipperName": "ABC Corp",
  "shipperPhone": "555-0100",
  "shipperEmail": "abc@corp.com",
  "referenceNumber": "REF-001",
  "origin": {
    "address": "123 Main St",
    "city": "Chicago",
    "state": "IL",
    "zip": "60601",
    "contactName": "Warehouse A",
    "contactPhone": "555-0200"
  },
  "destination": {
    "address": "456 Oak Ave",
    "city": "Dallas",
    "state": "TX",
    "zip": "75201",
    "contactName": "Warehouse B",
    "contactPhone": "555-0300"
  },
  "pickupDate": "2025-04-01T08:00:00Z",
  "deliveryDate": "2025-04-03T17:00:00Z",
  "weight": 15000,
  "truckType": "dry_van",
  "rate": 2500.00,
  "rateType": "per_trip",
  "isPublic": true,
  "commodity": "Electronics",
  "specialRequirements": "Liftgate required",
  "rateNegotiable": false,
  "requireVerifiedCarrier": false,
  "internalNotes": "VIP customer"
}
```
**Response 201:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "orgId": "...",
    "status": "draft",
    "...": "..."
  }
}
```

### 5.2 List Own Loads
```
GET /api/loads
Role: broker, carrier
Permission: loads.view
```
**Query:** `?status=posted&truckType=dry_van&pickupDateStart=2025-01-01&minWeight=5000&limit=20&cursor=...`

### 5.3 Get Load Summary
```
GET /api/loads/summary
Role: broker, carrier
Permission: loads.view
```
**Response:**
```json
{
  "success": true,
  "data": {
    "total": 120,
    "posted": 45,
    "booked": 30,
    "inTransit": 15,
    "delivered": 25,
    "cancelled": 5
  }
}
```

### 5.4 Get Single Load
```
GET /api/loads/:id
Role: broker
```

### 5.5 Update Load
```
PATCH /api/loads/:id
Role: broker
```
**Body:** Partial load fields (same shape as create)

### 5.6 Delete Draft
```
DELETE /api/loads/:id
Role: broker
```
Only deletes loads with `status: draft`

### 5.7 Post Load (Draft → Posted)
```
POST /api/loads/:id/post
Role: broker
```
Moves load from `draft` to `posted`. Publishes `load:posted` event.

### 5.8 Cancel Load
```
POST /api/loads/:id/cancel
Role: broker
```
Moves load to `cancelled`. Publishes cancellation events.

### 5.9 Transition Status
```
PATCH /api/loads/:id/status
Role: broker
```
**Body:** `{ "status": "in_transit" | "delivered" | "completed" }`

### 5.10 Assign Truck
```
POST /api/loads/:id/assign-truck
Role: broker
```
**Body:** `{ "truckId": "...", "driverId": "..." }`

### 5.11 Save as Template
```
POST /api/loads/:id/templates
Role: broker
```
Copies load as a reusable template.

### 5.12 List Templates
```
GET /api/loads/templates
Role: broker
```

### 5.13 Booking Request (Carrier books a load)
```
POST /api/loads/:id/booking-request
Role: carrier, independent_driver
Permission: loads.book
```
**Body:**
```json
{
  "truckId": "...",
  "driverId": "...",
  "proposedRate": 2400.00
}
```

### 5.14 Confirm Booking
```
POST /api/loads/:id/booking-confirm
Role: broker
```
**Body:** `{ "requestId": "booking-request-id" }`

### 5.15 Deny Booking
```
POST /api/loads/:id/booking-deny
Role: broker
```
**Body:** `{ "requestId": "booking-request-id" }`

### 5.16 List Booking Requests
```
GET /api/loads/:id/booking-requests
Role: broker
```

### 5.17 Cancel Booking
```
PUT /api/loads/:id/bookings/:bookingId/cancel
Role: carrier, independent_driver
Permission: loads.cancel
```

### 5.18 Submit Counter-Offer
```
POST /api/loads/:id/counteroffer
Role: broker, carrier, independent_driver
```
**Body:** `{ "proposedRate": 2300.00, "note": "Can do it for 2300", "bookingRequestId": "..." }`

### 5.19 Accept Counter-Offer
```
POST /api/loads/:id/counteroffer/:offerId/accept
Role: broker, carrier, independent_driver
```

### 5.20 Create Truck Request
```
POST /api/loads/:id/truck-request
Role: broker
```
**Body:** `{ "truckId": "...", "carrierOrgId": "...", "offeredRate": 2500.00 }`

### 5.21 Confirm Truck Request
```
POST /api/loads/:id/truck-request/:reqId/confirm
Role: carrier
```

### 5.22 Deny Truck Request
```
POST /api/loads/:id/truck-request/:reqId/deny
Role: carrier
```

---

## 6. Marketplace (`/api/marketplace`) — Auth Required

### 6.1 Search Loads
```
GET /api/marketplace/loads
Role: broker, carrier, independent_driver
Permission: loads.view
```
**Query:**
```
?originCity=Chicago&originState=IL
&destCity=Dallas&destState=TX
&truckType=dry_van
&minRate=1000&maxRate=5000
&minWeight=5000&maxWeight=30000
&maxDistance=1500
&pickupDateStart=2025-04-01&pickupDateEnd=2025-04-10
&sort=rate&sortDir=desc
&cursor=...&limit=20
```

### 6.2 Search Trucks
```
GET /api/marketplace/trucks
Role: broker
```
**Query:** `?type=dry_van&status=available&locationCity=Chicago&locationState=IL`

### 6.3 Saved Searches
```
POST   /api/marketplace/saved-searches    — Save search
GET    /api/marketplace/saved-searches    — List saved searches
DELETE /api/marketplace/saved-searches/:id — Delete saved search
Role: carrier, independent_driver
```
**Body (save):** `{ "name": "Midwest Vans", "filters": {...}, "alertEnabled": true, "alertChannels": ["push", "email"] }`

### 6.4 Preferred Lanes
```
POST   /api/marketplace/lanes    — Set preferred lane
GET    /api/marketplace/lanes    — List preferred lanes
DELETE /api/marketplace/lanes/:id — Delete preferred lane
Role: carrier, independent_driver
```
**Body:** `{ "originState": "IL", "destinationState": "TX", "minRatePerMile": 2.50, "truckTypes": ["dry_van"], "alertEnabled": true }`

---

## 7. Fleet (`/api/fleet`) — Auth Required

### 7.1 Trucks
```
POST   /api/fleet/trucks             — Create truck (carrier, independent_driver, fleet.manage)
GET    /api/fleet/trucks             — List trucks (carrier, independent_driver, company_driver, fleet.view)
GET    /api/fleet/trucks/available   — List available trucks (carrier, independent_driver, company_driver, fleet.view)
GET    /api/fleet/trucks/:id         — Get truck (carrier, independent_driver, company_driver, fleet.view)
PATCH  /api/fleet/trucks/:id         — Update truck (carrier, independent_driver, fleet.manage)
DELETE /api/fleet/trucks/:id         — Decommission truck (carrier, independent_driver, fleet.manage)
```
**Body (create):**
```json
{
  "plateNumber": "ABC1234",
  "plateState": "IL",
  "internalId": "TRK-001",
  "type": "dry_van",
  "vin": "1HGCM82633A004352",
  "year": 2023,
  "make": "Freightliner",
  "vehicleModel": "Cascadia",
  "specs": {
    "maxWeight": 44000,
    "length": 53,
    "hasLiftgate": true,
    "isHazmatCertified": false
  }
}
```

### 7.2 VIN Decode
```
POST   /api/fleet/trucks/:id/vin-decode — Decode VIN for truck (carrier, independent_driver, fleet.manage)
GET    /api/fleet/vin-decode/:vin       — Standalone VIN decode (carrier, independent_driver, fleet.manage)
```

### 7.3 Assign Driver
```
PATCH /api/fleet/trucks/:id/assign-driver
Role: carrier, independent_driver
Permission: fleet.assign_drivers
```
**Body:** `{ "driverId": "...", "driverName": "John Doe" }`

### 7.4 Assign GPS Device
```
PATCH /api/fleet/trucks/:id/assign-gps
Role: carrier, independent_driver
Permission: fleet.manage
```
**Body:** `{ "deviceId": "..." }`

### 7.5 Trailers
```
POST  /api/fleet/trailers             — Create trailer (carrier, independent_driver, fleet.manage)
GET   /api/fleet/trailers             — List trailers (carrier, independent_driver, company_driver, fleet.view)
PATCH /api/fleet/trailers/:id/assign-truck — Assign to truck (carrier, independent_driver, fleet.manage)
```
**Body (create):** `{ "type": "dry_van", "length": 53, "capacity": 44000, "plateNumber": "TRL-001" }`

### 7.6 Compliance
```
GET   /api/fleet/compliance           — Get compliance records (carrier, independent_driver, fleet.view)
PATCH /api/fleet/compliance/:driverId — Update compliance (carrier, fleet.manage)
```
**Query:** `?daysAhead=30`

### 7.7 Driver Location
```
POST /api/fleet/drivers/location
Role: carrier, independent_driver, company_driver
```
**Body:** `{ "lat": 41.8781, "lng": -87.6298 }`

---

## 8. Documents (`/api/documents`) — Auth Required

### 8.1 Upload Document
```
POST /api/documents/upload
Permission: documents.upload
```
**Content-Type:** `multipart/form-data`
**Fields:**
- `file` — single file (max 50MB, PDF/JPG/PNG/WEBP/DOC/DOCX)
- `type` — `"rate_confirmation" | "bol" | "pod" | "invoice" | "insurance" | "other"`
- `loadId` — optional, associate with load
- `metadata` — optional JSON string
- `notes` — optional text

### 8.2 List Documents
```
GET /api/documents
Permission: documents.view
```
**Query:** `?loadId=...&type=bol&status=pending&page=1&limit=20`

### 8.3 Get Document
```
GET /api/documents/:id
Permission: documents.view
```

### 8.4 Delete Document
```
DELETE /api/documents/:id
Permission: documents.upload
```

### 8.5 Update Document Status
```
PATCH /api/documents/:id/status
Permission: documents.upload
```
**Body:** `{ "status": "approved" | "rejected" }`

---

## 9. Messaging (`/api/messages`) — Auth Required

### 9.1 Get Conversations
```
GET /api/messages/conversations
```

### 9.2 Get Messages in Conversation
```
GET /api/messages/conversations/:conversationId/messages
```

### 9.3 Send Message
```
POST /api/messages/send
```
**Body:** `{ "conversationId": "...", "content": "Hello", "receiverId": "..." }`

### 9.4 Mark as Read
```
PUT /api/messages/conversations/:conversationId/read
```

### 9.5 Unread Count
```
GET /api/messages/unread-count
```
**Response:** `{ "count": 5 }`

---

## 10. Notifications (`/api/notifications`) — Auth Required

### 10.1 Get Notifications
```
GET /api/notifications
```

### 10.2 Mark All Read
```
PUT /api/notifications/mark-all-read
```

### 10.3 Delete Notification
```
DELETE /api/notifications/:id
```

### 10.4 Unread Count
```
GET /api/notifications/unread-count
```

---

## 11. Reviews (`/api/reviews`) — Auth Required

### 11.1 Create Review
```
POST /api/reviews
```
**Body:** `{ "loadId": "...", "reviewedUserId": "...", "rating": 5, "comment": "Great service" }`

### 11.2 Get Reviews for User
```
GET /api/reviews/user/:userId
```

### 11.3 Get Review for Load
```
GET /api/reviews/load/:loadId
```

---

## 12. Support (`/api/tickets`) — Auth Required

### 12.1 Create Ticket
```
POST /api/tickets
```
**Body:** `{ "subject": "Issue with load", "description": "...", "priority": "medium", "category": "technical" }`

### 12.2 List Tickets
```
GET /api/tickets
```

### 12.3 Get Ticket
```
GET /api/tickets/:id
```

### 12.4 Add Reply
```
POST /api/tickets/:id/reply
```
**Body:** `{ "message": "Additional info..." }`

### 12.5 Update Status
```
PATCH /api/tickets/:id/status
```
**Body:** `{ "status": "resolved" | "closed" }`

---

## 13. Analytics (`/api/analytics`) — Auth Required

### 13.1 Get Summary
```
GET /api/analytics/summary
```

---

## 14. Devices (`/api/devices`) — Auth Required

### 14.1 Register Device (Web Push / Mobile FCM)
```
POST /api/devices/register
```
**Body:** `{ "token": "fcm-or-webpush-token", "platform": "web" | "android" | "ios" }`

### 14.2 Unregister Device
```
POST /api/devices/unregister
```
**Body:** `{ "token": "fcm-or-webpush-token" }`

---

## 15. Health

```
GET /health                      — Monolith health (no auth)
GET /api/health                  — Monolith health via gateway (no auth)
```

**Response:** `{ "status": "ok", "timestamp": "..." }`

---

## 16. Enums Reference

### Roles
| Value | Description |
|-------|-------------|
| `admin` | System administrator |
| `broker` | Load broker / shipper |
| `carrier` | Carrier company owner |
| `independent_driver` | Independent owner-operator |
| `company_driver` | Driver for a carrier |

### Load Status
| Value | Transition |
|-------|-----------|
| `draft` | → `posted`, `cancelled` |
| `posted` | → `booked`, `cancelled` |
| `booked` | → `in_transit`, `cancelled` |
| `in_transit` | → `delivered` |
| `delivered` | → `completed` |
| `completed` | Terminal |
| `cancelled` | Terminal |
| `archived` | Terminal |

### Truck Types
`dry_van`, `flatbed`, `reefer`, `step_deck`, `lowboy`, `tanker`, `power_only`, `sprinter_van`, `box_truck`, `hot_shot`, `heavy_haul`, `conestoga`

### Document Types
`rate_confirmation`, `bol` (Bill of Lading), `pod` (Proof of Delivery), `invoice`, `insurance`, `other`

### Rate Types
`per_mile`, `per_trip`, `per_hour`, `per_hundred_weight`

### Identity Status
`pending` → `submitted` → `approved` | `rejected`

### Account Status
`pending_onboarding`, `pending_verification`, `active`, `suspended`, `deactivated`

### Booking Status
`pending`, `accepted`, `denied`, `cancelled`, `expired`

### Permissions (for Team Management)
| Permission | Scope |
|-----------|-------|
| `loads.view` | View loads |
| `loads.book` | Book loads |
| `loads.cancel` | Cancel loads |
| `fleet.view` | View fleet |
| `fleet.manage` | Manage fleet |
| `fleet.assign_drivers` | Assign drivers |
| `team.view` | View team |
| `team.manage` | Manage team |
| `payments.view` | View payments |
| `analytics.view` | View analytics |
| `documents.view` | View documents |
| `documents.upload` | Upload documents |

---

## 17. WebSocket Events (Realtime on port 3005)

### Client → Server
```
subscribe:load { loadId }      — Subscribe to load updates
unsubscribe:load { loadId }    — Unsubscribe
driver:location { lat, lng }   — Send driver GPS location
```

### Server → Client
```
load:status       — Load status changed
load:nearby       — New load near driver
load:new          — New load posted (broker gets org notifs)
notification      — In-app alert
booking:requested — New booking request (broker)
booking:confirmed — Booking confirmed (carrier)
booking:denied    — Booking denied (carrier)
counteroffer:submitted — New counter-offer
counteroffer:accepted  — Counter-offer accepted
```

### Connection
```javascript
const socket = io("http://YOUR_EC2_IP:3005", {
  auth: { token: "accessToken" },
  transports: ["websocket", "polling"]
});
```

---

## 18. Quick Reference for Mobile (Flutter)

All endpoints are identical for Flutter and Web. Key differences:

1. **Token storage:** Use `flutter_secure_storage` for tokens
2. **File uploads:** Use `http.MultipartRequest` for `verify-identity` and `documents/upload`
3. **Socket.io:** Use `socket_io_client` package
4. **Refresh:** Store refresh token in secure storage, call `/auth/refresh` on 401
5. **Base URL:** Same as web — `http://YOUR_EC2_IP:3000/api`

### Flutter Axios Equivalent
```dart
final dio = Dio(BaseOptions(
  baseUrl: 'http://YOUR_EC2_IP:3000/api',
  headers: {'Authorization': 'Bearer $accessToken'},
));
```

### Flutter File Upload Pattern
```dart
var request = http.MultipartRequest(
  'POST',
  Uri.parse('http://YOUR_EC2_IP:3000/api/documents/upload'),
);
request.headers['Authorization'] = 'Bearer $accessToken';
request.fields['type'] = 'bol';
request.files.add(await http.MultipartFile.fromPath('file', filePath));
var response = await request.send();
```

### Flutter Socket.io
```dart
final socket = IO.io('http://YOUR_EC2_IP:3005', <String, dynamic>{
  'transports': ['websocket', 'polling'],
  'auth': {'token': accessToken},
});
```
