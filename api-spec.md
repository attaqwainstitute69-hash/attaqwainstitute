# API Specification
## At-Taqwa Institute Digital Platform

**API Version:** `v1` (spec `1.0.0`) — see [§1.8 API Versioning](#18-api-versioning)  
**Base URL:** `https://api.attaqwainstitute.org/api/v1` (local: `http://localhost:5000/api/v1`)  
**Backend:** Express.js (TypeScript), Layered Service-Repository pattern — see [`backend.md`](./backend.md)  
**Database:** MongoDB Atlas / Mongoose — see [`database-schema.md`](./database-schema.md)  
**Requirements Source:** [`At-Taqwa-Institute-PRD-v1.2.md`](./At-Taqwa-Institute-PRD-v1.2.md)  
**Format:** JSON (`Content-Type: application/json`), except file upload (`multipart/form-data`)

---

## 1. Conventions

### 1.1 Authentication

Authentication is **passwordless (Email OTP)**. On successful OTP verification the server sets a signed JWT in an HTTP-only cookie:

```
Set-Cookie: accessToken=<JWT>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800
```

- JWT payload: `{ userId, token, role }`
- The frontend must send requests with `credentials: "include"`.
- No `Authorization` header is used by the browser client.

### 1.2 Access Levels

| Level | Who | Guard |
|---|---|---|
| 🌐 **Public** | Anyone, no login | — |
| 🔐 **User** | Any logged-in, verified user | `AuthGuard` |
| 🛡️ **Admin** (`super_admin`) | Super Administrator | `AuthGuard` + `RoleGuard("super_admin")` |
| ✏️ **Editor** (`content_editor`) | Content Editor (CMS only, no finances/submissions) | `AuthGuard` + `RoleGuard("content_editor", "super_admin")` |
| 🧑‍⚕️ **Counsellor** (`counsellor`) | Counsellor (assigned counselling cases only) | `AuthGuard` + `RoleGuard("counsellor", "super_admin")` |

`super_admin` passes every role guard.

### 1.3 Response Envelope

**Success**
```json
{
  "success": true,
  "message": "অপারেশন সফল হয়েছে",
  "data": { },
  "meta": { "page": 1, "limit": 20, "total": 134, "totalPages": 7 }
}
```
`meta` is present only on paginated list endpoints.

**Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)",
    "details": [{ "field": "phone", "message": "Invalid Bangladeshi phone number" }],
    "requestId": "req_01JBX7Q2M4K9",
    "timestamp": "2026-10-30T01:30:00.000Z",
    "path": "POST /api/v1/enrollments"
  }
}
```
Full error handling rules are in [§1.9 Error Handling](#19-error-handling).

### 1.4 Standard Error Codes

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod / Mongoose validation failed |
| 400 | `INVALID_ID` | `:id` param is not a valid ObjectId |
| 400 | `MALFORMED_JSON` | Request body is not valid JSON |
| 400 | `INVALID_STATE` | Action not allowed in current status (e.g. approving a non-pending enrollment) |
| 401 | `UNAUTHENTICATED` | Missing / expired / invalid `accessToken` cookie |
| 401 | `OTP_INVALID` | Wrong OTP code |
| 403 | `FORBIDDEN` | Role not allowed, or resource belongs to another user |
| 403 | `NOT_ELIGIBLE` | e.g. review without an approved enrollment |
| 404 | `NOT_FOUND` | Resource does not exist |
| 404 | `ROUTE_NOT_FOUND` | No route matches method + path |
| 404 | `UNSUPPORTED_API_VERSION` | Path uses a version that does not exist (e.g. `/api/v9`) |
| 405 | `METHOD_NOT_ALLOWED` | Path exists but not for this HTTP method |
| 409 | `DUPLICATE_KEY` | Unique field already exists (`slug`, `batchNo` per course, etc.) |
| 409 | `ALREADY_REVIEWED` | User already reviewed this course |
| 409 | `EMAIL_EXISTS` | Registration with an already registered email |
| 409 | `DUPLICATE_TRXID` | TrxID already used on a non-rejected enrollment |
| 409 | `ALREADY_ENROLLED` | User already has a non-rejected enrollment in the batch |
| 409 | `BATCH_FULL` | `enrolledCount >= seatCapacity` |
| 410 | `OTP_EXPIRED` | OTP expired, used, or locked after 3 wrong attempts |
| 410 | `API_VERSION_SUNSET` | API version was retired after its sunset date |
| 413 | `PAYLOAD_TOO_LARGE` | JSON body > 100 KB or upload above file limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Wrong `Content-Type` or file type not allowed |
| 429 | `OTP_COOLDOWN` | Resend requested within 60 seconds |
| 429 | `RATE_LIMITED` | More than 3 OTP requests / 15 min, or general limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `EMAIL_DELIVERY_FAILED` | Resend failed to send the OTP email |
| 503 | `SERVICE_UNAVAILABLE` | Database unreachable, or a seat-booking transaction conflicted and retries ran out |

### 1.5 Pagination, Sorting & Filtering

List endpoints accept: `?page=1&limit=20&sort=-createdAt`. `limit` max is `100`.

### 1.6 Validation Patterns (from `database-schema.md`)

| Field | Rule |
|---|---|
| `phone`, `senderNumber` | `^01[3-9]\d{8}$` |
| `trxId` | `^[A-Za-z0-9]{8,15}$`, stored uppercase |
| `token` | `^ATQ-\d{4}-[A-Z0-9]{5}$` |
| `otp` | `^\d{6}$` |
| `rating` | integer `1`–`5` |
| `:id` params | valid MongoDB `ObjectId` |

### 1.7 Rate Limits

| Scope | Limit |
|---|---|
| General API | 100 requests / IP / 15 min |
| `POST /auth/request-otp` | 3 requests / email+IP / 15 min, plus 60 s cooldown between sends |
| `POST /auth/verify-otp` | 3 wrong attempts invalidate the OTP |
| Public forms (`/counselling-requests`, `/institutions/requests`) | 5 requests / IP / hour |

Every response carries `RateLimit-Limit`, `RateLimit-Remaining` and `RateLimit-Reset` headers. A `429` also carries `Retry-After` (seconds).

---

### 1.8 API Versioning

#### 1.8.1 Strategy — URI path versioning

The **major** version is part of the URL path: `/api/v1/...`. A header-only scheme was not chosen because the Next.js ISR cache, the Vercel Edge CDN and browser devtools all key on the URL, so a version in the path keeps cached responses of different versions apart.

```
https://api.attaqwainstitute.org/api/v1/courses
                                    └┬┘
                               major version
