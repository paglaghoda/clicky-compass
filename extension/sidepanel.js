/* Guide Me — side panel */

const DEFAULT_API_BASE = "https://project--3b888ca9-b53a-4718-9cfe-5bc30531c13a-dev.lovable.app";

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const statusEl = document.getElementById("status");
const controlsEl = document.getElementById("controls");
const progressEl = document.getElementById("progress");
const stepLabel = document.getElementById("step-label");
const progressFill = document.getElementById("progress-fill");
const settingsPanel = document.getElementById("settings");
const apiBaseInput = document.getElementById("api-base");

let apiBase = DEFAULT_API_BASE;
let goal = "";
let history = [];
let lastSpoken = "";
let busy = false;
let audioEl = null;

/* ---------- settings ---------- */

chrome.storage.local.get(["apiBase"]).then(({ apiBase: saved }) => {
  apiBase = saved || DEFAULT_API_BASE;
  apiBaseInput.value = apiBase;
});

document.getElementById("settings-btn").addEventListener("click", () => {
  settingsPanel.hidden = !settingsPanel.hidden;
});

document.getElementById("save-settings").addEventListener("click", () => {
  apiBase = apiBaseInput.value.trim().replace(/\/$/, "") || DEFAULT_API_BASE;
  chrome.storage.local.set({ apiBase });
  settingsPanel.hidden = true;
  setStatus("Saved.");
});

/* ---------- chat rendering ---------- */

function addBubble(text, who, opts = {}) {
  const welcome = chatEl.querySelector(".welcome");
  if (welcome) welcome.remove();

  const div = document.createElement("div");
  div.className = `bubble ${who}${opts.step ? " step" : ""}`;
  const p = document.createElement("p");
  p.textContent = text;
  div.appendChild(p);

  if (opts.warning) {
    const w = document.createElement("div");
    w.className = "warning";
    w.textContent = `\u26A0 ${opts.warning}`;
    div.appendChild(w);
  }

  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setProgress(step, total) {
  if (!total || total < 1) {
    progressEl.hidden = true;
    return;
  }
  progressEl.hidden = false;
  stepLabel.textContent = `Step ${Math.min(step, total)} of ${total}`;
  progressFill.style.width = `${Math.round((Math.min(step, total) / total) * 100)}%`;
}

/* ---------- talking to the page ---------- */

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToPage(message) {
  const tab = await activeTab();
  if (!tab?.id) throw new Error("no-tab");
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content.css"] });
    return await chrome.tabs.sendMessage(tab.id, message);
  }
}

/* ---------- speaking ---------- */

async function speak(text) {
  if (!text) return;
  lastSpoken = text;
  try {
    if (audioEl) {
      audioEl.pause();
      audioEl = null;
    }
    const res = await fetch(`${apiBase}/api/public/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    audioEl = new Audio(URL.createObjectURL(blob));
    await audioEl.play().catch(() => {});
  } catch {
    /* voice is a bonus; never block the step */
  }
}

/* ---------- the guiding loop ---------- */

async function nextStep(userText) {
  if (busy) return;
  busy = true;
  sendBtn.disabled = true;
  setStatus("Looking at this page...");

  try {
    let page;
    try {
      page = await sendToPage({ type: "scan" });
    } catch {
      setStatus("");
      addBubble(
        "I can't read this page. Chrome doesn't let me help on this kind of page — please open a normal website first.",
        "assistant",
      );
      return;
    }

    if (userText) history.push({ role: "user", content: userText });

    const res = await fetch(`${apiBase}/api/public/guide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, history, page }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus("");
      addBubble(data.error || "Something went wrong. Please try again.", "assistant");
      return;
    }

    setStatus("");
    history.push({ role: "assistant", content: data.instruction });
    addBubble(data.instruction, "assistant", { step: true, warning: data.warning });
    setProgress(data.stepNumber, data.totalSteps);
    controlsEl.hidden = false;

    if (data.elementId) {
      const result = await sendToPage({
        type: "highlight",
        elementId: data.elementId,
        label: data.instruction.slice(0, 120),
      }).catch(() => null);
      if (!result?.ok) setStatus("I pointed as best I could — look for it on the page.");
    } else {
      await sendToPage({ type: "clear" }).catch(() => {});
    }

    if (data.done) {
      controlsEl.hidden = true;
      progressEl.hidden = true;
      goal = "";
      await sendToPage({ type: "clear" }).catch(() => {});
    }

    speak(data.spokenText || data.instruction);
  } finally {
    busy = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

async function startGoal(text) {
  goal = text;
  history = [];
  addBubble(text, "user");
  inputEl.value = "";
  await nextStep(`I want to: ${text}`);
}

function submit() {
  const text = inputEl.value.trim();
  if (!text) return;
  if (!goal) {
    startGoal(text);
  } else {
    addBubble(text, "user");
    inputEl.value = "";
    nextStep(text);
  }
}

sendBtn.addEventListener("click", submit);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submit();
  }
});

chatEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".example");
  if (btn) startGoal(btn.textContent.trim());
});

document.getElementById("repeat-btn").addEventListener("click", () => speak(lastSpoken));
document.getElementById("find-btn").addEventListener("click", () => {
  if (goal) nextStep("I cannot find it on the page. Please describe where it is again.");
});
document.getElementById("stop-btn").addEventListener("click", async () => {
  goal = "";
  history = [];
  controlsEl.hidden = true;
  progressEl.hidden = true;
  if (audioEl) audioEl.pause();
  await sendToPage({ type: "clear" }).catch(() => {});
  addBubble("Alright, we've stopped. Tell me any time if you'd like help with something else.", "assistant");
});

/* the page moved on — take another look */
chrome.runtime.onMessage.addListener((msg) => {
  if (!goal) return;
  if (msg?.type === "step-clicked" || msg?.type === "page-changed") {
    setTimeout(() => nextStep(), msg.type === "page-changed" ? 900 : 1200);
  }
});

/* ---------- voice input (WAV via Web Audio) ---------- */

let recording = null;

function encodeWav(chunks, sampleRate) {
  const length = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  // downsample to 16 kHz
  const ratio = sampleRate / 16000;
  const outLength = Math.floor(merged.length / ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const s = Math.max(-1, Math.min(1, merged[Math.floor(i * ratio)] || 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const buffer = new ArrayBuffer(44 + out.length * 2);
  const view = new DataView(buffer);
  const writeStr = (pos, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(pos + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + out.length * 2, true);
  writeStr(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, out.length * 2, true);
  new Int16Array(buffer, 44).set(out);
  return new Blob([buffer], { type: "audio/wav" });
}

async function startRecording() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    setStatus("I need permission to use the microphone.");
    return;
  }
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(node);
  node.connect(ctx.destination);
  recording = { stream, ctx, source, node, chunks };
  micBtn.classList.add("recording");
  micBtn.textContent = "\u25CF Listening... let go when done";
  setStatus("I'm listening.");
}

async function stopRecording() {
  if (!recording) return;
  const { stream, ctx, source, node, chunks } = recording;
  recording = null;
  micBtn.classList.remove("recording");
  micBtn.textContent = "\uD83C\uDFA4 Hold to talk";
  stream.getTracks().forEach((t) => t.stop());
  node.disconnect();
  source.disconnect();
  const blob = encodeWav(chunks, ctx.sampleRate);
  await ctx.close();

  if (blob.size < 4096) {
    setStatus("I didn't hear anything. Please try again.");
    return;
  }

  setStatus("Understanding what you said...");
  try {
    const form = new FormData();
    form.append("audio", blob, "recording.wav");
    const res = await fetch(`${apiBase}/api/public/transcribe`, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.text) {
      setStatus(data.error || "I couldn't understand that. Please try again.");
      return;
    }
    setStatus("");
    inputEl.value = data.text;
    submit();
  } catch {
    setStatus("I couldn't hear that. Please try again.");
  }
}

micBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  startRecording();
});
["pointerup", "pointerleave", "pointercancel"].forEach((evt) =>
  micBtn.addEventListener(evt, () => stopRecording()),
);

inputEl.focus();
