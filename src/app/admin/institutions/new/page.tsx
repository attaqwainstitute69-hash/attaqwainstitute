import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { canManageContent, requireStaff } from "@/lib/admin";
import { InstitutionForm } from "@/components/admin/institution-form";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "নতুন প্রতিষ্ঠান" };

export default function NewInstitutionPage() {
  return (
    <>
      <Link href="/admin/institutions" className="text-sm text-primary-light underline">
        ← সব প্রতিষ্ঠান
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-primary">নতুন প্রতিষ্ঠান</h1>
      <Suspense fallback={<p className="text-ink-soft">লোড হচ্ছে…</p>}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  const user = await requireStaff("/admin/institutions/new");
  if (!user || !canManageContent(user.role)) return <NoAccess />;
  return <InstitutionForm />;
}
