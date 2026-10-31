// Lets services react to a specific unique-index clash (e.g. retry token generation)
// without knowing Mongo error codes.
export function isDuplicateKeyError(err: unknown, field: string): boolean {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> } | null;
  return e?.code === 11000 && Object.keys(e.keyPattern ?? {}).includes(field);
}
