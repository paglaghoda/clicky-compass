import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ResearchRequest = { goal?: string; url?: string; title?: string };

type ResearchResult = {
  feasible: "yes" | "no" | "elsewhere";
  plainAnswer: string;
  route: string[];
  sourceUrl: string | null;
};

const cache = new Map<string, { at: number; value: ResearchResult }>();
const CACHE_MS = 1000 * 60 * 60 * 12;

const SYSTEM_PROMPT = `You help an assistant that guides elderly people through websites.
You are given the person's goal, the website they are on, and search results from that website's own help pages.

Decide ONE of three things:
- "yes": the task can be done on this website. Give the real route as short steps taken from the help page (e.g. ["Open the menu with your name", "Choose My Account", "Choose Membership"]).
- "no": this website simply does not offer that. Say so plainly and say why in one friendly sentence (e.g. sign-in is by phone number and a code, so there is no password to change).
- "elsewhere": it is possible, but somewhere else (the phone app, a different website). Say exactly where.

Saying "no" is a GOOD, correct answer when the setting does not exist. Never invent a menu path.

Write for a 75-year-old: short sentences, no jargon, no words like "navigate", "dashboard", "settings pane".

Respond with ONLY JSON:
{"feasible":"yes"|"no"|"elsewhere","plainAnswer":string,"route":string[],"sourceUrl":string|null}`;

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export const Route = createFileRoute("/api/public/research")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        const firecrawlKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) {
          return Response.json(
            { error: "AI is not configured for this app." },
            { status: 500, headers: corsHeaders },
          );
        }

        let body: ResearchRequest;
        try {
          body = (await request.json()) as ResearchRequest;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
        }

        const goal = String(body.goal ?? "").slice(0, 300).trim();
        if (!goal) {
          return Response.json({ error: "Missing goal." }, { status: 400, headers: corsHeaders });
        }
        const host = hostOf(String(body.url ?? ""));
        const key = `${host}::${goal.toLowerCase().replace(/\s+/g, " ")}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_MS) {
          return Response.json(hit.value, { headers: corsHeaders });
        }

        // 1. Search the site's own help pages.
        let findings = "";
        let firstSource: string | null = null;
        if (firecrawlKey) {
          try {
            const search = await fetch("https://connector-gateway.lovable.dev/firecrawl/v2/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "X-Connection-Api-Key": firecrawlKey,
              },
              body: JSON.stringify({
                query: `${host || String(body.title ?? "")} ${goal} help support official`,
                limit: 3,
                scrapeOptions: { formats: ["markdown"] },
              }),
            });
            if (search.ok) {
              const payload = (await search.json()) as {
                data?: { url?: string; title?: string; markdown?: string; description?: string }[];
              };
              const results = Array.isArray(payload.data) ? payload.data.slice(0, 3) : [];
              firstSource = results[0]?.url ?? null;
              findings = results
                .map(
                  (r, i) =>
                    `Result ${i + 1}: ${r.title ?? ""}\nURL: ${r.url ?? ""}\n${(
                      r.markdown ??
                      r.description ??
                      ""
                    )
                      .replace(/\s+/g, " ")
                      .slice(0, 3000)}`,
                )
                .join("\n\n");
            } else {
              console.error(`Firecrawl search failed [${search.status}]: ${await search.text().catch(() => "")}`);
            }
          } catch (err) {
            console.error("Firecrawl search error", err);
          }
        }

        const userContent = [
          `Goal: ${goal}`,
          `Website they are on: ${host || "unknown"} (${String(body.title ?? "").slice(0, 120)})`,
          findings
            ? `Search results from the web:\n${findings}`
            : "No search results were available. Answer from what you reliably know, and say 'no' if the setting does not exist on this site.",
        ].join("\n\n");

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-5.6-sol",
            reasoning_effort: "none",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          console.error(`Research gateway error [${response.status}]: ${detail}`);
          // Research is a helper, not a blocker — let guiding continue.
          return Response.json(
            { feasible: "yes", plainAnswer: "", route: [], sourceUrl: null } satisfies ResearchResult,
            { headers: corsHeaders },
          );
        }

        const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}") as Record<string, unknown>;
        } catch {
          parsed = {};
        }

        const feasible =
          parsed.feasible === "no" || parsed.feasible === "elsewhere"
            ? (parsed.feasible as "no" | "elsewhere")
            : "yes";

        const value: ResearchResult = {
          feasible,
          plainAnswer: parsed.plainAnswer ? String(parsed.plainAnswer).slice(0, 600) : "",
          route: Array.isArray(parsed.route)
            ? parsed.route.slice(0, 8).map((s) => String(s).slice(0, 160))
            : [],
          sourceUrl:
            typeof parsed.sourceUrl === "string" && parsed.sourceUrl.startsWith("http")
              ? parsed.sourceUrl
              : firstSource,
        };

        cache.set(key, { at: Date.now(), value });
        return Response.json(value, { headers: corsHeaders });
      },
    },
  },
});
