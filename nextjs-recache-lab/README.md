# Re:CACHE — local Next.js RSC, cache-poisoning, and SSRF lab

A Dockerized training environment inspired by zhero's **[Re:CACHE — Excessive reflection, type confusion, and 0-click SXSS on Next.js](https://zhero-web-sec.github.io/research-and-things/re-cache-excessive-reflection-type-confusion-and-0-click-sxss-on-nextjs)**. The WAF and bypass work are intentionally omitted.

This lab contains three demonstrations:

1. **Re:CACHE chain**: reflected response headers + RSC/HTML content-type confusion + an intentionally misconfigured shared cache + a `Refresh` header.
2. **CVE-2025-57822 SSRF**: vulnerable Next.js middleware redirect handling, demonstrated by reading a fixed synthetic response from a mock service on the private Docker network.
3. **`Location`-to-cache XSS variant**: a controlled HTML response from the same mock container is fetched through the vulnerable `Location` handling and cached under a same-origin lab URL, so a browser can execute a harmless proof-of-concept payload from the cached response.

It also includes `/static` and `/dynamic` pages for comparing pre-rendered and request-time RSC behavior.

> **Safety boundary:** this project intentionally pins Next.js **15.4.6**, which is affected by CVE-2025-57822. The SSRF helper can target only this lab's fixed internal service, and the Docker network is marked `internal: true`; the mock service is not published to the host. The only published port is `127.0.0.1:3000`. Do not remove these restrictions, expose the lab to a LAN/public interface, or use it against systems without authorization.

## Components

- **Next.js App Router origin** (`app/`): deliberately reflects selected request headers into response headers. The `Location` header reflection triggers the vulnerable middleware behavior in the pinned Next.js version.
- **Shared-cache simulator** (`cache-proxy/`): caches 200 GET responses by method + raw path/query and deliberately ignores request-header variation and `Vary`. It also caches responses regardless of normal origin cache directives.
- **Synthetic internal HTTP service** (`internal-service/`): returns a clearly fake training marker on `/secret`. It has no published host port and contains no real credential or sensitive data.
- **`exploit.py`**: performs the two-stage Re:CACHE cache-poisoning demonstration against localhost.
- **`exploit-ssrf.py`**: demonstrates the middleware SSRF by requesting a fixed URL, `http://ssrf-target:8081/secret`, through the vulnerable Next.js origin. The script does not accept an arbitrary SSRF destination.
- **`exploit-location-xss.py`**: starts a temporary controlled HTML payload server inside the `ssrf-target` container, uses a fixed in-network URL, and checks whether the resulting HTML response is cached under a same-origin path. It accepts only a localhost lab base URL.
- **`/static` and `/dynamic`**: demonstrate a forced-static Server Component and a request-time dynamic Server Component. The former shows a build-time timestamp; the latter reads `searchParams` and shows a request-time timestamp.
- **`examples/middleware-safe.example.ts`**: a defensive sketch showing explicit request-header forwarding instead of reflecting arbitrary incoming headers as response headers.

## Run it

Requirements: Docker Engine, Docker Compose v2, Python 3, and a browser.

```sh
docker compose up --build -d
docker compose ps
```

Wait until `app` and `ssrf-target` are healthy. The application is available at **http://localhost:3000/**.

### Demo 1: Re:CACHE cache poisoning and XSS

```sh
python3 exploit.py
```

Open `http://localhost:3000/` in a browser. The poisoned home-page response should send a zero-delay refresh to `/dynamic?...`, where the cached RSC body is interpreted as HTML and the harmless lab alert executes. Expected alert text: `RE-CACHE lab XSS executed`.

### Demo 2: CVE-2025-57822 middleware SSRF

```sh
python3 exploit-ssrf.py
```

The script sends a request to the local app with a `Location` header pointing to the fixed internal mock service. In this affected Next.js version, middleware's reflected `Location` is interpreted by the routing pipeline as an upstream destination. The response body should contain the synthetic marker:

```text
RESEARCHLABS_INTERNAL_DEMO_SECRET=synthetic-value-not-a-real-credential
```

This proves that a server-side request reached a service unavailable directly from the host and that its response was returned to the caller. The helper is deliberately not a general-purpose URL or port scanner.

### Demo 3: `Location`-to-cache XSS variant

```sh
python3 exploit-location-xss.py
```

