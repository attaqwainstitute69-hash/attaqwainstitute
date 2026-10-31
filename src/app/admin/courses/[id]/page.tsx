import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminBatches, getAdminCourse } from "@/lib/api";
import { canManageCourses, requireStaff } from "@/lib/admin";
import { BatchManager } from "@/components/admin/batch-manager";
import { CourseForm } from "@/components/admin/course-form";
import { DeleteCourse } from "@/components/admin/delete-course";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "কোর্স সম্পাদনা" };

export default function EditCoursePage({ params }: PageProps<"/admin/courses/[id]">) {
  return (
    <>
      <Link href="/admin/courses" className="text-sm text-primary-light underline">
        ← সব কোর্স
      </Link>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff(`/admin/courses/${id}`);
  if (!user || !canManageCourses(user.role)) return <NoAccess />;

  const [course, batches] = await Promise.all([getAdminCourse(id), getAdminBatches(id)]);
  if (!course) return <p className="mt-6 text-ink-soft">কোর্সটি পাওয়া যায়নি।</p>;

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-primary">{course.titleBn}</h1>
        <a href={`/bn/courses/${course.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gold-text underline">
          ওয়েবসাইটে দেখুন ↗
        </a>
      </div>

      <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_440px]">
        <CourseForm course={course} />
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {batches === null ? (
            <p className="rounded-xl bg-surface p-5 text-ink-soft">ব্যাচের তথ্য আনা যাচ্ছে না।</p>
          ) : (
            <BatchManager courseId={course._id} batches={batches} canDelete={user.role === "super_admin"} />
          )}
          {user.role === "super_admin" && <DeleteCourse courseId={course._id} />}
        </div>
      </div>
    </>
  );
}
