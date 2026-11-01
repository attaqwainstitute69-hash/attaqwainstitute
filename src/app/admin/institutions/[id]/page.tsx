import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAdminInstitution } from "@/lib/api";
import { canManageContent, requireStaff } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { DeleteEntity } from "@/components/admin/delete-entity";
import { InstitutionForm } from "@/components/admin/institution-form";
import { NoAccess } from "@/components/admin/no-access";

export const metadata: Metadata = { title: "প্রতিষ্ঠান সম্পাদনা" };

export default function EditInstitutionPage({ params }: PageProps<"/admin/institutions/[id]">) {
  return (
    <>
      <Link href="/admin/institutions" className="text-sm text-primary-light underline">
        ← সব প্রতিষ্ঠান
      </Link>
      <Suspense fallback={<p className="mt-6 text-ink-soft">লোড হচ্ছে…</p>}>
        <Editor params={params} />
      </Suspense>
    </>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff(`/admin/institutions/${id}`);
  if (!user || !canManageContent(user.role)) return <NoAccess />;

  const institution = await getAdminInstitution(id);
  if (!institution) return <p className="mt-6 text-ink-soft">প্রতিষ্ঠানটি পাওয়া যায়নি।</p>;

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-primary">{institution.name}</h1>
        {institution.status === "active" && (
          <a href="/bn/institutions" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-gold-text underline">
            ওয়েবসাইটে দেখুন ↗
          </a>
        )}
      </div>

      <div className="mt-6 grid gap-8 xl:grid-cols-[1fr_380px]">
        <InstitutionForm institution={institution} />
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-xl border border-neutral-sky bg-surface p-5 text-sm">
            <h2 className="font-bold text-primary">অনুরোধের তথ্য</h2>
            <p className="mt-2 text-ink-soft">জমা: {formatDateTime(institution.createdAt, "bn")}</p>
            {institution.contactPhone && (
              <p className="mt-1">
                মোবাইল:{" "}
                <a href={`tel:${institution.contactPhone}`} className="font-mono text-primary-light underline">
                  {institution.contactPhone}
                </a>
              </p>
            )}
            <p className="mt-3 font-medium text-primary">বার্তা</p>
            <p className="mt-1 whitespace-pre-line text-ink-soft">{institution.intakeMessage || "—"}</p>
          </section>
          {user.role === "super_admin" && (
            <DeleteEntity
              kind="institutions"
              id={institution._id}
              title="প্রতিষ্ঠান মুছে ফেলা"
              text="স্থায়ীভাবে মুছে যাবে। ইতিহাস রাখতে চাইলে মোছার বদলে অবস্থা “আর্কাইভ” করুন।"
            />
          )}
        </div>
      </div>
    </>
  );
}
