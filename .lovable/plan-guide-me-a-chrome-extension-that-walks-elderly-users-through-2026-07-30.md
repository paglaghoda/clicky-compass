# Guide Me — a Chrome extension that walks elderly users through any website

A sidebar assistant that listens to a request like "cancel my Amazon Prime subscription", looks at the page the user is actually on, and points at exactly what to click next with a big animated arrow and a highlight ring. It never clicks for them — the person stays in control the whole way.

## How it works for the user

1. Click the extension icon (or press the keyboard shortcut). A wide, high-contrast sidebar slides in on the right of the current page.
2. They type, or press the big microphone button and say what they want to do.
3. The assistant reads the page, replies in chat, and reads the step aloud in a slow, clear voice.
4. One step at a time: a large pulsing arrow points at the real button/link on the page, that element gets a thick highlight ring, and the rest of the page dims slightly.
5. When they click it and the page changes, the assistant re-reads the new page and shows the next step automatically. A step list in the sidebar shows progress ("Step 3 of 6").
6. Buttons for "Say that again", "I can't find it" (re-scans and re-points), "Go back a step", and "Stop".

Safety: guide-only. The extension never clicks, types, or submits anything. Before any irreversible step (cancel, delete, pay) the sidebar shows a plain-language warning card.

## What gets built

**1. The extension** (`extension/`, Manifest V3)
- `manifest.json` — `activeTab`, `scripting`, `storage`, `tabs`, side panel + action.
- Side panel UI (Chrome Side Panel API) with the chat, mic button, step list, and large-text senior-friendly styling (18–20px base, high contrast, huge tap targets).
- Content script: builds a compact "page map" (visible interactive elements — text, role, aria-label, position), and renders the overlay: arrow, highlight ring, dim layer, scroll-into-view. Re-runs on DOM mutations and navigation so the pointer stays glued to the right element.
- Background service worker: opens the panel, relays messages between panel and content script, calls the AI backend.

**2. Voice, both directions**
- Speech in: mic capture in the panel, encoded to WAV, sent to the backend, transcribed with Lovable AI speech-to-text, streamed back as text into the chat box.
- Speech out: every step is spoken via Lovable AI text-to-speech at a slowed rate, with a stop/replay control.

**3. The backend** (this Lovable app)
- `/api/public/guide` — receives the goal, the conversation, and the page map; asks Lovable AI which single element to point at next and what to say, returns `{ selectorHint, elementId, instruction, spokenText, stepNumber, totalSteps, warning }`. Streams the chat reply.
- `/api/public/transcribe` — audio in, text out.
- `/api/public/speak` — text in, audio out.
- CORS restricted to the extension origin; `LOVABLE_API_KEY` stays server-side only.

**4. Install page** (`/`)
- Replaces the placeholder home route with a short, large-type page: what it does, a Download button for the packaged ZIP, and four numbered install steps with the `chrome://extensions` instructions. No marketing site beyond this.

## Technical notes

- Element targeting: the content script assigns a stable `data-guide-id` to each candidate element and sends that id list to the model, so the model picks an id rather than inventing a CSS selector. Eliminates the usual "selector doesn't match" failure.
- Model: `openai/gpt-5.6-sol` through the Lovable AI Gateway, with a system prompt tuned for one-step-at-a-time, plain-language, no-jargon instructions.
- The page map is truncated and text-trimmed before sending; no page content is stored server-side.
- Packaging: ZIP built into `public/` with `nix run nixpkgs#zip`; download uses a fetch+blob click so it works inside the Lovable preview.
- Works on any site — nothing Amazon-specific is hardcoded.

## Out of scope for this version

Auto-clicking or form filling, saved history across sessions, accounts, and Firefox/Safari builds.