```

| Element | Rule |
|---|---|
| URL version | Major only: `v1`, `v2`, … Never `v1.1` in the path. |
| Spec version | Semantic version of this document: `MAJOR.MINOR.PATCH` (current `1.0.0`). |
| `X-API-Version` response header | Every response returns the exact spec version that served it, e.g. `X-API-Version: 1.0.0`. |
| Unversioned path | `/api/courses` (no version) → `404 UNSUPPORTED_API_VERSION`. There is no implicit "latest". |
| Unknown version | `/api/v9/courses` → `404 UNSUPPORTED_API_VERSION` with `details.supportedVersions: ["v1"]`. |
| Next.js OG route | `/api/og/course/[slug]` lives in the frontend app and is **not** versioned. |

#### 1.8.2 What needs a new major version

| Change | Type | Version bump |
|---|---|---|
| Add a new endpoint | Non-breaking | MINOR (`1.1.0`) |
| Add an **optional** request field or query param | Non-breaking | MINOR |
| Add a new field to a response | Non-breaking | MINOR |
| Add a new enum value to a **request** field | Non-breaking | MINOR |
| Add a new `error.code` | Non-breaking | MINOR |
| Fix docs / examples, no behaviour change | — | PATCH (`1.0.1`) |
| Remove or rename an endpoint, field or query param | **Breaking** | MAJOR (`v2`) |
| Make an optional request field required | **Breaking** | MAJOR |
| Change a field's type or format (e.g. `price` number → string) | **Breaking** | MAJOR |
| Add a new enum value to a **response** field the client switches on (e.g. new enrollment `status`) | **Breaking** | MAJOR |
| Change auth requirement or role of an endpoint | **Breaking** | MAJOR |
| Change the response envelope or an existing `error.code` | **Breaking** | MAJOR |

**Client rule:** the frontend must ignore unknown response fields and must have a fallback for unknown `error.code` values, so MINOR releases never break it.

#### 1.8.3 Deprecation & Sunset Policy

1. When `v2` is released, `v1` becomes **deprecated** but keeps working for at least **6 months**.
2. Every `v1` response then carries:
   ```
   Deprecation: @1798761600
   Sunset: Sat, 01 May 2027 00:00:00 GMT
   Link: <https://api.attaqwainstitute.org/api/v2/courses>; rel="successor-version"
   ```
3. A single endpoint can also be deprecated within a version (same headers, marked **Deprecated** in this document) before its removal in the next major.
4. After the `Sunset` date every `v1` request returns `410 API_VERSION_SUNSET`.
5. Deprecated-version traffic is logged per endpoint; the sunset is postponed if real traffic is still on the old version.

#### 1.8.4 Express Implementation

See [`backend.md` §2](./backend.md#2-api-versioning--express-implementation).

#### 1.8.5 Frontend Usage

```env
# .env
NEXT_PUBLIC_API_URL=https://api.attaqwainstitute.org/api/v1
```

The version lives in one env variable, so moving the Next.js app to `v2` is a single config change plus fixes for the breaking items listed in the changelog.

#### 1.8.6 Changelog

| Spec Version | Date | Type | Changes |
|---|---|---|---|
| `1.0.0` | 2026-10-31 | Initial | First release: 54 endpoints for Auth, Users, Courses, Batches, Enrollments, Institutions, Counselling, Reviews, Resources, Uploads. |

---

### 1.9 Error Handling

#### 1.9.1 Error Object

| Field | Type | Always present | Description |
|---|---|---|---|
| `success` | `false` | ✅ | |
| `error.code` | string | ✅ | Stable, machine-readable code from §1.4. **Clients must switch on this, never on `message`.** |
| `error.message` | string | ✅ | Human-readable message, safe to show to the user. Bengali by default; English if the request sends `Accept-Language: en`. |
| `error.details` | array \| object | ❌ | Field-level errors (`[{ field, message }]`) or extra context (`{ retryAfterSeconds }`, `{ attemptsLeft }`, `{ supportedVersions }`). |
| `error.requestId` | string | ✅ | Same value as the `X-Request-Id` response header. Used for support and log search. |
| `error.timestamp` | ISO date | ✅ | Server time of the error. |
| `error.path` | string | ✅ | `METHOD /path` that failed. |
| `error.stack` | string | ❌ | **Development only.** Never sent when `NODE_ENV=production`. |

#### 1.9.2 Request ID & Tracing

- The client may send `X-Request-Id`; if missing, the server generates one (`req_` + ULID).
- The ID is returned in the `X-Request-Id` header on **every** response (success and error) and in `error.requestId`.
- All logs for that request include the ID, so a user can report "Error ID: req_01JBX7Q2M4K9" and support can find the exact log lines.

#### 1.9.3 Validation Errors (`400 VALIDATION_ERROR`)

All request bodies, query params and route params are validated with **Zod** before reaching the controller. All failing fields are returned together, not only the first one:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "ফর্মে কিছু তথ্য সঠিক নয়",
    "details": [
      { "field": "senderNumber", "message": "সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)" },
      { "field": "trxId", "message": "সঠিক ৮-১৫ অক্ষরের বিকাশ/নগদ ট্রানজেকশন আইডি (TrxID) দিন" }
    ],
    "requestId": "req_01JBX7Q2M4K9",
    "timestamp": "2026-10-30T01:30:00.000Z",
    "path": "POST /api/v1/enrollments"
  }
}
```

`field` uses dot notation for nested values (`syllabus.0.titleBn`). The frontend maps `details[].field` directly to form inputs.

#### 1.9.4 Error Class Hierarchy

