import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type GuideElement = {
  id: string;
  tag: string;
  role?: string;
  text: string;
};

type GuideRequest = {
  goal?: string;
  history?: { role: "user" | "assistant"; content: string }[];
  page?: { url?: string; title?: string; elements?: GuideElement[] };
  research?: { feasible?: string; plainAnswer?: string; route?: string[]; sourceUrl?: string | null };
  noProgress?: number;
};

const SYSTEM_PROMPT = `You are "Sherpa", a patient assistant that helps elderly people use websites.
You are given the user's goal and a list of the clickable/typable elements currently visible on the page.
You NEVER click anything yourself. You tell the person exactly ONE next step at a time.

Rules:
- Pick at most ONE element from the provided list as the target, using its exact "id" value.
- If no element on this page moves the goal forward, set elementId to null and explain in plain words what to do (e.g. "scroll down", "open a new tab and go to amazon.com").
- Write like you are speaking to a 75-year-old who has never used a computer much. Short sentences. No jargon. No words like "navigate", "UI", "dropdown", "hamburger menu".
- Describe the target by what it LOOKS like and SAYS, e.g. 'Click the orange button that says "Continue".'
- spokenText should be the same instruction, written to be read out loud, slowly and warmly.
- Set warning to a short plain-language caution ONLY for steps that are hard to undo (cancelling, deleting, paying, confirming). Otherwise null.
- stepNumber/totalSteps are your best estimate of progress toward the goal.
- If the goal now looks complete, set done to true and congratulate them.

Being honest beats hunting:
- If this website does not offer what they asked for, say so plainly and set stuck to true. "This website does not let you do that" is a correct and helpful answer — never invent a menu path or keep opening menus hoping something appears.
- If you have already looked around and nothing on this site moves the goal forward, set stuck to true and suggest asking a family member or trying somewhere else.
- If a KNOWN ROUTE is given below, follow it in order instead of guessing.

Respond with ONLY a JSON object:
{"instruction":string,"spokenText":string,"elementId":string|null,"stepNumber":number,"totalSteps":number,"warning":string|null,"done":boolean,"stuck":boolean}`;


export const Route = createFileRoute("/api/public/guide")({
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

        let body: GuideRequest;
        try {
          body = (await request.json()) as GuideRequest;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
        }

        const goal = typeof body.goal === "string" ? body.goal.slice(0, 500).trim() : "";
        if (!goal) {
          return Response.json({ error: "Missing goal." }, { status: 400, headers: corsHeaders });
        }

        const elements = Array.isArray(body.page?.elements)
          ? body.page!.elements!.slice(0, 120).map((el) => ({
              id: String(el.id ?? "").slice(0, 24),
              tag: String(el.tag ?? "").slice(0, 16),
              role: el.role ? String(el.role).slice(0, 24) : undefined,
              text: String(el.text ?? "").replace(/\s+/g, " ").slice(0, 90),
            }))
          : [];

        const history = Array.isArray(body.history)
          ? body.history.slice(-8).map((m) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: String(m.content ?? "").slice(0, 800),
            }))
          : [];

        const research = body.research ?? {};
        const researchLines: string[] = [];
        if (research.feasible === "no") {
          researchLines.push(
            `CHECKED FIRST: this website does not offer that. ${String(research.plainAnswer ?? "").slice(0, 500)} Tell them plainly and set stuck to true.`,
          );
        } else if (research.feasible === "elsewhere") {
          researchLines.push(
            `CHECKED FIRST: it cannot be done here, but it can be done elsewhere. ${String(research.plainAnswer ?? "").slice(0, 500)} Tell them where to go and set stuck to true.`,
          );
        } else if (Array.isArray(research.route) && research.route.length) {
          researchLines.push(
            `KNOWN ROUTE from the site's own help pages (follow it in order):\n${research
              .route.slice(0, 8)
              .map((s, i) => `${i + 1}. ${String(s).slice(0, 160)}`)
              .join("\n")}`,
          );
        }
        const noProgress = Number(body.noProgress) || 0;
        if (noProgress >= 3) {
          researchLines.push(
            `You have given ${noProgress} steps with no progress. Stop hunting: say plainly that you cannot find it here and set stuck to true.`,
          );
        }

        const pageSummary = [
          `Current page: ${String(body.page?.title ?? "").slice(0, 120)}`,
          `URL: ${String(body.page?.url ?? "").slice(0, 200)}`,
          `Goal: ${goal}`,
          ...researchLines,
          `Elements on screen (JSON):`,
          JSON.stringify(elements),
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
              ...history,
              { role: "user", content: pageSummary },
            ],
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          const message =
            response.status === 429
              ? "Too many requests right now. Please wait a moment and try again."
              : response.status === 402
                ? "The assistant has run out of credits."
                : "The assistant could not answer just now.";
          console.error(`Guide gateway error [${response.status}]: ${detail}`);
          return Response.json({ error: message }, { status: response.status, headers: corsHeaders });
        }

        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = data.choices?.[0]?.message?.content ?? "{}";

        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          parsed = { instruction: raw, spokenText: raw, elementId: null };
        }

        const validId =
          typeof parsed.elementId === "string" && elements.some((e) => e.id === parsed.elementId)
            ? (parsed.elementId as string)
            : null;

        return Response.json(
          {
            instruction: String(parsed.instruction ?? "I'm not sure what to do next."),
            spokenText: String(parsed.spokenText ?? parsed.instruction ?? ""),
            elementId: validId,
            stepNumber: Number(parsed.stepNumber) || 1,
            totalSteps: Number(parsed.totalSteps) || 1,
            warning: parsed.warning ? String(parsed.warning) : null,
            done: Boolean(parsed.done),
            stuck: Boolean(parsed.stuck) || research.feasible === "no" || research.feasible === "elsewhere",

          },
          { headers: corsHeaders },
        );
      },
    },
  },
});
