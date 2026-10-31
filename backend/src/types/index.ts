export const ROLES = [
  "madrasa_teacher",
  "general_teacher",
  "parent",
  "student",
  "madrasa_admin", // muhtamim / principal (PRD §2.1)
  "researcher",
  "counsellor",
  "content_editor",
  "super_admin",
  "other",
] as const;

export type Role = (typeof ROLES)[number];

// The logged-in user on req.user. `role` is read from the database on every request, not trusted from the JWT.
export interface AuthUser {
  userId: string;
  token: string;
  role: Role;
}

// JWT payload (api-spec §1.1) plus `sv`, the user's sessionVersion when the token was issued.
export interface AccessTokenPayload extends AuthUser {
  sv: number;
}

// Output of the `validate` middleware. Express 5 makes req.query read-only, so parsed input lives here.
export interface ValidatedInput {
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  body: unknown;
}

declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: AuthUser;
      valid: ValidatedInput;
    }
  }
}
