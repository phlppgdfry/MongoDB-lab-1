import "dotenv/config";
import { closeDatabase, connectDatabase, knowledgeCollection } from "./db.js";

const documents = [
  {
    title: "MongoDB Atlas",
    content:
      "MongoDB Atlas is a managed cloud database service. A connection string and database user are required to connect an application.",
    tags: ["atlas", "cloud", "database"],
  },
  {
    title: "MongoDB Compass",
    content:
      "MongoDB Compass is a desktop application for browsing collections, documents, indexes, and database performance.",
    tags: ["compass", "desktop"],
  },
  {
    title: "Ollama",
    content:
      "Ollama runs language models locally. The Ollama JavaScript client can send chat messages to a locally running model.",
    tags: ["ollama", "ai", "local"],
  },
];

await connectDatabase();
const collection = knowledgeCollection();
await collection.deleteMany({});
await collection.insertMany(documents);
console.log(`Seeded ${documents.length} knowledge documents.`);
await closeDatabase();
