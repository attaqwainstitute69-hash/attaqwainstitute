import { Otp } from "../models/Otp.model";

export const MAX_OTP_ATTEMPTS = 3;

export const otpRepository = {
  // Most recent OTP for the email, used or not — drives the resend cooldown.
  findLatest(email: string) {
    return Otp.findOne({ email }).sort({ createdAt: -1 }).lean();
  },

  // The OTP a user can still verify against: newest, unused, unexpired, attempts left.
  findActive(email: string) {
    return Otp.findOne({
      email,
      isUsed: false,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_OTP_ATTEMPTS },
    })
      .sort({ createdAt: -1 })
      .lean();
  },

  // Issuing a new code invalidates every older one for the same email.
  async replace(email: string, otpHash: string, expiresAt: Date) {
    await Otp.deleteMany({ email });
    const otp = await Otp.create({ email, otpHash, expiresAt });
    return otp.toObject();
  },

  async deleteById(id: string) {
    await Otp.deleteOne({ _id: id });
  },

  // Atomic: returns the updated attempt count, or null if the OTP was already locked/used.
  async incrementAttempts(id: string): Promise<number | null> {
    const otp = await Otp.findOneAndUpdate(
      { _id: id, isUsed: false, attempts: { $lt: MAX_OTP_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { returnDocument: "after" },
    ).lean();
    return otp?.attempts ?? null;
  },

  // Atomic: only one concurrent verify can consume the OTP.
  async markUsed(id: string): Promise<boolean> {
    const otp = await Otp.findOneAndUpdate({ _id: id, isUsed: false }, { $set: { isUsed: true } }).lean();
    return otp !== null;
  },
};