Services throw typed `AppError`s and never build HTTP responses themselves. Operational errors are returned as-is; unknown errors become a generic `500 INTERNAL_ERROR`. Implementation: [`backend.md` §3.1](./backend.md#31-error-class-hierarchy).

#### 1.9.5 Global Error Handler — Error Mapping

A single Express error middleware (registered last) converts every thrown error into the envelope:

| Source error | Detected by | Mapped to |
|---|---|---|
| `AppError` | `instanceof AppError` | its own `statusCode` + `code` |
| Zod error | `instanceof ZodError` | `400 VALIDATION_ERROR` with `details[]` from `issues` |
| Mongoose `ValidationError` | `err.name === "ValidationError"` | `400 VALIDATION_ERROR` with `details[]` from `err.errors` |
| Mongoose `CastError` (bad ObjectId) | `err.name === "CastError"` | `400 INVALID_ID` |
| Mongo duplicate key | `err.code === 11000` | by index key: `email` → `409 EMAIL_EXISTS`, `trxId` → `409 DUPLICATE_TRXID`, `userId+batchId` → `409 ALREADY_ENROLLED`, `userId+courseId` (review) → `409 ALREADY_REVIEWED`, anything else → `409 DUPLICATE_KEY` with `details.field` |
| Transaction write conflict | `err.hasErrorLabel("TransientTransactionError")` | retried automatically by `session.withTransaction` until the driver's 120 s limit; if still failing → `503 SERVICE_UNAVAILABLE` |
| Mongo connection / timeout | `MongoNetworkError`, `MongoServerSelectionError` | `503 SERVICE_UNAVAILABLE` + `Retry-After: 30` |
| JWT expired | `TokenExpiredError` | `401 UNAUTHENTICATED` (`details.reason: "expired"`), cookie cleared |
| JWT invalid / tampered | `JsonWebTokenError` | `401 UNAUTHENTICATED`, cookie cleared |
| Body parser bad JSON | `err.type === "entity.parse.failed"` | `400 MALFORMED_JSON` |
| Body too large | `err.type === "entity.too.large"` | `413 PAYLOAD_TOO_LARGE` |
| Multer file size / type | `MulterError` | `413 PAYLOAD_TOO_LARGE` / `415 UNSUPPORTED_MEDIA_TYPE` |
| Rate limiter | `express-rate-limit` handler | `429 RATE_LIMITED` + `Retry-After` |
| Resend API failure (OTP send) | Resend SDK error | `502 EMAIL_DELIVERY_FAILED`; the OTP record is deleted so cooldown is not consumed |
| Any other error | fallback | `500 INTERNAL_ERROR` |

Handler implementation: [`backend.md` §3.2](./backend.md#32-global-error-handler).

#### 1.9.6 Logging & Privacy

See [`backend.md` §3.3](./backend.md#33-logging--privacy).

#### 1.9.7 Side-Effect Failures (non-blocking)

Some side effects run **after** the main DB write. Their failure must **not** turn a successful operation into an error:

| Operation | Side effect | On side-effect failure |
|---|---|---|
| `PATCH /admin/enrollments/:id/approve` | Approval email via Resend | Approval stays committed. Response still `200`, with `data.warnings: ["EMAIL_DELIVERY_FAILED"]`. Email is queued for retry (3 attempts, exponential backoff). |
| `POST /counselling-requests` | Notify admin & counsellor | Request still `201`. Failure logged and retried. |
| `PATCH /admin/reviews/:id/moderate` | ISR revalidation of `/`, `/reviews`, course page | Response still `200`. Page refreshes on the next ISR window. |
| `DELETE /admin/resources/:id` | Delete file from R2 | DB record deleted. Orphan file logged for cleanup job. |

Only `POST /auth/request-otp` treats email failure as a hard error (`502`), because the user cannot continue without the OTP.

#### 1.9.8 Client Handling Guide (Next.js)

| `code` | Frontend behaviour |
|---|---|
| `VALIDATION_ERROR` | Show `details[].message` under each matching form field. |
| `UNAUTHENTICATED` | Clear local user state, redirect to `/login?next=<current path>`. |
| `FORBIDDEN` | Show "এই পেজে আপনার প্রবেশাধিকার নেই" page. |
| `NOT_FOUND`, `INVALID_ID` | Render Next.js `notFound()` (404 page). |
| `EMAIL_EXISTS` | Switch the form to the login flow with the email pre-filled. |
| `OTP_INVALID` | Shake the 6-box input, show `details.attemptsLeft`. |
| `OTP_EXPIRED` | Clear OTP input, enable "Resend OTP". |
| `OTP_COOLDOWN` | Start the countdown from `details.retryAfterSeconds`. |
| `BATCH_FULL` | Flip badge to "সিট পূর্ণ", show "ওয়েটলিস্টে যুক্ত হোন". |
| `DUPLICATE_TRXID` | Highlight TrxID field: "এই TrxID ইতিমধ্যে ব্যবহৃত হয়েছে". |
| `ALREADY_ENROLLED` | Link to `/my-account`. |
| `NOT_ELIGIBLE`, `ALREADY_REVIEWED` | Hide / disable the "রিভিউ দিন" button. |
| `RATE_LIMITED` | Toast with wait time from `Retry-After`. Do not auto-retry. |
| `SERVICE_UNAVAILABLE` | Auto-retry GET requests up to 2 times (1 s, 3 s backoff), then show retry button. |
| `API_VERSION_SUNSET`, `UNSUPPORTED_API_VERSION` | Show "অনুগ্রহ করে পেজটি রিফ্রেশ করুন" (stale client build). |
| `INTERNAL_ERROR` / unknown code | Generic error toast with `requestId` ("Error ID: req_…") for support. |

**Retry rule:** only `GET` requests and `503` responses are auto-retried. `POST` / `PATCH` are never retried automatically. A duplicate `POST /enrollments` is already blocked by the unique `trxId` index (`409 DUPLICATE_TRXID`).

---

## 2. Endpoint Summary

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| **Auth** |||||
| 1 | `POST` | `/auth/request-otp` | 🌐 Public | Send 6-digit OTP (register or login) |
| 2 | `POST` | `/auth/verify-otp` | 🌐 Public | Verify OTP, create user (register), set session cookie |
| 3 | `POST` | `/auth/logout` | 🔐 User | Clear session cookie |
| 4 | `GET` | `/auth/me` | 🔐 User | Current logged-in user |
| **Users** |||||
| 5 | `PATCH` | `/users/me` | 🔐 User | Update own profile |
| 6 | `GET` | `/admin/users` | 🛡️ Admin | List / search users |
| 7 | `GET` | `/admin/users/:id` | 🛡️ Admin | User detail with enrollments |
| 8 | `PATCH` | `/admin/users/:id/role` | 🛡️ Admin | Change user role |
| **Courses** |||||
| 9 | `GET` | `/courses` | 🌐 Public | Course catalog with filters |
| 10 | `GET` | `/courses/:slug` | 🌐 Public | Course detail + active batches + seats + rating |
| 11 | `POST` | `/admin/courses` | ✏️ Editor | Create course |
| 12 | `PATCH` | `/admin/courses/:id` | ✏️ Editor | Update course |
| 13 | `DELETE` | `/admin/courses/:id` | 🛡️ Admin | Delete course |
| **Batches** |||||
| 14 | `GET` | `/courses/:slug/batches` | 🌐 Public | Batches of a course (without `venueOrLink`) |
| 15 | `GET` | `/admin/batches` | ✏️ Editor | All batches incl. `venueOrLink` |
| 16 | `POST` | `/admin/courses/:courseId/batches` | ✏️ Editor | Create batch |
| 17 | `PATCH` | `/admin/batches/:id` | ✏️ Editor | Update batch |
| 18 | `DELETE` | `/admin/batches/:id` | 🛡️ Admin | Delete batch (only if no enrollments) |
| **Enrollments** |||||
| 19 | `POST` | `/enrollments` | 🔐 User | Submit enrollment with bKash/Nagad TrxID |
| 20 | `GET` | `/enrollments/me` | 🔐 User | My enrollments (`/my-account`) |
| 21 | `GET` | `/enrollments/me/:id` | 🔐 User | My enrollment detail (unlocked venue/link if approved) |
| 22 | `PATCH` | `/enrollments/me/:id/resubmit` | 🔐 User | Re-submit TrxID for a rejected enrollment |
| 23 | `GET` | `/admin/enrollments` | 🛡️ Admin | Enrollment review queue |
| 24 | `GET` | `/admin/enrollments/stats` | 🛡️ Admin | Financial audit (method × status) |
| 25 | `PATCH` | `/admin/enrollments/:id/approve` | 🛡️ Admin | Approve (ACID seat increment + email) |
| 26 | `PATCH` | `/admin/enrollments/:id/reject` | 🛡️ Admin | Reject with reason |
| **Institutions** |||||
| 27 | `GET` | `/institutions` | 🌐 Public | Partner institution showcase |
| 28 | `GET` | `/institutions/:slug` | 🌐 Public | Institution detail + approved reviews |
| 29 | `POST` | `/institutions/requests` | 🌐 Public | Institutional service intake form |
| 30 | `GET` | `/admin/institutions` | ✏️ Editor | All institutions incl. pending |
| 31 | `POST` | `/admin/institutions` | ✏️ Editor | Create institution |
| 32 | `PATCH` | `/admin/institutions/:id` | ✏️ Editor | Update institution / badges / logo / status |
| 33 | `DELETE` | `/admin/institutions/:id` | 🛡️ Admin | Delete institution |
| **Counselling** |||||
| 34 | `POST` | `/counselling-requests` | 🌐 Public | Confidential counselling intake |
| 35 | `GET` | `/admin/counselling-requests` | 🧑‍⚕️ Counsellor | List (counsellor sees only assigned) |
| 36 | `GET` | `/admin/counselling-requests/:id` | 🧑‍⚕️ Counsellor | Case detail |
| 37 | `PATCH` | `/admin/counselling-requests/:id/assign` | 🛡️ Admin | Assign counsellor |
| 38 | `PATCH` | `/admin/counselling-requests/:id` | 🧑‍⚕️ Counsellor | Update status / confidential notes |
| **Reviews** |||||
| 39 | `GET` | `/reviews` | 🌐 Public | Approved reviews with category tabs |
| 40 | `GET` | `/reviews/summary` | 🌐 Public | Average rating + 5→1 star distribution |
| 41 | `POST` | `/reviews` | 🔐 User | Submit verified review (status `pending`) |
| 42 | `GET` | `/reviews/me` | 🔐 User | My submitted reviews |
| 43 | `GET` | `/reviews/eligibility` | 🔐 User | Which courses I can review |
| 44 | `GET` | `/admin/reviews` | 🛡️ Admin | Moderation queue |
| 45 | `PATCH` | `/admin/reviews/:id/moderate` | 🛡️ Admin | Approve / reject review |
| **Resources (Knowledge Hub)** |||||
| 46 | `GET` | `/resources` | 🌐 Public | Published resources with search |
| 47 | `GET` | `/resources/:id` | 🌐 Public | Resource detail |
| 48 | `POST` | `/resources/:id/download` | 🌐 Public | Increment download count, return file URL |
| 49 | `GET` | `/admin/resources` | ✏️ Editor | All resources incl. unpublished |
| 50 | `POST` | `/admin/resources` | ✏️ Editor | Create resource |
| 51 | `PATCH` | `/admin/resources/:id` | ✏️ Editor | Update / publish / unpublish |
| 52 | `DELETE` | `/admin/resources/:id` | ✏️ Editor | Delete resource |
| **Uploads** |||||
| 53 | `POST` | `/admin/uploads` | ✏️ Editor | Upload PDF / image to R2, return CDN URL |
| 53a | `POST` | `/admin/uploads/video-url` | ✏️ Editor | Presigned URL for a direct browser → R2 video upload |
| 53b | `POST` | `/admin/uploads/video-complete` | ✏️ Editor | Verify the uploaded video, return CDN URL |
| **Next.js (frontend app, not Express)** |||||
| 54 | `GET` | `/api/og/course/[slug]` | 🌐 Public | Dynamic 1200×630 Open Graph image |

---

## 3. Auth

### 3.1 `POST /auth/request-otp` — 🌐 Public

Sends a 6-digit OTP to the user's email via Resend. Hashed OTP is stored in `otps` with a 10-minute TTL.

**Request — registration**
```json
{
  "purpose": "register",
  "email": "ahmadullah@example.com"
}
```

**Request — login (email or token)**
```json
{
  "purpose": "login",
  "identifier": "ATQ-2026-87K2M"
}
```

| Field | Type | Required | Rule |
|---|---|---|---|
| `purpose` | `"register" \| "login"` | ✅ | |
| `email` | string | ✅ if `register` | valid email, lowercased |
| `identifier` | string | ✅ if `login` | registered email **or** token `ATQ-YYYY-XXXXX` |

**Response `200`**
```json
{
  "success": true,
  "message": "আপনার ইমেইলে ৬ ডিজিটের OTP পাঠানো হয়েছে",
  "data": {
    "email": "ah*******@example.com",
    "cooldownSeconds": 60,
    "expiresInSeconds": 600
  }
}
```
`email` is masked; for login by token the client never sees the full email.

**Errors:** `409 EMAIL_EXISTS` (register with existing email → frontend routes to login) · `404 NOT_FOUND` (login with unknown email/token) · `429 OTP_COOLDOWN` (`data.retryAfterSeconds`) · `429 RATE_LIMITED`

---

### 3.2 `POST /auth/verify-otp` — 🌐 Public

Verifies the OTP and marks it `isUsed = true`. For `register`, creates the `users` document and generates the unique token. Sets the `accessToken` cookie in both cases.

**Request — registration**
```json
{
  "purpose": "register",
  "email": "ahmadullah@example.com",
  "otp": "482913",
  "fullName": "মাওলানা আহমাদুল্লাহ",
  "phone": "01712345678",
  "role": "madrasa_teacher",
  "institution": "মারকাযুত তাকওয়া ঢাকা",
  "privacyConsent": true
}
```

| Field | Type | Required | Rule |
|---|---|---|---|
| `purpose` | `"register" \| "login"` | ✅ | |
| `email` / `identifier` | string | ✅ | same value used in `request-otp` |
| `otp` | string | ✅ | `^\d{6}$` |
| `fullName` | string | ✅ register | 3–80 chars |
| `phone` | string | ✅ register | `^01[3-9]\d{8}$` |
| `role` | enum | ✅ register | `madrasa_teacher`, `general_teacher`, `madrasa_admin` (muhtamim / principal), `parent`, `student`, `researcher`, `other` (staff roles cannot self-register) |
| `institution` | string | ❌ | max 150 chars |
| `privacyConsent` | boolean | ✅ register | must be `true` |

**Request — login**
```json
{
  "purpose": "login",
  "identifier": "ahmadullah@example.com",
  "otp": "482913"
}
```

**Response `201` (register) / `200` (login)** + `Set-Cookie: accessToken=...`
```json
{
  "success": true,
  "message": "আপনার ইউনিক টোকেন: ATQ-2026-87K2M",
  "data": {
    "user": {
      "_id": "6720f1a1b1c2d3e4f5a6b7c8",
      "token": "ATQ-2026-87K2M",
      "fullName": "মাওলানা আহমাদুল্লাহ",
      "phone": "01712345678",
      "email": "ahmadullah@example.com",
      "role": "madrasa_teacher",
      "institution": "মারকাযুত তাকওয়া ঢাকা",
      "isVerified": true,
      "createdAt": "2026-10-30T01:00:00.000Z"
    },
    "isNewUser": true,
    "redirectTo": "/my-account"
  }
}
```

**Errors:** `401 OTP_INVALID` (`data.attemptsLeft`) · `410 OTP_EXPIRED` (expired, used, or 3 wrong attempts) · `400 VALIDATION_ERROR` · `409 EMAIL_EXISTS`

---

### 3.3 `POST /auth/logout` — 🔐 User

Clears the `accessToken` cookie.

**Request:** no body  
**Response `200`**
```json
{ "success": true, "message": "সফলভাবে লগআউট হয়েছে", "data": null }
```

---

### 3.4 `GET /auth/me` — 🔐 User

Returns the current session user. Used by the navbar ("Token / Auth CTA") and route guards.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "_id": "6720f1a1b1c2d3e4f5a6b7c8",
    "token": "ATQ-2026-87K2M",
    "fullName": "মাওলানা আহমাদুল্লাহ",
    "phone": "01712345678",
    "email": "ahmadullah@example.com",
    "role": "madrasa_teacher",
    "institution": "মারকাযুত তাকওয়া ঢাকা",
    "isVerified": true
  }
}
```
**Errors:** `401 UNAUTHENTICATED`

---

## 4. Users

### 4.1 `PATCH /users/me` — 🔐 User

`email`, `token` and `role` cannot be changed here.

**Request**
```json
{
  "fullName": "মাওলানা আহমাদুল্লাহ সাভারী",
  "phone": "01812345678",
  "institution": "দারুল উলুম সাভার"
}
```
All fields optional. **Response `200`:** updated user object (same shape as `/auth/me`).

---

### 4.2 `GET /admin/users` — 🛡️ Admin

**Query:** `?q=ATQ-2026&role=madrasa_teacher&page=1&limit=20`  
`q` matches `token`, `email`, `phone` or `fullName`.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f1a1b1c2d3e4f5a6b7c8",
      "token": "ATQ-2026-87K2M",
      "fullName": "মাওলানা আহমাদুল্লাহ",
      "phone": "01712345678",
      "email": "ahmadullah@example.com",
      "role": "madrasa_teacher",
      "institution": "মারকাযুত তাকওয়া ঢাকা",
      "createdAt": "2026-10-30T01:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### 4.3 `GET /admin/users/:id` — 🛡️ Admin

**Response `200`:** user object + `enrollments[]` (with batch and course title populated).

### 4.4 `PATCH /admin/users/:id/role` — 🛡️ Admin

**Request**
```json
{ "role": "counsellor" }
```
`role` ∈ `madrasa_teacher`, `general_teacher`, `madrasa_admin`, `parent`, `student`, `researcher`, `counsellor`, `content_editor`, `super_admin`, `other`.  
**Response `200`:** updated user. **Errors:** `400 INVALID_STATE` (admin cannot demote themselves).

---

## 5. Courses

### 5.1 `GET /courses` — 🌐 Public

**Query:** `?pillar=training&format=online&status=open&q=শিক্ষক&page=1&limit=12`

| Param | Values |
|---|---|
| `pillar` | `training`, `consultancy`, `digital` |
| `format` | `online`, `offline`, `hybrid` |
| `status` | `open`, `upcoming`, `closed` |
| `q` | Bengali/English text search on `titleBn`, `descriptionBn` |

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f3c3d4e5f6a7b8c9d0e1",
      "slug": "teaching-proficiency-madrasa",
      "titleBn": "টিচিং প্রফিসিয়েন্সি প্রোগ্রাম (মাদরাসা শিক্ষক)",
      "titleEn": "Teaching Proficiency Program (Madrasa Teachers)",
      "pillar": "training",
      "format": "offline",
      "price": 3000,
      "status": "open",
      "trainerName": "মাওলানা মুফতি রফিকুল ইসলাম",
      "trainerPhoto": "https://cdn.attaqwainstitute.org/trainers/rafiqul.webp",
      "nextBatch": { "batchNo": 14, "startDate": "2026-11-15T00:00:00.000Z", "remainingSeats": 12, "isHouseful": false },
      "averageRating": 4.9,
      "totalReviews": 42
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 8, "totalPages": 1 }
}
```

---

### 5.2 `GET /courses/:slug` — 🌐 Public

Uses aggregation *Pipeline 1* (`database.md` §6.1). `venueOrLink` is **never** returned here.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "_id": "6720f3c3d4e5f6a7b8c9d0e1",
    "slug": "teaching-proficiency-madrasa",
    "titleBn": "টিচিং প্রফিসিয়েন্সি প্রোগ্রাম (মাদরাসা শিক্ষক)",
    "titleEn": "Teaching Proficiency Program (Madrasa Teachers)",
    "pillar": "training",
    "format": "offline",
    "price": 3000,
    "status": "open",
    "descriptionBn": "মাদরাসা শিক্ষকদের জন্য আধুনিক শিক্ষণ পদ্ধতি ও ক্লাসরুম ম্যানেজমেন্ট প্রশিক্ষণ।",
    "descriptionEn": null,
    "syllabus": [
      { "moduleNo": 1, "titleBn": "আধুনিক শিখন ও মূল্যায়ন পদ্ধতি", "topics": ["পেডাগোজি বনাম আন্দ্রেগোজি", "শিক্ষার্থীর মনস্তত্ত্ব বোঝা"] }
    ],
    "trainerName": "মাওলানা মুফতি রফিকুল ইসলাম",
    "trainerBio": "১৫ বছরের শিক্ষক প্রশিক্ষণ অভিজ্ঞতা",
    "trainerPhoto": "https://cdn.attaqwainstitute.org/trainers/rafiqul.webp",
    "activeBatches": [
      {
        "_id": "6720f4d4e5f6a7b8c9d0e1f2",
        "batchNo": 14,
        "startDate": "2026-11-15T00:00:00.000Z",
        "scheduleDetails": "প্রতি শুক্রবার ও শনিবার (বিকাল ৩:০০ - ৫:০০)",
        "seatCapacity": 30,
        "enrolledCount": 18,
        "remainingSeats": 12,
        "isHouseful": false
      }
    ],
    "averageRating": 4.9,
    "totalReviews": 42,
    "paymentInfo": {
      "bkash": "01XXXXXXXXX",
      "nagad": "01XXXXXXXXX"
    }
  }
}
```
`paymentInfo` comes from server config (merchant numbers), not from the DB.  
**Errors:** `404 NOT_FOUND`

---

### 5.3 `POST /admin/courses` — ✏️ Editor

**Request**
```json
{
  "slug": "conscious-parent-program",
  "titleBn": "সচেতন অভিভাবক প্রোগ্রাম",
  "titleEn": "Conscious Parent Program",
  "pillar": "training",
  "format": "online",
  "price": 1500,
  "status": "upcoming",
  "descriptionBn": "সন্তানের তারবিয়াত, স্ক্রিন আসক্তি ও কৈশোর বিষয়ে অভিভাবকদের প্রশিক্ষণ।",
  "descriptionEn": "Parenting training on tarbiyah, screen addiction and adolescence.",
  "syllabus": [
    { "moduleNo": 1, "titleBn": "স্ক্রিন আসক্তি ও সমাধান", "topics": ["কারণ", "ব্যবহারিক কৌশল"] }
  ],
  "trainerName": "ড. আব্দুল্লাহ",
  "trainerBio": "শিশু মনোবিজ্ঞানী",
  "trainerPhoto": "https://cdn.attaqwainstitute.org/trainers/abdullah.webp"
}
```

| Field | Required | Rule |
|---|---|---|
| `slug` | ✅ | unique, `^[a-z0-9-]+$` |
| `titleBn` | ✅ | |
| `pillar` | ✅ | `training` / `consultancy` / `digital` |
| `format` | ✅ | `online` / `offline` / `hybrid` |
| `price` | ✅ | number ≥ 0 |
| `descriptionBn` | ✅ | |
| `status` | ❌ | default `open` |
| others | ❌ | |

**Response `201`:** created course. **Errors:** `409 DUPLICATE_KEY` (slug exists).

### 5.4 `PATCH /admin/courses/:id` — ✏️ Editor

**Request:** any subset of the fields in 5.3. **Response `200`:** updated course.

### 5.5 `DELETE /admin/courses/:id` — 🛡️ Admin

**Response `200`:** `{ "success": true, "data": null }`  
**Errors:** `409 INVALID_STATE` if any batch of the course has enrollments (set `status: "closed"` instead).

---

## 6. Batches

### 6.1 `GET /courses/:slug/batches` — 🌐 Public

**Query:** `?includeInactive=false`  
**Response `200`:** array of batch objects as in `activeBatches` (5.2) — **no `venueOrLink`**.

### 6.2 `GET /admin/batches` — ✏️ Editor

**Query:** `?courseId=...&isActive=true&page=1`  
**Response `200`:** batches with `venueOrLink` and populated `course { _id, titleBn, slug }`.

### 6.3 `POST /admin/courses/:courseId/batches` — ✏️ Editor

**Request**
```json
{
  "batchNo": 15,
  "startDate": "2026-12-20",
  "scheduleDetails": "প্রতি শুক্রবার ও শনিবার (বিকাল ৩:০০ - ৫:০০)",
  "seatCapacity": 30,
  "venueOrLink": "https://zoom.us/j/9876543210?pwd=secret",
  "isActive": true
}
```

| Field | Required | Rule |
|---|---|---|
| `batchNo` | ✅ | integer, unique per course |
| `startDate` | ✅ | ISO date |
| `scheduleDetails` | ✅ | |
| `seatCapacity` | ✅ | integer ≥ 1 (default 30) |
| `venueOrLink` | ✅ | Zoom/Meet link or venue address (protected field) |
| `isActive` | ❌ | default `true` |

`enrolledCount` is **not** accepted — it is managed only by the approval transaction.  
**Response `201`:** created batch. **Errors:** `409 DUPLICATE_KEY` (duplicate `batchNo` for course).

### 6.4 `PATCH /admin/batches/:id` — ✏️ Editor

**Request:** subset of 6.3 fields. **Errors:** `400 VALIDATION_ERROR` if `seatCapacity < enrolledCount`.

### 6.5 `DELETE /admin/batches/:id` — 🛡️ Admin

**Errors:** `409 INVALID_STATE` if enrollments reference the batch (set `isActive: false` instead).

---

## 7. Enrollments

### 7.1 `POST /enrollments` — 🔐 User

User has paid via bKash/Nagad and submits the TrxID. Saved with `status: "pending"`. The seat is **not** taken until admin approval.

**Request**
```json
{
  "batchId": "6720f4d4e5f6a7b8c9d0e1f2",
  "paymentMethod": "bkash",
  "senderNumber": "01712345678",
  "trxId": "BL9A7K2M10",
  "experience": "৫ বছর যাবত হিফজ শিক্ষক হিসেবে কর্মরত"
}
```

| Field | Required | Rule |
|---|---|---|
| `batchId` | ✅ | active batch |
| `paymentMethod` | ✅ | `bkash` / `nagad` / `bank` |
| `senderNumber` | ✅ | `^01[3-9]\d{8}$` |
| `trxId` | ✅ | `^[A-Za-z0-9]{8,15}$` |
| `experience` | ❌ | max 300 chars |

**Response `201`**
```json
{
  "success": true,
  "message": "আপনার আবেদন জমা হয়েছে। পেমেন্ট যাচাইয়ের পর নিশ্চিত করা হবে।",
  "data": {
    "_id": "6720f5e5f6a7b8c9d0e1f2a3",
    "referenceNo": "6720f5e5f6a7b8c9d0e1f2a3",
    "batchId": "6720f4d4e5f6a7b8c9d0e1f2",
    "paymentMethod": "bkash",
    "senderNumber": "01712345678",
    "trxId": "BL9A7K2M10",
    "status": "pending",
    "createdAt": "2026-10-30T01:30:00.000Z"
  }
}
```
**Errors:** `409 BATCH_FULL` (frontend shows "সিট পূর্ণ") · `409 DUPLICATE_TRXID` · `409 ALREADY_ENROLLED` · `400 INVALID_STATE` (batch inactive / course closed) · `404 NOT_FOUND`

---

### 7.2 `GET /enrollments/me` — 🔐 User

Powers `/my-account`. `access` is populated **only** when `status === "approved"`.

**Query:** `?status=approved`

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f5e5f6a7b8c9d0e1f2a3",
      "status": "approved",
      "paymentMethod": "bkash",
      "trxId": "BL9A7K2M10",
      "rejectionReason": null,
      "verifiedAt": "2026-10-30T02:00:00.000Z",
      "createdAt": "2026-10-30T01:30:00.000Z",
      "course": { "_id": "6720f3c3d4e5f6a7b8c9d0e1", "slug": "teaching-proficiency-madrasa", "titleBn": "টিচিং প্রফিসিয়েন্সি প্রোগ্রাম (মাদরাসা শিক্ষক)", "format": "offline" },
      "batch": { "_id": "6720f4d4e5f6a7b8c9d0e1f2", "batchNo": 14, "startDate": "2026-11-15T00:00:00.000Z", "scheduleDetails": "প্রতি শুক্রবার ও শনিবার (বিকাল ৩:০০ - ৫:০০)" },
      "access": {
        "venueOrLink": "সাভার ক্যাম্পাস: ব্যাংক কলোনি, সাভার, ঢাকা (রুম ৩০২)"
      },
      "canReview": true,
      "canResubmit": false
    }
  ]
}
```
For `pending` / `rejected`, `access` is `null`. For `rejected`, `rejectionReason` is shown and `canResubmit` is `true`.

