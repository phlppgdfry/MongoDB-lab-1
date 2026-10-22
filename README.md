# Atlas Lab

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-RAG-47A248?logo=mongodb&logoColor=white)
![Ollama](https://img.shields.io/badge/Ollama-local_AI-black)

> A small, inspectable RAG showcase: MongoDB Atlas retrieves the facts, and a local Ollama model turns them into a grounded answer.

**Live locally:** `http://localhost:3000` · **Source:** [github.com/phlppgdfry/MongoDB-lab-1](https://github.com/phlppgdfry/MongoDB-lab-1)

## Why this demo exists

Atlas Lab is designed to make the moving parts of a modern AI feature easy to see:

```text
Question → API validation → MongoDB Atlas retrieval → Ollama generation → Answer + sources
```

It is intentionally small enough to understand in one sitting, but complete enough to demonstrate a real integration: cloud data, a typed API, a polished browser experience, local AI, request limits, structured errors, Docker support, and CI.

## What you can demonstrate

- **Grounded answers:** the model receives matching documents from the `knowledge` collection, not an invisible prompt.
- **Source visibility:** the UI shows which Atlas documents were retrieved.
- **Local-first AI:** Ollama runs the generation step on your machine.
- **Production-minded API:** input limits, JSON validation, rate limiting, safe error responses, health checks, and no secrets in source control.
- **Extendable foundation:** replace keyword retrieval with Atlas Search or Vector Search without rewriting the UI.

## Run it locally

### 1. Requirements

- Node.js 20+
- A MongoDB Atlas cluster and database user
- [Ollama](https://ollama.com) with a model, for example:

```bash
ollama serve
ollama pull qwen3:1.7b
```

### 2. Configure and seed

```bash
npm install
cp .env.example .env
# Set MONGODB_URI in .env
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Try the suggested prompts or ask your own question.

### 3. Test the API directly

```bash
curl http://localhost:3000/api/health

curl -X POST http://localhost:3000/api/ask \
  -H 'content-type: application/json' \
  -d '{"question":"What is MongoDB Atlas?"}'
```

Example response:

```json
{
  "answer": "MongoDB Atlas is a managed cloud database service...",
  "sources": [{ "title": "MongoDB Atlas", "tags": ["atlas", "cloud", "database"] }],
  "model": "qwen3:1.7b",
  "retrievalMs": 8,
  "generationMs": 1240
}
```

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Atlas/API readiness and model metadata |
| `GET` | `/api/documents` | List the demo knowledge base |
| `POST` | `/api/ask` | Retrieve context and generate an answer |

`POST /api/ask` accepts `{ "question": "..." }` with a 3–500 character question. API requests are limited per client by `RATE_LIMIT_PER_MINUTE`.

## Project map

```text
src/server.ts       HTTP API, static frontend, retrieval, AI orchestration
src/db.ts           MongoDB Atlas connection and collection access
src/seed.ts         Repeatable sample-data loader
public/             Presentation UI (HTML, CSS, browser JavaScript)
test/               Smoke tests
Dockerfile          Production container image
.github/workflows/  Build and test verification on every push/PR
```

## Architecture notes

The retrieval layer currently uses case-insensitive keyword matching across title, content, and tags. That makes the behavior transparent for a demo and works well for a small collection. For a production knowledge base, the next step is MongoDB Atlas Search or Vector Search with embeddings, plus authentication, durable rate limiting, audit logging, and a background ingestion pipeline.

The demo does **not** commit database credentials, Ollama secrets, or `.env` files. For public deployment, use your host's secret manager and restrict Atlas network access to the deployment's egress IPs.

## Quality checks

```bash
npm run check   # TypeScript build + tests
npm run seed    # Reset and load the example knowledge base
```

## License

MIT — use the demo as a starting point for your own experiments.
