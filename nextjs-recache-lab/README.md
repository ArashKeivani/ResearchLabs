# Re:CACHE: Next.js RSC, Cache Poisoning, and SSRF Lab

A local, Dockerized research lab inspired by zhero's write-up **[Re:CACHE — Excessive reflection, type confusion, and 0-click SXSS on Next.js](https://zhero-web-sec.github.io/research-and-things/re-cache-excessive-reflection-type-confusion-and-0-click-sxss-on-nextjs)**.

The purpose of this lab is to understand *why* the vulnerabilities work—not just run an exploit. It brings together React Server Components (RSC), HTTP content negotiation, middleware behavior, shared-cache design, browser navigation, and server-side request forgery (SSRF). WAF configuration and WAF-bypass research are intentionally out of scope.

> **Safety:** The lab deliberately uses vulnerable Next.js **15.4.6** and insecure middleware/cache behavior. Run it only on your own machine. Do not expose it to your LAN or the public Internet, and never point the demonstrations at real internal services or credentials.

## What you'll learn

- How an App Router page can have an HTML representation and a separate React Flight/RSC representation.
- Why `RSC: 1`, `Content-Type`, and `Vary` matter when an intermediary caches responses.
- How reflecting request headers into response headers can turn attacker input into framework control flow.
- Why a cache key must distinguish requests that can produce different representations.
- How `Refresh` can cause browser navigation, and how a cached response can turn separate bugs into a zero-click XSS chain.
- Why a `Location` header on a middleware response must not automatically become an instruction for the server to fetch a URL.
- How static prerendering differs from rendering a Server Component for each request.

## Demos

| Demo | Core idea | What to observe |
|---|---|---|
| **1. Re:CACHE cache poisoning and XSS** | Reflected headers + RSC/HTML content-type confusion + a misconfigured shared cache + `Refresh` | Two cache entries are poisoned. Visiting the home page navigates to the poisoned dynamic route, where the RSC response is interpreted as HTML and a harmless alert executes. |
| **2. CVE-2025-57822 SSRF** | Reflected `Location` + vulnerable middleware routing logic | A request to the local app causes the server to retrieve a synthetic response from a private mock service. The helper only targets that fixed service. |
| **3. Location-to-cache XSS variant** | The vulnerable `Location` flow fetches controlled HTML, which is cached under a same-origin lab URL | The HTML comes from a temporary Python server running on the host. A follow-up request verifies that the cached response is served. |
| **4. Static vs. dynamic RSC** | Build-time prerendering vs request-time rendering | Compare `/static` with `/dynamic`, including timestamps, query-dependent output, headers, and RSC payloads. |

## The main Re:CACHE chain

The first demo intentionally combines several independent behaviors. Each step is useful to understand on its own:

1. **The origin supports RSC.** An App Router route can return a React Flight payload for client-side navigation instead of a normal HTML document.
2. **Middleware reflects attacker-controlled headers.** In this lab, selected request headers are copied into response headers, allowing the response `Content-Type` and `Refresh` value to be influenced.
3. **The cache mishandles representation differences.** The cache key uses the request method and raw path/query but ignores request-header variation and `Vary`. It can therefore store an RSC response under a cache key later used by a normal browser request.
4. **The RSC response is labeled as HTML.** The body is still RSC data, but the poisoned response advertises an HTML content type.
5. **The home-page response is also poisoned.** Its `Refresh` header points to the cached target URL, so a visitor to the home page is navigated to the poisoned representation.

Neither RSC nor caching is inherently a vulnerability. The chain depends on the unsafe header reflection and the deliberately incorrect cache behavior working together.

## Repository layout

```text
nextjs-recache-lab/
├── app/                         # Next.js App Router origin and vulnerable middleware
│   └── app/
│       ├── page.tsx              # Home page used by the Refresh stage
│       ├── static/page.tsx       # Static RSC example
│       └── dynamic/page.tsx      # Dynamic RSC example and Re:CACHE target
├── cache-proxy/                  # Intentionally misconfigured shared-cache simulator
├── internal-service/             # Synthetic internal HTTP service; fake data only
├── examples/
│   └── middleware-safe.example.ts
├── exploit.py                    # Demo 1: Re:CACHE
├── exploit-ssrf.py               # Demo 2: CVE-2025-57822
├── exploit-location-xss.py       # Demo 3: Location-to-cache variant
├── docker-compose.yml
└── README.md
```

