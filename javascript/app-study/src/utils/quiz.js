const QUESTIONS_PER_PAGE = 10;
let currentPage = 0;
let userAnswers = {};
let results = { correct: [], incorrect: [] };
let currentQuestions = [];



export function iniciarTest(preguntas) {
  currentQuestions = preguntas;
  currentPage = 0;
  userAnswers = {};
  renderQuestions();
  iniciarTemporizador();
}


const questions = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  question: `¿Cuál es la respuesta correcta para la pregunta ${i + 1}?`,
  options: ["Opción A", "Opción B", "Opción C", "Opción D"],
  answer: "Opción A"
}));

export function renderQuestions() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";

  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = start + QUESTIONS_PER_PAGE;
  const visibleQuestions = questions.slice(start, end);

  visibleQuestions.forEach((q, i) => {
    const index = start + i;
    const userAns = userAnswers[index] || "";
    const div = document.createElement("div");
    div.className = "question-card";
    div.id = `q-${index}`;

    div.innerHTML = `
      <p><strong>${q.question}</strong></p>
      <div class="options">
        ${q.options
          .map(
            (opt) => `
            <label>
              <input type="radio" name="q${index}" value="${opt}" ${
              userAns === opt ? "checked" : ""
            }>
              ${opt}
            </label>
          `
          )
          .join("")}
      </div>
      <button>Checkear</button>
      <div class="feedback" id="feedback-${index}"></div>
    `;

    // Eventos de radio
    div.querySelectorAll(`input[name="q${index}"]`).forEach((input) => {
      input.addEventListener("change", (e) => {
        userAnswers[index] = e.target.value;
      });
    });

    // Botón checkear
    div.querySelector("button").addEventListener("click", () => {
      checkQuestion(index);
    });

    container.appendChild(div);
  });
}

function checkQuestion(index) {
  const feedback = document.getElementById(`feedback-${index}`);
  const card = document.getElementById(`q-${index}`);
  const correct = questions[index].answer;

  if (userAnswers[index] === correct) {
    feedback.innerHTML = "✅ Correcto";
    card.classList.add("correct");
    card.classList.remove("incorrect");
  } else {
    feedback.innerHTML = "❌ Incorrecto";
    card.classList.add("incorrect");
    card.classList.remove("correct");
  }
}

export function validateAll() {
  results = { correct: [], incorrect: [] };

  questions.forEach((q, i) => {
    if (userAnswers[i] === q.answer) {
      results.correct.push(q);
    } else {
      results.incorrect.push(q);
    }
  });

  const resultDiv = document.getElementById("results");
  resultDiv.innerHTML = `
    <h3>Resultados Finales</h3>
    <p>✅ Correctas: ${results.correct.length}</p>
    <p>❌ Incorrectas: ${results.incorrect.length}</p>

    <h4>Preguntas Incorrectas:</h4>
    <ul>
      ${results.incorrect.map((q) => `<li>${q.question}</li>`).join("")}
    </ul>
  `;
}

export function nextPage() {
  if ((currentPage + 1) * QUESTIONS_PER_PAGE < questions.length) {
    currentPage++;
    renderQuestions();
  }
}

export function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderQuestions();
  }
}
const STORAGE_KEY = "estadoTest";

function guardarEstado() {
  const data = {
    tema: select.value,
    userAnswers,
    tiempoRestante,
    currentPage
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function cargarEstado() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
}

function limpiarEstado() {
  localStorage.removeItem(STORAGE_KEY);
}
