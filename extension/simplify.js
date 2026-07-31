/* Sherpa — "Make this page easy to read"
   Fully reversible: we only add a class, some inline font sizes we remember,
   and data-guideme-hidden markers. Toggling off removes all of them. */

(() => {
  if (window.__guideMeSimplifyLoaded) return;
  window.__guideMeSimplifyLoaded = true;

  let on = false;
  const touched = []; // { el, fontSize, lineHeight }
  const hidden = [];
  const pausedMedia = [];

  const DISTRACTION_HINT =
    /(cookie|consent|gdpr|newsletter|subscribe-?(modal|popup)|promo|advert|advertis|banner-?ad|sponsor|popup|pop-up|modal-?overlay|interstitial|chat-?(widget|bot|launcher)|live-?chat|intercom|drift|social-?share|sticky-?(bar|footer|header)|floating|toast|notification-?bar|carousel|marquee|ticker|recommend|related-?(posts|articles)|trending|widget-?sidebar)/i;

  const KEEP = /(main|content|article|checkout|cancel|account|form|search|nav-primary)/i;

  function attrBlob(el) {
    return `${el.id || ""} ${typeof el.className === "string" ? el.className : ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("data-testid") || ""}`;
  }

  function hide(el) {
    if (!el || el.hasAttribute("data-guideme-hidden")) return;
    if (el === document.body || el === document.documentElement) return;
    if (el.closest("[data-guideme-layer]") || el.id === "guideme-restore") return;
    el.setAttribute("data-guideme-hidden", "true");
    hidden.push(el);
  }

  function calmDistractions() {
    // pause and mute anything playing
    document.querySelectorAll("video, audio").forEach((m) => {
      try {
        if (!m.paused) {
          m.pause();
          pausedMedia.push(m);
        }
        m.muted = true;
        m.removeAttribute("autoplay");
      } catch {
        /* ignore */
      }
    });

    document.querySelectorAll("iframe").forEach((f) => {
      const src = f.getAttribute("src") || "";
      if (/ads?\.|doubleclick|googlesyndication|adservice|taboola|outbrain|youtube|vimeo|player/i.test(src)) {
        hide(f);
      }
    });

    document.querySelectorAll("ins, marquee, blink, [id*='ad-'], [class*='advert']").forEach(hide);

    // sticky / fixed clutter and named distractions
    const candidates = document.querySelectorAll("div, section, aside, header, footer, dialog, form");
    let checked = 0;
    for (const el of candidates) {
      if (checked++ > 2500) break;
      if (el.hasAttribute("data-guideme-hidden")) continue;
      const blob = attrBlob(el);
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isOverlay =
        (style.position === "fixed" || style.position === "sticky") &&
        rect.height > 40 &&
        Number(style.zIndex || 0) >= 0;

      if (el.tagName === "ASIDE" && !KEEP.test(blob) && rect.width < window.innerWidth * 0.5) {
        hide(el);
        continue;
      }

      if (DISTRACTION_HINT.test(blob) && !KEEP.test(blob)) {
        // don't nuke a wrapper that holds most of the page
        if (rect.height < window.innerHeight * 0.9 || isOverlay) hide(el);
        continue;
      }

      if (isOverlay && (DISTRACTION_HINT.test(blob) || rect.height > window.innerHeight * 0.75)) {
        hide(el);
      }
    }

    // full-screen dimmers behind pop-ups
    document.querySelectorAll("body > div").forEach((el) => {
      if (el.hasAttribute("data-guideme-hidden")) return;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (
        s.position === "fixed" &&
        r.width >= window.innerWidth * 0.95 &&
        r.height >= window.innerHeight * 0.95 &&
        el.innerText.trim().length < 12
      ) {
        hide(el);
      }
    });

    document.documentElement.style.setProperty("overflow", "auto", "important");
    document.body.style.setProperty("overflow", "visible", "important");
  }

  function growText() {
    const nodes = document.querySelectorAll(
      "p, li, span, a, h1, h2, h3, h4, h5, h6, td, th, dd, dt, label, button, input, select, textarea, figcaption, small, strong, em, div",
    );
    let count = 0;
    for (const el of nodes) {
      if (count++ > 4000) break;
      if (el.closest("[data-guideme-layer]") || el.id === "guideme-restore") continue;
      if (el.hasAttribute("data-guideme-hidden")) continue;
      const s = getComputedStyle(el);
      const base = parseFloat(s.fontSize) || 16;
      if (el.tagName === "DIV") {
        // only grow divs that directly hold their own text
        const direct = Array.from(el.childNodes).some(
          (n) => n.nodeType === 3 && n.textContent.trim().length > 1,
        );
        if (!direct) continue;
      }
      const target = Math.max(Math.round(base * 1.35), 19);
      touched.push({
        el,
        fontSize: el.style.getPropertyValue("font-size"),
        fontPriority: el.style.getPropertyPriority("font-size"),
        lineHeight: el.style.getPropertyValue("line-height"),
        linePriority: el.style.getPropertyPriority("line-height"),
      });
      el.style.setProperty("font-size", `${target}px`, "important");
      el.style.setProperty("line-height", "1.7", "important");
    }

    // make plain links tappable too
    document.querySelectorAll("a").forEach((a) => {
      const r = a.getBoundingClientRect();
      if (r.height > 0 && r.height < 44 && (a.innerText || "").trim().length > 1) {
        a.classList.add("guideme-big-link");
      }
    });
  }

  function addRestoreChip() {
    if (document.getElementById("guideme-restore")) return;
    const btn = document.createElement("button");
    btn.id = "guideme-restore";
    btn.type = "button";
    btn.textContent = "\u21A9 Back to normal page";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      simplifyOff();
      chrome.runtime.sendMessage({ type: "simplify-changed", on: false }).catch(() => {});
    });
    document.documentElement.appendChild(btn);
  }

  function simplifyOn() {
    if (on) return true;
    on = true;
    const root = document.documentElement;
    root.classList.add("guideme-fade");
    root.style.opacity = "0.35";
    window.setTimeout(() => {
      calmDistractions();
      growText();
      root.classList.add("guideme-simple");
      addRestoreChip();
      root.style.opacity = "1";
      window.setTimeout(() => root.classList.remove("guideme-fade"), 300);
    }, 180);
    return true;
  }

  function simplifyOff() {
    if (!on) return true;
    on = false;
    const root = document.documentElement;
    root.classList.remove("guideme-simple");

    while (touched.length) {
      const t = touched.pop();
      if (t.fontSize) t.el.style.setProperty("font-size", t.fontSize, t.fontPriority);
      else t.el.style.removeProperty("font-size");
      if (t.lineHeight) t.el.style.setProperty("line-height", t.lineHeight, t.linePriority);
      else t.el.style.removeProperty("line-height");
    }
    while (hidden.length) hidden.pop().removeAttribute("data-guideme-hidden");
    document.querySelectorAll(".guideme-big-link").forEach((a) => a.classList.remove("guideme-big-link"));
    pausedMedia.length = 0;

    document.documentElement.style.removeProperty("overflow");
    document.body.style.removeProperty("overflow");
    document.getElementById("guideme-restore")?.remove();
    return true;
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === "simplify-on") {
      sendResponse({ ok: simplifyOn(), on: true });
      return true;
    }
    if (msg?.type === "simplify-off") {
      sendResponse({ ok: simplifyOff(), on: false });
      return true;
    }
    if (msg?.type === "simplify-toggle") {
      const next = !on;
      next ? simplifyOn() : simplifyOff();
      sendResponse({ ok: true, on: next });
      return true;
    }
    if (msg?.type === "simplify-state") {
      sendResponse({ on });
      return true;
    }
    return false;
  });
})();
