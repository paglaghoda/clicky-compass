# Simpler panel + Voice, Ask Family, Activity Log

The panel gets rebuilt around one idea: **"Tell me what you want to do."** Everything else hides until it's needed.

## Simpler interface

Today the panel stacks a settings row, an "easy to read" toggle, a guard card, a progress bar, a chat area and three control buttons — all visible at once. New layout, top to bottom:

1. Small header: name + one gear (settings, family contact, activity log all live behind it).
2. One big question: "What would you like to do?" with a large text box and a single, very large **Talk to me** microphone button under it. Typing is still there but visually secondary.
3. Nothing else on the first screen except three tappable example goals.

Once a goal is running, the first screen is replaced by the guidance view: the current step in a large card, the progress line, and at most three actions — **Say it again**, **I can't find it**, **Stop**. The "Make this page easy to read" toggle moves into a slim single row at the very bottom so it's reachable but never competes with the step. Scam/dark-pattern warnings stay as the one thing allowed to appear above the step, since they're urgent.

Fewer borders, one accent colour, more whitespace, bigger touch targets.

## 5.5 Voice input

Voice already works but is a small half-width button. It becomes the primary way in: a large circular mic on the ask screen, press-and-hold or tap-to-toggle, with a clear "Listening…" state and a live wave/pulse so the user knows it's hearing them. After the recording it shows what it heard as text before sending, so a mis-hear can be corrected with one tap. During guidance the mic stays available as a compact button so the user can ask follow-ups by voice.

## 5.6 Ask a Family Member

One button, visible on the guidance screen and in the menu: **Ask a family member for help**.

Pressing it:
- Takes a picture of the current tab.
- Sends the page context plus what the user was trying to do to the assistant, which writes a short, plain message in the user's voice: what they're trying to do, what page they're on, where they got stuck.
- Shows the drafted message and the picture in a simple preview the user can accept.
- Buttons: **Copy message**, **WhatsApp**, **Text message**, **Email** — each opens the relevant app pre-filled. The screenshot is copied to the clipboard and also downloadable, with a one-line hint to attach it.

No accounts, nothing sent anywhere automatically.

## 5.7 Plain-language activity log

Kept on the device only. Every completed goal, simplify toggle, and scam warning writes one friendly line: "You cancelled Amazon Prime — Tuesday afternoon." Opened from the menu as a clean dated list, newest first, with a **Clear history** button and a **Share with family** button that copies the last few lines as text. No URLs, no jargon.

## Technical notes

- `sidepanel.html` / `.css` rewritten around two views (`#ask` and `#guiding`) toggled by a `data-view` attribute on `<body>`; settings, family and history become slide-over sheets rather than always-on sections. Single accent token, one card style.
- Mic: existing `MediaRecorder` + `/api/public/transcribe` path reused; adds hold-and-tap handling, a `.listening` state with a CSS pulse, and a confirm-before-send transcript row.
- Family: `chrome.tabs.captureVisibleTab` (needs no new permission beyond existing `activeTab`/`<all_urls>`) for the image; new route `src/routes/api/public/handoff.ts` mirroring `guide.ts` (CORS, `LOVABLE_API_KEY`, `openai/gpt-5.6-sol`, JSON out `{ message }`) drafts the text from goal + page snapshot + last step. Share links built as `https://wa.me/?text=`, `sms:?&body=`, `mailto:?subject=&body=`; image written to the clipboard via `ClipboardItem` with a download fallback.
- Log: `chrome.storage.local` key `activity`, capped at 50 entries `{ ts, text, kind }`, appended from the existing done/simplify/guard code paths; rendered in the history sheet with `Intl.DateTimeFormat` friendly dates.
- Extension re-zipped to `public/guide-me-extension.zip`; install page copy updated for the new features.
