import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { canManageContent, requireStaff } from "@/lib/admin";
import { NoAccess } from "@/components/admin/no-access";
import { ResourceForm } from "@/components/admin/resource-form";

export const metadata: Metadata = { title: "নতুন রিসোর্স" };

export default function NewResourcePage() {
  return (
    <>
      <Link href="/admin/resources" className="text-sm text-primary-light underline">
        ← সব রিসোর্স
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-bold text-primary">নতুন রিসোর্স</h1>
      <Suspense fallback={<p className="text-ink-soft">লোড হচ্ছে…</p>}>
        <Guarded />
      </Suspense>
    </>
  );
}

async function Guarded() {
  const user = await requireStaff("/admin/resources/new");
  if (!user || !canManageContent(user.role)) return <NoAccess />;
  return <ResourceForm />;
}