### 7.3 `GET /enrollments/me/:id` — 🔐 User

Same object as one item of 7.2. **Errors:** `404 NOT_FOUND` (also returned when the enrollment belongs to another user — see §1.9.6)

### 7.4 `PATCH /enrollments/me/:id/resubmit` — 🔐 User

"পুনরায় TrxID জমা দিন" — only for `rejected` enrollments. Resets `status` to `pending` and clears `rejectionReason`.

**Request**
```json
{
  "paymentMethod": "nagad",
  "senderNumber": "01712345678",
  "trxId": "NG7H2K9P31"
}
```
**Response `200`:** updated enrollment with `status: "pending"`.  
**Errors:** `400 INVALID_STATE` (not rejected) · `409 DUPLICATE_TRXID` · `404 NOT_FOUND` (not owner)

---

### 7.5 `GET /admin/enrollments` — 🛡️ Admin

Admin Enrollment Review Queue.

**Query:** `?status=pending&paymentMethod=bkash&batchId=...&q=BL9A7&page=1&limit=50&sort=createdAt`  
`q` matches `trxId`, `senderNumber`, or user `token`.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f5e5f6a7b8c9d0e1f2a3",
      "user": { "_id": "6720f1a1b1c2d3e4f5a6b7c8", "token": "ATQ-2026-87K2M", "fullName": "মাওলানা আহমাদুল্লাহ", "phone": "01712345678", "email": "ahmadullah@example.com" },
      "course": { "titleBn": "টিচিং প্রফিসিয়েন্সি প্রোগ্রাম (মাদরাসা শিক্ষক)", "price": 3000 },
      "batch": { "_id": "6720f4d4e5f6a7b8c9d0e1f2", "batchNo": 14, "seatCapacity": 30, "enrolledCount": 18 },
      "paymentMethod": "bkash",
      "senderNumber": "01712345678",
      "trxId": "BL9A7K2M10",
      "experience": "৫ বছর যাবত হিফজ শিক্ষক হিসেবে কর্মরত",
      "status": "pending",
      "createdAt": "2026-10-30T01:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 50, "total": 7, "totalPages": 1 }
}
```

### 7.6 `GET /admin/enrollments/stats` — 🛡️ Admin

Uses aggregation *Pipeline 2* (`database.md` §6.2).

**Query:** `?from=2026-10-01&to=2026-10-31`

**Response `200`**
```json
{
  "success": true,
  "data": [
    { "paymentMethod": "bkash", "status": "approved", "totalTransactions": 120 },
    { "paymentMethod": "bkash", "status": "pending", "totalTransactions": 5 },
    { "paymentMethod": "nagad", "status": "approved", "totalTransactions": 64 },
    { "paymentMethod": "nagad", "status": "rejected", "totalTransactions": 3 }
  ]
}
```

### 7.7 `PATCH /admin/enrollments/:id/approve` — 🛡️ Admin

Runs the ACID transaction ([`backend.md` §4](./backend.md#4-race-condition-proof-seat-booking-mongodb-acid-transaction)): atomically checks `enrolledCount < seatCapacity`, increments `enrolledCount`, sets `status = "approved"`, `verifiedBy`, `verifiedAt`. After commit, sends the Resend confirmation email asynchronously and unlocks `venueOrLink` in `/my-account`.

**Request:** no body

**Response `200`**
```json
{
  "success": true,
  "message": "এনরোলমেন্ট অনুমোদিত হয়েছে এবং ইমেইল পাঠানো হয়েছে",
  "data": {
    "enrollment": { "_id": "6720f5e5f6a7b8c9d0e1f2a3", "status": "approved", "verifiedBy": "6720f999f6a7b8c9d0e1f299", "verifiedAt": "2026-10-30T02:00:00.000Z" },
    "batch": { "_id": "6720f4d4e5f6a7b8c9d0e1f2", "seatCapacity": 30, "enrolledCount": 19, "remainingSeats": 11 }
  }
}
```
**Errors:** `400 INVALID_STATE` ("এই আবেদনটি ইতিমধ্যে প্রক্রিয়াজাত করা হয়েছে") · `409 BATCH_FULL` · `404 NOT_FOUND`

### 7.8 `PATCH /admin/enrollments/:id/reject` — 🛡️ Admin

**Request**
```json
{ "rejectionReason": "প্রদত্ত TrxID বিকাশ স্টেটমেন্টে পাওয়া যায়নি। অনুগ্রহ করে সঠিক TrxID দিন।" }
```
`rejectionReason`: required, max 500 chars.

**Response `200`:** enrollment with `status: "rejected"`, `verifiedBy`, `verifiedAt`.  
**Errors:** `400 INVALID_STATE` (not pending)

---

## 8. Institutions

### 8.1 `GET /institutions` — 🌐 Public

Only `status: "active"`.

**Query:** `?district=ঢাকা&featured=true&badge=monitoring_partner&page=1&limit=24`

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f6f6a7b8c9d0e1f2a3b4",
      "name": "মাদরাসাতুত তাকওয়া সাভার",
      "slug": "madrasatut-taqwa-savar",
      "district": "ঢাকা",
      "studentCount": 450,
      "teacherCount": 24,
      "badges": ["management_partner", "monitoring_partner", "trained_faculty"],
      "logoUrl": "https://cdn.attaqwainstitute.org/institutions/taqwa-logo.webp",
      "headName": "মাওলানা হাফিজুর রহমান",
      "headQuote": "আত-তাকওয়ার ৯-ধাপ মনিটরিং চালুর পর আমাদের শিক্ষার্থীদের পড়ার আগ্রহ ও শৃঙ্খলা অভাবনীয় বৃদ্ধি পেয়েছে।",
      "featured": true
    }
  ],
  "meta": { "page": 1, "limit": 24, "total": 1, "totalPages": 1 }
}
```
`contactPhone` is **not** exposed publicly.

