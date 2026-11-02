import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { bdPhone } from "@/lib/validation";
import { whatsappLink } from "@/lib/site";

// Chat Agent tools (ai-chat-prompts.md §B). Every tool calls the Express API (api-spec.md) from the
// server. Only public endpoints and the current user's own `/me` endpoints — never admin ones.

const API_URL = (process.env.API_URL ?? "http://localhost:5000/api/v1").replace(/\/+$/, "");

export interface ToolContext {
  // The visitor's `accessToken` cookie, forwarded only to tools marked `needsUser`.
  accessToken?: string;
}

type ToolResult = Record<string, unknown>;

interface ToolDef<S extends z.ZodType> {
  description: string;
  input: S;
  needsUser?: boolean;
  run: (input: z.infer<S>, ctx: ToolContext) => Promise<ToolResult>;
}

function defineTool<S extends z.ZodType>(def: ToolDef<S>) {
  return def;
}

async function callApi(path: string, init: RequestInit & { accessToken?: string } = {}): Promise<ToolResult> {
  const { accessToken, headers, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      "Accept-Language": "bn",
      ...(rest.body && { "Content-Type": "application/json" }),
      ...(accessToken && { Cookie: `accessToken=${accessToken}` }),
      // Same as src/lib/api.ts: server-side calls skip the API's per-IP limit (the chat has its own).
      ...(process.env.INTERNAL_API_KEY && { "X-Internal-Key": process.env.INTERNAL_API_KEY }),
      ...headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });

  // The endpoint is in api-spec.md but not built yet.
  if (res.status === 404 && !res.headers.get("content-type")?.includes("json")) return { error: "not_available_yet" };

  const body = (await res.json().catch(() => null)) as
    | { success: true; data: unknown; meta?: unknown }
    | { success: false; error: { code: string; message?: string; details?: unknown } }
    | null;

  if (!body) return { error: "bad_response", status: res.status };
  if (!body.success) {
    if (body.error.code === "ROUTE_NOT_FOUND") return { error: "not_available_yet" };
    if (body.error.code === "UNAUTHENTICATED") return { error: "not_logged_in" };
    return { error: body.error.code, message: body.error.message, details: body.error.details };
  }
  return { data: body.data, ...(body.meta !== undefined && { meta: body.meta }) };
}

const query = (params: Record<string, string | number | undefined>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") qs.set(k, String(v));
  const s = qs.toString();
  return s ? `?${s}` : "";
};

