// Static demonstration route: the value below is captured when Next.js builds this route.
// No request-specific APIs (cookies, headers, searchParams, etc.) are used.
export const dynamic = "force-static";

const generatedAt = new Date().toISOString();

export default function StaticPage() {
  return (
    <main>
      <div className="eyebrow">Static route</div>
      <h1>Static RSC page</h1>
      <p>
        This Server Component is prerendered during <code>next build</code>. The HTML and RSC
        representation can be generated before a visitor requests this URL.
      </p>
      <section className="panel">
        <strong>Build-time value</strong>
        <pre>{generatedAt}</pre>
        <p>
          This timestamp should remain the same between requests to the deployed build. A query
          parameter such as <code>?pwn=hello</code> does not alter this pre-generated output.
        </p>
      </section>
      <p><a href="/dynamic?pwn=try-this">Compare with the dynamic route</a></p>
      <p><a href="/">Back to home</a></p>
    </main>
  );
}
