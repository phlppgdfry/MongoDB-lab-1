const form = document.querySelector("#ask-form");
const question = document.querySelector("#question");
const answer = document.querySelector("#answer");
const answerTitle = document.querySelector("#answer-title");
const sources = document.querySelector("#sources");
const latency = document.querySelector("#latency");
const modelName = document.querySelector("#model-name");
const count = document.querySelector("#character-count");
const statusText = document.querySelector("#status-text");
const statusDot = document.querySelector("#status-dot");

function updateCount() {
  count.textContent = `${question.value.length} / 500`;
}

async function health() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();
    statusText.textContent = data.ok ? "Atlas connected" : "Degraded";
    statusDot.classList.toggle("online", data.ok);
    modelName.textContent = data.model;
  } catch {
    statusText.textContent = "Offline";
  }
}

function showSources(items) {
  sources.innerHTML = items.length
    ? `<span class="sources-label">Retrieved from Atlas</span>${items.map((item) => `<span class="source">${item.title}</span>`).join("")}`
    : `<span class="sources-label">No matching documents</span>`;
}

async function ask(event) {
  event.preventDefault();
  const value = question.value.trim();
  if (value.length < 3) return;
  answer.classList.add("loading");
  answer.classList.remove("empty");
  answerTitle.textContent = "Thinking…";
  latency.textContent = "";
  sources.innerHTML = "";
  try {
    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question: value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Request failed");
    answer.textContent = data.answer;
    answerTitle.textContent = "Answer";
    latency.textContent = `${data.retrievalMs + data.generationMs}ms`;
    showSources(data.sources);
  } catch (error) {
    answer.textContent = error.message;
    answerTitle.textContent = "Could not answer";
  } finally {
    answer.classList.remove("loading");
  }
}

question.addEventListener("input", updateCount);
form.addEventListener("submit", ask);
document.querySelectorAll(".suggestions button").forEach((button) => {
  button.addEventListener("click", () => {
    question.value = button.textContent;
    updateCount();
    question.focus();
  });
});
updateCount();
health();
