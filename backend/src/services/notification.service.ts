import { env, isProduction } from "../config/env";
import { resend } from "../config/resend";
import { logger } from "../utils/logger";
import { maskEmail } from "../utils/mask";

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

async function send(email: Email): Promise<void> {
  if (!resend) {
    // Dev only (env.ts requires RESEND_API_KEY in production). Printed with console, not the
    // logger, so OTPs never reach log storage.
    if (!isProduction) console.info(`\n[dev email] to=${email.to} subject="${email.subject}"\n${email.text}\n`);
    return;
  }

  const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...email });
  if (error) {
    logger.error({ to: maskEmail(email.to), err: error }, "Resend email failed");
    throw new Error(`Resend: ${error.message}`);
  }
}

export const notificationService = {
  sendOtpEmail(to: string, otp: string, expiresInMinutes: number) {
    return send({
      to,
      subject: `${otp} — আত-তাকওয়া ইনস্টিটিউট ভেরিফিকেশন কোড`,
      text: `আপনার ভেরিফিকেশন কোড: ${otp}\nকোডটি ${expiresInMinutes} মিনিট পর্যন্ত কার্যকর থাকবে। কাউকে এই কোড জানাবেন না।`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <p>আসসালামু আলাইকুম,</p>
          <p>আপনার ভেরিফিকেশন কোড:</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
          <p>কোডটি ${expiresInMinutes} মিনিট পর্যন্ত কার্যকর থাকবে। কাউকে এই কোড জানাবেন না।</p>
          <p>— আত-তাকওয়া ইনস্টিটিউট</p>
        </div>`,
    });
  },

  // Post-approval confirmation (PRD §3.5). Class details stay in /my-account, never in the email.
  sendApprovalEmail(to: string, info: { fullName: string; token: string; courseTitle: string }) {
    const accountUrl = `${env.FRONTEND_URL}/bn/my-account`;
    const body = `আপনার টোকেন ${info.token}-এর বিপরীতে "${info.courseTitle}" কোর্সের এনরোলমেন্ট সফলভাবে অনুমোদিত হয়েছে। ক্লাসের বিস্তারিত রুটিন আপনার ড্যাশবোর্ডে যুক্ত করা হয়েছে।`;
    return send({
      to,
      subject: `এনরোলমেন্ট অনুমোদিত — ${info.courseTitle}`,
      text: `আসসালামু আলাইকুম ${info.fullName},\n${body}\n\nড্যাশবোর্ড: ${accountUrl}\n\n— আত-তাকওয়া ইনস্টিটিউট`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <p>আসসালামু আলাইকুম ${escapeHtml(info.fullName)},</p>
          <p>${escapeHtml(body)}</p>
          <p><a href="${accountUrl}" style="display:inline-block;background:#d4a843;color:#0f1a2e;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:bold">ড্যাশবোর্ড দেখুন</a></p>
          <p>— আত-তাকওয়া ইনস্টিটিউট</p>
        </div>`,
    });
  },
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
