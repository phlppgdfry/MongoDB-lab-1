// Keyword retrieval for the knowledge collection. Kept free of database and model imports so it can be
// tested on its own and swapped for Atlas Search or Vector Search later.
export const NO_SOURCES_ANSWER = "I could not find this in the knowledge base, so I will not guess. Try asking about MongoDB Atlas, Compass or Ollama.";
// Words that appear in almost every question and would match almost every document.
const STOP_WORDS = new Set([
    "the", "and", "for", "are", "was", "what", "which", "who", "how", "why", "when", "where", "does", "can",
    "you", "your", "with", "from", "that", "this", "these", "those", "into", "about", "there", "their", "have",
    "has", "had", "use", "used", "using", "tell", "explain", "please", "need", "want", "should", "would", "could",
    "any", "all", "not", "but", "its", "our", "out", "get", "one", "two", "also", "than", "then", "them", "they",
]);
/** Lower-case alphanumeric terms longer than two characters, without stop words, at most eight. */
export function searchTerms(question) {
    return [...new Set(question.toLowerCase().split(/[^a-z0-9]+/))]
        .filter((term) => term.length > 2 && !STOP_WORDS.has(term))
        .slice(0, 8);
}
/** MongoDB filter for the terms, or null when nothing searchable remains (then nothing is retrieved). */
export function searchQuery(terms) {
    if (!terms.length)
        return null;
    return {
        $or: terms.flatMap((term) => [
            { title: { $regex: term, $options: "i" } },
            { content: { $regex: term, $options: "i" } },
            { tags: { $regex: term, $options: "i" } },
        ]),
    };
}
/** Score by distinct matched terms (title and tag matches count double) and keep the best `limit`. */
export function rankDocuments(documents, terms, limit = 5) {
    const score = (document) => terms.reduce((total, term) => {
        const inTitle = document.title.toLowerCase().includes(term);
        const inTags = document.tags.some((tag) => tag.toLowerCase().includes(term));
        const inContent = document.content.toLowerCase().includes(term);
        return total + (inTitle || inTags ? 2 : inContent ? 1 : 0);
    }, 0);
    return documents
        .map((document) => ({ document, score: score(document) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.document);
}
