# Agent Ecosystem

A landing page for the Agent Ecosystem project — a personal network of AI agents that do real work: handling tasks, automating workflows, and collaborating with each other so less time goes to busywork.

## Built with

- HTML5 (semantic elements: `header`, `main`, `section`, `footer`)
- CSS, written mobile-first with a single `min-width` breakpoint for larger screens
- Vanilla JavaScript (no libraries or frameworks) for the expandable "How it works" section

Everything lives in a single file, [`index.html`](index.html) — no build step, package manager, or dependencies.

## Deployment

The site is static and deployed via GitHub Pages, serving `index.html` directly from the `main` branch. Pushing to `main` updates the live site.

## Content Generator

The "Generate" button on the landing page calls a Supabase Edge Function
([`supabase/functions/generate/index.ts`](supabase/functions/generate/index.ts))
that proxies to the Claude API to produce a short-form hook + script from the
"AI news/topic" and "Angle for local service businesses" fields. The Anthropic
API key lives only on the Supabase side as a secret — it's never shipped to
the browser.

### Setup

1. Create a Supabase project at [supabase.com](https://supabase.com) (or use an existing one).
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log in:
   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   ```
3. Set your Anthropic API key as a secret:
   ```bash
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
4. Deploy the function:
   ```bash
   supabase functions deploy generate
   ```
5. In `index.html`, set `SUPABASE_FUNCTION_URL` to
   `https://YOUR-PROJECT-REF.supabase.co/functions/v1/generate` and
   `SUPABASE_ANON_KEY` to your project's anon/public key (Project Settings →
   API in the Supabase dashboard).