### 8.2 `GET /institutions/:slug` — 🌐 Public

**Response `200`:** institution object (as above) + `reviews[]` (approved, `reviewCategory: "consultancy"`) + `averageRating`. **Errors:** `404 NOT_FOUND`

### 8.3 `POST /institutions/requests` — 🌐 Public

"আপনার প্রতিষ্ঠানে সেবা নিন" intake form (PRD Flow 4). Creates an `institutions` document with `status: "pending"`, `featured: false`, `badges: []`.

**Request**
```json
{
  "name": "দারুল উলুম সাভার",
  "district": "ঢাকা",
  "studentCount": 300,
  "teacherCount": 18,
  "headName": "মাওলানা আব্দুর রহিম",
  "contactPhone": "01612417120",
  "serviceNeeded": ["management_sop", "teacher_training", "monitoring_system"],
  "message": "আমাদের প্রতিষ্ঠানে ৯-ধাপ মনিটরিং চালু করতে চাই।"
}
```

| Field | Required | Rule |
|---|---|---|
| `name` | ✅ | |
| `district` | ✅ | |
| `contactPhone` | ✅ | `^01[3-9]\d{8}$` |
| `headName` | ✅ | |
| `studentCount`, `teacherCount` | ❌ | integer ≥ 0 |
| `serviceNeeded` | ✅ | array, min 1 — ⚠️ see §13 |
| `message` | ❌ | max 1000 chars — ⚠️ see §13 |

