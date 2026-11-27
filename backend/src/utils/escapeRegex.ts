// User search text → literal RegExp source, so `q` can never inject a pattern.
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
