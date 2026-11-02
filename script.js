const consent = document.getElementById("consent");
const intervalSelect = document.getElementById("interval");
const video = document.getElementById("video");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("status");
const statusDot = document.getElementById("statusDot");
const count = document.getElementById("count");
const uptime = document.getElementById("uptime");
const lastCapture = document.getElementById("lastCapture");
const message = document.getElementById("message");

let stream = null;
let captureTimer = null;
let clockTimer = null;
let startedAt = null;
let photoCount = 0;
let running = false;
let busy = false;
let sessionVersion = 0;

function showMessage(text) {
  message.textContent = text;
}

function setStatus(text, active = false) {
  statusText.textContent = text;
  statusDot.classList.toggle("active", active);
}

function updateUptime() {
  if (!startedAt) return;
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  uptime.textContent =
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0");
}

async function capturePhoto(currentVersion) {
  if (!running || busy || currentVersion !== sessionVersion) return;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

  busy = true;

  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem.");

    context.drawImage(video, 0, 0);

    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, "image/jpeg", 0.82)
    );

    if (!blob || !running || currentVersion !== sessionVersion) return;

    const form = new FormData();
    form.append("photo", blob, "captura.jpg");

    const response = await fetch("/api/send-photo", {
      method: "POST",
      body: form
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Falha no envio.");
    }

    if (running && currentVersion === sessionVersion) {
      photoCount += 1;
      count.textContent = String(photoCount);
      lastCapture.textContent =
        "Último envio: " + new Date().toLocaleTimeString("pt-BR");
      showMessage("");
    }
  } catch (error) {
    if (running && currentVersion === sessionVersion) {
      showMessage(error.message);
    }
  } finally {
    busy = false;
  }
}

async function startCapture() {
  if (running) return;

  if (!consent.checked) {
    showMessage("Confirme que a pessoa diante da câmera concorda com a captura.");
    return;
  }

  startBtn.disabled = true;
  showMessage("Solicitando permissão para usar a câmera...");

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Câmera indisponível. Abra o site usando HTTPS.");
    }

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: { ideal: "environment" }
      },
      audio: false
    });

    video.srcObject = stream;
    video.hidden = false;
    await video.play();

    if (!video.videoWidth) {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("A câmera não ficou pronta.")), 10000);
        video.addEventListener("loadedmetadata", () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
      });
    }

    running = true;
    sessionVersion += 1;
    photoCount = 0;
    count.textContent = "0";
    startedAt = Date.now();

    const currentVersion = sessionVersion;
    const interval = Number(intervalSelect.value);

    setStatus("Câmera ativa • enviando com autorização", true);
    stopBtn.disabled = false;
    startBtn.disabled = true;
    intervalSelect.disabled = true;
    consent.disabled = true;

    clockTimer = setInterval(updateUptime, 1000);
    await capturePhoto(currentVersion);
    captureTimer = setInterval(() => capturePhoto(currentVersion), interval);
    showMessage("Captura ativa. Use Parar para encerrar.");
  } catch (error) {
    stopCapture(error.message);
  }
}

function stopCapture(messageText = "Captura interrompida.") {
  running = false;
  sessionVersion += 1;

  clearInterval(captureTimer);
  clearInterval(clockTimer);
  captureTimer = null;
  clockTimer = null;

  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  video.pause();
  video.srcObject = null;
  video.hidden = true;

  startedAt = null;
  uptime.textContent = "00:00";
  setStatus("Câmera desligada", false);

  startBtn.disabled = false;
  stopBtn.disabled = true;
  intervalSelect.disabled = false;
  consent.disabled = false;

  if (messageText) showMessage(messageText);
}

startBtn.addEventListener("click", startCapture);
stopBtn.addEventListener("click", () => stopCapture("Captura parada por você."));

window.addEventListener("pagehide", () => {
  running = false;
  clearInterval(captureTimer);
  clearInterval(clockTimer);
  if (stream) stream.getTracks().forEach(track => track.stop());
});
