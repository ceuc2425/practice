import './style.css';
import { msgK } from './utils/quiz';

const QUESTIONS_PER_PAGE = 10;
let currentPage = 0;
let userAnswers = {};
let results = { correct: [], incorrect: [] };
let currentQuestions = [];
let tiempoRestante = 1800;
let temporizador = null;

const STORAGE_KEY = "estadoTest";

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
  actualizarEstilosBotones();
}

function renderQuestions() {
  const container = document.getElementById("quiz-container");
  container.innerHTML = "";

  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = start + QUESTIONS_PER_PAGE;
  const visibleQuestions = currentQuestions.slice(start, end);

  // Mostrar progreso y página actual
  let progreso = document.getElementById("progreso");
  if (!progreso) {
    progreso = document.createElement("div");
    progreso.id = "progreso";
    document.body.prepend(progreso);
  }
  progreso.textContent = `📊 Preguntas respondidas: ${Object.keys(userAnswers).length}/${currentQuestions.length} | Página ${currentPage + 1} de ${Math.ceil(currentQuestions.length / QUESTIONS_PER_PAGE)}`;

  visibleQuestions.forEach((q, i) => {
    const index = start + i;
    const userAns = userAnswers[index] || "";
    const div = document.createElement("div");
    div.className = "question-card";
    div.id = `q-${index}`;

    div.innerHTML = `
      <p><strong>${q.pregunta || q.question}</strong></p>
      <div class="options">
        ${q.opciones.map(opt => `
          <label>
            <input type="radio" name="q${index}" value="${opt}" ${userAns === opt ? "checked" : ""}>
            ${opt}
          </label>`).join("")}
      </div>
      <button class="btn-validar-individual" data-index="${index}"> Validar</button>
      <div class="feedback" id="feedback-${index}"></div>
    `;

    div.querySelectorAll(`input[name="q${index}"]`).forEach((input) => {
      input.addEventListener("change", (e) => {
        userAnswers[index] = e.target.value;
        guardarEstado();

        // Actualiza progreso
        document.getElementById("progreso").textContent =
          `📊 Preguntas respondidas: ${Object.keys(userAnswers).length}/${currentQuestions.length} | Página ${currentPage + 1} de ${Math.ceil(currentQuestions.length / QUESTIONS_PER_PAGE)}`;

        if (Object.keys(userAnswers).length === currentQuestions.length) {
          document.getElementById("validate-all").style.display = "inline-block";
        }
      });
    });

    container.appendChild(div);
  });

  // Botón individual de validación
  document.querySelectorAll(".btn-validar-individual").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = parseInt(btn.dataset.index);
      if (userAnswers[index]) {
        checkQuestion(index);
      } else {
        alert(`❗ Debes seleccionar una respuesta para la pregunta ${index + 1}`);
      }
    });
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
    document.getElementById(`q-${index}`).classList.remove("incorrect");
  } else {
    feedback.innerHTML = `❌ Incorrecto<br>✅ Respuesta correcta: <strong>${correct}</strong>`;
    document.getElementById(`q-${index}`).classList.add("incorrect");
    document.getElementById(`q-${index}`).classList.remove("correct");
  }
}

// --- CORREGIDO: Validar todas las preguntas (no solo la página actual) ---
function handleValidate() {
  // Comprobar si hay preguntas sin responder
  const noContestadas = [];
  for (let i = 0; i < currentQuestions.length; i++) {
    if (!userAnswers[i]) noContestadas.push(`Pregunta ${i + 1}`);
  }

  if (noContestadas.length > 0) {
    alert("❗ Faltan por responder:\n" + noContestadas.join("\n"));
    return;
  }

  validateAll(); // Validar todas las preguntas y mostrar resultados finales
}

function validateAll() {
  results = { correct: [], incorrect: [] };

  currentQuestions.forEach((q, i) => {
    const correct = q.respuesta_correcta || q.answer;
    if (userAnswers[i] === correct) {
      results.correct.push(q);
      marcarPregunta(i, true);
    } else {
      results.incorrect.push({ ...q, userAnswer: userAnswers[i] });
      marcarPregunta(i, false);
    }
  });

  const total = currentQuestions.length;
  const correctas = results.correct.length;
  const incorrectas = results.incorrect.length;
  const porcentaje = ((correctas / total) * 100).toFixed(2);

  let resultDiv = document.getElementById("results");
  if (!resultDiv) {
    resultDiv = document.createElement("div");
    resultDiv.id = "results";
    document.body.appendChild(resultDiv);
  }

  resultDiv.innerHTML = `
    <h3>📊 Resultados Finales</h3>
    <p>✅ Correctas: <strong>${correctas}</strong></p>
    <p>❌ Incorrectas: <strong>${incorrectas}</strong></p>
    <p>🎯 Puntaje final: <strong>${porcentaje}%</strong></p>
    <h4>❌ Preguntas Incorrectas:</h4>
    <ul>
      ${results.incorrect.map(q => `
        <li style="margin-bottom:1rem;">
          <strong>${q.pregunta || q.question}</strong><br>
          Tu respuesta: <span style="color:#f44336">${q.userAnswer || 'No respondida'}</span><br>
          ✅ Correcta: <strong>${q.respuesta_correcta || q.answer}</strong>
        </li>`).join("")}
    </ul>
  `;

  resultDiv.scrollIntoView({ behavior: "smooth" });
}

