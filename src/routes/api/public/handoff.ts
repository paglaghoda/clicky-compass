import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type HandoffRequest = {
  goal?: string;
  lastStep?: string;
  page?: { url?: string; title?: string; headings?: string[]; bodyText?: string };
};

const SYSTEM_PROMPT = `You write a short message FROM an elderly person TO their adult child or a family member, asking for help with a website.

Rules:
- Write in the first person, as the elderly person. Warm, calm, no jargon at all.
- Say plainly: what they are trying to do, which website they are on, and what is confusing them right now.
- Mention that a picture of the screen is attached.
- 4 short sentences at most. No greeting fluff beyond a simple "Hello".
- No markdown, no bullet points, no sign-off name.

Respond with ONLY a JSON object: {"message": string}`;

export const Route = createFileRoute("/api/public/handoff")({
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

        let body: HandoffRequest;
        try {
          body = (await request.json()) as HandoffRequest;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
        }

        const context = [
          `They are trying to: ${String(body.goal ?? "").slice(0, 300) || "(not said yet)"}`,
          `Website: ${String(body.page?.title ?? "").slice(0, 120)} (${String(body.page?.url ?? "").slice(0, 200)})`,
          `Headings on screen: ${(body.page?.headings ?? []).slice(0, 8).join(" | ").slice(0, 400)}`,
          `Last thing the assistant told them: ${String(body.lastStep ?? "").slice(0, 300)}`,
          `Some page text: ${String(body.page?.bodyText ?? "").slice(0, 800)}`,
        ].join("\n");

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            reasoning_effort: "none",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: context },
            ],
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          console.error(`Handoff gateway error [${response.status}]: ${detail}`);
          return Response.json(
            { error: "Could not write the message just now." },
            { status: response.status, headers: corsHeaders },
          );
        }

        const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        const raw = data.choices?.[0]?.message?.content ?? "{}";
        let message = "";
        try {
          message = String((JSON.parse(raw) as { message?: unknown }).message ?? "");
        } catch {
          message = raw;
        }

        return Response.json({ message }, { headers: corsHeaders });
      },
    },
  },
});