### Components and deliberate simplifications

- **Next.js origin (`app/`):** Uses the App Router and deliberately unsafe middleware that reflects selected request headers. The framework version is pinned to 15.4.6 to reproduce the vulnerable `Location` handling relevant to CVE-2025-57822.
- **Shared-cache simulator (`cache-proxy/`):** Stores successful `GET` responses by method and raw path/query, ignores header variation and `Vary`, and intentionally does not follow normal origin cache directives. It is a teaching model, not a full CDN implementation.
- **Mock internal service (`internal-service/`):** The private Docker service `ssrf-target:8081` returns a synthetic marker at `/secret`. It is not published to a host port and contains no real secrets.
- **Exploit helpers:** Restricted to the local lab and/or fixed synthetic destinations. The third helper starts its own temporary host-side HTTP server and does not run Docker commands or alter containers/networks.
- **Static and dynamic routes:** `/static` uses `dynamic = "force-static"`; `/dynamic` uses `dynamic = "force-dynamic"` and reads request query parameters.

## Start the lab

Requirements: Docker Engine, Docker Compose v2, Python 3, and a browser. These commands assume Linux with Docker Engine.

```sh
# If upgrading an earlier copy of the lab, recreate its Compose resources first.
sudo docker compose down
sudo docker compose up --build -d
sudo docker compose ps
```

The cache should publish its port only on loopback, typically shown as:

```text
127.0.0.1:3000->8080/tcp
```

