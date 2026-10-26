# ResearchLabs

A collection of reproducible, Dockerized labs for exploring security vulnerabilities, web technologies, protocols, and the implementation details behind research writeups.

The goal is to go beyond reading a write-up: each lab should provide a working environment that makes the relevant protocol, implementation detail, or vulnerability chain possible to inspect hands-on.

## Labs

| Lab | What is implemented | Research topics | Related write-up / reference |
|---|---|---|---|
| [`nextjs-recache-lab`](./nextjs-recache-lab/) | Dockerized Next.js App Router app; reflected-header behavior; deliberately misconfigured shared-cache simulator; two-stage cache-poisoning/XSS helper; a bounded SSRF reproduction for CVE-2025-57822; a `Location`-to-cache XSS variant using a controlled mock host; static and dynamic RSC routes. | Next.js App Router; React Server Components / Flight; static vs dynamic rendering; HTTP `Content-Type`, `Location`, and `Refresh`; middleware behavior; shared-cache keys and `Vary`; cache poisoning; XSS; SSRF / CVE-2025-57822. | [Re:CACHE — Excessive reflection, type confusion, and 0-click SXSS on Next.js](https://zhero-web-sec.github.io/research-and-things/re-cache-excessive-reflection-type-confusion-and-0-click-sxss-on-nextjs); [CVE-2025-57822 advisory](https://github.com/vercel/next.js/security/advisories/GHSA-4342-x723-ch2f); [Intigriti 0825 write-up](https://zhero-web-sec.github.io/ctf-intigriti-0825/) |

## Principles

- **Learn by building:** implement the smallest useful system that demonstrates the behavior.
- **Reproducible:** include source, dependencies, and practical run instructions.
- **Understand the chain:** document prerequisites, assumptions, relevant requests/responses, and why the behavior occurs.
- **Separate facts from approximations:** identify where a lab models a real system and where it intentionally simplifies it.

## Safety notice

Some labs intentionally contain vulnerable code and proof-of-concept exploit logic. They are for local education and authorized research only. Do not expose them to the public internet or use their techniques against systems without permission. Read each lab's own safety notes before running it.

## Disclaimer

These labs are independent educational projects. A lab inspired by a public write-up is not necessarily an exact recreation of the original target, infrastructure, or every exploit condition; limitations and intentional simplifications should be documented in each lab's README.
