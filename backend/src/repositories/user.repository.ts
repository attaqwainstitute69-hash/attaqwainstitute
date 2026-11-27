import { User, type IUser } from "../models/User.model";
import { escapeRegex } from "../utils/escapeRegex";

export type CreateUserInput = Pick<
  IUser,
  "token" | "fullName" | "phone" | "email" | "role" | "institution" | "isVerified" | "privacyConsent" | "passwordHash"
>;

export interface AdminUserFilter {
  role?: IUser["role"];
  q?: string;
}

const adminListProjection = {
  token: 1,
  fullName: 1,
  phone: 1,
  email: 1,
  role: 1,
  institution: 1,
  createdAt: 1,
};

export const userRepository = {
  findById(id: string) {
    return User.findById(id).lean();
  },

  // Just what authGuard needs on every request.
  findSessionById(id: string) {
    return User.findById(id, { token: 1, role: 1, sessionVersion: 1 }).lean();
  },

  // Revokes every token issued so far (logout).
  async bumpSessionVersion(id: string) {
    await User.updateOne({ _id: id }, { $inc: { sessionVersion: 1 } });
  },

  findByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase() }).lean();
  },

  findByToken(token: string) {
    return User.findOne({ token: token.toUpperCase() }).lean();
  },

  // Password login / forgot password: email, ATQ token or mobile (already normalized by the validator),
  // with the hash that is otherwise never selected. A mobile number is not unique (family members may
  // share one), so this returns a list; a few is enough to tell the accounts apart.
  findForLogin(identifier: string) {
    const filter = identifier.includes("@")
      ? { email: identifier.toLowerCase() }
      : /^01\d{9}$/.test(identifier)
        ? { phone: identifier }
        : { token: identifier.toUpperCase() };
    return User.find(filter).select("+passwordHash").limit(5).lean();
  },

  findWithPasswordById(id: string) {
    return User.findById(id).select("+passwordHash").lean();
  },

  // Stores a new password and revokes every session issued so far.
  async setPassword(id: string, passwordHash: string) {
    return User.findByIdAndUpdate(
      id,
      { $set: { passwordHash }, $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 }, $inc: { sessionVersion: 1 } },
      { returnDocument: "after" },
    ).lean();
  },

  async setResetToken(id: string, resetTokenHash: string, resetTokenExpiresAt: Date) {
    await User.updateOne({ _id: id }, { $set: { resetTokenHash, resetTokenExpiresAt } });
  },

  // Claims a live reset token in one step, so a link works once even under concurrent clicks.
  claimResetToken(resetTokenHash: string) {
    return User.findOneAndUpdate(
      { resetTokenHash, resetTokenExpiresAt: { $gt: new Date() } },
      { $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 } },
    ).lean();
  },

  async existsByEmail(email: string): Promise<boolean> {
    return (await User.exists({ email: email.toLowerCase() })) !== null;
  },

  async create(input: CreateUserInput) {
    const user = await User.create(input);
    return user.toObject();
  },

  // PATCH /users/me — email, token and role are never part of `update`.
  updateProfile(id: string, update: Partial<Pick<IUser, "fullName" | "phone" | "institution">>) {
    return User.findByIdAndUpdate(id, { $set: update }, { returnDocument: "after", runValidators: true }).lean();
  },

  updateRole(id: string, role: IUser["role"]) {
    return User.findByIdAndUpdate(id, { $set: { role } }, { returnDocument: "after", runValidators: true }).lean();
  },

  // `q` matches token, email, phone or name (api-spec §4.2).
  async listForAdmin(filter: AdminUserFilter, page: number, limit: number) {
    const match: Record<string, unknown> = {};
    if (filter.role) match.role = filter.role;
    if (filter.q) {
      const re = new RegExp(escapeRegex(filter.q), "i");
      match.$or = [{ token: re }, { email: re }, { phone: re }, { fullName: re }];
    }

    const [items, total] = await Promise.all([
      User.find(match, adminListProjection)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(match),
    ]);
    return { items, total };
  },

  // Staff recipients for notification emails.
  listEmailsByRoles(roles: IUser["role"][]) {
    return User.find({ role: { $in: roles } }, { email: 1 }).lean();
  },

  updateRoleByEmail(email: string, role: IUser["role"]) {
    return User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { role } },
      { returnDocument: "after", runValidators: true },
    ).lean();
  },
};
