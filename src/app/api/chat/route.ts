import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { z } from "zod";
import { CHAT_SYSTEM_PROMPT } from "@/lib/chat/system-prompt";
import { chatTools, runTool, SENSITIVE_TOOLS } from "@/lib/chat/tools";
import { whatsappLink } from "@/lib/site";

// POST /api/chat — the website's AI assistant (ai-chat-prompts.md §B).
// The browser sends plain-text history; tool calls happen here, on the server, and never reach the client.

const MODEL = process.env.CHAT_MODEL ?? "claude-sonnet-5-5";
// Each round is one paid model call, so a single visitor message costs at most MAX_TOOL_ROUNDS + 1 calls.
const MAX_TOOL_ROUNDS = 4;
// Chat replies are a few short paragraphs. A low ceiling caps the worst-case bill per call.
const MAX_OUTPUT_TOKENS = 2048;

// Created on first use, so a missing ANTHROPIC_API_KEY fails the request instead of the module load.
let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic());

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(30)
    .refine((m) => m[0]?.role === "user" && m.at(-1)?.role === "user", "must start and end with a user message"),
});

// 20 messages / 10 min per IP. In-memory, so per server instance — move to Redis when scaling out.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 20;
const hits = new Map<string, { count: number; resetAt: number }>();

// Every message costs model tokens, so there is also a site-wide hourly ceiling. Override with CHAT_HOURLY_LIMIT.
// It is in memory, so on Vercel each server instance has its own count and it resets on a cold start: it is
// a soft limit only. The hard cap is the monthly spend limit set in the Anthropic Console (DEPLOY.md).
const GLOBAL_LIMIT = Number(process.env.CHAT_HOURLY_LIMIT) || 600;
const globalWindow = { count: 0, resetAt: 0 };

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (globalWindow.resetAt <= now) Object.assign(globalWindow, { count: 0, resetAt: now + 60 * 60 * 1000 });
  if (++globalWindow.count > GLOBAL_LIMIT) return true;

  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    if (hits.size > 10_000) hits.clear();
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMIT;
}

// The first X-Forwarded-For entry is whatever the client sent, so rotating it would dodge the limit.
// Use the IP our own proxy saw: x-real-ip (set by Vercel), else the last X-Forwarded-For hop.
function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = request.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return hops?.at(-1) || "unknown";
}

const fallbackReply = (lang: "bn" | "en") =>
  lang === "en"
    ? `Sorry, I can't answer that right now. Please message us on WhatsApp: ${whatsappLink}`
    : `দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না। অনুগ্রহ করে WhatsApp-এ যোগাযোগ করুন: ${whatsappLink}`;

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return Response.json({ error: "RATE_LIMITED" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });

  const lang = request.headers.get("accept-language")?.startsWith("en") ? "en" : "bn";
  const accessToken = (await cookies()).get("accessToken")?.value;

  const messages: Anthropic.Beta.BetaMessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await getClient().beta.messages.create({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        // One breakpoint at the end of the system prompt caches tools + system (render order: tools → system).
        system: [{ type: "text", text: CHAT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: chatTools,
        // Last round: no more tools, so the model has to answer.
        ...(round === MAX_TOOL_ROUNDS && { tool_choice: { type: "none" } }),
        messages,
      });

      if (response.stop_reason === "refusal") {
        return Response.json({ reply: fallbackReply(lang) });
      }

      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }

      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");

      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        const reply = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim();
        return Response.json({ reply: reply || fallbackReply(lang) });
      }

      messages.push({ role: "assistant", content: response.content });

      // Run parallel tool calls together and return every result in one user message.
      const results = await Promise.all(
        toolUses.map(async (tool): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
          const result = await runTool(tool.name, tool.input, { accessToken });
          if (!SENSITIVE_TOOLS.has(tool.name)) console.info("[chat] tool", tool.name, "error" in result ? result.error : "ok");
          return {
            type: "tool_result",
            tool_use_id: tool.id,
            content: JSON.stringify(result),
            ...("error" in result && { is_error: true }),
          };
        }),
      );
      messages.push({ role: "user", content: results });
    }

    return Response.json({ reply: fallbackReply(lang) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "BUSY", reply: fallbackReply(lang) }, { status: 503 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("[chat] Claude API error", err.status, err.message);
    } else {
      console.error("[chat] unexpected error", err);
    }
    return Response.json({ error: "INTERNAL_ERROR", reply: fallbackReply(lang) }, { status: 500 });
  }
}
