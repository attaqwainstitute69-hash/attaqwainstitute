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
