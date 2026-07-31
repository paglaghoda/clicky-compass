import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SnapshotElement = {
  id: string;
  tag: string;
  text: string;
  faint?: boolean;
};

type InspectRequest = {
  page?: {
    url?: string;
    title?: string;
    headings?: string[];
    modalText?: string;
    bodyText?: string;
    elements?: SnapshotElement[];
  };
};

const SYSTEM_PROMPT = `You are the "Guard" inside a browser helper used by elderly people.
You look at a snapshot of the page they are on and decide whether it is (a) trying to manipulate them, or (b) likely a scam.

Look for MANIPULATION (dark patterns):
- guilt-trip or shaming retention copy when someone tries to cancel ("Are you sure? You'll lose everything", "No thanks, I don't like saving money")
- the real cancel/close/unsubscribe control being small, grey, faint, or worded confusingly while the "keep it" button is big
- double negatives or confusing choices
- fake countdowns, pressure timers, pre-ticked boxes, hidden costs

Look for SCAM / PHISHING:
- the domain does not match the brand it claims to be (lookalike banking, delivery, tax, government, tech-support pages)
- urgent demands for passwords, card numbers, one-time codes, gift cards, remote access
- "your account will be closed", "your parcel is held", "your computer is infected"

Be conservative. Ordinary shopping, news, and normal sign-in pages on their real domains are risk "none".

Write for a 75-year-old. Short sentences, no jargon, no words like "phishing", "dark pattern", "UI", "domain".
Examples of good headlines: "This page is trying to make it hard to say no." / "This does not look like the real bank."

If a genuine cancel/close/unsubscribe control exists in the element list, put its exact id in realActionElementId, and describe it in realActionLabel (e.g. 'the small grey link that says "End membership"'). Otherwise both null.

Respond with ONLY JSON:
{"risk":"none"|"manipulation"|"scam","headline":string,"explanation":string,"advice":string,"realActionElementId":string|null,"realActionLabel":string|null}`;

export const Route = createFileRoute("/api/public/inspect")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "AI is not configured for this app." },
            { status: 500, headers: corsHeaders },
          );
        }

        let body: InspectRequest;
        try {
          body = (await request.json()) as InspectRequest;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
        }

        const page = body.page ?? {};
        const elements = Array.isArray(page.elements)
          ? page.elements.slice(0, 80).map((el) => ({
              id: String(el.id ?? "").slice(0, 24),
              tag: String(el.tag ?? "").slice(0, 16),
              text: String(el.text ?? "").replace(/\s+/g, " ").slice(0, 90),
              faint: Boolean(el.faint) || undefined,
            }))
          : [];

        const summary = [
          `URL: ${String(page.url ?? "").slice(0, 300)}`,
          `Title: ${String(page.title ?? "").slice(0, 200)}`,
          `Headings: ${(Array.isArray(page.headings) ? page.headings : []).slice(0, 12).join(" | ").slice(0, 600)}`,
          `Pop-up / dialog text: ${String(page.modalText ?? "").replace(/\s+/g, " ").slice(0, 800)}`,
          `Page text: ${String(page.bodyText ?? "").replace(/\s+/g, " ").slice(0, 2500)}`,
          `Buttons and links (JSON, "faint" means small/grey/low-contrast):`,
          JSON.stringify(elements),
        ].join("\n");

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            reasoning_effort: "none",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: summary },
            ],
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          console.error(`Inspect gateway error [${response.status}]: ${detail}`);
          const message =
            response.status === 429
              ? "Too many requests right now. Please wait a moment."
              : response.status === 402
                ? "The assistant has run out of credits."
                : "The safety check could not run just now.";
          return Response.json({ error: message }, { status: response.status, headers: corsHeaders });
        }

        const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
        } catch {
          parsed = {};
        }

        const risk =
          parsed.risk === "manipulation" || parsed.risk === "scam" ? (parsed.risk as string) : "none";
        const validId =
          typeof parsed.realActionElementId === "string" &&
          elements.some((e) => e.id === parsed.realActionElementId)
            ? (parsed.realActionElementId as string)
            : null;

        return Response.json(
          {
            risk,
            headline: parsed.headline ? String(parsed.headline).slice(0, 200) : "",
            explanation: parsed.explanation ? String(parsed.explanation).slice(0, 500) : "",
            advice: parsed.advice ? String(parsed.advice).slice(0, 400) : "",
            realActionElementId: validId,
            realActionLabel: parsed.realActionLabel ? String(parsed.realActionLabel).slice(0, 160) : null,
          },
          { headers: corsHeaders },
        );
      },
    },
  },
});
