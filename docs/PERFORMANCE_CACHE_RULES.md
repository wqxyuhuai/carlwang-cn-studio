# Performance And Cache Rules

This document records the performance decisions that are easy to undo accidentally. It is a maintenance policy, not a request to maximize cache duration or minimize every request at any cost.

The governing principle is:

> Reduce repeated transfer and initial work while preserving publishing freshness, media correctness, interaction state and the approved visual system.

For content synchronization and publishing order, also read `docs/CONTENT_SYNC_RULES.md`. For interaction behavior, read `docs/UX_DECISIONS.md`. Validation remains in `HARNESS.md`.

## 1. Decision Framework

Before adding or changing a cache, answer all five questions:

1. What is the exact cache key?
2. Can the resource change while that key stays the same?
3. What invalidates or versions it?
4. What happens when the origin returns an error or malformed response?
5. Which visual, navigation or playback behavior could the optimization disturb?

A longer TTL is appropriate only when the URL is immutable or explicitly versioned. A shorter TTL plus targeted revalidation is safer for editorial JSON. Errors, mutation responses and private input are not cache candidates.

## 2. Current Cache Map

| Resource | Key and layer | Current policy | Invalidation or exception |
| --- | --- | --- | --- |
| Public site JSON | Shared Next data cache and `PUBLIC_CONTENT_CACHE_TAG` | Five-minute fallback TTL | Publishing may request `/api/revalidate`; a failed request does not undo a valid OSS publish |
| Per-project `content.json` | `contentUrl` in the shared data cache | Same five-minute TTL and tag | Cache only a successful, usable response; transient failures must remain retryable |
| Responsive raster image | Source URL, width and quality in the image optimizer | WebP variants, one-year minimum cache TTL | Use accurate `sizes`; change the source URL or cache version when replacing an object |
| Remote SVG icon | Direct OSS URL | Long immutable browser/edge cache when the URL is stable | Keep direct delivery; the raster optimizer is not the right path for SVG |
| Full proxied OSS media | Proxy request URL, runtime cache and local development disk cache | One-year immutable response | Safe only for stable media URLs |
| Partial video response | Proxy URL plus the exact `Range` header | Cache 206 chunks up to 8 MiB | Never reuse a chunk for a different range; stream larger chunks |
| Hashed Next/static and font assets | Versioned path or content query hash | One-year immutable | Do not apply this policy to an editable asset with an unversioned URL |
| Editable local Figma/field media | Static path | One day plus seven-day stale-while-revalidate | Shorter lifetime accepts more reads in exchange for safer replacement |
| Contact, view-count and revalidation mutations | API response | `no-store` | Mutation results and user input must never enter a shared cache |
| Runtime or upstream error | Error response | `no-store` | Do not turn a temporary failure into a durable empty result |

The values in this table are deliberate defaults, not universal constants. If the resource identity or deployment architecture changes, revisit the key and invalidation strategy before copying the TTL.

## 3. Public Content And Revalidation

`src/lib/cache-tags.ts` owns both `PUBLIC_CONTENT_CACHE_TAG` and `PUBLIC_CONTENT_REVALIDATE_SECONDS`. Do not duplicate the five-minute value across routes or scripts.

The two freshness mechanisms serve different purposes:

- The TTL is the reliable fallback. It bounds staleness even when no secret is configured or revalidation is temporarily unavailable.
- `/api/revalidate` is the fast path after a successful publish. It improves freshness but is not part of the publish transaction.

This separation is intentional. Making revalidation mandatory would make an already valid OSS publish appear to fail; relying only on the TTL would make editorial updates unnecessarily slow.

Only successful, structurally usable JSON should become a durable cache entry. A timeout, non-2xx response, malformed body, `null` or fallback empty result must remain observable for that request and be retried later. When validation or cache semantics change, version the cache key or invalidate the shared tag.

Work view counts are a separate, frequently changing overlay. A successful D1 increment updates the current detail view but does not invalidate the full public-content cache. The OSS fallback may update JSON when D1 is unavailable, still without turning every view into a full-site regeneration.

## 4. Page Loading And Route Prefetch

Initial rendering should include only the surface needed for the current URL:

- About and Works Index mount on first use, then stay mounted so filters, scroll position and warm interaction state survive tab changes.
- An inactive mounted panel uses `display: none`; it must not continue painting or intercepting input.
- Do not viewport-prefetch every work card. Use hover, focus and press intent for ordinary detail routes.
- Featured may retain its small, delayed warmup budget after the canvas is ready: at most two detail routes on desktop or three on mobile.
- Work detail deliberately prefetches its resolved return destination. This is a justified exception because close and Escape must feel immediate and preserve the exact source surface.

Lazy mounting has a tradeoff: the first visit to a deferred panel may do a little more work. Keeping it mounted afterward avoids a worse state reset, repeated media loading or replayed entry animation. Do not unmount warm panels merely to reduce the DOM count.

Performance work must not change the contextual return contract, mobile first-tap navigation, Grid/List state, nested scroll restoration, reduced-motion fallback or the approved Featured entry behavior.

## 5. Raster Images

Use responsive image delivery for OSS raster images, including project covers, Notion body images, video posters and sprite sheets. Supply a `sizes` value that reflects the rendered layout:

- A full-width mobile image may request a large mobile candidate.
- An image in a two- or three-column Notion group must describe that fraction rather than pretending to be full width.
- The detail cover uses the width of the fixed summary column on desktop.

