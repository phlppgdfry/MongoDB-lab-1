// Retrieval runs live with the repo's own src/search.ts (compiled to search.js). Answers for the sample
// questions were recorded from the real app (qwen3:1.7b); other questions can go to the visitor's own Ollama.
import { searchTerms, searchQuery, rankDocuments, NO_SOURCES_ANSWER } from './search.js';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const md = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
const KNOWLEDGE = [ // src/seed.ts
  { title: 'MongoDB Atlas', content: 'MongoDB Atlas is a managed cloud database service. A connection string and database user are required to connect an application.', tags: ['atlas', 'cloud', 'database'] },
  { title: 'MongoDB Compass', content: 'MongoDB Compass is a desktop application for browsing collections, documents, indexes, and database performance.', tags: ['compass', 'desktop'] },
  { title: 'Ollama', content: 'Ollama runs language models locally. The Ollama JavaScript client can send chat messages to a locally running model.', tags: ['ollama', 'ai', 'local'] },
];
const SYSTEM = 'You are the Atlas Lab assistant. Answer only from the supplied knowledge base. If the answer is not present, say you do not know. Be concise. Do not add facts, steps, names or sources that are not in the knowledge base.';
const rec = await (await fetch('assets/recorded.json')).json();
let current = { docs: [], prompt: '' };

function score(d, terms) { return terms.reduce((t, x) => t + (d.title.toLowerCase().includes(x) || d.tags.some(g => g.includes(x)) ? 2 : d.content.toLowerCase().includes(x) ? 1 : 0), 0); }
function run() {
  const q = $('al-q').value.trim(), terms = searchTerms(q), filter = searchQuery(terms);
  $('al-terms').innerHTML = terms.length ? terms.map(t => `<span class="pill info">${esc(t)}</span>`).join(' ') : '<span class="pill warn">none: nothing will be retrieved</span>';
  $('al-filter').textContent = filter ? JSON.stringify(filter).replace(/\{"title"/g, '\n  {"title"').slice(0, 900) : 'null  // no query is sent';
  const docs = filter ? rankDocuments(KNOWLEDGE, terms) : [];
  $('al-docs').innerHTML = KNOWLEDGE.map(d => { const s = filter ? score(d, terms) : 0, inn = docs.includes(d);
    return `<div class="al-doc ${inn ? 'in' : ''}"><b>${esc(d.title)}</b><span class="pill ${inn ? 'ok' : ''}">${inn ? 'score ' + s : 'not retrieved'}</span></div>`; }).join('');
  const context = docs.map(d => `- ${d.title}: ${d.content}`).join('\n');
  current = { docs, prompt: `Knowledge base:\n${context}\n\nQuestion: ${q}` };
  $('al-prompt').textContent = docs.length ? `[system] ${SYSTEM}\n\n[user] ${current.prompt}` : 'No model call: nothing was retrieved, so the API answers with a fixed refusal.';
  const r = rec.answers.find(a => a.question.toLowerCase() === q.toLowerCase());
  $('al-local-msg').textContent = '';
  if (!docs.length) { $('al-answer').innerHTML = md(NO_SOURCES_ANSWER); $('al-src').textContent = '· no model call'; }
  else if (r) { $('al-answer').innerHTML = md(r.answer); $('al-src').textContent = `· recorded from the real app · ${r.model} · ${r.generationMs} ms`; }
  else { $('al-answer').innerHTML = '<span class="dim">Not recorded for this question. Use your own Ollama below, or run the repo locally.</span>'; $('al-src').textContent = ''; }
  $('al-local').disabled = !docs.length;
}
async function askLocal() {
  const msg = $('al-local-msg'); msg.textContent = 'Asking http://127.0.0.1:11434 …';
  try {
    const r = await fetch('http://127.0.0.1:11434/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: $('al-model').value, stream: false, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: current.prompt }] }) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    $('al-answer').innerHTML = md(d.message.content.replace(/<think>[\s\S]*?<\/think>/g, '').trim()); $('al-src').textContent = `· your Ollama · ${esc($('al-model').value)}`; msg.textContent = '';
  } catch (e) {
    msg.innerHTML = `Could not reach your Ollama (${esc(e.message)}). Ollama only accepts browser requests from allowed origins. Start it with <code>OLLAMA_ORIGINS=https://phlppgdfry.github.io ollama serve</code> and pull the model. Safari blocks requests from an https page to localhost; use Chrome or Firefox.`;
  }
}
$('al-chips').innerHTML = rec.answers.map(a => `<button type="button">${esc(a.question)}</button>`).join('');
$('al-chips').addEventListener('click', e => { if (e.target.tagName === 'BUTTON') { $('al-q').value = e.target.textContent; run(); } });
$('al-q').addEventListener('input', run);
$('al-local').addEventListener('click', askLocal);
$('al-q').value = rec.answers[3].question; run();
