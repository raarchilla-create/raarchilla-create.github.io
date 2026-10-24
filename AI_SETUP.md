# Comments and live AI setup

## Embedded article comments (Utterances)
The site includes Utterances, a free GitHub Issues-based comments widget. Four discussion issues already exist.
To activate the embedded widget, the repository owner must install the Utterances GitHub App at https://github.com/apps/utterances and grant access only to `raarchilla-create/raarchilla-create.github.io`. The repository must remain public, and GitHub Issues must be enabled. Readers need a GitHub account. Comments can be edited, hidden or locked by repository maintainers. The direct GitHub Issues links work without the app.

## Generative AI assistant
The site currently has a working **local knowledge search**. It does not make paid AI requests.

To activate a real model, deploy the files in `ai-worker/` to a **Cloudflare Worker** with the Workers AI binding configured. Check current Cloudflare Workers and Workers AI pricing, limits, data handling and account requirements before enabling it. There is no guarantee of zero cost under every usage level or plan.

1. Create or connect your Cloudflare account. In a development machine with Node.js, install Wrangler: `npm install -g wrangler`.
2. In `ai-worker/`, run `wrangler login`, then `wrangler deploy`. Confirm the AI binding and selected model are supported in your account.
3. Copy the deployed `https://...workers.dev` endpoint into the `AI_ENDPOINT` constant in the root `index.html`.
4. Verify browser CORS, language selection, successful answers and fallback behavior.
5. Enable platform rate limiting before sharing widely. CORS is not an authentication or abuse-prevention mechanism: a public endpoint can be called outside a browser. Consider Turnstile, abuse controls, quotas and a budget cap.

**Never commit provider API tokens or secrets to the public GitHub repository.** The example uses a Cloudflare Workers AI binding, not a browser-exposed API key.
