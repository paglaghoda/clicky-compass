import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_VOICE = "694f9389-aac1-45b6-b726-9d9369183238";

export const Route = createFileRoute("/api/public/speak")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        const cartesiaKey = process.env.CARTESIA_API_KEY;

        let text = "";
        let voice = DEFAULT_VOICE;
        try {
          const body = (await request.json()) as { text?: string; voice?: string };
          text = String(body.text ?? "").slice(0, 2000).trim();
          if (typeof body.voice === "string" && body.voice.trim()) voice = body.voice.trim().slice(0, 80);
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
        }
        if (!text) {
          return Response.json({ error: "Nothing to say." }, { status: 400, headers: corsHeaders });
        }

        // Preferred: Cartesia Sonic, slowed and warm.
        if (cartesiaKey) {
          try {
            const cartesia = await fetch("https://api.cartesia.ai/tts/bytes", {
              method: "POST",
              headers: {
                "X-API-Key": cartesiaKey,
                "Cartesia-Version": "2024-11-13",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model_id: "sonic-2",
                transcript: text,
                voice: { mode: "id", id: voice },
                language: "en",
                speed: "slow",
                output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
              }),
            });
            if (cartesia.ok) {
              return new Response(cartesia.body, {
                headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
              });
            }
            console.error(
              `Cartesia TTS error [${cartesia.status}]: ${await cartesia.text().catch(() => "")}`,
            );
          } catch (err) {
            console.error("Cartesia TTS failed", err);
          }
        }

        if (!apiKey) {
          return Response.json({ error: "AI is not configured." }, { status: 500, headers: corsHeaders });
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
