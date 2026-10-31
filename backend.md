# Backend Specification
## At-Taqwa Institute Digital Platform

**Backend:** Express 5, TypeScript, Node.js ≥ 20.6 (Layered Service-Repository Pattern)  
**Database:** MongoDB Atlas (Mongoose ODM, Replica Set with ACID Transactions)  
**External Services:** Resend (Email OTP & transactional alerts), Cloudflare R2 / Cloudinary (PDFs, logos, banners)  
**Base URL:** `https://api.attaqwainstitute.org/api/v1` (local: `http://localhost:5000/api/v1`)

**Related documents:**
- [`architecture.md`](./architecture.md) — system topology, frontend rendering strategy, auth sequence
- [`api-spec.md`](./api-spec.md) — endpoint contract, response envelope, error codes, rate limits
- [`database.md`](./database.md) / [`database-schema.md`](./database-schema.md) — collections, indexes, Mongoose models
- [`dfd.md`](./dfd.md) — data flow diagrams

---

## 1. Layered Monolith Design

To keep the codebase maintainable, testable, and loosely coupled, the Express backend is split into **four layers**. Each layer may only call the layer directly below it:

```
1. Presentation   (api/)           routes → validators → controllers
        ↓
2. Business Logic (services/)
        ↓
3. Data Access    (repositories/)
        ↓
4. Schema         (models/)        Mongoose schemas & model registration
```

The backend lives in its own `backend/` folder, separate from the Next.js app at the repo root, and is deployed as its own process.

```
backend/
├── package.json
├── tsconfig.json
├── .env.example
└── src/
    ├── app.ts                      # Express app: middleware pipeline, /api/v1 mount, 404 + error handler
    ├── server.ts                   # Bootstrap: env check, DB connect, listen, graceful shutdown
    │
    ├── api/                        # ── 1. PRESENTATION LAYER (versioned) ──
    │   ├── routes/v1/
    │   │   ├── index.ts            # v1Router — mounts every route file below
    │   │   ├── auth.routes.ts          # /auth/*
    │   │   ├── user.routes.ts          # /users/me, /admin/users/*
    │   │   ├── course.routes.ts        # /courses/*, /admin/courses/*
    │   │   ├── batch.routes.ts         # /courses/:slug/batches, /admin/batches/*, /admin/courses/:courseId/batches
    │   │   ├── enrollment.routes.ts    # /enrollments/*, /admin/enrollments/*
    │   │   ├── institution.routes.ts   # /institutions/*, /admin/institutions/*
    │   │   ├── counselling.routes.ts   # /counselling-requests, /admin/counselling-requests/*
    │   │   ├── review.routes.ts        # /reviews/*, /admin/reviews/*
    │   │   ├── resource.routes.ts      # /resources/*, /admin/resources/*
    │   │   └── upload.routes.ts        # /admin/uploads
    │   ├── controllers/v1/         # One file per route file (course.controller.ts, …). No business logic.
    │   ├── validators/v1/          # Zod request schemas = DTOs (course.validator.ts, …)
    │   └── middlewares/            # requestId, authGuard, roleGuard, rateLimiter, validate,
    │                               # notFoundHandler, errorHandler
    │
    ├── services/                   # ── 2. BUSINESS LOGIC LAYER (not versioned) ──
    │   ├── auth.service.ts             # OTP generation/verification, cooldown, JWT signing
    │   ├── user.service.ts             # Profile update, admin user list, role change
    │   ├── course.service.ts           # Catalog filtering, course CRUD, delete guard
    │   ├── batch.service.ts            # Batch CRUD, seat summary (remainingSeats, isHouseful)
    │   ├── enrollment.service.ts       # Seat-booking transaction, TrxID check, approve/reject
    │   ├── institution.service.ts      # Client network, onboarding requests
    │   ├── counselling.service.ts      # Confidential intake, counsellor assignment
    │   ├── review.service.ts           # Verified-student eligibility, moderation
    │   ├── resource.service.ts         # Knowledge Hub, Bengali search, download counter
    │   ├── upload.service.ts           # R2 upload / delete
    │   └── notification.service.ts     # Resend email templates & triggers (no route)
    │
    ├── repositories/               # ── 3. DATA ACCESS LAYER (not versioned) ──
    │   ├── transaction.ts              # runInTransaction(fn) — wraps session.withTransaction
    │   ├── user.repository.ts
    │   ├── otp.repository.ts
    │   ├── course.repository.ts
    │   ├── batch.repository.ts
    │   ├── enrollment.repository.ts
    │   ├── institution.repository.ts
    │   ├── counselling.repository.ts
    │   ├── review.repository.ts
    │   └── resource.repository.ts
    │
    ├── models/                     # ── 4. SCHEMA LAYER ── (schemas: database-schema.md §6)
    │   ├── User.model.ts
    │   ├── Otp.model.ts
    │   ├── Course.model.ts
    │   ├── Batch.model.ts
    │   ├── Enrollment.model.ts
    │   ├── Institution.model.ts
    │   ├── Counselling.model.ts
    │   ├── Review.model.ts
    │   └── Resource.model.ts
    │
    ├── config/                     # env.ts (Zod-validated env), db.ts, resend.ts, r2.ts
    ├── utils/                      # AppError, errorMessages, response helpers,
    │                               # tokenGenerator (ATQ-YYYY-XXXXX), logger
    └── types/                      # Shared TypeScript types (Role, Express Request augmentation)
```

