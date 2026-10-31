// Masking rules from backend.md §3.3.

// ahmadullah@example.com → ah********@example.com
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 3))}@${domain}`;
}