`slug` is generated server-side.

**Response `201`**
```json
{
  "success": true,
  "message": "আপনার অনুরোধ গৃহীত হয়েছে। ৪৮ ঘণ্টার মধ্যে আমাদের কনসালটেন্সি টিম যোগাযোগ করবে।",
  "data": { "referenceNo": "6720fa11d0e1f2a3b4c5d6e7", "status": "pending" }
}
```

### 8.4 `GET /admin/institutions` — ✏️ Editor

**Query:** `?status=pending&district=...&q=...&page=1`  
**Response `200`:** institutions incl. `contactPhone` and `status`.

### 8.5 `POST /admin/institutions` — ✏️ Editor

**Request**
```json
{
  "name": "মাদরাসাতুত তাকওয়া সাভার",
  "slug": "madrasatut-taqwa-savar",
  "district": "ঢাকা",
  "studentCount": 450,
  "teacherCount": 24,
  "badges": ["management_partner", "monitoring_partner"],
  "logoUrl": "https://cdn.attaqwainstitute.org/institutions/taqwa-logo.webp",
  "headName": "মাওলানা হাফিজুর রহমান",
  "headQuote": "...",
  "contactPhone": "01612417120",
  "featured": true,
  "status": "active"
}
```
`badges` ∈ `management_partner`, `monitoring_partner`, `trained_faculty`. `status` ∈ `pending`, `active`, `archived`. `headQuote` max 500.  
**Response `201`:** created institution.

### 8.6 `PATCH /admin/institutions/:id` — ✏️ Editor

**Request:** any subset of 8.5 (e.g. approve an intake: `{ "status": "active", "badges": ["management_partner"] }`). **Response `200`.**

### 8.7 `DELETE /admin/institutions/:id` — 🛡️ Admin

**Response `200`.** Prefer `status: "archived"` to keep review history.