Open **[http://127.0.0.1:3000/](http://127.0.0.1:3000/)**. Check the cache proxy with:

```sh
curl -i http://127.0.0.1:3000/__lab/healthz
```

Optional network/cache settings are in `.env.example`. Copy it to `.env` only if you want to customize the values; don't overwrite an existing `.env` you have already customized.

## Demo 1 — Re:CACHE cache poisoning and XSS

Run:

```sh
python3 exploit.py
```

Then open [http://127.0.0.1:3000/](http://127.0.0.1:3000/) in a browser. The helper poisons the dynamic route's cache entry with an RSC response labeled as HTML, then poisons the home-page response with a `Refresh` header pointing at that target.

Expected proof-of-execution alert:

```text
RE-CACHE lab XSS executed
```

To understand the chain, inspect the helper's two stages and compare these requests manually. Clear the cache between experiments so a previous cache entry doesn't affect the result:

```sh
curl -i -X POST http://127.0.0.1:3000/__lab/cache/clear
curl -i -H 'RSC: 1' 'http://127.0.0.1:3000/dynamic?pwn=hello'
curl -i 'http://127.0.0.1:3000/dynamic?pwn=hello'
```

Compare `Content-Type`, `Vary`, `X-Lab-Cache`, and the response bodies. An RSC body is React Flight serialization, not an ordinary HTML document.

## Demo 2 — CVE-2025-57822 middleware SSRF

Run:

```sh
python3 exploit-ssrf.py
```

The helper sends a request to the local app with a `Location` header pointing only to `http://ssrf-target:8081/secret`. In the vulnerable version, reflected `Location` can be mistaken for an upstream routing destination, causing the Next.js server to fetch the mock service's response.

Expected synthetic response marker:

```text
RESEARCHLABS_INTERNAL_DEMO_SECRET=synthetic-value-not-a-real-credential
```

The script does not accept an arbitrary destination. The point of the exercise is to trace the difference between a legitimate redirect (which tells the browser to navigate) and a routing bug that makes the server issue a request itself.

## Demo 3 — `Location`-to-cache XSS variant

Run this on the host as your normal user:

```sh
python3 exploit-location-xss.py
```

The helper starts a temporary Python HTTP server on the configured private Docker bridge gateway, serving a harmless HTML document at `/payload`. It then uses the vulnerable `Location` flow to fetch that page, checks that the shared cache stores it under `/__lab-location-xss`, and prints the same-origin URL to open in your browser.

The payload includes a visible `RESEARCHLABS_LOCATION_CACHE_XSS` marker and a harmless JavaScript `alert`. The local server shuts down when the script exits; the cache entry remains until its TTL expires or the cache is cleared.

The app reaches the host-side listener through `host.docker.internal`, which Compose maps to `PAYLOAD_GATEWAY`. The payload server binds to that private bridge gateway—not to `0.0.0.0` or a public interface.

### If Demo 3 times out

First verify that the payload server is reachable from the app container. With a temporary server running on the configured gateway, for example `172.30.250.1`:

```sh
python3 -m http.server 8082 --bind 172.30.250.1
```

In another terminal:

```sh
sudo docker compose exec app node -e '
fetch("http://host.docker.internal:8082/")
  .then(async r => {
    console.log("HTTP", r.status);
    console.log((await r.text()).slice(0, 120));
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
'
```

Expect `HTTP 200` and HTML from Python's test server. Stop this temporary server before running the exploit, since the exploit starts its own server. If the connection times out and UFW is active, the broad rule below fixed it on the development machine:

```sh
sudo ufw allow 8082/tcp
```

That rule is broad; prefer restricting it to the payload-network subnet when practical. Also check that `host.docker.internal` in the app container resolves to the configured `PAYLOAD_GATEWAY`, and ensure that the selected private subnet doesn't overlap with your VPN or another network.

## Demo 4 — Static vs. dynamic RSC

Open:

- [Static route](http://127.0.0.1:3000/static)
- [Dynamic route](http://127.0.0.1:3000/dynamic?pwn=hello)

The static route is prerendered during the build; its timestamp reflects build-time output. The dynamic route is rendered per request and reads `searchParams`, so its timestamp and query-dependent content can change between requests.

To inspect their RSC representations, clear the cache and use distinct query strings:

```sh
curl -i -X POST http://127.0.0.1:3000/__lab/cache/clear
curl -i -H 'RSC: 1' 'http://127.0.0.1:3000/static?view=one'
curl -i -H 'RSC: 1' 'http://127.0.0.1:3000/dynamic?pwn=one&view=two'
```

Compare the `Content-Type`, `Vary`, response body, and any prerender-related headers emitted by this build. Static/dynamic rendering and HTML/RSC response formats are related concepts, but they are not the same distinction.

## Observe and reset

```sh
# Follow origin/cache/mock-service logs
sudo docker compose logs -f app cache ssrf-target

# Check the proxy and clear its in-memory cache
curl -i http://127.0.0.1:3000/__lab/healthz
curl -i -X POST http://127.0.0.1:3000/__lab/cache/clear

# Stop the lab
sudo docker compose down
```

The cache simulator adds `X-Lab-Cache: MISS` or `X-Lab-Cache: HIT` and an `Age` header for visibility. Its cache is in memory and resets when the cache container restarts.

## References

- [Re:CACHE — Excessive reflection, type confusion, and 0-click SXSS on Next.js](https://zhero-web-sec.github.io/research-and-things/re-cache-excessive-reflection-type-confusion-and-0-click-sxss-on-nextjs)
- [CVE-2025-57822 / GHSA-4342-x723-ch2f](https://github.com/vercel/next.js/security/advisories/GHSA-4342-x723-ch2f) — relevant middleware `Location` handling issue in affected self-hosted Next.js versions. This lab uses 15.4.6; patched release lines include 15.4.7 and 14.2.32.
- [Intigriti 0825 write-up](https://zhero-web-sec.github.io/ctf-intigriti-0825/)
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

## Defensive takeaways

- Upgrade affected self-hosted Next.js versions and review middleware behavior against the official advisory.
- Don't reflect arbitrary request headers into response headers. In particular, don't allow untrusted clients to control `Location`, `Content-Type`, or `Refresh`.
- To forward request headers downstream, use `NextResponse.next({ request: { headers } })`; don't copy request headers into the middleware response.
- Keep cache keys and `Vary`/content-negotiation behavior consistent with the origin's representations. An RSC payload must not be served as HTML.
- Keep deliberately vulnerable labs isolated and away from real credentials, internal systems, and production traffic.
