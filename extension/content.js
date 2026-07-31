/* Sherpa — content script
   Builds a map of what is visible on the page and draws the big arrow + highlight. */

(() => {
  if (window.__guideMeLoaded) return;
  window.__guideMeLoaded = true;

  let idCounter = 0;
  let current = null; // { el, label }
  let layer = null;
  let rafId = null;

  const INTERACTIVE =
    'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [onclick], [tabindex]:not([tabindex="-1"])';

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return false;
    if (rect.bottom < -200 || rect.top > window.innerHeight + 800) return false;
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) < 0.05)
      return false;
    return true;
  }

  function describe(el) {
    const parts = [
      el.getAttribute("aria-label"),
      el.getAttribute("title"),
      el.getAttribute("placeholder"),
      el.getAttribute("value"),
      el.getAttribute("alt"),
      (el.innerText || el.textContent || "").trim(),
    ].filter(Boolean);
    const text = parts.join(" ").replace(/\s+/g, " ").trim();
    return text.slice(0, 90);
  }

  function scanPage() {
    idCounter = 0;
    const elements = [];
    const seen = new Set();

    document.querySelectorAll(INTERACTIVE).forEach((el) => {
      if (el.closest("[data-guideme-layer]")) return;
      if (!isVisible(el)) return;
      const text = describe(el);
      const tag = el.tagName.toLowerCase();
      const type = el.getAttribute("type") || "";
      if (!text && tag !== "input" && tag !== "select" && tag !== "textarea") return;

      const key = `${tag}|${type}|${text}|${Math.round(el.getBoundingClientRect().top)}`;
      if (seen.has(key)) return;
      seen.add(key);

      const id = `g${++idCounter}`;
      el.setAttribute("data-guide-id", id);
      elements.push({
        id,
        tag: type ? `${tag}:${type}` : tag,
        role: el.getAttribute("role") || undefined,
        text: text || `${tag} field`,
      });
    });

    // Some page text helps the model understand where the person is.
    const heading = (document.querySelector("h1")?.innerText || "").trim().slice(0, 120);

    return {
      url: location.href,
      title: (heading ? `${document.title} — ${heading}` : document.title).slice(0, 200),
      elements: elements.slice(0, 120),
    };
  }

  function ensureLayer() {
    if (layer && document.body.contains(layer)) return layer;
    layer = document.createElement("div");
    layer.setAttribute("data-guideme-layer", "true");
    layer.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;z-index:2147483640;pointer-events:none;";
    layer.innerHTML =
      '<div class="guideme-ring" hidden></div>' +
      '<div class="guideme-arrow" hidden><span>&#11015;</span></div>' +
      '<div class="guideme-label" hidden></div>';
    document.body.appendChild(layer);
    return layer;
  }

  function clearHighlight() {
    current = null;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    if (layer) layer.remove();
    layer = null;
  }

  function position() {
    if (!current || !document.body.contains(current.el)) {
      clearHighlight();
      return;
    }
    const l = ensureLayer();
    const ring = l.querySelector(".guideme-ring");
    const arrow = l.querySelector(".guideme-arrow");
    const label = l.querySelector(".guideme-label");
    const r = current.el.getBoundingClientRect();
    const top = r.top + window.scrollY;
    const left = r.left + window.scrollX;

    ring.hidden = false;
    ring.style.top = `${top - 6}px`;
    ring.style.left = `${left - 6}px`;
    ring.style.width = `${r.width + 12}px`;
    ring.style.height = `${r.height + 12}px`;

    arrow.hidden = false;
    arrow.style.top = `${top - 14}px`;
    arrow.style.left = `${left + r.width / 2}px`;

    if (current.label) {
      label.hidden = false;
      label.textContent = current.label;
      const below = r.top < 220;
      label.style.left = `${Math.min(Math.max(left + r.width / 2, 180), window.innerWidth - 180 + window.scrollX)}px`;
      label.style.top = below ? `${top + r.height + 26}px` : `${top - 110}px`;
    } else {
      label.hidden = true;
    }

    rafId = requestAnimationFrame(position);
  }

  function highlight(elementId, labelText) {
    clearHighlight();
    const el = document.querySelector(`[data-guide-id="${CSS.escape(elementId)}"]`);
    if (!el) return false;
    current = { el, label: labelText || "" };
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    ensureLayer();
    position();

    el.addEventListener(
      "click",
      () => {
        clearHighlight();
        chrome.runtime.sendMessage({ type: "step-clicked" }).catch(() => {});
      },
      { once: true, capture: true },
    );
    return true;
  }

  function isFaint(el) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const size = parseFloat(s.fontSize) || 16;
    const weak = /rgba?\(\s*(1[3-9]\d|2\d\d)\s*,\s*(1[3-9]\d|2\d\d)\s*,\s*(1[3-9]\d|2\d\d)/.test(s.color);
    return size < 14 || r.height < 26 || weak || Number(s.opacity) < 0.8;
  }

  function snapshotPage() {
    const scan = scanPage();
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((h) => (h.innerText || "").trim())
      .filter(Boolean)
      .slice(0, 12);

    const modal = document.querySelector(
      'dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]',
    );
    const modalText = modal ? (modal.innerText || "").trim().slice(0, 1200) : "";

    const elements = scan.elements.slice(0, 80).map((e) => {
      const el = document.querySelector(`[data-guide-id="${CSS.escape(e.id)}"]`);
      return { id: e.id, tag: e.tag, text: e.text, faint: el ? isFaint(el) : false };
    });

    return {
      url: location.href,
      title: document.title.slice(0, 200),
      headings,
      modalText,
      bodyText: (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 3000),
      elements,
    };
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "scan") {
      sendResponse(scanPage());
      return true;
    }
    if (msg?.type === "snapshot") {
      sendResponse(snapshotPage());
      return true;
    }

    if (msg?.type === "highlight") {
      sendResponse({ ok: highlight(msg.elementId, msg.label) });
      return true;
    }
    if (msg?.type === "clear") {
      clearHighlight();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });
})();
