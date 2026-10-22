import "dotenv/config";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Ollama } from "ollama";
import { closeDatabase, connectDatabase, knowledgeCollection } from "./db.js";

const port = Number(process.env.PORT ?? 3000);
const model = process.env.OLLAMA_MODEL ?? "qwen3:1.7b";
const rateLimitPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 30);
const publicDirectory = join(fileURLToPath(new URL(".", import.meta.url)), "../public");
const ollama = new Ollama({ host: process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434" });
const requests = new Map<string, { count: number; resetAt: number }>();

type KnowledgeDocument = {
  _id?: unknown;
  title: string;
  content: string;
  tags: string[];
};

type AskResult = {
  answer: string;
  sources: Array<Pick<KnowledgeDocument, "title" | "tags">>;
  model: string;
  retrievalMs: number;
  generationMs: number;
};

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function clientAddress(request: IncomingMessage): string {
  return request.socket.remoteAddress ?? "unknown";
}

function withinRateLimit(request: IncomingMessage): boolean {
  const now = Date.now();
  const key = clientAddress(request);
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (current.count >= rateLimitPerMinute) return false;
  current.count += 1;
  return true;
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 10_000) throw new Error("Request body is too large");
  }
  if (!body) return {};
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function searchQuery(question: string) {
  const terms = [...new Set(question.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2))].slice(0, 8);
  return terms.length
    ? {
        $or: terms.flatMap((term) => [
          { title: { $regex: term, $options: "i" } },
          { content: { $regex: term, $options: "i" } },
          { tags: { $regex: term, $options: "i" } },
        ]),
      }
    : {};
}

export async function answerQuestion(question: string): Promise<AskResult> {
  const retrievalStarted = performance.now();
  const documents = (await knowledgeCollection().find(searchQuery(question)).limit(5).toArray()) as KnowledgeDocument[];
  const retrievalMs = Math.round(performance.now() - retrievalStarted);
  const context = documents.map((document) => `- ${document.title}: ${document.content}`).join("\n");

  const generationStarted = performance.now();
  const response = await ollama.chat({
    model,
    stream: false,
    messages: [
      {
        role: "system",
        content:
          "You are the Atlas Lab assistant. Answer only from the supplied knowledge base. If the answer is not present, say you do not know. Be concise and do not invent sources.",
      },
      { role: "user", content: `Knowledge base:\n${context || "(no matching documents)"}\n\nQuestion: ${question}` },
    ],
  });

  return {
    answer: response.message.content.trim(),
    sources: documents.map(({ title, tags }) => ({ title, tags })),
    model,
    retrievalMs,
    generationMs: Math.round(performance.now() - generationStarted),
  };
}

function contentType(path: string): string {
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml",
    }[extname(path)] ?? "application/octet-stream"
  );
}

function serveStatic(pathname: string, response: ServerResponse): void {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(publicDirectory, requested));
  if (!filePath.startsWith(publicDirectory) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    json(response, 404, { error: "not found" });
    return;
  }
  response.writeHead(200, { "content-type": contentType(filePath), "x-content-type-options": "nosniff" });
  createReadStream(filePath).pipe(response);
}

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  try {
    if (pathname.startsWith("/api/") && !withinRateLimit(request)) {
      json(response, 429, { error: "rate limit exceeded", retryAfterSeconds: 60 });
      return;
    }

    if (request.method === "GET" && pathname === "/api/health") {
      json(response, 200, { ok: true, service: "atlas-lab", database: "connected", model });
      return;
    }

    if (request.method === "GET" && pathname === "/api/documents") {
      const documents = await knowledgeCollection().find({}, { projection: { _id: 0, title: 1, content: 1, tags: 1 } }).toArray();
      json(response, 200, { documents });
      return;
    }

    if (request.method === "POST" && pathname === "/api/ask") {
      const body = await readJson(request);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      if (question.length < 3 || question.length > 500) {
        json(response, 400, { error: "question must contain 3 to 500 characters" });
        return;
      }
      json(response, 200, await answerQuestion(question));
      return;
    }

    if (request.method === "GET") {
      serveStatic(pathname, response);
      return;
    }

    json(response, 404, { error: "not found" });
  } catch (error) {
    console.error(`[request-error] ${request.method} ${pathname}`, error);
    const message = error instanceof SyntaxError ? "invalid JSON" : "service temporarily unavailable";
    json(response, error instanceof SyntaxError ? 400 : 503, { error: message });
  }
});

await connectDatabase();
server.listen(port, () => console.log(`Atlas Lab running at http://localhost:${port}`));

async function shutdown(): Promise<void> {
  server.close();
  await closeDatabase();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
