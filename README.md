# MongoDB Atlas + API + local AI agent

Small TypeScript demo that stores knowledge in MongoDB Atlas, exposes an HTTP API, and asks a local Ollama model to answer questions using matching MongoDB documents as context.

## Prerequisites

- Node.js 20+
- A MongoDB Atlas cluster, database user, and IP access list entry
- Ollama installed and running locally
- An Ollama model, for example `ollama pull qwen3:1.7b`

## Setup

```bash
npm install
cp .env.example .env
# Put your Atlas connection string in .env
npm run seed
npm run dev
```

Ask the agent:

```bash
curl -X POST http://localhost:3000/ask \
  -H 'content-type: application/json' \
  -d '{"question":"What is MongoDB Atlas?"}'
```

The API has two endpoints:

- `GET /health` checks that the API and Atlas connection are available.
- `POST /ask` searches the `knowledge` collection and sends the matching context to Ollama.

The demo deliberately keeps the retrieval step explicit and small: MongoDB stores the source information, while Ollama generates the natural-language answer locally. No AI or database credentials are committed to the repository.
