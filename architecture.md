# System Architecture Document
## At-Taqwa Institute Digital Platform

**Version:** 1.0 (Draft Architecture)  
**Architecture Pattern:** Layered Monolith Architecture (Separated Client-Server)  
**Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion  
**Backend:** Express.js, TypeScript, Node.js (Layered Service-Repository Pattern)  
**Database:** MongoDB Atlas (Mongoose ODM, Replica Set with ACID Transactions)  

---

## 1. Architectural Overview & System Topology

The platform follows a **Layered Monolith Architecture** split into a decoupled **Next.js Client Application** and a modular **Express.js RESTful API Backend**, backed by **MongoDB Atlas**:

```mermaid
flowchart TD
    Client["🌐 Client Layer (Next.js 16 App Router)\n• Server Components (SEO, Static/ISR)\n• Client Components (Framer Motion, Forms)\n• SolaimanLipi WOFF2 (Zero CLS)"]
    
    API_Gateway["🔒 HTTP / REST Security Gateway\n• CORS, Helmet, Rate Limiter\n• Cookie Parser (HTTP-Only JWT)\n• Zod Request Validation"]
    
    subgraph Express_Backend["⚙️ Express.js Layered Backend"]
        Controllers["1. Controller Layer\n(Request handling, Status codes, DTOs)"]
        Services["2. Business Service Layer\n(Auth, Enrollment, Seats, Verification, Notifications)"]
        Repositories["3. Data Access / Repository Layer\n(Mongoose Models, Queries, Transactions)"]
    end
    
    subgraph Storage_Cloud["☁️ Database & External Services"]
        MongoDB["🍃 MongoDB Atlas (Primary DB)\n• ACID Transactions for Seat Booking\n• Compound & Unique Indexes\n• Bengali Text Search Index"]
        Resend["📧 Resend API\n(Email OTP & Transactional Alerts)"]
        CloudStorage["📁 Cloudflare R2 / Cloudinary\n(PDFs, Logos, Banners)"]
    end

    Client -->|HTTPS / REST API Requests| API_Gateway
    API_Gateway --> Controllers
    Controllers --> Services
    Services --> Repositories
    Repositories --> MongoDB
    Services -->|Async Event| Resend
    Services -->|Asset Upload| CloudStorage
```

---

## 2. Express.js Backend: Layered Monolith Design

Folder structure and layer responsibilities (Controllers → Services → Repositories → Models) are documented in [`backend.md` §1](./backend.md#1-layered-monolith-design).

---

## 3. MongoDB Atlas Data Schema & Document Models

```mermaid
erDiagram
    USER ||--o{ ENROLLMENT : "submits"
    USER ||--o{ REVIEW : "writes"
    COURSE ||--|{ BATCH : "contains"
    BATCH ||--o{ ENROLLMENT : "receives"
    COURSE ||--o{ REVIEW : "evaluated_by"
    INSTITUTION ||--o{ REVIEW : "receives"

    USER {
        ObjectId _id PK
        string token UK "ATQ-2026-XXXXX"
        string fullName
        string phone
        string email UK
        string role "madrasa_teacher, admin, parent"
        string institution
        Date createdAt
    }

    BATCH {
        ObjectId _id PK
        ObjectId courseId FK
        int batchNo
        Date startDate
        int seatCapacity
        int enrolledCount
        string venueOrLink
        boolean isActive
    }

    ENROLLMENT {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId batchId FK
        string paymentMethod "bkash, nagad, bank"
        string senderNumber
        string trxId UK
        string status "pending, approved, rejected"
        string rejectionReason
        ObjectId verifiedBy
        Date verifiedAt
    }

    REVIEW {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId courseId FK
        string reviewCategory "course, consultancy, parenting"
        string reviewerName
        string reviewerRole
        int rating "1 to 5"
        string reviewTitle
        string reviewBody
        string videoUrl
        string status "pending, approved, rejected"
    }
```

### Critical MongoDB Indexes:
- `users`: `{ email: 1 }` (Unique), `{ token: 1 }` (Unique)
- `enrollments`: `{ trxId: 1 }` (Unique, partial filter: `{ status: { $in: ['pending', 'approved'] } }`)
- `batches`: `{ courseId: 1, batchNo: 1 }`
- `courses`: `{ slug: 1 }` (Unique), Text index: `{ title_bn: "text", description_bn: "text" }`
- `otps`: `{ email: 1 }`, TTL index: `{ createdAt: 1 }` with `expireAfterSeconds: 600` (auto-delete expired OTPs after 10 mins).

---

## 4. Key Architectural Subsystems & Flow

### 4.1 Passwordless Auth & Session Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor User as Learner / Teacher
    participant Next as Next.js Frontend
    participant Exp as Express API Server
    participant Resend as Resend Email Service
    participant Mongo as MongoDB Atlas

    User->>Next: Enters Email / Token & Mobile Number
    Next->>Exp: POST /api/v1/auth/request-otp
    Exp->>Exp: Validate 60s cooldown & rate limit
    Exp->>Mongo: Store hashed 6-digit OTP (10m TTL)
    Exp->>Resend: Dispatch OTP email template
    Resend-->>User: Delivers 6-digit OTP Code
    User->>Next: Inputs 6-digit OTP
    Next->>Exp: POST /api/v1/auth/verify-otp
    Exp->>Mongo: Validate code & find/create User Profile
    Exp->>Exp: Sign secure JWT (Payload: userId, token, role)
    Exp-->>Next: Set HTTP-Only, Secure, SameSite=Lax Cookie (`accessToken`)
    Next-->>User: Redirects to /my-account with active session
```

---

### 4.2 Race-Condition Proof Seat Booking (MongoDB ACID Transaction)

See [`backend.md` §4](./backend.md#4-race-condition-proof-seat-booking-mongodb-acid-transaction).

---

## 5. Next.js Frontend Integration & Rendering Strategy

| Route / Page | Rendering Strategy | Data Fetching Pattern | Reason |
|---|---|---|---|
| **Homepage (`/`)** | Static / ISR (`revalidate: 120`) | Pre-rendered HTML from Express API | Maximum SEO, fast LCP ($\le 2.0s$), caching at Vercel Edge |
| **Course Catalog (`/courses`)** | ISR (`revalidate: 60`) | Pre-rendered with client-side filter tabs | Instant loading with up-to-date batch status |
| **Course Detail (`/courses/[slug]`)**| Dynamic SSR / ISR | Fetch batch seat count & syllabus | Real-time seat availability check |
| **Reviews Page (`/reviews`)** | ISR (`revalidate: 300`) | Cached approved reviews | Low database read load |
| **Learner Dashboard (`/my-account`)**| Client-Side Rendering (CSR) | Protected REST API with HTTP-only cookie | Personalized private user data |
| **Admin Dashboard (`/admin`)** | CSR with TanStack Query | REST API with RoleGuard middleware | Real-time queue review, mutations, optimistic updates |

---

## 6. Security & Infrastructure Hardening

See [`backend.md` §5](./backend.md#5-security--infrastructure-hardening).

---

*Status: Draft Architecture for Review & Finalization*

