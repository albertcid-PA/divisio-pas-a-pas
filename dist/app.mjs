import {
  buildDivisionPlan,
  getHint,
  getStepPrompt,
  isCorrectAnswer
} from "./logic.mjs";

const STEP_META = {
  quotient: { label: "DIVIDEIX", concept: "Tria una sola xifra: quantes vegades cap el divisor sense superar el nombre parcial?" },
  product: { label: "MULTIPLICA", concept: "El producte parcial representa la quantitat que acabes de repartir en aquest pas." },
  remainder: { label: "RESTA", concept: "La resta diu què queda per repartir. Abans de baixar una xifra, ha de ser més petita que el divisor." },
  bring: { label: "BAIXA", concept: "Baixa exactament una xifra del dividend i col·loca-la a la columna següent." }
};

const PRACTICE_SETS = {
  1: {
    1: [[84, 4], [125, 5], [96, 3], [248, 8], [132, 6], [144, 9]],
    2: [[97, 4], [116, 5], [143, 6], [258, 7], [389, 8], [3, 7]],
    3: [[1005, 5], [804, 4], [1008, 8], [1204, 6], [2037, 3], [1002, 9]]
  },
  2: {
    1: [[156, 12], [288, 16], [325, 13], [432, 24], [735, 21], [864, 27]],
    2: [[250, 12], [437, 15], [728, 23], [915, 28], [1000, 32], [347, 14]],
    3: [[1205, 12], [3007, 15], [1010, 25], [5040, 24], [2025, 20], [10000, 32]]
  }
};

const $ = (selector) => document.querySelector(selector);
const elements = {
  form: $("#problem-form"), dividend: $("#dividend-input"), divisor: $("#divisor-input"),
  formError: $("#form-error"), board: $("#math-board"), feedback: $("#feedback"),
  coachPanel: $(".coach-panel"), coachLabel: $("#coach-step-label"), coachTitle: $("#coach-title"), coachQuestion: $("#coach-question"), concept: $("#concept-note"),
  counter: $("#step-counter"), check: $("#check-button"), hint: $("#hint-button"), show: $("#show-step-button"),
  completion: $("#completion"), level: $("#practice-level"), digits: $("#practice-digits"), levelWrap: $("#practice-level-wrap"),
  chips: $("#example-chips"), setupKicker: $("#setup-kicker"), setupTitle: $("#setup-title"),
  statCompleted: $("#stat-completed"), statStreak: $("#stat-streak"), statBest: $("#stat-best")
};

const state = {
  mode: "learn",
  plan: null,
  cursor: 0,
  answers: new Map(),
  attempts: new Map(),
  assisted: false,
  lastPracticeKey: ""
};

function loadProgress() {
  try {
    return { completed: 0, streak: 0, bestStreak: 0, ...JSON.parse(localStorage.getItem("divisio-progress-v1") || "{}") };
  } catch {
    return { completed: 0, streak: 0, bestStreak: 0 };
  }
}

let progress = loadProgress();
function saveProgress() {
  try { localStorage.setItem("divisio-progress-v1", JSON.stringify(progress)); } catch { /* mode privat o emmagatzematge desactivat */ }
  renderProgress();
}

function renderProgress() {
  elements.statCompleted.textContent = progress.completed;
  elements.statStreak.textContent = progress.streak;
  elements.statBest.textContent = progress.bestStreak;
}

function currentStep() { return state.plan?.steps[state.cursor] ?? null; }
function stepIndex(id) { return state.plan.steps.findIndex((step) => step.id === id); }
function isStepVisible(id) { return stepIndex(id) <= state.cursor; }
function isSolved(id) { return state.answers.has(id); }

function inputMarkup(step, gridColumn = "auto") {
  const maxLength = String(step.answer).length;
  return `<input class="math-input" id="active-input" data-step-id="${step.id}" style="grid-column:${gridColumn}" aria-label="${step.label}" inputmode="numeric" pattern="[0-9]*" maxlength="${maxLength}" autocomplete="off" />`;
}

