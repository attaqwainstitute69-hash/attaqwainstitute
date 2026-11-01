// Response shapes from api-spec.md. Shared by server pages and client components.

export type Pillar = "training" | "consultancy" | "digital";
export type CourseFormat = "online" | "offline" | "hybrid";
export type CourseStatus = "open" | "upcoming" | "closed";
export type EnrollmentStatus = "pending" | "approved" | "rejected";
export type PaymentMethod = "bkash" | "nagad" | "bank";

export interface Paged<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// GET /courses (§5.1)
export interface CourseSummary {
  _id: string;
  slug: string;
  titleBn: string;
  titleEn?: string;
  pillar: Pillar;
  format: CourseFormat;
  price: number;
  status: CourseStatus;
  trainerName?: string;
  trainerPhoto?: string;
  coverImage?: string;
  nextBatch: { batchNo: number; startDate: string; remainingSeats: number; isHouseful: boolean } | null;
  averageRating: number;
  totalReviews: number;
}

export interface PublicBatch {
  _id: string;
  batchNo: number;
  startDate: string;
  scheduleDetails: string;
  seatCapacity: number;
  enrolledCount: number;
  remainingSeats: number;
  isHouseful: boolean;
}

// GET /courses/:slug (§5.2)
export interface Course extends Omit<CourseSummary, "nextBatch"> {
  descriptionBn: string;
  descriptionEn?: string | null;
  syllabus: { moduleNo: number; titleBn: string; topics: string[] }[];
  trainerBio?: string;
  media?: { kind: "image" | "video"; url: string; captionBn?: string }[];
  activeBatches: PublicBatch[];
  paymentInfo: { bkash?: string; nagad?: string };
}

// GET /auth/me (§3.4)
export interface SessionUser {
  _id: string;
  token: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  institution?: string;
  // False for accounts from the old OTP flow, which set a password without a current one.
  hasPassword?: boolean;
}

// GET /admin/courses/:id — the raw course for the edit form.
export interface AdminCourse {
  _id: string;
  slug: string;
  titleBn: string;
  titleEn?: string;
  pillar: Pillar;
  format: CourseFormat;
  price: number;
  status: CourseStatus;
  descriptionBn: string;
  descriptionEn?: string;
  syllabus: { moduleNo: number; titleBn: string; topics: string[] }[];
  trainerName?: string;
  trainerBio?: string;
  trainerPhoto?: string;
  coverImage?: string;
  media: { kind: "image" | "video"; url: string; captionBn?: string }[];
}

// GET /admin/batches (§6.2) — includes the protected venueOrLink.
export interface AdminBatch {
  _id: string;
  batchNo: number;
  startDate: string;
  scheduleDetails: string;
  seatCapacity: number;
  enrolledCount: number;
  remainingSeats: number;
  venueOrLink: string;
  isActive: boolean;
  course: { _id: string; titleBn: string; slug: string };
}

// GET /admin/enrollments (§7.5)
export interface AdminEnrollment {
  _id: string;
  user: { _id: string; token: string; fullName: string; phone: string; email: string };
  course: { _id: string; titleBn: string; price: number };
  batch: { _id: string; batchNo: number; seatCapacity: number; enrolledCount: number };
  paymentMethod: PaymentMethod;
  senderNumber: string;
  trxId: string;
  experience?: string;
  status: EnrollmentStatus;
  rejectionReason?: string;
  createdAt: string;
}

// GET /enrollments/me (§7.2)
export interface MyEnrollment {
  _id: string;
  status: EnrollmentStatus;
  paymentMethod: PaymentMethod;
  senderNumber: string;
  trxId: string;
  rejectionReason: string | null;
  verifiedAt: string | null;
  createdAt: string;
  course: { _id: string; slug: string; titleBn: string; titleEn?: string; format: CourseFormat };
  batch: { _id: string; batchNo: number; startDate: string; scheduleDetails: string };
  access: { venueOrLink: string } | null;
  canResubmit: boolean;
  canReview: boolean;
}

export type ReviewCategory = "course" | "consultancy" | "parenting";
export type ReviewStatus = "pending" | "approved" | "rejected";

