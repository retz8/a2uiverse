/**
 * The pages the sign-in popup shows from the orchestrator: the token page for `http` bearer and
 * `apiKey` (task-12.5 decision 2), and the one-line pages a sign-in ends on. Words for customers:
 * no address, no protocol term. The scheme's description is the vendor's, shown as plain text
 * under whose it is — nothing in it rendered, no address in it made live.
 */

const STYLE = `
:root { color-scheme: light dark; --ink: #1c2024; --soft: #60646c; --line: #d9d9e0;
  --page: #f9f9fb; --card: #fff; --accent: #3e63dd; --on-accent: #fff; }
@media (prefers-color-scheme: dark) { :root { --ink: #edeef0; --soft: #b0b4ba;
  --line: #363a3f; --page: #111113; --card: #18191b; --accent: #5472e4; } }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
  background: var(--page); color: var(--ink);
  font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { width: 100%; max-width: 420px; background: var(--card); border: 1px solid var(--line);
  border-radius: 12px; padding: 24px; display: grid; gap: 16px; }
h1 { font-size: 20px; margin: 0; }
p { margin: 0; color: var(--soft); }
.from { display: grid; gap: 4px; }
.words { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--ink);
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; overflow: hidden; }
.words.open { display: block; }
button.link { justify-self: start; padding: 0; border: 0; background: none; color: var(--accent);
  font: inherit; cursor: pointer; }
a.help { justify-self: start; color: var(--accent); }
label { display: grid; gap: 6px; font-weight: 500; }
input { font: inherit; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px;
  background: var(--page); color: var(--ink); }
button.go { font: inherit; padding: 10px 14px; border: 0; border-radius: 8px;
  background: var(--accent); color: var(--on-accent); cursor: pointer; justify-self: start; }
`;

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function page(title: string, body: string, script = ''): string {
  return (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    `<title>${escapeHtml(title)}</title><style>${STYLE}</style></head>` +
    `<body><main>${body}</main>${script ? `<script>${script}</script>` : ''}</body></html>`
  );
}

/** A sign-in ended: one heading, one line; signed in, it tries to close itself. */
export function endPage(signedIn: boolean): string {
  return signedIn
    ? page(
        "You're signed in",
        "<h1>You're signed in</h1><p>You can close this window.</p>",
        'setTimeout(() => window.close(), 600);',
      )
    : page(
        "Sign-in didn't finish",
        "<h1>Sign-in didn't finish</h1><p>Close this window and try signing in again.</p>",
      );
}

export function refusedPage(): string {
  return page(
    "This sign-in can't start",
    "<h1>This sign-in can't start</h1><p>Close this window and try signing in again.</p>",
  );
}

/** The token page (task-12.5 decision 2). */
export function keyPage(params: {
  app: string;
  attempt: string;
  action: string;
  description?: string;
  helpUrl?: string;
}): string {
  const app = escapeHtml(params.app);
  const from = params.description
    ? `<div class="from"><p>From ${app}:</p>` +
      `<div class="words" id="words">${escapeHtml(params.description)}</div>` +
      '<button type="button" class="link" id="all" hidden>Show all</button></div>'
    : '';
  const help = params.helpUrl
    ? `<a class="help" href="${escapeHtml(params.helpUrl)}" target="_blank" rel="noopener noreferrer">Open ${app}'s help page</a>`
    : '';
  const body =
    `<h1>Connect ${app}</h1>${from}${help}` +
    `<form method="post" action="${escapeHtml(params.action)}">` +
    `<input type="hidden" name="attempt" value="${escapeHtml(params.attempt)}">` +
    '<label>Paste your key<input name="key" type="password" autocomplete="off" spellcheck="false" required></label>' +
    '<button class="go" type="submit">Connect</button></form>';
  const script =
    "const w=document.getElementById('words'),b=document.getElementById('all');" +
    "if(w&&b&&w.scrollHeight>w.clientHeight+1){b.hidden=false;b.onclick=()=>{w.classList.add('open');b.hidden=true;};}";
  return page(`Connect ${params.app}`, body, script);
}