function digitSpans(number, endIndex, extraClass = "") {
  const digits = String(number).split("");
  const start = endIndex - digits.length + 2;
  return digits.map((digit, offset) => `<span class="work-digit ${extraClass}" style="grid-column:${start + offset}">${digit}</span>`).join("");
}

function renderBoard() {
  const plan = state.plan;
  const active = currentStep();
  const columns = plan.digits.length;
  let workRows = "";

  for (const iteration of plan.iterations) {
    const productStep = plan.steps.find((step) => step.id === `p-${iteration.index}`);
    const remainderStep = plan.steps.find((step) => step.id === `r-${iteration.index}`);
    const bringStep = plan.steps.find((step) => step.id === `b-${iteration.index}`);

    if (isStepVisible(productStep.id)) {
      const length = String(productStep.answer).length;
      const start = iteration.dividendIndex - length + 2;
      const productContent = isSolved(productStep.id)
        ? digitSpans(productStep.answer, iteration.dividendIndex)
        : active?.id === productStep.id ? inputMarkup(productStep, `${start} / span ${length}`) : "";
      workRows += `<div class="work-row product" style="--columns:${columns}" aria-label="Producte parcial"><span class="math-minus" style="grid-column:${start}" aria-hidden="true">−</span>${productContent}</div>`;
    }

    if (isStepVisible(remainderStep.id)) {
      const length = String(remainderStep.answer).length;
      const start = iteration.dividendIndex - length + 2;
      let remainderContent = isSolved(remainderStep.id)
        ? digitSpans(remainderStep.answer, iteration.dividendIndex)
        : active?.id === remainderStep.id ? inputMarkup(remainderStep, `${start} / span ${length}`) : "";

      if (bringStep && isStepVisible(bringStep.id) && isSolved(remainderStep.id)) {
        remainderContent += isSolved(bringStep.id)
          ? `<span class="work-digit bring-cell" style="grid-column:${iteration.dividendIndex + 2}">${bringStep.answer}</span>`
          : active?.id === bringStep.id ? inputMarkup(bringStep, `${iteration.dividendIndex + 2}`) : "";
      }
      workRows += `<div class="work-row remainder" style="--columns:${columns}" aria-label="Resta parcial${bringStep && isSolved(bringStep.id) ? " i xifra baixada" : ""}">${remainderContent}</div>`;
    }
  }

  const quotientBoxes = plan.iterations.map((iteration) => {
    const step = plan.steps.find((item) => item.id === `q-${iteration.index}`);
    if (isSolved(step.id)) return `<span class="quotient-cell">${step.answer}</span>`;
    if (active?.id === step.id) return `<span class="quotient-cell active-cell">${inputMarkup(step)}</span>`;
    return `<span class="quotient-cell future" aria-hidden="true">0</span>`;
  }).join("");

  elements.board.innerHTML = `
    <div class="division-left">
      <div class="digit-grid dividend-row" style="--columns:${columns}">
        ${plan.digits.map((digit, index) => `<span style="grid-column:${index + 1}">${digit}</span>`).join("")}
      </div>
      ${workRows}
    </div>
    <div class="division-right">
      <div class="divisor-value">${plan.divisor}</div>
      <div class="quotient-boxes" aria-label="Quocient">${quotientBoxes}</div>
    </div>`;

  const input = $("#active-input");
  if (input) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") { event.preventDefault(); submitAnswer(); }
    });
    input.addEventListener("input", () => {
      input.value = input.value.replace(/\D/g, "");
      if (["quotient", "bring"].includes(active.type) && input.value.length === 1) submitAnswer();
    });
    requestAnimationFrame(() => input.focus());
  }
}

