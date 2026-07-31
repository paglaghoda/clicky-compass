# Simplify This Page + Dark Pattern & Scam Guard

Two new features for the Guide Me extension, both built on the existing side panel + content script.

## 5.2 Simplify This Page (P0)

A single large toggle at the top of the side panel: **"Make this page easy to read"**. One click transforms the current page; clicking again restores it exactly.

What the toggle does on the live page:
- Bigger text and roomier line spacing everywhere (scaled from each element's own size, so layout stays sane).
- Stronger contrast: near-black text on near-white surfaces, underlined links in a strong blue.
- Calms distractions: pauses and mutes autoplay video/audio, stops animations and flashing/blinking elements, hides sticky banners, cookie bars, chat widgets, newsletter pop-ups and overlay modals that block reading.
- Enlarges buttons and links to comfortable tap targets with clear borders, so they're easy to aim at.
- A small floating "Back to normal" chip stays on the page while simplified, so the user is never trapped.

Before/after demo moment: the change is applied with a short cross-fade so the difference is obvious on stage, and the toggle button in the panel clearly shows ON/OFF state.

Everything is reversible — it's a single stylesheet plus a small set of marked hidden elements, all removed on toggle off. It never edits the site's data or clicks anything.

## 5.3 Dark Pattern & Scam Guard (P1)

Automatic watching, with plain-language warnings.

- When a page loads (and when the user asks for guidance), the extension collects a light snapshot: page title, URL/domain, headings, button and link labels, and any modal text.
- The assistant reviews that snapshot for two things:
  1. **Manipulation** — guilt-trip retention copy, buried or de-emphasised cancel buttons, double-negative choices, fake countdowns, pre-ticked boxes.
  2. **Scam risk** — lookalike domains for banks/delivery/government, urgent payment or password demands, mismatched brand vs domain.
- Findings appear as a coloured warning card at the top of the side panel in simple wording, for example: "This page is trying to make it hard to say no. The real cancel button is the grey 'End membership' link — I'll point at it." Amber for manipulation, red for likely scam.
- Each warning offers one action: **"Show me the real button"** (highlights the genuine cancel/close control with the existing big arrow) or, for scams, **"Leave this page"** plus advice to never enter passwords or card details.
- The panel reads the warning aloud in the same warm, slow voice used for steps.
- Any warning can be dismissed, and dismissals are remembered per domain for the session so it doesn't nag.

## Technical notes

- `extension/simplify.js` + `extension/simplify.css`: injected stylesheet using `!important` rules under a `html.guideme-simple` class, plus a reversible pass that marks hidden distractions with `data-guideme-hidden`, pauses media, and disables animations. Messages `simplify-on` / `simplify-off` / `simplify-state` handled in the content script; state kept per tab in `chrome.storage.session`.
- Content script gains a `snapshot` message returning domain, title, headings, modal/dialog text and labelled controls (reusing the existing scan walker and `data-guide-id` tagging so the guard can hand an element id straight to `highlight`).
- New API route `src/routes/api/public/inspect.ts`: same CORS + `LOVABLE_API_KEY` pattern as `guide.ts`, model `openai/gpt-5.6-sol`, returns strict JSON `{ risk: "none" | "manipulation" | "scam", headline, explanation, realActionElementId?, advice }`.
- Side panel: new "Make this page easy to read" toggle button and a `#guard` warning card region in `sidepanel.html`/`.css`, wired in `sidepanel.js` with the existing thinking indicator and TTS path; auto-inspect runs on `page-changed`, debounced, results cached per URL.
- `manifest.json` adds `simplify.js`/`simplify.css` to the content script bundle; extension is re-zipped to `public/guide-me-extension.zip` and the install page copy mentions both features.
