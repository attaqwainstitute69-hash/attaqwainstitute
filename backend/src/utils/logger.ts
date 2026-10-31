import pino from "pino";

// Secrets are never logged (backend.md §3.3).
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "*.otp",
      "*.otpHash",
      "*.accessToken",
      "*.confidentialNotes",
    ],
    censor: "[REDACTED]",
  },
  ...(process.env.NODE_ENV !== "production" && {
    transport: { target: "pino-pretty", options: { colorize: true } },
  }),
});