function renderCoach() {
  const step = currentStep();
  if (!step) return;
  const meta = STEP_META[step.type];
  const practice = state.mode === "practice";
  elements.coachPanel.classList.toggle("is-practice", practice);
  elements.coachLabel.textContent = practice ? "MODE PRÀCTICA" : `PAS ${state.cursor + 1} · ${meta.label}`;
  elements.coachTitle.textContent = practice ? "És el teu torn" : "Ara et toca";
  elements.coachQuestion.hidden = practice;
  elements.concept.hidden = practice;
  elements.coachQuestion.textContent = practice ? "" : getStepPrompt(step, state.plan.divisor);
  elements.concept.textContent = practice ? "" : meta.concept;
  elements.counter.textContent = `${state.cursor + 1} de ${state.plan.steps.length} passos`;
  elements.hint.hidden = practice;
  elements.show.hidden = practice;
}

function renderWorkspace() {
  elements.completion.hidden = true;
  elements.feedback.className = "feedback";
  elements.feedback.textContent = "";
  renderBoard();
  renderCoach();
}

function startProblem(dividend, divisor, { scroll = true } = {}) {
  try {
    state.plan = buildDivisionPlan(dividend, divisor);
    state.cursor = 0;
    state.answers = new Map();
    state.attempts = new Map();
    state.assisted = false;
    elements.formError.textContent = "";
    elements.dividend.value = state.plan.dividend;
    elements.divisor.value = state.plan.divisor;
    renderWorkspace();
    if (scroll) $("#workspace-card").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    elements.formError.textContent = error.message;
    elements.formError.focus?.();
  }
}

function wrongAnswer(input, step) {
  const attempts = (state.attempts.get(step.id) || 0) + 1;
  state.attempts.set(step.id, attempts);
  input.classList.remove("is-wrong");
  void input.offsetWidth;
  input.classList.add("is-wrong");
  elements.feedback.className = "feedback";
  elements.feedback.textContent = state.mode === "practice"
    ? attempts === 1
      ? "Encara no és correcte. Torna-ho a provar: gairebé ho tens!"
      : "No passa res. Revisa les xifres i prova-ho una altra vegada."
    : `Encara no. ${getHint(step, state.plan.divisor, Math.min(attempts, 2))}`;
  input.select();
}

function submitAnswer() {
  const step = currentStep();
  const input = $("#active-input");
  if (!step || !input || input.dataset.checking === "true") return;
  if (!input.value) {
    elements.feedback.textContent = "Escriu una xifra o un nombre abans de comprovar.";
    input.focus();
    return;
  }
  if (!isCorrectAnswer(step, input.value)) {
    wrongAnswer(input, step);
    return;
  }

  input.dataset.checking = "true";
  state.answers.set(step.id, String(step.answer));
  elements.feedback.className = "feedback success";
  elements.feedback.textContent = "Molt bé! Aquest pas està ben col·locat.";
  state.cursor += 1;
  window.setTimeout(() => {
    if (state.cursor >= state.plan.steps.length) finishProblem();
    else renderWorkspace();
  }, 280);
}

function showHint() {
  if (state.mode === "practice") return;
  const step = currentStep();
  const previous = state.attempts.get(step.id) || 0;
  const level = Math.min(3, previous + 1);
  state.attempts.set(step.id, level);
  elements.feedback.className = "feedback";
  elements.feedback.textContent = getHint(step, state.plan.divisor, level);
  $("#active-input")?.focus();
}

function revealStep() {
  if (state.mode === "practice") return;
  const step = currentStep();
  state.assisted = true;
  state.answers.set(step.id, String(step.answer));
  state.cursor += 1;
  if (state.cursor >= state.plan.steps.length) finishProblem();
  else {
    renderWorkspace();
    elements.feedback.textContent = "T'hem mostrat només aquest pas. Mira on s'ha col·locat i continua.";
  }
}

