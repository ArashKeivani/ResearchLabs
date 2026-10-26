type DynamicPageProps = {
  searchParams: Promise<{
    pwn?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function DynamicPage({ searchParams }: DynamicPageProps) {
  const params = await searchParams;
  const value = Array.isArray(params.pwn) ? params.pwn[0] : (params.pwn ?? "");
  const renderedAt = new Date().toISOString();

  // Intentionally render the query as a normal React child. Ordinary HTML output escapes it,
  // while the lab's RSC response serializes the string in a different wire format. The proxy's
  // deliberate cache/content-type mistakes make that alternate representation dangerous.
  return (
    <main>
      <div className="eyebrow">Dynamic route</div>
      <h1>Dynamic RSC page</h1>
      <p>
        This route renders at request time and reads the URL's <code>pwn</code> query parameter.
        The text is rendered as a normal React child, not with <code>dangerouslySetInnerHTML</code>.
      </p>
      <section className="panel">
        <strong>Request-time value</strong>
        <pre>{value || "(no pwn parameter supplied)"}</pre>
        <strong>Rendered at</strong>
        <pre>{renderedAt}</pre>
      </section>
      <p><a href="/static">Compare with the static route</a></p>
      <p><a href="/">Back to home</a></p>
    </main>
  );
}
