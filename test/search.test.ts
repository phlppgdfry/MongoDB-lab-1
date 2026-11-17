import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankDocuments, searchQuery, searchTerms } from "../src/search.js";

const knowledge = [
  { title: "MongoDB Atlas", content: "MongoDB Atlas is a managed cloud database service. A connection string and database user are required to connect an application.", tags: ["atlas", "cloud", "database"] },
  { title: "MongoDB Compass", content: "MongoDB Compass is a desktop application for browsing collections, documents, indexes, and database performance.", tags: ["compass", "desktop"] },
  { title: "Ollama", content: "Ollama runs language models locally. The Ollama JavaScript client can send chat messages to a locally running model.", tags: ["ollama", "ai", "local"] },
];

describe("searchTerms", () => {
  it("drops stop words, short words and duplicates", () => {
    assert.deepEqual(searchTerms("What is the Ollama client? Ollama!"), ["ollama", "client"]);
  });
  it("keeps at most eight terms", () => {
    assert.equal(searchTerms("alpha bravo charlie delta echo foxtrot golf hotel india juliet").length, 8);
  });
});

describe("searchQuery", () => {
  it("returns null when nothing searchable remains, so nothing is retrieved", () => {
    assert.equal(searchQuery(searchTerms("how do I do it?")), null);
  });
  it("searches title, content and tags for each term", () => {
    assert.equal(searchQuery(["atlas"])?.$or.length, 3);
  });
});

describe("rankDocuments", () => {
  it("puts the document that matches in its title or tags first", () => {
    const ranked = rankDocuments(knowledge, searchTerms("How do I connect to Atlas?"));
    assert.equal(ranked[0]?.title, "MongoDB Atlas");
  });
  it("leaves out documents that match no term", () => {
    const ranked = rankDocuments(knowledge, searchTerms("Which tool runs a model locally?"));
    assert.deepEqual(ranked.map((d) => d.title), ["Ollama"]);
  });
});