**One repository per model.** Every collection, including small ones like `otps` and `reviews`, goes through its repository. No other layer imports a model.

**Admin endpoints stay in their domain's route file.** For example, `course.routes.ts` registers both `GET /courses` and `POST /admin/courses`. The guard is attached per route (`authGuard`, `roleGuard(...)`) following the access levels in [`api-spec.md` §1.2](./api-spec.md#12-access-levels). There is no separate `admin.routes.ts`.

### 1.1 Layer Responsibilities

| # | Layer | Does | Never does |
|---|---|---|---|
| 1 | **Presentation** (routes, validators, controllers, middlewares) | Matches the URL and applies guards and rate limits. Validates params, query and body with Zod. Calls one service method and sends the envelope `{ success: true, data, meta? }` ([`api-spec.md` §1.3](./api-spec.md#13-response-envelope)). | Contains business rules, imports repositories or models, or catches errors just to format them (that is `errorHandler`'s job). |
| 2 | **Business Logic** (services) | Holds 100% of the business rules: seat availability, TrxID uniqueness, OTP cooldowns, review eligibility, role checks on ownership. Decides the transaction boundary and triggers notifications. Throws `AppError`. | Reads `req`/`res`, builds HTTP responses, or imports Mongoose models. |
| 3 | **Data Access** (repositories) | Runs queries, aggregation pipelines and atomic updates. Accepts an optional `ClientSession` so services can group calls into one ACID transaction. Returns plain objects (`.lean()`) unless a document is needed for `save()`. | Contains business rules or throws HTTP-specific errors. |
| 4 | **Schema** (models) | Holds Mongoose schemas, indexes, field validators and model registration. | Contains query logic beyond schema hooks. |

### 1.2 Dependency Rules

- `controllers → services → repositories → models`. Calls only go down, and never skip a layer.
- A service may call another service (for example, `enrollment.service` calls `notification.service`).
- Transactions are opened with `runInTransaction` from `repositories/transaction.ts`, so services never import `mongoose` directly.

---

## 2. API Versioning — Express Implementation

Versioning strategy, deprecation policy and changelog: [`api-spec.md` §1.8](./api-spec.md#18-api-versioning).

```typescript
// app.ts
const SPEC_VERSION = "1.0.0";

app.use(requestId);
// Set before the body parser so even MALFORMED_JSON responses carry the header.
app.use("/api", (_req, res, next) => {
  res.setHeader("X-API-Version", SPEC_VERSION);
  next();
});
// ... helmet, cors, generalLimiter, express.json, cookieParser

app.use("/api/v1", v1Router);
app.use("/api", unsupportedVersionHandler);   // /api/courses, /api/v9/... → 404
app.use(notFoundHandler);                      // /api/v1/unknown → 404 ROUTE_NOT_FOUND
app.use(errorHandler);

// api/middlewares/notFoundHandler.ts
export const SUPPORTED_VERSIONS = ["v1"] as const;

export const unsupportedVersionHandler: RequestHandler = (req, _res, next) => {
  const version = req.path.split("/")[1];
  if (!SUPPORTED_VERSIONS.includes(version as (typeof SUPPORTED_VERSIONS)[number])) {
    throw new AppError("UNSUPPORTED_API_VERSION", 404, { supportedVersions: SUPPORTED_VERSIONS });
  }
  next(); // supported version but no matching route → falls through to notFoundHandler
};
```

| Request | Result |
|---|---|
| `GET /api/v1/courses` | handled by `v1Router` |
| `GET /api/courses` (no version) | `404 UNSUPPORTED_API_VERSION`, `details.supportedVersions: ["v1"]` |
| `GET /api/v9/courses` | `404 UNSUPPORTED_API_VERSION` |
| `GET /api/v1/unknown` | `404 ROUTE_NOT_FOUND` |

**When `v2` is released** (not implemented yet, since only `v1` exists): add `"v2"` to `SUPPORTED_VERSIONS`, mount `v2Router` at `/api/v2`, and put a `deprecation("v1")` middleware in front of `v1Router`. Until the sunset date it sets the `Deprecation`, `Sunset` and `Link: rel="successor-version"` headers. After that date it throws `410 API_VERSION_SUNSET` ([`api-spec.md` §1.8.3](./api-spec.md#183-deprecation--sunset-policy)).

Routes, controllers and validators live under a version folder (see the §1 tree) so that `v2` can reuse unchanged services:

```
api/
├── routes/v1/        # v1Router + route files
├── controllers/v1/
├── validators/v1/    # DTOs
└── (routes|controllers|validators)/v2/   # created only when a breaking change is needed
```

Services and repositories are **not** versioned; only routes, controllers and DTOs (validators) are.

---

## 3. Error Handling Implementation

Error object, error codes and the error-mapping table: [`api-spec.md` §1.4 and §1.9](./api-spec.md#19-error-handling).

### 3.1 Error Class Hierarchy

Services throw typed errors; they never build HTTP responses themselves.

```typescript
// utils/AppError.ts
export class AppError extends Error {
  isOperational = true;                       // expected error → safe to show to user

  constructor(
    public readonly code: ErrorCode,          // e.g. "BATCH_FULL"
    public readonly statusCode: number,       // e.g. 409
    public readonly details?: unknown,        // sent to the client as error.details
    message?: string,                         // internal only (logs / stack), never sent to the client
  ) {
    super(message ?? errorMessages.bn[code]);
    this.name = "AppError";
  }
}

// Usage inside a service
if (batch.enrolledCount >= batch.seatCapacity) {
  throw new AppError("BATCH_FULL", 409, { batchId: batch._id });
}
```

- **Operational errors** (`AppError`): expected business errors, returned with their own `code`, `statusCode` and `details`.
- **Programmer / unknown errors** (bugs, `TypeError`, unknown library errors): logged with the full stack and returned to the client as a generic `500 INTERNAL_ERROR`. `normalizeError` wraps them in an `AppError` with `isOperational = false`, so the real message never leaks.
- The client-facing `error.message` always comes from `errorMessages[lang][code]` (`utils/errorMessages.ts`, Bengali + English), never from `AppError.message`. To show a different text, add a new code.

### 3.2 Global Error Handler

A single Express error middleware (registered last) converts every thrown error into the envelope, using the mapping table in [`api-spec.md` §1.9.5](./api-spec.md#195-global-error-handler--error-mapping):

```typescript
// api/middlewares/errorHandler.ts
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const appError = normalizeError(err);           // applies the mapping table
  const lang: Lang = req.acceptsLanguages("bn", "en") === "en" ? "en" : "bn";

  if (appError.statusCode >= 500) {
    logger.error({ requestId: req.id, err, path: req.originalUrl }, "Unhandled error");
  } else {
    logger.warn({ requestId: req.id, code: appError.code, path: req.originalUrl });
  }

  // Only a bad/expired session clears the cookie — not e.g. OTP_INVALID (also 401).
  // Same options as when it was set (config/cookie.ts), or the browser keeps it.
  if (appError.code === "UNAUTHENTICATED") res.clearCookie(ACCESS_TOKEN_COOKIE, accessTokenCookieOptions);
  if (appError.statusCode === 503) res.setHeader("Retry-After", 30);

  const stack = err instanceof Error ? err.stack : undefined;

  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: appError.isOperational ? errorMessages[lang][appError.code] : errorMessages[lang].INTERNAL_ERROR,
      details: appError.details,
      requestId: req.id,
      timestamp: new Date().toISOString(),
      path: `${req.method} ${req.originalUrl}`,
      ...(!isProduction && stack && { stack }),
    },
  });
};

// app.ts — order matters
app.use("/api/v1", v1Router);
app.use("/api", unsupportedVersionHandler); // → 404 UNSUPPORTED_API_VERSION (§2)
app.use(notFoundHandler);                   // → 404 ROUTE_NOT_FOUND
app.use(errorHandler);                      // must be registered last
```

`405 METHOD_NOT_ALLOWED` (api-spec §1.4) is **not implemented yet**. A known path with the wrong method currently returns `404 ROUTE_NOT_FOUND`.

Express 5 forwards rejected promises from async handlers to `errorHandler` natively, so no `asyncHandler` wrapper is needed. `process.on("unhandledRejection")` and `uncaughtException` (in `server.ts`) log the error at `fatal` and exit with code 1, and the process manager (PM2 / container restart policy) starts a fresh process. On `SIGTERM`/`SIGINT` the server stops accepting connections, closes the DB connection and exits, with a forced exit after 10 s.

### 3.3 Logging & Privacy

| Rule | Detail |
|---|---|
| Log level | `4xx` → `warn`, `5xx` → `error` (with stack). |
| Never logged | OTP codes, OTP hashes, JWTs, cookies, `confidentialNotes`, counselling `message`. Enforced by pino `redact` in `utils/logger.ts` (cookie / authorization headers, `*.otp`, `*.otpHash`, `*.accessToken`, `*.confidentialNotes`). A counselling `message` must never be passed to the logger, because a `*.message` redact path would also hide every error message. In development without `RESEND_API_KEY`, OTP emails are printed with `console.info`, never through the logger. |
| Masked in logs | `email` (`ah*****@example.com`), `phone` / `senderNumber` (`017*****678`), `trxId` (`BL9A****10`). Helpers live in `utils/mask.ts`. `maskEmail` exists now; add `maskPhone` / `maskTrxId` there with the enrollment module, the first place they are logged. |
| Error messages | Never reveal whether data exists for another user (e.g. accessing someone else's enrollment returns `404`, not `403`, when the ID is not owned). |
| Auth messages | **Open decision.** api-spec §3.1 returns `404 NOT_FOUND` for a login with an unknown email/token, which tells the caller whether an account exists. The current implementation follows the spec. Account enumeration is limited only by the OTP rate limit (3 / email + IP / 15 min). To close it, return the same `200` with a masked placeholder for unknown identifiers and send no email; that is a breaking change to api-spec §3.1. |

---

## 4. Race-Condition Proof Seat Booking (MongoDB ACID Transaction)

To prevent over-booking when multiple users submit payments concurrently for the last seat, the service opens a transaction and the repositories do the atomic work:

```typescript
// repositories/transaction.ts
// session.withTransaction retries TransientTransactionError automatically (api-spec §1.9.5).
export async function runInTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}

// repositories/batch.repository.ts
// Atomic seat check + increment: matches only while a seat is free.
incrementSeatIfAvailable(batchId: Types.ObjectId, session: ClientSession) {
  return Batch.findOneAndUpdate(
    { _id: batchId, $expr: { $lt: ["$enrolledCount", "$seatCapacity"] } },
    { $inc: { enrolledCount: 1 } },
    { session, returnDocument: "after" }
  ).lean();
}

// repositories/enrollment.repository.ts
// Conditional update: only a still-pending enrollment can be approved, so the status check
// does not depend on transaction write-conflict detection alone.
markApproved(id: string, adminId: string, session: ClientSession) {
  return Enrollment.findOneAndUpdate(
    { _id: id, status: "pending" },
    { $set: { status: "approved", verifiedBy: adminId, verifiedAt: new Date() } },
    { session, returnDocument: "after" }
  ).lean();
}

// services/enrollment.service.ts
async function approveEnrollment(enrollmentId: string, adminId: string) {
  // The callback may run more than once (transient-error retry): no side effects inside it.
  const { enrollment, batch } = await runInTransaction(async (session) => {
    const pending = await enrollmentRepository.findById(enrollmentId, session);
    if (!pending) throw new AppError("NOT_FOUND", 404);
    if (pending.status !== "pending") {
      throw new AppError("INVALID_STATE", 400, { status: pending.status });
    }

    const batch = await batchRepository.incrementSeatIfAvailable(pending.batchId, session);
    if (!batch) throw new AppError("BATCH_FULL", 409, { batchId: pending.batchId });

    const enrollment = await enrollmentRepository.markApproved(enrollmentId, adminId, session);
    // Another admin approved it between the read and the update → abort, seat increment rolls back.
    if (!enrollment) throw new AppError("INVALID_STATE", 400, { status: "approved" });

    return { enrollment, batch };
  });

  // Side effect runs after commit. A failed email does not undo the approval (api-spec §1.9.7).
  const warnings: string[] = [];
  try {
    await notificationService.sendApprovalEmail(enrollment.userId, batch);
  } catch {
    warnings.push("EMAIL_DELIVERY_FAILED");
  }

  // Response shape: api-spec §7.7
  return {
    enrollment: { _id: enrollment._id, status: enrollment.status, verifiedBy: enrollment.verifiedBy, verifiedAt: enrollment.verifiedAt },
    batch: {
      _id: batch._id,
      seatCapacity: batch.seatCapacity,
      enrolledCount: batch.enrolledCount,
      remainingSeats: batch.seatCapacity - batch.enrolledCount,
    },
    ...(warnings.length > 0 && { warnings }),
  };
}
```

### 4.1 Why it is safe

| Scenario | Outcome |
|---|---|
| Two admins approve **different** enrollments for the **last seat** at the same time | `incrementSeatIfAvailable` matches only while `enrolledCount < seatCapacity`. Both transactions write the same batch document, so MongoDB aborts one with a write conflict. `withTransaction` re-runs it, the filter no longer matches, and that admin gets `409 BATCH_FULL`. |
| Two admins approve the **same** enrollment | The second one reads `approved` on retry, or `markApproved` matches nothing. Either way it gets `400 INVALID_STATE` and its seat increment is rolled back. |
| Process crashes mid-transaction | Uncommitted transactions are discarded by MongoDB; no half-approved state. |
| Email fails after commit | Approval stays committed; response is `200` with `data.warnings: ["EMAIL_DELIVERY_FAILED"]`. |

**Retry behaviour:** `session.withTransaction` re-runs the callback on `TransientTransactionError` and retries `UnknownTransactionCommitResult` on commit. It keeps retrying until a **120-second** driver limit, not a fixed count. If it still fails, the error reaches `errorHandler` as `503 SERVICE_UNAVAILABLE`. An `AppError` thrown inside the callback aborts immediately and is not retried.

### 4.2 Open items

- **Seat is taken at approval, not at submission** (api-spec §7.1, by design). Several users can pay for the last seat. Only the first to be approved gets it, and the rest get `409 BATCH_FULL` at approval even though they have paid. Those enrollments need a defined path: reject with a refund reason, or move to the waitlist (api-spec §13 #1). The admin UI should show `remainingSeats` next to the pending queue.
- **Email retry queue** (api-spec §1.9.7: "3 attempts, exponential backoff") is not designed yet. Until it exists, the email is attempted once and the failure is reported in `warnings`.
- **Inactive batch at approval:** `POST /enrollments` rejects inactive batches, but a batch deactivated after submission can still be approved. This is allowed on purpose (the user has already paid). Add `isActive: true` to the `incrementSeatIfAvailable` filter if that should be blocked.

---

## 5. Security & Infrastructure Hardening

Status column: ✅ implemented · ⏳ planned (module not built yet).

### 5.1 Sessions & Cookies ✅

1. **HTTP-only JWT cookie.** The access token lives in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` when `NODE_ENV=production`), so page scripts cannot read it even if an XSS bug exists. All cookie options live in `config/cookie.ts` and are reused for set, logout and error-clear, so the browser always sees them as the same cookie.
2. **JWT.** HS256, signed and verified with `algorithms: ["HS256"]` pinned. Valid for 7 days (`JWT_EXPIRES_IN_SECONDS`). `JWT_SECRET` and `OTP_SECRET` are separate keys, each at least 32 characters, checked at boot by `config/env.ts`.
   - **Revocation.** Each user has a `sessionVersion`, copied into the JWT as `sv`. `authGuard` loads the user on every request and rejects the token if the user is gone or `sv` no longer matches (`401 UNAUTHENTICATED`, `reason: "revoked"`). Logout increments `sessionVersion`, so every token issued before it, on every device, stops working — including a copied cookie.
   - **Role from the DB.** `authGuard` takes `role` from the database, not from the token, so promoting or demoting a user takes effect on their next request.
   - Authenticated responses carry `Cache-Control: no-store`.
3. **CSRF.** No CSRF token is used, for four reasons:
   - `SameSite=Lax` keeps the cookie off cross-site `POST`/`PATCH`/`DELETE` requests.
   - Every state-changing route reads a JSON body. `express.json` only parses `application/json`, which a plain HTML form cannot send.
   - A cross-origin `fetch` with JSON triggers a CORS preflight, which only `FRONTEND_URL` passes.
   - `originGuard` refuses any non-GET request whose `Origin` is not `FRONTEND_URL`, or whose `Sec-Fetch-Site` is `cross-site` (`403 FORBIDDEN`). Server-to-server calls send no `Origin` and pass.

   Every subdomain of `attaqwainstitute.org` counts as *same-site*, so never host user-generated content on a subdomain.

### 5.2 Transport & Headers ✅

4. **CORS whitelist:** `cors({ origin: FRONTEND_URL, credentials: true })`. Only the frontend origin may make credentialed browser requests. CORS does not restrict non-browser clients; guards and rate limits do.
5. **Headers:** `helmet()` defaults (HSTS, `X-Content-Type-Options`, frame denial, etc.); `X-Powered-By` disabled.
6. **Body limits:** JSON bodies over 100 KB → `413 PAYLOAD_TOO_LARGE`.
7. **Errors:** no stack traces or internal messages in production responses (§3).

### 5.3 Rate Limiting ✅

8. `express-rate-limit` (limits from api-spec §1.7):

   | Scope | Limit | Key |
   |---|---|---|
   | All `/api` routes | 100 / 15 min | IP |
   | `POST /auth/request-otp` | 3 / 15 min, plus 60 s cooldown per email (in `auth.service`) | IP + email/identifier |
   | `POST /auth/request-otp` | 10 codes / 24 h (in `auth.service`, `utils/windowCounter.ts`) | email, any IP |
   | `POST /auth/verify-otp` | 10 / 15 min (`otpVerifyLimiter`) | IP |
   | Public forms (`/counselling-requests`, `/institutions/requests`) | 5 / hour | IP (`publicFormLimiter`, attached when those routes are built) |

   - **Client IP depends on `TRUST_PROXY`.** Set it to the number of reverse proxies in front of the API: `0` if the API is reached directly, `1` behind a single load balancer or Nginx. If it is too high, clients can spoof `X-Forwarded-For` and bypass every limit. If it is too low, all users share the proxy's IP and the 100-request limit applies to everyone together.
   - **The store is in memory.** Counters reset on restart and are not shared between instances. Move to a shared store (Upstash Redis, already listed in the root `.env.example`) before running more than one instance.
   - **OTP brute force** is bounded by 3 attempts per OTP and 10 codes per email per day, both holding across IPs: at most 30 guesses per account per day, about a 1-in-33,000 chance of guessing a 6-digit code. The trade-off is that someone who knows a user's email can use up that user's 10 daily codes and block their login for the rest of the day.

### 5.4 Input Validation & NoSQL Injection ✅

9. Every param, query and body is parsed by a strict Zod schema (strings, enums, numbers, never free-form objects) before it reaches a service, so a `{ "$gt": "" }` payload is rejected with `400 VALIDATION_ERROR`.
   - Controllers read only `req.valid`.
   - Mongoose `strictQuery` drops unknown filter fields.
   - `express-mongo-sanitize` is not used: it reassigns `req.query`, which is read-only in Express 5.
   - Mongoose `sanitizeFilter` is not used either: it also neutralises the repositories' own `$gt` / `$in` operators.

### 5.5 OTP Storage ✅

10. **Hashing.** OTPs are stored as `HMAC-SHA256(email:otp)` keyed with `OTP_SECRET` and compared with `timingSafeEqual`. A 6-digit code has only 10⁶ values, so a slow hash like bcrypt would not stop offline guessing after a DB leak; the server-side key does.
11. **Single use.** Issuing a new OTP deletes older ones for that email. Attempt counting and consumption are single atomic updates, so concurrent verifies cannot reuse a code. A TTL index removes records after 10 minutes.

### 5.6 Asset Storage ✅

12. **Storage.** Images, PDFs and videos are served from **Cloudflare R2** with CDN caching (`config/r2.ts`, `services/upload.service.ts`). Without the `R2_*` env vars the upload endpoints answer `503`.
13. **Upload checks.** Images (≤ 5 MB) and PDFs (≤ 20 MB) go through `POST /admin/uploads` (Multer memory storage). The real type comes from magic bytes (`utils/fileType.ts`), never the extension or `Content-Type`; SVG is rejected. Object keys are generated on the server (`<folder>/<ulid>.<ext>`).
14. **Videos.** Videos (≤ 500 MB) upload straight from the browser to R2 with a presigned `PUT` (type + exact size signed), then `video-complete` checks the magic bytes and deletes anything that is not a video (api-spec §12.2–12.3). The R2 bucket needs a CORS rule allowing `PUT` from `FRONTEND_URL`.
15. **Open item.** Files replaced or removed from a course are not deleted from R2 yet; a cleanup job should remove objects no document references.

### 5.7 Open Items

1. **SSR / ISR traffic from Next.js.** Server-side fetches from Vercel come from a small set of IPs, so the 100 / 15 min per-IP limit would throttle the whole site's rendering. Exempt server-to-server calls with a shared secret header (`X-Internal-Key`) that skips `generalLimiter`, or put a CDN cache in front of public `GET`s.

---

## 6. Running Locally

```bash
cd backend
cp .env.example .env      # fill MONGODB_URI (replica set / Atlas), JWT_SECRET, FRONTEND_URL
npm install
npm run dev               # tsx watch → http://localhost:5000/api/v1/health
npm run typecheck
npm run build && npm start
```

The root Next.js `tsconfig.json` and `eslint.config.mjs` exclude `backend/`, so the two apps type-check and lint on their own.

---
*Status: Draft — moved from `architecture.md` §2, §4.2, §6 and `api-spec.md` §1.8.4, §1.9.4–§1.9.6*
