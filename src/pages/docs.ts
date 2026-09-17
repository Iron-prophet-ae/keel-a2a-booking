export function renderDocsPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Keel A2A booking API</title>
  <style>
    :root { color-scheme: dark; --bg:#11140f; --ink:#f4f1e8; --muted:#b7b3a6; --line:#2c3128; --accent:#c6d36b; }
    body { margin:0; background:var(--bg); color:var(--ink); font-family:"Segoe UI",system-ui,sans-serif; }
    main { max-width: 800px; margin: 0 auto; padding: 32px 20px 72px; }
    h1,h2 { font-family: Georgia, serif; font-weight: 500; }
    a { color: var(--accent); }
    code, pre { background:#1a1e18; border:1px solid var(--line); }
    code { padding: 1px 5px; font-size: 13px; }
    pre { padding: 14px; overflow: auto; }
    table { width:100%; border-collapse: collapse; }
    th, td { text-align:left; border-bottom:1px solid var(--line); padding:10px 8px; vertical-align:top; }
    .muted { color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <p class="muted">Keel · Make work move</p>
    <h1>A2A booking API</h1>
    <p>Five HTTP JSON steps. Auth: <code>X-Api-Key</code>. Machine-readable spec: <a href="/openapi.json">/openapi.json</a>.</p>
    <table>
      <thead><tr><th>Step</th><th>Endpoint</th><th>What happens</th></tr></thead>
      <tbody>
        <tr><td>1</td><td><code>POST /v1/handshake</code></td><td>Identify the visiting agent. Receive a session and capability list.</td></tr>
        <tr><td>2</td><td><code>POST /v1/intake</code></td><td>Send org, contact agent, purpose, duration, timezone.</td></tr>
        <tr><td>3</td><td><code>POST /v1/slots/propose</code></td><td>Receive open times from the calendar adapter.</td></tr>
        <tr><td>4</td><td><code>POST /v1/bookings/confirm</code></td><td>Lock one slot. Get a booking id and ICS payload.</td></tr>
        <tr><td>5</td><td><code>GET /v1/bookings/{id}</code></td><td>Read booking status.</td></tr>
      </tbody>
    </table>
    <h2>External agent sequence</h2>
    <pre>handshake → intake → propose slots → confirm → (optional) status</pre>
    <p>Persona and tool bindings live in <code>src/agent/</code>. The demo client in <code>scripts/demo-client.ts</code> runs the same sequence.</p>
    <p><a href="/">Back to the desk board</a></p>
  </main>
</body>
</html>`;
}
