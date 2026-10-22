import { MongoClient, type Collection, type Document } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("MONGODB_URI is required");
}

const client = new MongoClient(uri);
const database = client.db(process.env.MONGODB_DB ?? "mongodb_lab");

export async function connectDatabase(): Promise<void> {
  await client.connect();
  await database.command({ ping: 1 });
}

export function knowledgeCollection(): Collection<Document> {
  return database.collection("knowledge");
}

export async function closeDatabase(): Promise<void> {
  await client.close();
}