---

## 9. Counselling Requests (Confidential)

### 9.1 `POST /counselling-requests` — 🌐 Public

Confidential parent counselling intake (PRD Flow 5). Notifies Super Admin and the designated counsellor by email.

**Request**
```json
{
  "parentName": "সুলতানা পারভীন",
  "phone": "01819876543",
  "childAge": "৮-১২ বছর",
  "problemCategory": "screen_addiction",
  "preferredTime": "বিকাল",
  "message": "সন্তান মোবাইল গেমসে অতিমাত্রায় আসক্ত, পড়াশোনায় একেবারেই মনোযোগ দিচ্ছে না।"
}
```

| Field | Required | Rule |
|---|---|---|
| `parentName` | ✅ | |
| `phone` | ✅ | `^01[3-9]\d{8}$` |
| `childAge` | ✅ | |
| `problemCategory` | ✅ | `behavioral`, `screen_addiction`, `inattention`, `adolescence`, `other` |
| `preferredTime` | ✅ | |
| `message` | ✅ | min 20 chars |

**Response `201`** — echoes nothing sensitive back:
```json
{
  "success": true,
  "message": "আপনার অনুরোধ গোপনীয়ভাবে গৃহীত হয়েছে। একজন কাউন্সেলর শীঘ্রই যোগাযোগ করবেন।",
  "data": { "referenceNo": "6720f7a7b8c9d0e1f2a3b4c5" }
}
```

### 9.2 `GET /admin/counselling-requests` — 🧑‍⚕️ Counsellor

- `super_admin`: all requests.
- `counsellor`: only where `assignedCounsellorId === currentUser._id` (enforced server-side).
- `content_editor`: ❌ `403`.

**Query:** `?status=new&problemCategory=screen_addiction&page=1`

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f7a7b8c9d0e1f2a3b4c5",
      "parentName": "সুলতানা পারভীন",
      "phone": "01819876543",
      "childAge": "৮-১২ বছর",
      "problemCategory": "screen_addiction",
      "preferredTime": "বিকাল",
      "status": "in_progress",
      "assignedCounsellor": { "_id": "6720f888b8c9d0e1f2a3b488", "fullName": "ড. ফাতিমা" },
      "createdAt": "2026-10-30T01:15:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### 9.3 `GET /admin/counselling-requests/:id` — 🧑‍⚕️ Counsellor

**Response `200`:** full object incl. `message` and `confidentialNotes`.  
**Errors:** `403 FORBIDDEN` (counsellor not assigned)

### 9.4 `PATCH /admin/counselling-requests/:id/assign` — 🛡️ Admin

**Request**
```json
{ "counsellorId": "6720f888b8c9d0e1f2a3b488" }
```
Target user must have role `counsellor`. **Response `200`:** updated request. **Errors:** `400 VALIDATION_ERROR` (user is not a counsellor)

### 9.5 `PATCH /admin/counselling-requests/:id` — 🧑‍⚕️ Counsellor (assigned) / 🛡️ Admin

**Request**
```json
{
  "status": "in_progress",
  "confidentialNotes": "প্রথম সেশন সম্পন্ন। স্ক্রিন টাইম দৈনিক ১ ঘণ্টায় নামিয়ে আনার ট্র্যাকার দেওয়া হয়েছে।"
}
```
`status` ∈ `new`, `in_progress`, `resolved`. **Response `200`.**

---

## 10. Reviews

### 10.1 `GET /reviews` — 🌐 Public

Only `status: "approved"`. Powers homepage S10, course pages and `/reviews`.

**Query:** `?category=course&courseId=...&institutionId=...&hasVideo=true&minRating=4&page=1&limit=12`  
`category` ∈ `course`, `consultancy`, `parenting` (omit for "সকল রিভিউ").

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f8b8c9d0e1f2a3b4c5d6",
      "reviewCategory": "course",
      "reviewerName": "মাওলানা আহমাদুল্লাহ",
      "reviewerRole": "হিফজ শিক্ষক, মারকাযুত তাকওয়া",
      "rating": 5,
      "reviewTitle": "শিক্ষণ পদ্ধতিতে নতুন দিগন্ত খুলে দিয়েছে",
      "reviewBody": "এই প্রশিক্ষণে অংশ নেওয়ার পর আমার ক্লাসরুম পরিচালনার মানসিকতা পুরোপুরি বদলে গেছে। অসাধারণ কোর্স!",
      "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "isVerifiedUser": true,
      "verifiedBadge": { "type": "verified_student", "token": "ATQ-2026-87K2M" },
      "course": { "slug": "teaching-proficiency-madrasa", "titleBn": "টিচিং প্রফিসিয়েন্সি প্রোগ্রাম (মাদরাসা শিক্ষক)" },
      "institution": null,
      "createdAt": "2026-10-30T02:30:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 350, "totalPages": 30 }
}
```
`verifiedBadge.type` is `verified_student` or `verified_institution_head`.

### 10.2 `GET /reviews/summary` — 🌐 Public

Rating Summary Widget.

**Query:** `?category=course&courseId=...&institutionId=...` (all optional)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "averageRating": 4.9,
    "totalReviews": 352,
    "distribution": { "5": 320, "4": 25, "3": 5, "2": 1, "1": 1 },
    "byCategory": { "course": 210, "consultancy": 62, "parenting": 80 }
  }
}
```

### 10.3 `POST /reviews` — 🔐 User

New reviews are saved with `status: "pending"`. `userId`, `reviewerName`, `isVerifiedUser` are set from the session, not from the body.

**Eligibility (Anti-Fraud Guard):**
- `course`: user must have an `approved` enrollment in a batch of `courseId`, and one review per user per course.
- `consultancy`: `institutionId` required; user should be linked to that institution (verified by admin during moderation).
- `parenting`: user must have an approved enrollment in a parenting course or a resolved counselling case (checked by admin during moderation).

**Request**
```json
{
  "reviewCategory": "course",
  "courseId": "6720f3c3d4e5f6a7b8c9d0e1",
  "institutionId": null,
  "reviewerRole": "হিফজ শিক্ষক, মারকাযুত তাকওয়া",
  "rating": 5,
  "reviewTitle": "শিক্ষণ পদ্ধতিতে নতুন দিগন্ত খুলে দিয়েছে",
  "reviewBody": "এই প্রশিক্ষণে অংশ নেওয়ার পর আমার ক্লাসরুম পরিচালনার মানসিকতা পুরোপুরি বদলে গেছে।",
  "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "consent": true
}
```

| Field | Required | Rule |
|---|---|---|
| `reviewCategory` | ✅ | `course` / `consultancy` / `parenting` |
| `courseId` | ✅ if `course` | ObjectId |
| `institutionId` | ✅ if `consultancy` | ObjectId |
| `reviewerRole` | ✅ | |
| `rating` | ✅ | integer 1–5 |
| `reviewTitle` | ✅ | max 120 |
| `reviewBody` | ✅ | max 1000 |
| `videoUrl` | ❌ | YouTube / Facebook Reel URL |
| `consent` | ✅ | must be `true` (not stored — see §13) |

**Response `201`**
```json
{
  "success": true,
  "message": "আপনার রিভিউ পর্যালোচনার জন্য জমা হয়েছে",
  "data": { "_id": "6720f8b8c9d0e1f2a3b4c5d6", "status": "pending" }
}
```
**Errors:** `403 NOT_ELIGIBLE` · `409 ALREADY_REVIEWED` · `400 VALIDATION_ERROR`

### 10.4 `GET /reviews/me` — 🔐 User

**Response `200`:** my reviews (all statuses) with `status`.

### 10.5 `GET /reviews/eligibility` — 🔐 User

Used to show/hide the "রিভিউ দিন" button.

**Query:** `?courseId=...` (optional)

**Response `200`**
```json
{
  "success": true,
  "data": {
    "eligibleCourses": [
      { "courseId": "6720f3c3d4e5f6a7b8c9d0e1", "titleBn": "টিচিং প্রফিসিয়েন্সি প্রোগ্রাম (মাদরাসা শিক্ষক)", "alreadyReviewed": false }
    ]
  }
}
```

### 10.6 `GET /admin/reviews` — 🛡️ Admin

Reviews Moderation queue.

**Query:** `?status=pending&category=course&page=1`  
**Response `200`:** reviews of any status, with populated `user { token, fullName, email }`.

### 10.7 `PATCH /admin/reviews/:id/moderate` — 🛡️ Admin

