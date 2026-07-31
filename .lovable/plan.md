# Check first, then guide — plus a mic that actually works

Three fixes: stop the assistant guessing on sites where the task isn't possible, give it real facts before it starts, and make the microphone work end to end with Cartesia voices.

## 1. Look it up before guiding

Right now the assistant only sees the buttons on the current screen, so on a site like JioHotstar — which has no password-change screen at all — it keeps hunting through menus hoping something turns up.

New behaviour when a goal is given:

1. Sherpa says "Let me check how this works on this site…" (the thinking loader, with that wording).
2. It searches the web for the site's own help page for that exact task — e.g. "JioHotstar change password help".
3. It reads what it finds and decides one of three things:
   - **Yes, here's the path** — it now knows the real route ("Profile → Account → Manage devices") and guides along it instead of trial-and-error.
   - **Not possible here** — it says so plainly and stops: "JioHotstar doesn't let you change your password on the website. Your login is your phone number and a code sent by text, so there is no password to change." Offers "Ask a family member" and "Try something else".
   - **Possible, but somewhere else** — "You can only do this in the JioHotstar app on your phone" or "This is done on the Amazon website, not here" — with an offer to open the right page.
4. The route it learned is then handed to every following step, so the arrow follows a known path rather than fresh guesswork each time.

The result is cached per site + task so repeat asks are instant.

## 2. Honest steps instead of endless hunting

Even with research, the step-by-step guide gets two guardrails:

- If three steps go by with no real progress, it stops and says "I can't find a way to do this on this site" rather than looping through menus.
- It is told explicitly that "no such setting exists here" is a correct, useful answer — not a failure to work around.

## 3. The microphone

The button currently fails at the permission stage: Chrome cannot show a microphone prompt inside a side panel, so the request is refused instantly and you see "I need permission to use the microphone."

The fix:

- A one-time permission page. First time you press the mic, Sherpa opens a small tab that says "Sherpa needs to hear you" with one big **Allow microphone** button. Chrome shows the real prompt there, you say yes once, the tab closes, and the mic works from then on.
- Clearer states in the panel: **Hold and speak → Listening… → Understanding what you said…**, and a plain message if permission was declined, with a "Try again" link back to the permission page.
- Tap-to-start / tap-to-stop as well as press-and-hold, since holding steadily is hard for some hands.

## 4. Cartesia voice

Both directions move to Cartesia with your key:

- **Hearing you** — Cartesia Ink-Whisper transcribes the recording.
- **Reading steps aloud** — Cartesia Sonic speaks each instruction, at a slightly slowed pace and warm voice. A voice picker sits in Settings so you can choose one that's easy to hear.

If Cartesia is unreachable, it quietly falls back to the current voice rather than going silent.

## What I'll need from you

- **Firecrawl** connection (for the web lookup) — I'll open the connect card.
- **Cartesia API key** — I'll open the secure secret form.

## Technical notes

- New `src/routes/api/public/research.ts`: Firecrawl `search` (top 3 official help/support results, scraped to markdown) → `openai/gpt-5.6-sol` with `reasoning_effort: "none"` → JSON `{ feasible: "yes"|"no"|"elsewhere", plainAnswer, route: string[], sourceUrl }`. In-memory cache keyed by `hostname + normalised goal`.
- `guide.ts`: accepts an optional `research` object and injects the known route plus a "saying it isn't possible is a valid answer" rule into the system prompt; adds a `noProgress` counter passed from the panel and a `stuck: true` outcome.
- `sidepanel.js`: calls `/api/public/research` before the first `nextStep`, renders the three outcomes, stores `research` in the session and passes it on every subsequent step.
- Mic: new `extension/permission.html` + `permission.js` opened via `chrome.tabs.create` when `getUserMedia` rejects with `NotAllowedError`; `"permissions": [... "audioCapture"]` added to the manifest; existing WAV encoder kept; pointer handlers extended with tap-toggle.
- New `src/routes/api/public/transcribe.ts` path switches to Cartesia STT (`/stt`, `model: ink-whisper`) with `CARTESIA_API_KEY`; `speak.ts` switches to Cartesia `/tts/bytes` (`sonic-2`, mp3) with the Lovable TTS path kept as fallback on non-2xx.
- Extension re-zipped to `public/guide-me-extension.zip`.
