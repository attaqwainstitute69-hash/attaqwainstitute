import { Resend } from "resend";
import { env } from "./env";

// null in development without a key — notification.service then prints emails to the console.
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
