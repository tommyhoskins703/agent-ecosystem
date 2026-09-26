// Supabase Edge Function: history
//
// Returns every saved generation, newest first, for the History section on
// the landing page.
//
// Deploy: supabase functions deploy history
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the edge
// runtime. The service role key bypasses RLS, so this read needs no policy
// on "generations" - and it must never leave this function.
//
// Note: this endpoint exposes the whole table to anyone with the anon key,
// which is public in index.html. That is intended here (the rows are shown
// on a public page), but it means every saved generation is world-readable.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Server is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: jsonHeaders },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // id is a tiebreaker: rows saved in the same instant would otherwise come
  // back in an arbitrary order.
  const { data, error } = await supabase
    .from("generations")
    .select("id, topic, angle, hook, script, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Failed to fetch generations:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  return new Response(JSON.stringify({ generations: data ?? [] }), { headers: jsonHeaders });
});
