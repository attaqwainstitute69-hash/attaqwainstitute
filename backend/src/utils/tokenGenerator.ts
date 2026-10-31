import { randomInt } from "node:crypto";

// No 0/O/1/I so a token read aloud or copied by hand is not misread.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// Student token `ATQ-YYYY-XXXXX` (database-schema.md §2.1).
export function generateStudentToken(now = new Date()): string {
  let suffix = "";
  for (let i = 0; i < 5; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `ATQ-${now.getFullYear()}-${suffix}`;
}
