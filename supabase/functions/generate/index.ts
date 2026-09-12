// Supabase Edge Function: generate
//
// Proxies short-form content generation requests to the Claude API.
// Keeps the Anthropic API key server-side (as a Supabase secret) so it
// is never exposed to the browser.
//
// Deploy: supabase functions deploy generate
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = "claude-sonnet-5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "Server is missing ANTHROPIC_API_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let topic: unknown;
  let angle: unknown;
  try {
    const body = await req.json();
    topic = body.topic;
    angle = body.angle;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (typeof topic !== "string" || !topic.trim() || typeof angle !== "string" || !angle.trim()) {
    return new Response(JSON.stringify({ error: "\"topic\" and \"angle\" are required strings" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const prompt = `You write short-form video scripts (for TikTok/Reels/Shorts) that help local
service businesses (plumbers, HVAC, landscapers, salons, etc.) turn AI news into
relatable, useful content for their customers.

AI news/topic: ${topic.trim()}
Angle for local service businesses: ${angle.trim()}

Write:
1. A "hook" - one punchy opening line (under 15 words) designed to stop someone
   from scrolling.
2. A "script" - a 30-45 second spoken script (roughly 80-120 words) that
   explains the news in plain language and lands the angle for a local
   service business owner or their customers.

Respond with ONLY a JSON object in this exact shape, no markdown fences, no
extra commentary:
{"hook": "...", "script": "..."}`;

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    return new Response(JSON.stringify({ error: `Anthropic API error: ${errText}` }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await anthropicRes.json();
  const text = data.content?.[0]?.text ?? "";

  let parsed: { hook?: string; script?: string };
  try {
    parsed = JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: "Model did not return valid JSON", raw: text }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
