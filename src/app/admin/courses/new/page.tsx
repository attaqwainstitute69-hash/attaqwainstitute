import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { canManageCourses, requireStaff } from "@/lib/admin";
import { CourseForm } from "@/components/admin/course-form";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "নতুন কোর্স" };

export default function NewCoursePage() {
  return (
    <>
      <Link href="/admin/courses" className="text-sm text-primary-light underline">
        ← সব কোর্স
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-primary">নতুন কোর্স</h1>
      <p className="mt-1 mb-6 text-sm text-ink-soft">কোর্স তৈরির পর ব্যাচ (তারিখ, আসন, ক্লাস লিংক/ভেন্যু) যুক্ত করতে পারবেন।</p>
      <Suspense fallback={<p className="text-ink-soft">লোড হচ্ছে…</p>}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  const user = await requireStaff("/admin/courses/new");
  if (!user || !canManageCourses(user.role)) return <NoAccess />;
  return <CourseForm />;
}