This reduces transfer without changing authored composition. In the 2026-07-20 sample, selecting a 384 px candidate for a three-column image instead of 1200 px reduced that response from 44,467 bytes to 8,412 bytes, about 81%. This is evidence for accurate layout metadata, not a requirement to add many nearby breakpoints.

Every additional width can fragment the edge cache. Add a candidate only when it represents a meaningful layout size; do not pursue the smallest possible file by creating a dense set of one-off variants.

Remote SVG tool icons stay on their direct OSS URLs. They are already small, preserve vector quality and do not benefit from raster WebP conversion. Treat this as an explicit exception, not a failed optimization.

The first request for a new image variant can still reach OSS. The benefit appears when the variant is reused by later visitors or warm navigation, so compare both cold and warm behavior.

## 6. Video And Range Requests

Public video URLs are normalized through `/api/media/oss` so the Worker can preserve byte-range playback and reuse stable media.

The proxy follows these rules:

1. The cache identity for a partial response includes the exact client `Range` header.
2. Only the initial open-ended probe beginning at byte zero is bounded to 2 MiB.
3. Later open-ended ranges remain intact because browsers may use them to read MP4 metadata near the end of the file.
4. A valid 206 response up to 8 MiB may be buffered and stored in the runtime cache.
5. Larger partial responses stream directly to avoid Worker memory pressure.
6. A cached full object may satisfy a valid later range locally.
7. Unsupported hosts, upstream failures and invalid ranges return uncached errors.

The 8 MiB threshold balances reuse against memory. Raising it may increase cache hits but also forces larger Worker buffers; lowering it saves memory but sends more repeated traffic to OSS. Change it only with measurements from representative videos.

Do not add cache-busting query parameters to ordinary video reads. If an object must be replaced, publish a versioned URL instead of asking every request to bypass the cache.

Cloudflare Cache Reserve is not the default answer for this path. The current workload depends heavily on transformed image variants and partial video ranges, while Reserve is most useful for reusable original full objects with sufficiently long edge TTLs. Reconsider it only after production analytics show meaningful full-object origin traffic. Likewise, moving media to R2 is an architectural change, not a routine cache toggle; consider it when sustained OSS egress or latency justifies migration complexity.

## 7. Static Assets And Fonts

The local Bebas Neue and SF Pro files are WOFF2 subsets referenced with content hashes. `/fonts/*` and `/_next/static/*` therefore use a one-year immutable policy.

`/figma/*` and `/field-media/*` are easier to replace without renaming, so they use a one-day TTL with seven-day stale-while-revalidate. This accepts some repeat transfer to reduce the risk of a year-long stale editable asset.

`public/_headers` applies to Cloudflare static assets. It does not define cache behavior for Worker-rendered pages or API routes. Local `next dev` and `next start` also do not prove these Cloudflare headers; verify them in an OpenNext/Workers preview.

## 8. Responses That Must Stay Uncached

Keep explicit `Cache-Control: no-store` on:

- contact submissions and validation errors;
- view-count mutation responses;
- revalidation responses;
- media proxy errors and rejected hosts;
- any response that contains or reflects private form input.

Never cache an error as successful empty content, never share one video range under another range key, and never expose Notion or Aliyun credentials to the browser as part of a media optimization.

## 9. Approaches To Avoid By Default

- Do not replace targeted revalidation with `no-store` public reads. It solves freshness by discarding almost all reuse.
- Do not give unversioned editable assets a one-year immutable lifetime.
- Do not route tiny SVG icons through raster conversion merely to make every media path identical.
- Do not buffer an entire large video or large range inside the Worker when streaming is sufficient.
- Do not prefetch all detail routes to hide navigation latency.
- Do not unmount a visited panel if doing so resets user state or replays expensive motion.
- Do not infer Worker/API cache behavior from `public/_headers`.
- Do not add Cloudflare products or migrate storage without production evidence that the current origin traffic warrants the operational cost.

These are defaults, not prohibitions. A different choice is valid when its cache identity, failure mode, measurable benefit and UX effect are documented.

## 10. Verification

Use `HARNESS.md` as the release checklist. For cache or media changes, also verify:

1. All published work detail routes still build successfully.
2. A narrow Notion column selects a materially smaller image candidate than a full-width image.
3. Repeating the same video range changes `X-Media-Cache` from a miss to a range hit while status, `Content-Range` and byte length remain correct.
4. A later open-ended video range can still read metadata near the end of the object.
5. Large video ranges stream without being buffered into the small-range cache.
6. Mutation and error responses contain `Cache-Control: no-store`.
7. Font and static-asset headers are checked in Workers preview, not only in the Next development server.
8. `/`, Index, About and one detail page produce no obvious console errors at desktop and mobile widths.
9. Detail close/Escape, first-tap mobile cards, fullscreen video hit zones and reduced-motion behavior remain unchanged.

Reference measurements from 2026-07-20:

- Homepage initial requests fell from roughly 100 to roughly 32 in the tested state.
- Local font transfer fell from roughly 16.5 MiB to roughly 430 KiB.
- A mobile detail trace under Slow 4G and 4x CPU throttling recorded 0.96 s LCP and 0 CLS.
- A warm homepage trace recorded 146 ms LCP and 0 CLS.
- Repeating an exact range in the Cloudflare OpenNext preview produced a runtime partial-range hit.

These are diagnostic baselines, not permanent performance budgets. Content volume, cache warmth, hardware and network conditions change the numbers. Investigate material regressions under comparable conditions rather than optimizing to reproduce one trace exactly.
