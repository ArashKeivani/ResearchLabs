export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <main>
      <div className="eyebrow">Local security training lab</div>
      <h1>Re:CACHE</h1>
      <p>
        This deliberately vulnerable Next.js App Router application demonstrates reflected response
        headers, React Server Components (RSC), shared-cache mistakes, and a separate middleware
        SSRF issue fixed by Next.js 15.4.7.
      </p>

      <section className="panel">
        <span className="tag">Research 1</span>
        <h2>Cache poisoning and reflected XSS</h2>
        <p>
          The <code>/dynamic</code> route reflects the <code>pwn</code> query value in its Server
          Component output. A misconfigured cache ignores the RSC representation and the middleware
          reflects response headers, enabling the two-stage Re:CACHE demonstration.
        </p>
        <p><a href="/dynamic">Open the dynamic route</a></p>
        <p>Run <code>python3 exploit.py</code> to prepare the two cache entries.</p>
      </section>

      <section className="panel">
        <span className="tag">Research 2</span>
        <h2>CVE-2025-57822: middleware SSRF</h2>
        <p>
          This lab pins Next.js 15.4.6, an affected version. A reflected request <code>Location</code>
          header is interpreted by the vulnerable middleware-routing pipeline as an upstream target.
          The helper reads a fixed, synthetic secret from the mock service on the private Docker network.
        </p>
        <p>Run <code>python3 exploit-ssrf.py</code> to demonstrate the bounded SSRF.</p>
      </section>

      <section className="panel">
        <span className="tag">RSC learning</span>
        <h2>Static versus dynamic RSC</h2>
        <p>
          <code>/static</code> is prerendered during the build. <code>/dynamic</code> renders per
          request and reads a query parameter. Compare the timestamp and inspect each route with
          <code> curl -i -H 'RSC: 1' ...</code>.
        </p>
        <p><a href="/static">Open static route</a> · <a href="/dynamic?pwn=hello">Open dynamic route</a></p>
      </section>

      <section className="panel warning">
        <strong>Training only</strong>
        <p>
          This project intentionally uses vulnerable software and middleware. The cache is published
          only on 127.0.0.1; app and mock target traffic use dedicated Docker networks. The cache-edge
          network exists for the published local endpoint. Do not expose this lab to a LAN, public
          interface, reverse proxy, or the Internet.
        </p>
      </section>
    </main>
  );
}
