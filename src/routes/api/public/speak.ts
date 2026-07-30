import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const Route = createFileRoute("/api/public/speak")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return Response.json({ error: "AI is not configured." }, { status: 500, headers: corsHeaders });
        }

        let text = "";
        try {
          const body = (await request.json()) as { text?: string };
          text = String(body.text ?? "").slice(0, 2000).trim();
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
        }
        if (!text) {
          return Response.json({ error: "Nothing to say." }, { status: 400, headers: corsHeaders });
        }

        const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice: "alloy",
            response_format: "mp3",
            speed: 0.85,
            instructions:
              "Speak slowly, warmly and clearly, as if helping a kind elderly person who is nervous about computers.",
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          console.error(`Speak gateway error [${response.status}]: ${detail}`);
          return Response.json(
            { error: "Could not read that out loud." },
            { status: response.status, headers: corsHeaders },
          );
        }

        return new Response(response.body, {
          headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
        });
      },
    },
  },
});
