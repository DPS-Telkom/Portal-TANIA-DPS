// Model provider adapter for tania-assistant.
//
// TANIA's logic speaks one shape (Anthropic Messages: text / tool_use blocks,
// stop_reason, usage). The provider is configuration (Supabase secrets):
//   AI_API_FORMAT   anthropic (default) | openai
//   AI_BASE_URL     gateway host, no /v1 (unset → Anthropic API directly)
//   AI_API_KEY      gateway key (required when AI_BASE_URL is set)
//   AI_AUTH_SCHEME  x-api-key (default) | bearer
//   AI_MODEL        model id (default claude-haiku-4-5)
// The Anthropic key (ANTHROPIC_API_KEY) is used only without a gateway and is
// never forwarded to one.

import Anthropic from "npm:@anthropic-ai/sdk@0.128.0";

export interface AiRequest {
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens: number;
  tools?: Anthropic.Tool[];
  toolChoice?: "auto" | "none";
  /** JSON Schema for a structured (JSON object) answer. */
  jsonSchema?: Record<string, unknown>;
}

export interface AiClient {
  model: string;
  format: "anthropic" | "openai";
  create(req: AiRequest): Promise<Anthropic.Message>;
}

/** HTTP error from an OpenAI-format gateway. */
export class GatewayError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export function errorStatus(e: unknown): number | undefined {
  if (e instanceof Anthropic.APIError) return e.status;
  if (e instanceof GatewayError) return e.status;
  return undefined;
}

export function errorText(e: unknown): string {
  return e instanceof Error ? String(e.message) : String(e);
}

export function isBadRequest(e: unknown): boolean {
  return e instanceof Anthropic.BadRequestError || (e instanceof GatewayError && (e.status === 400 || e.status === 422));
}

// ---------------------------------------------------------------------------
// Anthropic Messages API (direct or Anthropic-compatible gateway)
// ---------------------------------------------------------------------------
function anthropicClient(apiKey: string, baseURL: string | undefined, bearer: boolean, model: string): AiClient {
  // Both credentials explicit: the SDK would otherwise read ANTHROPIC_* env
  // vars and could forward the Anthropic key to a gateway.
  const sdk = bearer
    ? new Anthropic({ apiKey: null, authToken: apiKey, baseURL })
    : new Anthropic({ apiKey, authToken: null, baseURL });
  return {
    model,
    format: "anthropic",
    async create(req) {
      const message = await sdk.messages.create({
        model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: req.messages,
        ...(req.tools ? { tools: req.tools, tool_choice: { type: req.toolChoice ?? "auto" } } : {}),
        ...(req.jsonSchema ? { output_config: { format: { type: "json_schema" as const, schema: req.jsonSchema } } } : {}),
      });
      if (!Array.isArray((message as { content?: unknown }).content)) {
        const keys = Object.keys(message ?? {}).slice(0, 12).join(",");
        throw new GatewayError(502, `gateway returned a non-Anthropic response (keys: ${keys}); set AI_API_FORMAT=openai`);
      }
      return message;
    },
  };
}

// ---------------------------------------------------------------------------
// OpenAI chat.completions format (e.g. Telkom MIDAS)
// ---------------------------------------------------------------------------
type OpenAiMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

function textFromBlocks(content: Anthropic.MessageParam["content"]): string {
  if (typeof content === "string") return content;
  return content
    .map((b) => (b.type === "text" ? b.text : ""))
    .filter(Boolean)
    .join("\n");
}

/** Anthropic-shaped conversation → OpenAI messages (tool_use ↔ tool_calls). */
export function toOpenAiMessages(system: string, messages: Anthropic.MessageParam[]): OpenAiMessage[] {
  const out: OpenAiMessage[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content } as OpenAiMessage);
      continue;
    }
    if (m.role === "assistant") {
      const calls: OpenAiToolCall[] = m.content
        .filter((b): b is Anthropic.ToolUseBlockParam => b.type === "tool_use")
        .map((b) => ({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } }));
      out.push({ role: "assistant", content: textFromBlocks(m.content) || null, ...(calls.length ? { tool_calls: calls } : {}) });
      continue;
    }
    // user turn: tool results become `tool` messages; any text stays a user message
    for (const b of m.content) {
      if (b.type === "tool_result") {
        const content = typeof b.content === "string" ? b.content : textFromBlocks(b.content as Anthropic.MessageParam["content"]);
        out.push({ role: "tool", tool_call_id: b.tool_use_id, content: b.is_error ? `ERROR: ${content}` : content });
      }
    }
    const text = textFromBlocks(m.content);
    if (text) out.push({ role: "user", content: text });
  }
  return out;
}