This variant follows the alternative mentioned in the Re:CACHE writeup: use the vulnerable `Location` handling to retrieve a controlled HTML page and store the returned response in the shared cache. The script starts the temporary payload server inside the existing `ssrf-target` container, so it does not publish an extra host port. It checks for a cache hit on the follow-up request and prints the same-origin URL to open in a browser. The payload is a harmless JavaScript `alert` and a visible marker.

The script requires Docker access (use `sudo python3 exploit-location-xss.py` on systems where the current user cannot access Docker) and the cache port mapping `127.0.0.1:3000->8080/tcp`. It is restricted to a localhost base URL and the fixed internal mock service.

### Demo 4: Static vs dynamic RSC

Open [static route](http://localhost:3000/static) and [dynamic route](http://localhost:3000/dynamic?pwn=hello) in a browser. The static route has `dynamic = "force-static"`; its `generatedAt` timestamp is captured during `next build`. The dynamic route has `dynamic = "force-dynamic"`; it reads the query string and computes its timestamp during each request.

To inspect their RSC representation, first clear the lab cache and use distinct URLs so a prior cached representation does not influence the comparison:

```sh
curl -i -X POST http://localhost:3000/__lab/cache/clear
curl -i -H 'RSC: 1' 'http://localhost:3000/static?view=one'
curl -i -H 'RSC: 1' 'http://localhost:3000/dynamic?pwn=one&view=two'
```

Look for the response `Content-Type`, `Vary`, body shape, and (where emitted by this Next.js build) the prerender-related response header. The RSC payload is React Flight serialization, not ordinary HTML. The static route's output was generated during the build; the dynamic route runs for the request and incorporates its query value.

## Observe requests and reset the cache

```sh
docker compose logs -f app cache ssrf-target
curl -i http://localhost:3000/__lab/healthz
curl -i -X POST http://localhost:3000/__lab/cache/clear
```

The proxy adds `X-Lab-Cache: MISS` or `X-Lab-Cache: HIT` plus `Age` for visibility. The cache is in-memory and resets when the cache container restarts; both helpers also clear it where appropriate.

To stop the lab:

```sh
docker compose down
```

To rebuild its images from scratch:

```sh
docker compose down --rmi local
docker compose up --build -d
```

## CVE background and versions

[**CVE-2025-57822 / GHSA-4342-x723-ch2f**](https://github.com/vercel/next.js/security/advisories/GHSA-4342-x723-ch2f) describes improper middleware redirect handling that can lead to SSRF in vulnerable, self-hosted configurations when incoming request headers are reflected into responses. The advisory lists **15.4.7** and **14.2.32** as patched versions for their respective release lines. This lab uses **15.4.6** specifically to reproduce the vulnerable behavior.

The Re:CACHE cache-poisoning chain models excessive header reflection plus a shared cache that mishandles RSC/HTML response variants. The SSRF demonstration is an additional route to server-side impact. The `Location`-to-cache XSS variant models the alternative described in the writeup and is separate from the `Refresh`-based final chain.

References:

- [Re:CACHE — Excessive reflection, type confusion, and 0-click SXSS on Next.js](https://zhero-web-sec.github.io/research-and-things/re-cache-excessive-reflection-type-confusion-and-0-click-sxss-on-nextjs)
- [CVE-2025-57822 — GitHub Security Advisory](https://github.com/vercel/next.js/security/advisories/GHSA-4342-x723-ch2f)
- [CVE-2025-57822 — Vercel changelog](https://vercel.com/changelog/cve-2025-57822)
- [CTF — Intigriti 0825 (SSRF explanation)](https://zhero-web-sec.github.io/ctf-intigriti-0825/)

## What is intentionally simplified

The original target was anonymized. This repository reproduces the relevant request/response behaviors in a deliberately constructed environment, not the target's application or a production CDN. The cache behavior is a simplified simulator. The SSRF destination is a synthetic service accessible only inside this Docker network. Actual exploitability against a different application depends on its middleware, framework version, deployment, and network reachability. WAF rules and bypasses are intentionally not included.

## Defensive takeaways

- Upgrade affected self-hosted Next.js installations to a patched release, and check custom middleware against the official advisory.
- Do not reflect arbitrary request headers into response headers. In particular, do not let a client control `Location`, `Content-Type`, or `Refresh`.
- When request headers must be passed downstream, use the request-header form (`NextResponse.next({ request: { headers } })`) rather than writing them into the response.
- Make cache keys and `Vary`/content-negotiation behavior consistent with the origin's representations. Do not cache RSC payloads as HTML.
- Keep vulnerable labs local, isolated, and separate from real credentials or services.
