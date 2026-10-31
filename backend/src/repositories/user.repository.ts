import { User, type IUser } from "../models/User.model";

export type CreateUserInput = Pick<
  IUser,
  "token" | "fullName" | "phone" | "email" | "role" | "institution" | "isVerified" | "privacyConsent"
>;

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

  async existsByEmail(email: string): Promise<boolean> {
    return (await User.exists({ email: email.toLowerCase() })) !== null;
  },

  async create(input: CreateUserInput) {
    const user = await User.create(input);
    return user.toObject();
  },

  updateRoleByEmail(email: string, role: IUser["role"]) {
    return User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: { role } },
      { returnDocument: "after", runValidators: true },
    ).lean();
  },
};
