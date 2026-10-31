import Link from "next/link";

// Shown to logged-in users whose role cannot open this page (PRD §2.2 role scopes).
export function NoAccess({ text = "এই পাতাটি দেখার অনুমতি আপনার নেই।" }: { text?: string }) {
  return (
    <div className="rounded-xl border border-accent-orange/40 bg-surface p-8 text-center">
      <p className="text-lg font-semibold text-primary">{text}</p>
      <p className="mt-2 text-sm text-ink-soft">প্রয়োজন হলে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।</p>
      <Link href="/bn" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-5 font-semibold text-white">
        ওয়েবসাইটে ফিরে যান
      </Link>
    </div>
  );
}