// GET /reviews (§10.1)
export interface PublicReview {
  _id: string;
  reviewCategory: ReviewCategory;
  reviewerName: string;
  reviewerRole: string;
  rating: number;
  reviewTitle: string;
  reviewBody: string;
  videoUrl: string | null;
  isVerifiedUser: boolean;
  verifiedBadge: { type: "verified_student" | "verified_institution_head"; token: string | null } | null;
  course: { slug: string; titleBn: string; titleEn?: string } | null;
  institution: { name: string } | null;
  createdAt: string;
}

// GET /reviews/summary (§10.2). averageRating is null when nothing is published yet.
export interface ReviewSummary {
  averageRating: number | null;
  totalReviews: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  byCategory: Record<ReviewCategory, number>;
}

// GET /reviews/me (§10.4)
export interface MyReview extends Omit<PublicReview, "verifiedBadge"> {
  status: ReviewStatus;
}

// GET /reviews/eligibility (§10.5)
export interface ReviewEligibility {
  eligibleCourses: { courseId: string; slug: string; titleBn: string; titleEn: string | null; alreadyReviewed: boolean }[];
}

// GET /admin/reviews (§10.6)
export interface AdminReview extends MyReview {
  moderatedAt: string | null;
  user: { _id: string; token: string; fullName: string; email: string } | Record<string, never>;
}

// GET /institutions (§8.1). contactPhone and intake fields are never public.
export type InstitutionBadge = "management_partner" | "monitoring_partner" | "trained_faculty";
export type InstitutionService = "management_sop" | "teacher_training" | "monitoring_system" | "other";

export interface PublicInstitution {
  _id: string;
  name: string;
  slug: string;
  district: string;
  studentCount?: number;
  teacherCount?: number;
  badges: InstitutionBadge[];
  logoUrl?: string;
  headName?: string;
  headQuote?: string;
  featured: boolean;
}

// GET /resources (§11.1). fileUrl comes only from POST /resources/:id/download.
export type ResourceCategory = "article" | "guide" | "sop_template" | "research";

export interface PublicResource {
  _id: string;
  titleBn: string;
  titleEn?: string;
  category: ResourceCategory;
  tags: string[];
  fileSize?: number;
  thumbnailUrl?: string;
  author: string;
  downloadsCount: number;
  createdAt: string;
  hasFile: boolean;
}

// POST /counselling-requests (§9.1)
export type ProblemCategory = "behavioral" | "screen_addiction" | "inattention" | "adolescence" | "other";

// GET /admin/institutions (§8.4) — the raw document, incl. intake fields.
export type InstitutionStatus = "pending" | "active" | "archived";

export interface AdminInstitution extends PublicInstitution {
  contactPhone?: string;
  status: InstitutionStatus;
  serviceNeeded: InstitutionService[];
  intakeMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// GET /admin/resources (§11.4) — the raw document, incl. fileUrl.
export interface AdminResource extends Omit<PublicResource, "hasFile"> {
  fileUrl?: string;
  isPublished: boolean;
  updatedAt: string;
}

// GET /admin/counselling-requests (§9.2). The list leaves out message and confidentialNotes.
export type CounsellingStatus = "new" | "in_progress" | "resolved";

export interface CounsellingSummary {
  _id: string;
  parentName: string;
  phone: string;
  childAge: string;
  problemCategory: ProblemCategory;
  preferredTime: string;
  status: CounsellingStatus;
  assignedCounsellor: { _id: string; fullName: string } | null;
  createdAt: string;
}

// GET /admin/counselling-requests/:id (§9.3)
export interface CounsellingDetail extends CounsellingSummary {
  message: string;
  confidentialNotes?: string;
  updatedAt: string;
}

// GET /admin/users (§4.2)
export interface AdminUser {
  _id: string;
  token: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  institution?: string;
  createdAt: string;
}

// Waitlist for full courses (PRD §3.4.3). Live statuses are waiting / contacted.
export type WaitlistStatus = "waiting" | "contacted" | "enrolled" | "cancelled";

// GET /waitlists/me
export interface MyWaitlist {
  _id: string;
  courseId: string;
  status: WaitlistStatus;
  course: { slug: string; titleBn: string; titleEn?: string } | null;
  createdAt: string;
}

// GET /admin/waitlists
export interface AdminWaitlist {
  _id: string;
  status: WaitlistStatus;
  course: { _id: string; slug: string; titleBn: string } | null;
  user: { _id: string; token: string; fullName: string; email: string; phone: string; institution?: string } | null;
  createdAt: string;
  updatedAt: string;
}
