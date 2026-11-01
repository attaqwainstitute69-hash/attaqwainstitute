import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminResource } from "@/lib/api";
import { canManageContent, requireStaff } from "@/lib/admin";
import { formatNumber } from "@/lib/format";
import { DeleteEntity } from "@/components/admin/delete-entity";
import { NoAccess } from "@/components/admin/no-access";
import { ResourceForm } from "@/components/admin/resource-form";

export const metadata: Metadata = { title: "রিসোর্স সম্পাদনা" };

export default function EditResourcePage({ params }: PageProps<"/admin/resources/[id]">) {
  return (
    <>
      <Link href="/admin/resources" className="text-sm text-primary-light underline">
        ← সব রিসোর্স
      </Link>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff(`/admin/resources/${id}`);
  if (!user || !canManageContent(user.role)) return <NoAccess />;

  const resource = await getAdminResource(id);
  if (!resource) return <p className="mt-6 text-ink-soft">রিসোর্সটি পাওয়া যায়নি।</p>;

  return (
    <>
      <h1 className="mt-2 text-2xl font-bold text-primary">{resource.titleBn}</h1>
      <p className="mt-1 text-sm text-ink-soft">{formatNumber(resource.downloadsCount, "bn")} বার ডাউনলোড হয়েছে</p>
      <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_380px]">
        <ResourceForm resource={resource} />
        <div className="xl:sticky xl:top-6 xl:self-start">
          <DeleteEntity kind="resources" id={resource._id} title="রিসোর্স মুছে ফেলা" text="রিসোর্স ও তার আপলোড করা ফাইল স্থায়ীভাবে মুছে যাবে। শুধু লুকাতে চাইলে “প্রকাশিত” টিক তুলে দিন।" />
        </div>
      </div>
    </>
  );
}
