#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";
import { z } from "zod";

const BASE_URL = process.env.GLM52_BASE_URL || "http://127.0.0.1:8115/v1";
const MODEL = process.env.GLM52_MODEL || "glm-5.2-bf16-a100-600k-sglang-triton";
const API_KEY = process.env.GLM52_API_KEY_FILE
  ? readFileSync(process.env.GLM52_API_KEY_FILE, "utf8").trim()
  : (process.env.GLM52_API_KEY || "").trim();
if (!API_KEY) {
  throw new Error("Set GLM52_API_KEY or GLM52_API_KEY_FILE before starting the MCP server");
}
const TLS_CA = process.env.GLM52_CA_CERT_PATH
  ? readFileSync(process.env.GLM52_CA_CERT_PATH)
  : undefined;
const TIMEOUT_MS = Number(process.env.GLM52_MCP_TIMEOUT_MS || 1200000);
const MAX_OUTPUT_TOKENS = Number(process.env.GLM52_MCP_MAX_OUTPUT_TOKENS || 131072);
const DEFAULT_OUTPUT_TOKENS = Math.min(
  Number(process.env.GLM52_MCP_DEFAULT_OUTPUT_TOKENS || 4096),
  MAX_OUTPUT_TOKENS,
);

function apiUrl(path) {
  const base = BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`;
  return new URL(path.replace(/^\/+/, ""), base).toString();
}

function headers() {
  return {
    authorization: `Bearer ${API_KEY}`,
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
}

function openHttpResponse(url, options, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const transport = target.protocol === "https:" ? https : http;
    const request = transport.request(target, {
      method: options.method || "GET",
      headers: options.headers || {},
      ...(target.protocol === "https:" && TLS_CA ? { ca: TLS_CA, minVersion: "TLSv1.2" } : {}),
    });
    let settled = false;
    const timeout = setTimeout(() => {
      request.destroy(new Error(`Request timed out after ${timeoutMs} ms: ${url}`));
    }, timeoutMs);

    request.once("response", (response) => {
      settled = true;
      resolve({ response, clearDeadline: () => clearTimeout(timeout) });
    });
    request.once("error", (error) => {
      clearTimeout(timeout);
      if (!settled) reject(error);
    });
    if (options.body) request.write(options.body);
    request.end();
  });
}

async function readResponseText(response) {
  const chunks = [];
  for await (const chunk of response) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}

function responseError(response, text) {
  return new Error(`${response.statusCode} ${response.statusMessage || "HTTP error"}: ${text.slice(0, 2000)}`);
}

async function requestJson(url, options, timeoutMs = TIMEOUT_MS) {
  const { response, clearDeadline } = await openHttpResponse(url, options, timeoutMs);
  try {
    const text = await readResponseText(response);
    if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) {
      throw responseError(response, text);
    }
    if (!text.trim()) throw new Error(`Empty response from ${url}`);
    return JSON.parse(text);
  } finally {
    clearDeadline();
  }
}

function textFromMessage(message) {
  return (message?.content || [])
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("")
    .trim();
}

function parseSseEvent(rawEvent) {
  const data = rawEvent
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data || data === "[DONE]") {
    return null;
  }
  return JSON.parse(data);
}

async function requestMessageStream(body) {
  const { response, clearDeadline } = await openHttpResponse(apiUrl("messages"), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ ...body, stream: true }),
  });
  try {
    if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) {
      throw responseError(response, await readResponseText(response));
    }

    const decoder = new TextDecoder();
    const chunks = [];
    let buffer = "";
    let eventCount = 0;
    let messageId = null;
    let stopReason = null;
    let usage = null;
    let messageStarted = false;
    let messageStopped = false;

    function collect(rawEvent) {
      const event = parseSseEvent(rawEvent);
      if (!event) return;
      eventCount += 1;
      if (event.type === "error") {
        // Do not echo upstream payloads, which may include private request data.
        throw new Error("Upstream Anthropic stream reported an error");
      }
      if (event.type === "ping") return;
      const lifecycleEvent = [
        "message_start", "message_delta", "message_stop",
        "content_block_start", "content_block_delta", "content_block_stop",
      ].includes(event.type);
      if (!lifecycleEvent) return; // Preserve unknown-event compatibility.
      if (messageStopped) throw new Error("Anthropic stream event followed message_stop");
      if (event.type === "message_start") {
        if (messageStarted || typeof event.message?.id !== "string" || !event.message.id) {
          throw new Error("Invalid Anthropic message_start");
        }
        messageStarted = true;
        messageId = event.message.id;
        usage = event.message?.usage || usage;
      } else {
        if (!messageStarted) throw new Error("Anthropic stream event preceded message_start");
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          chunks.push(event.delta.text || "");
        } else if (event.type === "message_delta") {
          stopReason = event.delta?.stop_reason || stopReason;
          usage = { ...(usage || {}), ...(event.usage || {}) };
        } else if (event.type === "message_stop") {
          if (typeof stopReason !== "string" || !stopReason) {
            throw new Error("Anthropic message_stop lacked a stop reason");
          }
          messageStopped = true;
        }
      }
    }

    for await (const chunk of response) {
      buffer += decoder.decode(chunk, { stream: true });
      let delimiterIndex;
      while ((delimiterIndex = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const rawEvent = buffer.slice(0, delimiterIndex);
        const delimiterLength = buffer[delimiterIndex] === "\r" ? 4 : 2;
        buffer = buffer.slice(delimiterIndex + delimiterLength);
        collect(rawEvent);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) collect(buffer);
    if (!messageStarted || !messageStopped) {
      throw new Error("Anthropic stream ended before message_stop");
    }

    return {
      id: messageId,
      output_text: chunks.join("").trim(),
      stop_reason: stopReason,
      usage,
      stream_event_count: eventCount,
    };
  } finally {
    clearDeadline();
  }
}

function errorText(error) {
  const cause = error?.cause?.code ? ` | ${error.cause.code}` : "";
  return `${String(error?.message || error)}${cause}`;
}

const server = new McpServer(
  { name: "glm52-sglang-anthropic-mcp", version: "1.0.0" },
  {
    instructions:
      "Use glm52_status and glm52_ask only when the user explicitly requests local GLM-5.2 or a GLM comparison. This server calls the local SGLang native Anthropic endpoint and does not replace the host agent model.",
  },
);

server.registerTool(
  "glm52_status",
  {
    title: "Check local GLM-5.2",
    description: "Check the current local A100 GLM-5.2 SGLang endpoint and model metadata.",
    inputSchema: {},
  },
  async () => {
    try {
      const models = await requestJson(apiUrl("models"), { method: "GET", headers: headers() }, 30000);
      const listed = Array.isArray(models?.data) ? models.data : [];
      const target = listed.find((item) => item?.id === MODEL);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: Boolean(target),
            base_url: BASE_URL,
            model: MODEL,
            max_model_len: target?.max_model_len ?? null,
            listed_models: listed.map((item) => item?.id).filter(Boolean),
            checked_at: new Date().toISOString(),
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: JSON.stringify({ ok: false, base_url: BASE_URL, model: MODEL, error: errorText(error) }, null, 2) }],
      };
    }
  },
);

server.registerTool(
  "glm52_ask",
  {
    title: "Ask local GLM-5.2",
    description: "Send a prompt to the current local A100 GLM-5.2 through SGLang native Anthropic Messages API.",
    inputSchema: {
      prompt: z.string().min(1),
      system: z.string().optional(),
      max_output_tokens: z.number().int().min(1).max(MAX_OUTPUT_TOKENS).default(DEFAULT_OUTPUT_TOKENS),
      temperature: z.number().min(0).max(2).default(0.2),
      thinking: z.boolean().default(false),
      stream: z.boolean().default(true),
    },
  },
  async ({ prompt, system, max_output_tokens, temperature, thinking, stream }) => {
    const body = {
      model: MODEL,
      max_tokens: max_output_tokens,
      temperature,
      thinking: { type: thinking ? "adaptive" : "disabled" },
      messages: [{ role: "user", content: prompt }],
    };
    if (system?.trim()) body.system = system.trim();

    try {
      const response = stream
        ? await requestMessageStream(body)
        : await requestJson(apiUrl("messages"), {
            method: "POST",
            headers: headers(),
            body: JSON.stringify(body),
          });
      const outputText = stream ? response.output_text : textFromMessage(response);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: "completed",
            model: MODEL,
            base_url: BASE_URL,
            output_text: outputText,
            stop_reason: response.stop_reason || null,
            usage: response.usage || null,
            streamed: stream,
            stream_event_count: stream ? response.stream_event_count : null,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: JSON.stringify({ status: "error", model: MODEL, base_url: BASE_URL, output_text: "", streamed: stream, error: errorText(error) }, null, 2) }],
      };
    }
  },
);

await server.connect(new StdioServerTransport());