function finishProblem() {
  renderBoard();
  elements.counter.textContent = `${state.plan.steps.length} de ${state.plan.steps.length} passos`;
  elements.coachLabel.textContent = "DIVISIÓ COMPLETA";
  elements.coachTitle.textContent = "Molt bona feina!";
  elements.coachQuestion.hidden = false;
  elements.concept.hidden = false;
  elements.coachQuestion.textContent = "Has construït tota l'operació, pas per pas.";
  elements.concept.textContent = `Comprovació: ${state.plan.divisor} × ${state.plan.quotient} + ${state.plan.remainder} = ${state.plan.dividend}.`;
  elements.feedback.className = "feedback success";
  elements.feedback.textContent = state.assisted ? "Acabada amb una mica d'ajuda. La propera, prova de fer-la sense mostrar passos!" : "Fantàstic: no t'has saltat cap pas.";
  elements.check.hidden = true;
  elements.hint.hidden = true;
  elements.show.hidden = true;

  const remainderText = state.plan.remainder ? ` i residu ${state.plan.remainder}` : ", exacta";
  elements.completion.innerHTML = `
    <h3>Operació completada</h3>
    <p><strong>${state.plan.dividend} ÷ ${state.plan.divisor} = ${state.plan.quotient}${remainderText}</strong></p>
    <button class="primary-button" id="next-problem" type="button">${state.mode === "practice" ? "Exercici següent" : "Fes-ne una altra"} <span aria-hidden="true">→</span></button>`;
  elements.completion.hidden = false;
  $("#next-problem").addEventListener("click", () => state.mode === "practice" ? startRandomPractice() : $("#setup-card").scrollIntoView({ behavior: "smooth" }));

  if (state.mode === "practice") {
    progress.completed += 1;
    progress.streak = state.assisted ? 0 : progress.streak + 1;
    progress.bestStreak = Math.max(progress.bestStreak, progress.streak);
    saveProgress();
  }
}

function startRandomPractice() {
  const level = Number(elements.level.value);
  const divisorDigits = Number(elements.digits.value);
  const set = PRACTICE_SETS[divisorDigits][level];
  let candidates = set.filter(([a, b]) => `${a}/${b}` !== state.lastPracticeKey);
  if (!candidates.length) candidates = set;
  const [dividend, divisor] = candidates[Math.floor(Math.random() * candidates.length)];
  state.lastPracticeKey = `${dividend}/${divisor}`;
  startProblem(dividend, divisor);
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-tab").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const practice = mode === "practice";
  elements.levelWrap.hidden = !practice;
  elements.chips.hidden = practice;
  elements.form.hidden = practice;
  elements.setupKicker.textContent = practice ? "Exercicis graduats" : "Tria una divisió";
  elements.setupTitle.textContent = practice ? "Un repte al teu nivell" : "Comencem amb nombres amables";
  elements.check.hidden = false;
  elements.hint.hidden = practice;
  elements.show.hidden = practice;
  if (practice) startRandomPractice();
  else startProblem(elements.dividend.value || 130, elements.divisor.value || 5, { scroll: false });
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  startProblem(elements.dividend.value, elements.divisor.value);
});
elements.check.addEventListener("click", submitAnswer);
elements.hint.addEventListener("click", showHint);
elements.show.addEventListener("click", revealStep);
document.querySelectorAll(".mode-tab").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
document.querySelectorAll("[data-dividend]").forEach((button) => button.addEventListener("click", () => startProblem(button.dataset.dividend, button.dataset.divisor)));
elements.level.addEventListener("change", startRandomPractice);
elements.digits.addEventListener("change", startRandomPractice);
$("#reset-progress").addEventListener("click", () => {
  progress = { completed: 0, streak: 0, bestStreak: 0 };
  saveProgress();
  $("#reset-progress").textContent = "Progrés reiniciat";
  window.setTimeout(() => { $("#reset-progress").textContent = "Reinicia el progrés"; }, 1200);
});

renderProgress();
startProblem(130, 5, { scroll: false });
