# Add a "thinking" loader to Guide Me

## Problem
Users sometimes can't tell whether Guide Me is working on the next step or has got stuck. Right now the only feedback is small status text ("Looking at this page..." / "Understanding what you said..."). We need a clear, senior-friendly visual indicator that the assistant is actively thinking.

## Solution
Add an animated "thinking" loader inside the side panel that appears whenever Guide Me is busy, and disappears as soon as the next instruction is ready.

## What will change

### 1. Side panel markup (`extension/sidepanel.html`)
- Add a dedicated "thinking" bubble/row in the chat area, hidden by default.
- Use a simple CSS-animated dot pattern or spinner plus a plain-language label like "Thinking..." so it is easy to see.

### 2. Side panel styles (`extension/sidepanel.css`)
- Style the thinking indicator with the existing orange accent, large size, and high contrast.
- Add a gentle, non-dizzying CSS animation (e.g. three dots that fade in sequence or a slow spinner).
- Ensure it is visually distinct from user and assistant message bubbles.

### 3. Side panel logic (`extension/sidepanel.js`)
- Show the thinking indicator at the start of `nextStep()` and `stopRecording()` / transcription, and hide it when the response is rendered or an error occurs.
- Keep the existing status text as a fallback/accessibility label.
- Make sure the loader is removed/hidden if the user clicks Stop or if an error happens, so it never stays on screen.

### 4. Re-package the extension
- Rebuild `public/guide-me-extension.zip` so the updated files are included in the downloadable package.

## Out of scope
- No changes to the AI prompts or backend routes.
- No changes to the landing page, unless a tiny note about the new loader is needed.

## Acceptance criteria
- When the user sends a message or releases the mic button, a clear "Thinking..." animation appears in the side panel.
- The loader disappears as soon as the assistant's next instruction is shown or an error message appears.
- The animation is large, calm, and readable for elderly users (no fast flashing).
- The packaged ZIP contains the updated extension.