const tools = {
  search_courses: defineTool({
    description:
      "Search the live course catalog. Returns title, slug, pillar, format, price, status, trainer, next batch date, remaining seats and rating.",
    input: z.object({
      q: z.string().max(100).optional().describe("Keywords, Bengali or English"),
      pillar: z.enum(["training", "consultancy", "digital"]).optional(),
      format: z.enum(["online", "offline", "hybrid"]).optional(),
      status: z.enum(["open", "upcoming", "closed"]).optional(),
      limit: z.number().int().min(1).max(10).optional(),
    }),
    run: ({ limit = 5, ...filters }) => callApi(`/courses${query({ ...filters, limit })}`),
  }),

  get_course: defineTool({
    description:
      "Full detail of one course by slug: description, syllabus, trainer, fee, active batches with remaining seats and houseful flag, rating, and bKash/Nagad merchant numbers.",
    input: z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) }),
    run: ({ slug }) => callApi(`/courses/${slug}`),
  }),

  get_review_summary: defineTool({
    description: "Average rating and the 5→1 star distribution of approved reviews.",
    input: z.object({}),
    run: () => callApi("/reviews/summary"),
  }),

  search_resources: defineTool({
    description: "Search published Knowledge Hub resources (articles, guides, SOP templates, research).",
    input: z.object({
      q: z.string().max(100).optional(),
      category: z.enum(["article", "guide", "sop_template", "research"]).optional(),
    }),
    run: (input) => callApi(`/resources${query({ ...input, limit: 5 })}`),
  }),

  list_institutions: defineTool({
    description: "Public list of partner / client institutions.",
    input: z.object({}),
    run: () => callApi(`/institutions${query({ limit: 10 })}`),
  }),

  get_my_account: defineTool({
    description: "The logged-in user's name, token and role. Returns not_logged_in if there is no session.",
    input: z.object({}),
    needsUser: true,
    run: async (_input, { accessToken }) => {
      if (!accessToken) return { error: "not_logged_in" };
      const result = await callApi("/auth/me", { accessToken });
      const user = result.data as { fullName?: string; token?: string; role?: string } | undefined;
      // Only what the assistant needs — no email or phone.
      return user ? { data: { fullName: user.fullName, token: user.token, role: user.role } } : result;
    },
  }),

  get_my_enrollments: defineTool({
    description:
      "The logged-in user's enrollments with course, batch, status (pending / approved / rejected) and the admin's rejection note. Returns not_logged_in if there is no session.",
    input: z.object({}),
    needsUser: true,
    run: async (_input, { accessToken }) => {
      if (!accessToken) return { error: "not_logged_in" };
      const result = await callApi("/enrollments/me", { accessToken });
      // Strip the unlocked venue / meeting link: the assistant must send users to /my-account for it.
      if (Array.isArray(result.data)) {
        const hidden = new Set(["venueOrLink", "meetingLink", "meetingPassword"]);
        result.data = result.data.map((e: Record<string, unknown>) =>
          Object.fromEntries(Object.entries(e).filter(([key]) => !hidden.has(key))),
        );
      }
      return result;
    },
  }),

  submit_institution_request: defineTool({
    description:
      "Submit the institutional service intake form. Call only after the user has seen a summary and said yes.",
    input: z.object({
      institutionName: z.string().trim().min(1).max(200),
      location: z.string().trim().min(1).max(200),
      contactName: z.string().trim().min(1).max(100),
      phone: bdPhone,
      studentCount: z.number().int().min(0).optional(),
      teacherCount: z.number().int().min(0).optional(),
      serviceNeeded: z.string().trim().min(1).max(1000),
    }),
    run: (input) => callApi("/institutions/requests", { method: "POST", body: JSON.stringify(input) }),
  }),

  submit_counselling_request: defineTool({
    description:
      "Submit the confidential parent counselling form. Only the Super Admin and the assigned counsellor can read it. Call only after the user has seen a summary and said yes.",
    input: z.object({
      parentName: z.string().trim().min(1).max(100),
      phone: bdPhone,
      childAge: z.number().int().min(0).max(25).optional(),
      concernSummary: z.string().trim().min(1).max(2000).describe("Short summary in the parent's own words"),
      preferredCallTime: z.string().trim().max(100).optional(),
    }),
    run: (input) => callApi("/counselling-requests", { method: "POST", body: JSON.stringify(input) }),
  }),

  handoff_to_human: defineTool({
    description: "Hand the conversation to the At-Taqwa team. Returns a WhatsApp link with a pre-filled summary.",
    input: z.object({
      reason: z.enum(["payment", "complaint", "complex_question", "safety", "user_request"]),
      summary: z
        .string()
        .max(300)
        .describe("One or two lines for the team. No OTPs, no sensitive child details."),
    }),
    run: async ({ summary }) => ({
      data: { whatsappUrl: `${whatsappLink}?text=${encodeURIComponent(summary)}` },
    }),
  }),
};

type ToolName = keyof typeof tools;

// Tool list for the API request. Built once, in a fixed order, so the prompt cache prefix never changes.
export const chatTools: Anthropic.Beta.BetaTool[] = Object.entries(tools).map(([name, def]) => {
  const schema = z.toJSONSchema(def.input, { io: "input" }) as Record<string, unknown>;
  delete schema.$schema;
  return { name, description: def.description, input_schema: schema as Anthropic.Beta.BetaTool.InputSchema };
});

// Tools whose inputs must never be logged (counselling is confidential — api-spec §1.9.6).
export const SENSITIVE_TOOLS = new Set<string>(["submit_counselling_request"]);

// Validates the model's input against the tool's schema before running it.
export async function runTool(name: string, rawInput: unknown, ctx: ToolContext): Promise<ToolResult> {
  const def = tools[name as ToolName] as ToolDef<z.ZodType> | undefined;
  if (!def) return { error: "unknown_tool" };

  const parsed = def.input.safeParse(rawInput);
  if (!parsed.success) {
    return { error: "invalid_input", issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })) };
  }

  try {
    return await def.run(parsed.data, def.needsUser ? ctx : {});
  } catch {
    return { error: "service_unavailable" };
  }
}
