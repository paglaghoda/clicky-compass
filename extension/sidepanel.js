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
const thinkingEl = document.getElementById("thinking");

let apiBase = DEFAULT_API_BASE;
let goal = "";
let history = [];
let lastSpoken = "";
let busy = false;
let audioEl = null;

function showThinking() {
  if (thinkingEl) {
    thinkingEl.hidden = false;
    chatEl.scrollTop = chatEl.scrollHeight;
  }
}

function hideThinking() {
  if (thinkingEl) thinkingEl.hidden = true;
}

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
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js", "simplify.js"],
    });
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["content.css", "simplify.css"],
    });

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
  micBtn.disabled = true;
  showThinking();
  setStatus("Looking at this page...");

  try {
    let page;
    try {
      page = await sendToPage({ type: "scan" });
    } catch {
      hideThinking();
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
      hideThinking();
      setStatus("");
      addBubble(data.error || "Something went wrong. Please try again.", "assistant");
      return;
    }

    hideThinking();
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
    micBtn.disabled = false;
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
  hideThinking();
  if (audioEl) audioEl.pause();
  await sendToPage({ type: "clear" }).catch(() => {});
  addBubble("Alright, we've stopped. Tell me any time if you'd like help with something else.", "assistant");
});

/* the page moved on — take another look */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "simplify-changed") {
    setSimplifyButton(Boolean(msg.on));
    return;
  }
  if (msg?.type === "page-changed") {
    setSimplifyButton(false);
    refreshSimplifyState();
    scheduleGuard(1400);
  }
  if (!goal) return;
  if (msg?.type === "step-clicked" || msg?.type === "page-changed") {
    setTimeout(() => nextStep(), msg.type === "page-changed" ? 900 : 1200);
  }
});

/* ---------- Simplify this page ---------- */

const simplifyBtn = document.getElementById("simplify-btn");
const simplifyText = document.getElementById("simplify-text");

function setSimplifyButton(isOn) {
  simplifyBtn.setAttribute("aria-pressed", isOn ? "true" : "false");
  simplifyText.textContent = isOn ? "Back to the normal page" : "Make this page easy to read";
}

async function refreshSimplifyState() {
  try {
    const state = await sendToPage({ type: "simplify-state" });
    setSimplifyButton(Boolean(state?.on));
  } catch {
    setSimplifyButton(false);
  }
}

simplifyBtn.addEventListener("click", async () => {
  simplifyBtn.disabled = true;
  try {
    const res = await sendToPage({ type: "simplify-toggle" });
    setSimplifyButton(Boolean(res?.on));
    setStatus(res?.on ? "This page is now easier to read." : "Back to the normal page.");
  } catch {
    setStatus("I can't change this kind of page. Please open a normal website.");
  } finally {
    simplifyBtn.disabled = false;
  }
});

/* ---------- Dark pattern & scam guard ---------- */

const guardEl = document.getElementById("guard");
const guardHeadline = document.getElementById("guard-headline");
const guardExplanation = document.getElementById("guard-explanation");
const guardAdvice = document.getElementById("guard-advice");
const guardAction = document.getElementById("guard-action");
const guardDismiss = document.getElementById("guard-dismiss");

let guardTimer = null;
let guardChecking = false;
let lastGuardUrl = "";
const dismissedHosts = new Set();
let guardTarget = null;

function hideGuard() {
  guardEl.hidden = true;
  guardEl.classList.remove("scam");
  guardAction.hidden = true;
  guardTarget = null;
}

function showGuard(result, url) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    /* ignore */
  }
  if (dismissedHosts.has(`${host}|${result.headline}`)) return;

  guardEl.hidden = false;
  guardEl.classList.toggle("scam", result.risk === "scam");
  guardHeadline.textContent = `\u26A0 ${result.headline}`;
  guardExplanation.textContent = result.explanation || "";
  guardAdvice.textContent = result.advice || "";
  guardEl.dataset.host = host;

  if (result.risk === "scam") {
    guardTarget = null;
    guardAction.hidden = false;
    guardAction.textContent = "Leave this page";
  } else if (result.realActionElementId) {
    guardTarget = { id: result.realActionElementId, label: result.realActionLabel || result.headline };
    guardAction.hidden = false;
    guardAction.textContent = "Show me the real button";
  } else {
    guardTarget = null;
    guardAction.hidden = true;
  }

  speak(
    `${result.headline} ${result.explanation || ""} ${result.advice || ""}`.replace(/\s+/g, " ").trim(),
  );
}

guardAction.addEventListener("click", async () => {
  if (guardTarget) {
    const res = await sendToPage({
      type: "highlight",
      elementId: guardTarget.id,
      label: guardTarget.label,
    }).catch(() => null);
    if (!res?.ok) setStatus("I couldn't point at it — it may have moved.");
    return;
  }
  const tab = await activeTab();
  if (tab?.id) chrome.tabs.update(tab.id, { url: "https://www.google.com" }).catch(() => {});
  hideGuard();
});

guardDismiss.addEventListener("click", () => {
  const host = guardEl.dataset.host || "";
  dismissedHosts.add(`${host}|${guardHeadline.textContent.replace(/^\u26A0\s*/, "")}`);
  hideGuard();
});

async function runGuard() {
  if (guardChecking) return;
  guardChecking = true;
  try {
    const page = await sendToPage({ type: "snapshot" }).catch(() => null);
    if (!page?.url || page.url === lastGuardUrl) return;
    lastGuardUrl = page.url;
    if (!/^https?:/i.test(page.url)) return;

    const res = await fetch(`${apiBase}/api/public/inspect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page }),
    });
    if (!res.ok) return;
    const result = await res.json().catch(() => null);
    if (!result || result.risk === "none" || !result.headline) {
      hideGuard();
      return;
    }
    showGuard(result, page.url);
  } catch {
    /* the guard is a bonus; never block the user */
  } finally {
    guardChecking = false;
  }
}

function scheduleGuard(delay = 1200) {
  if (guardTimer) clearTimeout(guardTimer);
  guardTimer = setTimeout(runGuard, delay);
}

refreshSimplifyState();
scheduleGuard(1500);



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

  showThinking();
  setStatus("Understanding what you said...");
  try {
    const form = new FormData();
    form.append("audio", blob, "recording.wav");
    const res = await fetch(`${apiBase}/api/public/transcribe`, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.text) {
      hideThinking();
      setStatus(data.error || "I couldn't understand that. Please try again.");
      return;
    }
    hideThinking();
    setStatus("");
    inputEl.value = data.text;
    submit();
  } catch {
    hideThinking();
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
