# Hospitality AI — knowledge-grounded beta

## Status (24 October 2026)

The website chat is live. The new Worker code is committed in `ai-worker/worker.js` but **must be manually deployed in Cloudflare**; updating GitHub does not update the live Worker.

### Deployment (desktop)

1. Open Cloudflare dashboard → Workers & Pages → `rodrigo-hospitality-ai` → Edit code.
2. Open [ai-worker/worker.js](https://github.com/raarchilla-create/raarchilla-create.github.io/blob/main/ai-worker/worker.js), copy the **entire** source and replace the Cloudflare editor contents.
3. Click Deploy. Keep the Workers AI binding named exactly `AI`.
4. Open https://raarchilla-create.github.io/ → AI. Test:
   - `¿Qué es el APPCC y cuáles son sus siete principios?`
   - `Tengo un food cost del 34 %. ¿Por dónde empiezo?`
   - `¿Cómo evitar duplicados al reenviar facturas de un ERP?`
   - `¿Cómo comparo las horas planificadas y las realmente trabajadas?`

### How grounding works

The Worker contains **29 generalised, anonymised reference cards** in its `KB` array. A simple local token-based retriever scores the question and sends up to 3 relevant cards to Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct-fp8`). The model is instructed to prioritize those references, avoid invented facts, and disclose uncertainty. The response includes `sources`, shown in the website chat.

This is a **lightweight retrieval-augmented generation (RAG) prototype**, not semantic vector search. It does not read the user's private files, historical conversations or private GitHub repositories at runtime. The knowledge is deliberately generalized and is embedded in publicly readable Worker source in the website's public GitHub repository. **Never paste proprietary client documentation or private data into this array.**

### Security and limitations

- Browser requests allowed only from `https://raarchilla-create.github.io` via CORS; **CORS is not authentication or robust abuse prevention**. Consider a Cloudflare rate-limiting binding and monitoring usage before broader public launch.
- Cloudflare Workers AI has usage quotas and may change pricing or model availability.
- Retrieval is keyword-based and may miss synonyms or retrieve unrelated entries. Model output may still be incorrect; high-stakes food safety and legal claims require independent verification.
- The Worker does not provide citations to independent official regulations, only labels for internal knowledge cards.
- No client names, contract amounts, personal details, or proprietary API specifications are included.

### Next phase

For a truly private, growing corpus: store reviewed anonymized documents in a separate **private** repository, index curated content in Cloudflare D1/Vectorize/R2 or another suitable storage service, and retrieve it server-side with appropriate access control. Do not fetch private GitHub content from browser JavaScript or put GitHub tokens in the site.
