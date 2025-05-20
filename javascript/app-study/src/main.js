
import './style.css';

const QUESTIONS_PER_PAGE = 10;
let currentPage = 0;
let userAnswers = {};
let results = { correct: [], incorrect: [] };
let currentQuestions = [];
let tiempoRestante = 1800;
let temporizador = null;

const STORAGE_KEY = "estadoTest";

// UI Elements
const select = document.createElement("select");
select.innerHTML = `
  <option value="">Selecciona un tema</option>
  <option value="modificacion_contrato">Modificación del contrato</option>
  <option value="seguridad_social">Seguridad Social</option>
  <option value="mixto_general">Mixto General</option>
`;
document.body.prepend(select);

const saved = cargarEstado();
if (saved) {
  select.value = saved.tema;
  select.dispatchEvent(new Event("change"));
}

select.addEventListener("change", async (e) => {
  const tema = e.target.value;
  if (!tema) return;
  select.disabled = true;
  document.getElementById("validate-all").style.display = "none";
  tiempoRestante = 1800;

  try {
    const res = await fetch(`/jsons/${tema}.json`);
    const data = await res.json();
    iniciarTest(data);
    guardarEstado();
  } catch (err) {
    alert("Error cargando test: " + err.message);
    console.error(err);
  }
});

document.getElementById("prev-btn").addEventListener("click", prevPage);
document.getElementById("next-btn").addEventListener("click", nextPage);
document.getElementById("validate-all").addEventListener("click", handleValidate);

const finalizarBtn = document.createElement("button");
finalizarBtn.textContent = "Finalizar";
finalizarBtn.addEventListener("click", finalizarTest);
document.getElementById("validate-btn").appendChild(finalizarBtn);

const reiniciarBtn = document.createElement("button");
reiniciarBtn.textContent = "Reiniciar";
reiniciarBtn.addEventListener("click", () => {
  limpiarEstado();
  location.reload();
});
document.getElementById("validate-btn").appendChild(reiniciarBtn);

function iniciarTest(preguntas) {
  const saved = cargarEstado();
  currentQuestions = preguntas;
  currentPage = 0;
  userAnswers = {};
  tiempoRestante = 1800;

  if (saved && saved.tema === select.value) {
    userAnswers = saved.userAnswers || {};
    tiempoRestante = saved.tiempoRestante || 1800;
    currentPage = saved.currentPage || 0;
  }

  renderQuestions();
  iniciarTemporizador();
}

function renderQuestions() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";

  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = start + QUESTIONS_PER_PAGE;
  const visibleQuestions = currentQuestions.slice(start, end);

  visibleQuestions.forEach((q, i) => {
    const index = start + i;
    const userAns = userAnswers[index] || "";
    const div = document.createElement("div");
    div.className = "question-card";
    div.id = `q-${index}`;

    div.innerHTML = `
      <p><strong>${q.pregunta || q.question}</strong></p>
      <div class="options">
        ${q.opciones
          .map(
            (opt) => `
          <label>
            <input type="radio" name="q${index}" value="${opt}" ${
              userAns === opt ? "checked" : ""
            }>
            ${opt}
          </label>`
          )
          .join("")}
      </div>
      <div class="feedback" id="feedback-${index}"></div>
    `;

    div.querySelectorAll(`input[name="q${index}"]`).forEach((input) => {
      input.addEventListener("change", (e) => {
        userAnswers[index] = e.target.value;
        guardarEstado();

        if (Object.keys(userAnswers).length === currentQuestions.length) {
          document.getElementById("validate-all").style.display = "inline-block";
        }
      });
    });

    container.appendChild(div);
  });
}

function iniciarTemporizador() {
  clearInterval(temporizador);
  const display = document.getElementById("temporizador") || document.createElement("div");
  display.id = "temporizador";
  document.body.prepend(display);
  actualizarTemporizador();

  temporizador = setInterval(() => {
    tiempoRestante--;
    actualizarTemporizador();
    guardarEstado();
    if (tiempoRestante <= 0) {
      finalizarTest();
    }
  }, 1000);
}

function actualizarTemporizador() {
  const min = Math.floor(tiempoRestante / 60).toString().padStart(2, "0");
  const seg = (tiempoRestante % 60).toString().padStart(2, "0");
  document.getElementById("temporizador").textContent = `⏱️ Tiempo restante: ${min}:${seg}`;
}

function checkQuestion(index) {
  const feedback = document.getElementById(`feedback-${index}`);
  const correct = currentQuestions[index].respuesta_correcta || currentQuestions[index].answer;
  const userAns = userAnswers[index];

  if (userAns === correct) {
    feedback.innerHTML = "✅ Correcto";
    document.getElementById(`q-${index}`).classList.add("correct");
  } else {
    feedback.innerHTML = `❌ Incorrecto<br>✅ Respuesta correcta: <strong>${correct}</strong>`;
    document.getElementById(`q-${index}`).classList.add("incorrect");
  }
}

function handleValidate() {
  if (Object.keys(userAnswers).length !== currentQuestions.length) {
    const noContestadas = currentQuestions
      .map((q, i) => (userAnswers[i] ? null : `Pregunta ${i + 1}`))
      .filter(Boolean);
    alert("Faltan por responder:\n" + noContestadas.join("\n"));
    return;
  }

  validateAll();
}

function validateAll() {
  results = { correct: [], incorrect: [] };

  currentQuestions.forEach((q, i) => {
    const correct = q.respuesta_correcta || q.answer;
    if (userAnswers[i] === correct) {
      results.correct.push(q);
    } else {
      results.incorrect.push(q);
      checkQuestion(i);
    }
  });

  const resultDiv = document.getElementById("results");
  resultDiv.innerHTML = `
    <h3>Resultados Finales</h3>
    <p>✅ Correctas: ${results.correct.length}</p>
    <p>❌ Incorrectas: ${results.incorrect.length}</p>
    <h4>Preguntas Incorrectas:</h4>
    <ul>
      ${results.incorrect.map((q) => `<li>${q.pregunta || q.question} <br>✅ <em>${q.respuesta_correcta || q.answer}</em></li>`).join("")}
    </ul>
  `;
}

function finalizarTest() {
  clearInterval(temporizador);
  validateAll();
  select.disabled = false;
  limpiarEstado();
}

function nextPage() {
  if ((currentPage + 1) * QUESTIONS_PER_PAGE < currentQuestions.length) {
    currentPage++;
    renderQuestions();
    guardarEstado();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderQuestions();
    guardarEstado();
  }
}

// localStorage utils
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
