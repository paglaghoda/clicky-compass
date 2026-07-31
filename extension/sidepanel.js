/* Guide Me — side panel */

const DEFAULT_API_BASE = "https://project--3b888ca9-b53a-4718-9cfe-5bc30531c13a-dev.lovable.app";

const body = document.body;
const statusEl = document.getElementById("status");
const stepTextEl = document.getElementById("step-text");
const stepWarnEl = document.getElementById("step-warning");
const stepLabel = document.getElementById("step-label");
const progressFill = document.getElementById("progress-fill");
const thinkingEl = document.getElementById("thinking");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const micSmall = document.getElementById("mic-small");
const micHint = document.getElementById("mic-hint");
const heardEl = document.getElementById("heard");
const heardText = document.getElementById("heard-text");

let apiBase = DEFAULT_API_BASE;
let goal = "";
let history = [];
let lastSpoken = "";
let lastStep = "";
let busy = false;
let audioEl = null;
let research = null;
let noProgress = 0;
let lastSeenUrl = "";


function setView(view) {
  body.dataset.view = view;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function showThinking() {
  thinkingEl.hidden = false;
}

function hideThinking() {
  thinkingEl.hidden = true;
}

function setProgress(step, total) {
  if (!total || total < 1) total = 1;
  stepLabel.textContent = `Step ${Math.min(step, total)} of ${total}`;
  progressFill.style.width = `${Math.round((Math.min(step, total) / total) * 100)}%`;
}

function showStep(text, warning) {
  lastStep = text;
  stepTextEl.textContent = text;
  stepWarnEl.hidden = !warning;
  stepWarnEl.textContent = warning ? `\u26A0 ${warning}` : "";
}

/* ---------- settings ---------- */

chrome.storage.local.get(["apiBase"]).then(({ apiBase: saved }) => {
  apiBase = saved || DEFAULT_API_BASE;
});

/* ---------- activity log ---------- */

async function logActivity(text) {
  if (!text) return;
  const { activity = [] } = await chrome.storage.local.get(["activity"]);
  activity.unshift({ ts: Date.now(), text });
  await chrome.storage.local.set({ activity: activity.slice(0, 50) });
}

function friendlyDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today at ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })} at ${time}`;
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
    /* voice is a bonus */
  }
}

/* ---------- the guiding loop ---------- */

async function nextStep(userText) {
  if (busy) return;
  busy = true;
  setView("guiding");
  showThinking();
  setStatus("Looking at this page...");

  try {
    let page;
    try {
      page = await sendToPage({ type: "scan" });
    } catch {
      hideThinking();
      setStatus("");
      showStep(
        "I can't read this page. Chrome doesn't let me help here — please open a normal website first.",
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
    hideThinking();
    setStatus("");

    if (!res.ok) {
      showStep(data.error || "Something went wrong. Please try again.");
      return;
    }

    history.push({ role: "assistant", content: data.instruction });
    showStep(data.instruction, data.warning);
    setProgress(data.stepNumber, data.totalSteps);

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
      await logActivity(`You finished: ${goal}`);
      goal = "";
      await sendToPage({ type: "clear" }).catch(() => {});
      setTimeout(() => setView("ask"), 6000);
    }

    speak(data.spokenText || data.instruction);
  } finally {
    busy = false;
  }
}

async function startGoal(text) {
  goal = text;
  history = [];
  if (inputEl) inputEl.value = "";
  heardEl.hidden = true;
  await logActivity(`You asked for help to: ${text}`);
  await nextStep(`I want to: ${text}`);
}

sendBtn.addEventListener("click", () => {
  const text = inputEl.value.trim();
  if (text) startGoal(text);
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendBtn.click();
  }
});

document.querySelectorAll(".example").forEach((btn) =>
  btn.addEventListener("click", () => startGoal(btn.textContent.trim())),
);

document.getElementById("heard-go").addEventListener("click", () => {
  const text = heardText.textContent.trim();
  heardEl.hidden = true;
  if (!text) return;
  if (goal) nextStep(text);
  else startGoal(text);
});

document.getElementById("heard-redo").addEventListener("click", () => {
  heardEl.hidden = true;
  setStatus("");
});

document.getElementById("repeat-btn").addEventListener("click", () => speak(lastSpoken || lastStep));
document.getElementById("find-btn").addEventListener("click", () => {
  if (goal) nextStep("I cannot find it on the page. Please describe where it is again.");
});
document.getElementById("stop-btn").addEventListener("click", async () => {
  goal = "";
  history = [];
  hideThinking();
  if (audioEl) audioEl.pause();
  await sendToPage({ type: "clear" }).catch(() => {});
  setView("ask");
  setStatus("Stopped. Tell me any time if you'd like help with something else.");
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
    if (res?.on) logActivity("You made a page easier to read");
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

  logActivity(`We warned you about ${host || "a page"}: ${result.headline}`);
  speak(`${result.headline} ${result.explanation || ""} ${result.advice || ""}`.replace(/\s+/g, " ").trim());
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
    /* the guard is a bonus */
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

function setListening(on) {
  micBtn.classList.toggle("listening", on);
  micSmall.classList.toggle("listening", on);
  micHint.textContent = on
    ? "Listening... let go, or tap again, when you're done"
    : "Hold the button — or tap it — and say it out loud";
}

function askForMicPermission() {
  setStatus("Please tap “Allow” on the page I just opened, then try the microphone again.");
  micHint.textContent = "I need your permission to use the microphone.";
  chrome.tabs.create({ url: chrome.runtime.getURL("permission.html") });
}

async function startRecording() {
  if (recording) return false;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    askForMicPermission();
    return false;
  }
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  source.connect(node);
  node.connect(ctx.destination);
  recording = { stream, ctx, source, node, chunks };
  setListening(true);
  setStatus("I'm listening.");
  return true;
}

async function stopRecording() {
  if (!recording) return;
  const { stream, ctx, source, node, chunks } = recording;
  recording = null;
  setListening(false);
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
  showThinking();
  try {
    const form = new FormData();
    form.append("audio", blob, "recording.wav");
    const res = await fetch(`${apiBase}/api/public/transcribe`, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    hideThinking();
    if (!res.ok || !data.text) {
      setStatus(data.error || "I couldn't understand that. Please try again.");
      return;
    }
    setStatus("");
    if (body.dataset.view === "guiding") {
      nextStep(data.text);
      return;
    }
    heardText.textContent = data.text;
    heardEl.hidden = false;
  } catch {
    hideThinking();
    setStatus("I couldn't hear that. Please try again.");
  }
}

/* Hold to talk, or simply tap once to start and tap again to stop —
   whichever a shaky hand manages first. */
[micBtn, micSmall].forEach((btn) => {
  let pressedAt = 0;
  let startedByThisPress = false;

  btn.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    if (recording) {
      // tap-to-stop
      await stopRecording();
      startedByThisPress = false;
      pressedAt = 0;
      return;
    }
    pressedAt = Date.now();
    startedByThisPress = await startRecording();
  });

  const release = () => {
    if (!recording || !startedByThisPress) return;
    // A quick tap leaves it listening; a real hold stops on release.
    if (Date.now() - pressedAt < 500) return;
    stopRecording();
    startedByThisPress = false;
  };

  ["pointerup", "pointercancel"].forEach((evt) => btn.addEventListener(evt, release));
});


/* ---------- sheets: menu, settings, history, family ---------- */

const sheet = document.getElementById("sheet");
const sheetTitle = document.getElementById("sheet-title");
const sheetBody = document.getElementById("sheet-body");

function openSheet(title, build) {
  sheetTitle.textContent = title;
  sheetBody.replaceChildren();
  build(sheetBody);
  sheet.hidden = false;
}

function closeSheet() {
  sheet.hidden = true;
}

document.getElementById("sheet-close").addEventListener("click", closeSheet);
sheet.addEventListener("click", (e) => {
  if (e.target === sheet) closeSheet();
});

function menuButton(label, onClick) {
  const b = document.createElement("button");
  b.className = "menu-item";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

document.getElementById("menu-btn").addEventListener("click", () => {
  openSheet("Menu", (el) => {
    el.append(
      menuButton("\uD83D\uDC64  Ask a family member for help", openFamilySheet),
      menuButton("\uD83D\uDCD3  What I've done recently", openHistorySheet),
      menuButton("\u2699\uFE0F  Settings", openSettingsSheet),
    );
  });
});

document.getElementById("family-btn").addEventListener("click", openFamilySheet);

function openSettingsSheet() {
  openSheet("Settings", (el) => {
    const label = document.createElement("label");
    label.textContent = "Helper address";
    const input = document.createElement("input");
    input.type = "url";
    input.spellcheck = false;
    input.value = apiBase;
    const save = document.createElement("button");
    save.className = "primary-btn wide";
    save.textContent = "Save";
    save.addEventListener("click", () => {
      apiBase = input.value.trim().replace(/\/$/, "") || DEFAULT_API_BASE;
      chrome.storage.local.set({ apiBase });
      closeSheet();
      setStatus("Saved.");
    });
    el.append(label, input, save);
  });
}

async function openHistorySheet() {
  const { activity = [] } = await chrome.storage.local.get(["activity"]);
  openSheet("What I've done recently", (el) => {
    if (!activity.length) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "Nothing yet. Once I help you with something, it will appear here.";
      el.append(p);
      return;
    }
    activity.forEach((item) => {
      const wrap = document.createElement("div");
      wrap.className = "log-item";
      const time = document.createElement("time");
      time.textContent = friendlyDate(item.ts);
      const p = document.createElement("p");
      p.textContent = item.text;
      wrap.append(time, p);
      el.append(wrap);
    });

    const share = document.createElement("button");
    share.className = "primary-btn wide";
    share.textContent = "Copy this list to share";
    share.addEventListener("click", async () => {
      const text = activity
        .slice(0, 10)
        .map((i) => `${friendlyDate(i.ts)} — ${i.text}`)
        .join("\n");
      await navigator.clipboard.writeText(text).catch(() => {});
      share.textContent = "Copied";
    });

    const clear = document.createElement("button");
    clear.className = "quiet-btn";
    clear.style.width = "100%";
    clear.style.marginTop = "10px";
    clear.textContent = "Clear this history";
    clear.addEventListener("click", async () => {
      await chrome.storage.local.set({ activity: [] });
      closeSheet();
      setStatus("History cleared.");
    });

    el.append(share, clear);
  });
}

/* ---------- Ask a family member ---------- */

async function openFamilySheet() {
  openSheet("Ask a family member", (el) => {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Writing a message about this page...";
    el.append(p);
  });

  let shot = "";
  try {
    shot = await chrome.tabs.captureVisibleTab(undefined, { format: "png" });
  } catch {
    shot = "";
  }

  const page = await sendToPage({ type: "snapshot" }).catch(() => null);
  let message = "";
  try {
    const res = await fetch(`${apiBase}/api/public/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, lastStep, page }),
    });
    const data = await res.json().catch(() => ({}));
    message = data.message || "";
  } catch {
    /* fall through to a simple message */
  }

  if (!message) {
    message = `Hello, I could use a little help. I'm trying to ${goal || "do something"} on ${page?.title || "a website"} and I'm not sure what to press next. I've attached a picture of my screen.`;
  }

  openSheet("Ask a family member", (el) => {
    const label = document.createElement("label");
    label.textContent = "This is the message. You can change it.";
    const area = document.createElement("textarea");
    area.className = "draft";
    area.value = message;

    const grid = document.createElement("div");
    grid.className = "share-grid";

    const text = () => encodeURIComponent(area.value);
    const link = (labelText, href) => {
      const b = document.createElement("button");
      b.className = "quiet-btn";
      b.textContent = labelText;
      b.addEventListener("click", () => chrome.tabs.create({ url: href() }));
      return b;
    };

    const copy = document.createElement("button");
    copy.className = "primary-btn";
    copy.textContent = "Copy message";
    copy.addEventListener("click", async () => {
      await navigator.clipboard.writeText(area.value).catch(() => {});
      copy.textContent = "Copied";
      logActivity("You copied a message asking your family for help");
    });

    grid.append(
      copy,
      link("WhatsApp", () => `https://wa.me/?text=${text()}`),
      link("Text message", () => `sms:?&body=${text()}`),
      link("Email", () => `mailto:?subject=${encodeURIComponent("Can you help me?")}&body=${text()}`),
    );

    el.append(label, area, grid);

    if (shot) {
      const img = document.createElement("img");
      img.className = "shot";
      img.src = shot;
      img.alt = "Picture of your screen";
      const hint = document.createElement("p");
      hint.className = "hint";
      hint.textContent = "Attach this picture so they can see your screen.";
      const save = document.createElement("button");
      save.className = "quiet-btn";
      save.style.width = "100%";
      save.textContent = "Save the picture";
      save.addEventListener("click", () => {
        const a = document.createElement("a");
        a.href = shot;
        a.download = "my-screen.png";
        a.click();
      });
      el.append(img, hint, save);
    }
  });
}