const STOP_REASONS: Record<string, Anthropic.Message["stop_reason"]> = {
  stop: "end_turn",
  tool_calls: "tool_use",
  function_call: "tool_use",
  length: "max_tokens",
  content_filter: "refusal",
};

interface OpenAiResponse {
  id?: string;
  model?: string;
  choices?: {
    finish_reason?: string;
    message?: { content?: string | null; tool_calls?: OpenAiToolCall[]; refusal?: string | null };
  }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** OpenAI chat.completion → Anthropic-shaped Message. */
export function fromOpenAiResponse(res: OpenAiResponse, model: string): Anthropic.Message {
  const choice = res.choices?.[0];
  if (!choice?.message) throw new GatewayError(502, "gateway response has no choices[0].message");
  const content: Anthropic.ContentBlock[] = [];
  if (choice.message.content) content.push({ type: "text", text: choice.message.content, citations: null } as Anthropic.TextBlock);
  for (const call of choice.message.tool_calls ?? []) {
    let input: unknown = {};
    try {
      input = call.function.arguments ? JSON.parse(call.function.arguments) : {};
    } catch {
      input = {};
    }
    content.push({ type: "tool_use", id: call.id, name: call.function.name, input } as Anthropic.ToolUseBlock);
  }
  const hasTools = content.some((b) => b.type === "tool_use");
  return {
    id: res.id ?? "gateway",
    type: "message",
    role: "assistant",
    model: res.model ?? model,
    content,
    stop_reason: hasTools ? "tool_use" : choice.message.refusal ? "refusal" : STOP_REASONS[choice.finish_reason ?? "stop"] ?? "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: res.usage?.prompt_tokens ?? 0,
      output_tokens: res.usage?.completion_tokens ?? 0,
    },
  } as unknown as Anthropic.Message;
}

function openAiClient(apiKey: string, baseURL: string, bearer: boolean, model: string): AiClient {
  const url = `${baseURL.replace(/\/+$/, "")}/v1/chat/completions`;
  const auth: Record<string, string> = bearer ? { Authorization: `Bearer ${apiKey}` } : { "x-api-key": apiKey };
  return {
    model,
    format: "openai",
    async create(req) {
      const body: Record<string, unknown> = {
        model,
        max_tokens: req.maxTokens,
        messages: toOpenAiMessages(req.system, req.messages),
      };
      if (req.tools?.length) {
        body.tools = req.tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description ?? "", parameters: t.input_schema },
        }));
        body.tool_choice = req.toolChoice ?? "auto";
      }
      if (req.jsonSchema) {
        body.response_format = { type: "json_schema", json_schema: { name: "tania_response", schema: req.jsonSchema, strict: true } };
      }
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      const text = await r.text();
      if (!r.ok) {
        let msg = text.slice(0, 300);
        try {
          const j = JSON.parse(text);
          msg = String(j?.error?.message ?? j?.error ?? j?.message ?? msg).slice(0, 300);
        } catch {
          /* raw text */
        }
        throw new GatewayError(r.status, msg);
      }
      return fromOpenAiResponse(JSON.parse(text), model);
    },
  };
}

// ---------------------------------------------------------------------------
export function createAiClient(): AiClient | null {
  const baseURL = Deno.env.get("AI_BASE_URL")?.trim() || undefined;
  const model = Deno.env.get("AI_MODEL")?.trim() || "claude-haiku-4-5";
  const key = baseURL ? Deno.env.get("AI_API_KEY") : Deno.env.get("ANTHROPIC_API_KEY");
  const bearer = (Deno.env.get("AI_AUTH_SCHEME") ?? "x-api-key").trim().toLowerCase() === "bearer";
  const format = (Deno.env.get("AI_API_FORMAT") ?? "anthropic").trim().toLowerCase();
  if (!key) return null;
  if (format === "openai" && baseURL) return openAiClient(key, baseURL, bearer, model);
  return anthropicClient(key, baseURL, bearer, model);
}