// Función para marcar visualmente cada pregunta (correcta o incorrecta)
function marcarPregunta(index, esCorrecta) {
  const feedback = document.getElementById(`feedback-${index}`);
  if (!feedback) return;

  if (esCorrecta) {
    feedback.innerHTML = "✅ Correcto";
    document.getElementById(`q-${index}`).classList.add("correct");
    document.getElementById(`q-${index}`).classList.remove("incorrect");
  } else {
    const correct = currentQuestions[index].respuesta_correcta || currentQuestions[index].answer;
    feedback.innerHTML = `❌ Incorrecto<br>✅ Respuesta correcta: <strong>${correct}</strong>`;
    document.getElementById(`q-${index}`).classList.add("incorrect");
    document.getElementById(`q-${index}`).classList.remove("correct");
  }
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
    scrollToFirstQuestion();
    mensajeMotivacion();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderQuestions();
    guardarEstado();
    scrollToFirstQuestion();
    mensajeMotivacion();;
  }
}

function scrollToFirstQuestion() {
  const firstQuestion = document.querySelector(".question-card");
  if (firstQuestion) {
    firstQuestion.scrollIntoView({ behavior: "smooth", block: "start" });
  } else {
    const container = document.getElementById("body");
    container.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

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

// Cambios visuales de botones
// Cambios visuales de botones
function actualizarEstilosBotones() {
  document.getElementById("prev-btn").style.backgroundColor = "#007bff"; // azul
  document.getElementById("next-btn").style.backgroundColor = "#007bff"; // azul
  document.getElementById("validate-all").style.backgroundColor = "#28a745"; // verde
  finalizarBtn.style.backgroundColor = "#28a745"; // verde
  reiniciarBtn.style.backgroundColor = "#6c757d"; // gris oscuro
}

const rellenarMixtoBtn = document.createElement("button");
rellenarMixtoBtn.textContent = "Rellenar con mezcla (correctas e incorrectas)";
rellenarMixtoBtn.style.backgroundColor = "#dc3545"; // rojo
rellenarMixtoBtn.style.color = "white";
rellenarMixtoBtn.style.marginLeft = "10px";

rellenarMixtoBtn.addEventListener("click", () => {
  // Rellenar userAnswers con mezcla correcta/incorrecta para TODAS las preguntas
  currentQuestions.forEach((q, i) => {
    if (i % 2 === 0) {
      // Preguntas pares con respuesta correcta
      const correcta = q.respuesta_correcta || q.answer;
      userAnswers[i] = correcta;
    } else {
      // Preguntas impares con respuesta incorrecta (elige la primera opción que NO sea la correcta)
      const correcta = q.respuesta_correcta || q.answer;
      const incorrecta = q.opciones.find(opt => opt !== correcta) || correcta;
      userAnswers[i] = incorrecta;
    }
  });

  // Actualizar los inputs solo de la página actual (para que se reflejen los cambios en el DOM)
  const start = currentPage * QUESTIONS_PER_PAGE;
  const end = Math.min(start + QUESTIONS_PER_PAGE, currentQuestions.length);

  for (let i = start; i < end; i++) {
    const respuesta = userAnswers[i];
    const inputRadio = document.querySelector(`input[name="q${i}"][value="${respuesta}"]`);
    if (inputRadio) inputRadio.checked = true;
  }

  // Actualizar el progreso
  const progreso = document.getElementById("progreso");
  if (progreso) {
    progreso.textContent = `📊 Preguntas respondidas: ${Object.keys(userAnswers).length}/${currentQuestions.length} | Página ${currentPage + 1} de ${Math.ceil(currentQuestions.length / QUESTIONS_PER_PAGE)}`;
  }

  // Mostrar el botón de validar todas las preguntas si todas están respondidas
  if (Object.keys(userAnswers).length === currentQuestions.length) {
    document.getElementById("validate-all").style.display = "inline-block";
  }

  guardarEstado();

  alert("✅ Preguntas pares con respuestas correctas y preguntas impares con respuestas incorrectas han sido rellenadas.");
});

document.getElementById("validate-btn").appendChild(rellenarMixtoBtn);

// Función para obtener la página actual (por si quieres usarlo explícitamente)
function obtenerPaginaActual() {
  return currentPage;
}

let mensajeMotivacion = () => {
  const texto = msgK(obtenerPaginaActual());
  const elem = document.getElementById("mensaje-mov");
  const elem2 = document.getElementById("motivacion");
  if (elem) {
    elem.innerHTML = texto; // muestra el mensaje
    elem2.innerHTML = texto; // muestra el mensaje
  }
};

