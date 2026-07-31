# Sherpa Landing Page Plan

Rebuild the `/` landing page to position the product as **Sherpa**, a web browser for elderly users, instead of the previous "Guide Me" Chrome extension.

## Goals

- Rebrand headline, copy, and metadata from "Guide Me" to "Sherpa".
- Keep the focus on elderly users: large text, plain language, calm hierarchy, no clutter.
- Surface the five key capabilities provided by the user:
  1. Voice-first guided actions with big orange arrows.
  2. One-button page simplification (text size, contrast, quiet distractions).
  3. Dark-pattern and scam warnings in plain language.
  4. "Ask a family member" handoff with screenshot.
  5. On-device plain-language activity log.
- Update the download/install section to match the "browser" framing while reusing the existing download plumbing.

## Design Direction (user-confirmed)

- **Palette**: Warm Orange & Cream — cream background `#fbfaf7`, orange accent `#ff6a00`, dark navy text `#12203a`, muted slate `#4b5a72`.
- **Typography**: DM Serif Display for headings, Fira Sans for body.
- **Layout**: Hero grid — large hero block with headline, subheadline, and CTA, followed by a bento-style feature grid and a clear install section.

## Implementation

### 1. Design tokens in `src/styles.css`

- Add semantic brand tokens mapped to the chosen palette using `oklch`:
  - `--sherpa-cream` (background)
  - `--sherpa-navy` (foreground/headings)
  - `--sherpa-orange` (primary accent / CTA)
  - `--sherpa-slate` (muted text)
  - `--sherpa-soft-blue` (feature card borders)
- Register them in `@theme inline` so Tailwind utilities like `bg-sherpa-cream`, `text-sherpa-orange`, etc. are available.
- Add font tokens `--font-display` (DM Serif Display) and `--font-body` (Fira Sans).

### 2. Font loading in `src/routes/__root.tsx`

- Add Google Fonts `<link>` tags for DM Serif Display and Fira Sans in the root `head()`.
- Keep the existing meta and stylesheet links intact.

### 3. Rewrite `src/routes/index.tsx`

- Update route `head()` with Sherpa browser metadata:
  - Title: "Sherpa — The Browser That Guides You"
  - Description: senior-focused summary of voice-guided navigation.
  - Open Graph / Twitter tags matching the new title and description.
- Page structure:
  - **Hero**: eyebrow label, large headline (DM Serif Display), supportive subheadline, big orange "Download Sherpa" CTA.
  - **Trust line**: short sentence about staying in control.
  - **Feature grid**: 4–5 cards in a responsive grid covering the five capabilities above. Use the provided copy, trimmed for clarity.
  - **How to install**: 4 simple browser-focused steps (download installer, run it, optionally set as default, start browsing).
  - **Footer note**: compatibility and helper-address tip, updated for the browser.
- Replace all hardcoded hex classes with the new semantic Tailwind tokens.
- Keep the existing `fetch("/guide-me-extension.zip")` download handler; only update button copy and downloaded filename to `sherpa-browser.zip`.

### 4. Accessibility and senior-friendly details

- Maintain very large type sizes, generous line height, and high-contrast text.
- Keep cards with thick borders and rounded corners for clear touch/click targets.
- Avoid dense paragraphs; one idea per card.
- No auto-playing motion or distracting animations.

## Out of Scope

- No changes to the extension files in `/extension`.
- No backend API changes.
- No new routes.

## Verification

- Build passes without Tailwind / TypeScript errors.
- Landing page preview shows the Sherpa brand, large readable text, feature grid, and updated download section.
