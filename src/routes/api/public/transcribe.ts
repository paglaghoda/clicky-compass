import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_BYTES = 20 * 1024 * 1024;

export const Route = createFileRoute("/api/public/transcribe")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        const cartesiaKey = process.env.CARTESIA_API_KEY;

        let file: File | null = null;
        try {
          const form = await request.formData();
          const candidate = form.get("audio");
          if (candidate instanceof File) file = candidate;
        } catch {
          return Response.json({ error: "Invalid upload." }, { status: 400, headers: corsHeaders });
        }

        if (!file || file.size < 2048) {
          return Response.json(
            { error: "That recording was empty. Please try again." },
            { status: 400, headers: corsHeaders },
          );
        }
        if (file.size > MAX_BYTES) {
          return Response.json(
            { error: "That recording is too long." },
            { status: 413, headers: corsHeaders },
          );
        }

        // Preferred: Cartesia Ink-Whisper.
        if (cartesiaKey) {
          try {
            const upstream = new FormData();
            upstream.append("model", "ink-whisper");
            upstream.append("language", "en");
            upstream.append("file", file, "recording.wav");

            const cartesia = await fetch("https://api.cartesia.ai/stt", {
              method: "POST",
              headers: { "X-API-Key": cartesiaKey, "Cartesia-Version": "2024-11-13" },
              body: upstream,
            });
            if (cartesia.ok) {
              const data = (await cartesia.json()) as { text?: string };
              if (data.text) return Response.json({ text: data.text }, { headers: corsHeaders });
            } else {
              console.error(
                `Cartesia STT error [${cartesia.status}]: ${await cartesia.text().catch(() => "")}`,
              );
            }
          } catch (err) {
            console.error("Cartesia STT failed", err);
          }
        }

        if (!apiKey) {
          return Response.json({ error: "AI is not configured." }, { status: 500, headers: corsHeaders });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-transcribe");
        upstream.append("file", file, "recording.wav");

        const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          console.error(`Transcribe gateway error [${response.status}]: ${detail}`);
          return Response.json(
            { error: "Could not understand that recording." },
            { status: response.status, headers: corsHeaders },
          );
        }

        const data = (await response.json()) as { text?: string };
        return Response.json({ text: data.text ?? "" }, { headers: corsHeaders });
      },
    },
  },
});