**Request**
```json
{ "status": "approved" }
```
`status` ∈ `approved`, `rejected`. Sets `moderatedBy`.  
**Response `200`:** updated review. Approved reviews go live on homepage S10, course page and `/reviews`; the API revalidates the related ISR paths.

---

## 11. Resources (Knowledge Hub)

### 11.1 `GET /resources` — 🌐 Public

Only `isPublished: true`.

**Query:** `?category=sop_template&tag=monitoring&q=মনিটরিং&page=1&limit=12`  
`category` ∈ `article`, `guide`, `sop_template`, `research`. `q` uses the text index on `titleBn` + `tags`.

**Response `200`**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6720f9c9d0e1f2a3b4c5d6e7",
      "titleBn": "মাদরাসা শিক্ষক মূল্যায়ন ও মনিটরিং চেকলিস্ট (SOP)",
      "titleEn": "Madrasa Teacher Evaluation and Monitoring Checklist SOP",
      "category": "sop_template",
      "tags": ["monitoring", "sop", "evaluation"],
      "fileSize": 2450000,
      "thumbnailUrl": "https://cdn.attaqwainstitute.org/sops/thumb-monitoring.webp",
      "author": "আত-তাকওয়া রিসার্চ সেল",
      "downloadsCount": 432,
      "createdAt": "2026-10-30T01:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 12, "total": 1, "totalPages": 1 }
}
```

### 11.2 `GET /resources/:id` — 🌐 Public

**Response `200`:** single resource. **Errors:** `404 NOT_FOUND` (or unpublished)

### 11.3 `POST /resources/:id/download` — 🌐 Public

Atomically `$inc: { downloadsCount: 1 }` and returns the file URL.

**Request:** no body  
**Response `200`**
```json
{
  "success": true,
  "data": { "fileUrl": "https://cdn.attaqwainstitute.org/sops/teacher-monitoring-sop.pdf", "downloadsCount": 433 }
}
```

### 11.4 `GET /admin/resources` — ✏️ Editor

**Query:** `?isPublished=false&category=...&page=1`. **Response `200`:** resources incl. unpublished.

### 11.5 `POST /admin/resources` — ✏️ Editor

**Request**
```json
{
  "titleBn": "মাদরাসা শিক্ষক মূল্যায়ন ও মনিটরিং চেকলিস্ট (SOP)",
  "titleEn": "Madrasa Teacher Evaluation and Monitoring Checklist SOP",
  "category": "sop_template",
  "tags": ["monitoring", "sop", "evaluation"],
  "fileUrl": "https://cdn.attaqwainstitute.org/sops/teacher-monitoring-sop.pdf",
  "fileSize": 2450000,
  "thumbnailUrl": "https://cdn.attaqwainstitute.org/sops/thumb-monitoring.webp",
  "author": "আত-তাকওয়া রিসার্চ সেল",
  "isPublished": true
}
```
Required: `titleBn`, `category`. `downloadsCount` not accepted.  
**Response `201`:** created resource.

### 11.6 `PATCH /admin/resources/:id` — ✏️ Editor

**Request:** subset of 11.5 (e.g. `{ "isPublished": false }`). **Response `200`.**

### 11.7 `DELETE /admin/resources/:id` — ✏️ Editor

**Response `200`.** Also deletes the file from R2.

---

## 12. Uploads & Open Graph

### 12.1 `POST /admin/uploads` — ✏️ Editor

**Content-Type:** `multipart/form-data`

| Field | Required | Rule |
|---|---|---|
| `file` | ✅ | Image (`webp`, `png`, `jpg`) ≤ 5 MB in any folder, or PDF ≤ 20 MB in `resources` only. Type is read from magic bytes. SVG is not accepted (it can carry scripts). |
| `folder` | ✅ | `courses`, `blog`, `trainers`, `institutions`, `resources`, `thumbnails` |

The object key is generated by the server: `<folder>/<ulid>.<ext>`. Sending a video here returns `415` with a hint to use §12.2.

**Response `201`**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.attaqwainstitute.org/resources/01jbx3k9q2m7v8w4t6r5y0z1ab.pdf",
    "key": "resources/01jbx3k9q2m7v8w4t6r5y0z1ab.pdf",
    "fileSize": 2450000,
    "mimeType": "application/pdf"
  }
}
```

### 12.2 `POST /admin/uploads/video-url` — ✏️ Editor

Videos (up to 500 MB) do not pass through the API. Step 1 returns a presigned R2 `PUT` URL, valid 15 minutes. The type and exact byte size are signed, so R2 rejects a different body.

| Field | Required | Rule |
|---|---|---|
| `folder` | ✅ | `courses` or `blog` |
| `mimeType` | ✅ | `video/mp4`, `video/webm`, `video/quicktime` |
| `fileSize` | ✅ | Bytes, 1 – 524 288 000 |

**Response `201`**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://<account>.r2.cloudflarestorage.com/...&X-Amz-Signature=...",
    "method": "PUT",
    "headers": { "Content-Type": "video/mp4" },
    "key": "courses/01jbx3m2c4d6f8h0j2k4m6n8pq.mp4",
    "url": "https://cdn.attaqwainstitute.org/courses/01jbx3m2c4d6f8h0j2k4m6n8pq.mp4",
    "expiresIn": 900
  }
}
```

The browser then sends `PUT uploadUrl` with the file as the body and the returned `headers`. The bucket needs a CORS rule allowing `PUT` from the frontend origin.

### 12.3 `POST /admin/uploads/video-complete` — ✏️ Editor

Step 2, after the `PUT` succeeds. Body: `{ "key": "<key from §12.2>" }`. The server reads the object's first bytes; if it is not a real video it is deleted and `415` is returned. Unknown key → `404`.

**Response `200`:** `{ url, key, fileSize, mimeType }` as in §12.1. Only use the `url` after this step succeeds.

### 12.4 Using uploaded media

- **Courses:** `coverImage` (image URL) and `media[]` on `POST/PATCH /admin/courses`. Each item: `{ "kind": "image" | "video", "url": "https://...", "captionBn"?: "..." }`, max 20. A video `url` may be an uploaded R2 file or a YouTube / Vimeo link.
- **Blog:** the `blog` folder is ready; the blog/article module itself is not built yet.

### 12.5 `GET /api/og/course/[slug]` — 🌐 Public (Next.js Edge route)

Served by the **Next.js app** using `@vercel/og`, not by Express. It reads `GET /api/v1/courses/:slug` and returns a `1200×630` `image/png` with course title (SolaimanLipi), format badge (অনলাইন / অফলাইন), trainer name, course fee, and At-Taqwa logo.

**Response `200`:** `Content-Type: image/png`, `Cache-Control: public, max-age=86400`

---

## 13. Open Items / Schema Gaps

These come from the PRD but are not yet supported by `database-schema.md`. Each one needs a decision before it is implemented.

| # | PRD Requirement | Gap | Suggested Fix |
|---|---|---|---|
| 1 | **Waitlist** ("ওয়েটলিস্টে যুক্ত হোন", PRD §3.4) | No collection stores waitlist entries. | Add a `waitlists` collection `{ userId, courseId, createdAt }` + `POST /waitlists` (🔐 User) and `GET /admin/waitlists` (🛡️ Admin). |
| 2 | **Institutional intake** (`serviceNeeded`, `message`) | `institutions` has no fields for these. | Add `serviceNeeded: string[]` and `intakeMessage: string` to `Institution`, or a separate `institution_requests` collection. |
| 3 | **Review consent checkbox** | `reviews` has no `consent` field. | Add `consentGiven: boolean` + `consentAt: Date` to `Review` for audit. |
| 4 | **One review per user per course** | No unique index. | Add a partial unique index `{ userId: 1, courseId: 1 }` where `courseId` exists. |
| 5 | **Duplicate enrollment check** | `{ userId, batchId }` index is not unique. | Make it a partial unique index where `status != "rejected"`. |
| 6 | **"Course completed" condition for reviews** | No completion field on enrollments. | Add `completedAt` to `Enrollment`, or treat batch `startDate` + duration as completion. |
| 7 | **Homepage stats counters (S6), Events/Webinars (S12), Trainers (S11)** | No collections. | Serve from static config/CMS in V1, or add collections in a later sprint. |

---

*Document Status: Draft API Specification `1.0.0` for Sprint 1 — aligned with PRD v1.2, `database-schema.md` and `architecture.md`.*
