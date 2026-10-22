import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import ollama from "ollama";
import { closeDatabase, connectDatabase, knowledgeCollection } from "./db.js";

const port = Number(process.env.PORT ?? 3000);
const model = process.env.OLLAMA_MODEL ?? "llama3.2";

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (!body) return {};
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Request body must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

async function answerQuestion(question: string): Promise<string> {
  const terms = question
    .toLowerCase()
    .split(/\W+/)
    .filter((term) => term.length > 2)
    .slice(0, 8);
  const query = terms.length
    ? { $or: terms.flatMap((term) => [{ title: { $regex: term, $options: "i" } }, { content: { $regex: term, $options: "i" } }]) }
    : {};
  const documents = await knowledgeCollection().find(query).limit(5).toArray();
  const context = documents.map((document) => `- ${document.title}: ${document.content}`).join("\n");

  const response = await ollama.chat({
    model,
    messages: [
      {
        role: "system",
        content:
          "Answer only from the supplied knowledge base. If the answer is not present, say that you do not know. Keep the answer concise.",
      },
      { role: "user", content: `Knowledge base:\n${context || "(no matching documents)"}\n\nQuestion: ${question}` },
    ],
    stream: false,
  });
  return response.message.content;
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      sendJson(response, 200, { ok: true, database: "connected", model });
      return;
    }

    if (request.method === "POST" && request.url === "/ask") {
      const body = await readJson(request);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      if (!question) {
        sendJson(response, 400, { error: "question is required" });
        return;
      }
      sendJson(response, 200, { answer: await answerQuestion(question), model });
      return;
    }

    sendJson(response, 404, { error: "not found" });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: error instanceof Error ? error.message : "internal server error" });
  }
});

await connectDatabase();
server.listen(port, () => console.log(`API listening on http://localhost:${port}`));

async function shutdown(): Promise<void> {
  server.close();
  await closeDatabase();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
