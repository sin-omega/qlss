import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { siteOrigin } from "@/lib/env";

// Routes that bypass the ban check (auth, public shorten, unshorten API,
// onboarding, and static assets). Banned users can still sign out and reach
// the onboarding page (though onboarding itself requires being signed in).
const PUBLIC_PATHS = [
  "/api/shorten",
  "/api/unshorten",
  "/api/auth",
  "/api/logout",
  "/api/onboard",
  "/auth",
  "/onboard",
  "/api/abuse",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { response, ban } = await updateSession(request);

  if (!ban) {
    return response;
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Allow public paths (sign-in, onboarding, logout, public APIs, static) so
  // banned users can still log out / the auth flow still works.
  if (isPublicPath(pathname)) {
    return response;
  }

  const origin = siteOrigin();

  // API requests (except the public ones above) get a JSON 403.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "forbidden", reason: ban.type === "ip" ? "ip_banned" : "user_banned" },
      { status: 403 },
    );
  }

  // Everything else gets the HTML ban page.
  return banPageResponse(origin, ban);
}

export const config = {
  matcher: [
    // Run on everything except static assets and the public shorten endpoint
    // (which must remain reachable for unauthenticated link creation).
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\..*)(?!api/shorten).*)",
  ],
};

// ─── Ban page HTML ──────────────────────────────────────────────────────────

type Lang = "en" | "pl";

const BAN_TEXT: Record<Lang, { title: string; sub: string; reason: string; back: string; prompt: string }> = {
  en: {
    title: "access denied",
    sub: "You no longer have access to QLSS.",
    reason: "reason",
    back: "back to qlss",
    prompt: "qlss --access-denied",
  },
  pl: {
    title: "odmowa dostępu",
    sub: "Nie masz już dostępu do QLSS.",
    reason: "powód",
    back: "wróć do qlss",
    prompt: "qlss --odmowa-dostepu",
  },
};

function banPageResponse(origin: string, ban: { type: "user" | "ip"; reason?: string | null }): NextResponse {
  const css = sharedBanCSS();
  const txt = BAN_TEXT.en; // default fallback (lang-specific injected at call site)
  // Build with the default lang text; the inlined script swaps client-side.
  const reasonText = ban.reason && ban.reason.trim().length > 0 ? escapeHtml(ban.reason) : null;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>QLSS — access denied</title>
<style>${css}</style>
</head>
<body>
<div class="wordmark">QLSS</div>
<div class="wrap">
  <div class="prompt"><span>$</span> <span id="prompt">${escapeHtml(txt.prompt)}</span></div>
  <h1 id="title">${escapeHtml(txt.title)}</h1>
  <p class="sub" id="sub">${escapeHtml(txt.sub)}</p>
  ${reasonText ? `<div class="reason"><span class="reason-label" id="reason-label">${escapeHtml(txt.reason)}:</span> <span class="reason-text">${reasonText}</span></div>` : ""}
  <div class="back"><a class="btn-link" href="${escapeHtml(origin)}/api/logout">&larr; <span id="back">${escapeHtml(txt.back)}</span></a></div>
</div>
<div class="footer">QLSS &middot; short links</div>
<script>
  (function() {
    var D = {
      en: { title: "access denied", sub: "You no longer have access to QLSS.", reason: "reason", back: "back to qlss", prompt: "qlss --access-denied" },
      pl: { title: "odmowa dostępu", sub: "Nie masz już dostępu do QLSS.", reason: "powód", back: "wróć do qlss", prompt: "qlss --odmowa-dostepu" }
    };
    function getCookie(n){var m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)'));return m?m[2]:null;}
    var lang = getCookie('qlss-lang');
    if (lang !== 'pl' && lang !== 'en') {
      var al = (navigator.language||'').toLowerCase();
      lang = al.indexOf('pl')===0 ? 'pl' : 'en';
    }
    var t = D[lang] || D.en;
    document.getElementById('prompt').textContent = t.prompt;
    document.getElementById('title').textContent = t.title;
    document.getElementById('sub').textContent = t.sub;
    var rl = document.getElementById('reason-label'); if (rl) rl.textContent = t.reason + ':';
    var bk = document.getElementById('back'); if (bk) bk.textContent = t.back;
    try {
      function theme(){var c=getCookie('theme')||localStorage.getItem('theme')||'system';if(c==='dark'||c==='light')document.documentElement.setAttribute('data-theme',c);}
      theme();
    } catch(e) {}
  })();
</script>
</body>
</html>`;
  return new NextResponse(html, {
    status: 403,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function sharedBanCSS(): string {
  return `
  :root {
    color-scheme: light dark;
    --bg: #fbfbf9; --fg: #0c0c0a; --muted: #6a6a64; --border: #d9d8d0;
    --card: #ffffff; --hover: #ecebe4; --grid: rgba(12,12,10,0.035); --error: #b44040;
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --bg:#0c0c0a; --fg:#e8e6df; --muted:#8a8880; --border:#3a3a36; --card:#1a1a18; --hover:#2a2a26; --grid:rgba(232,230,223,0.04); --error:#e06060;
  }}
  :root[data-theme="dark"] { --bg:#0c0c0a; --fg:#e8e6df; --muted:#8a8880; --border:#3a3a36; --card:#1a1a18; --hover:#2a2a26; --grid:rgba(232,230,223,0.04); --error:#e06060; }
  :root[data-theme="light"] { --bg:#fbfbf9; --fg:#0c0c0a; --muted:#6a6a64; --border:#d9d8d0; --card:#ffffff; --hover:#ecebe4; --grid:rgba(12,12,10,0.035); --error:#b44040; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow-x: hidden; }
  body {
    font-family: "Roboto Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    background: var(--bg); color: var(--fg);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100vh; padding: 1.5rem;
    background-image: linear-gradient(to right, var(--grid) 1px, transparent 1px), linear-gradient(to bottom, var(--grid) 1px, transparent 1px);
    background-size: 24px 24px;
  }
  .wordmark { position: absolute; top: 1.25rem; left: 1.5rem; font-size: 0.75rem; font-weight: 700; letter-spacing: -0.01em; }
  .wrap { max-width: 24rem; width: 100%; text-align: center; }
  .prompt { color: var(--muted); font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 0.75rem; }
  .prompt span { color: var(--fg); }
  h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 0.75rem; }
  .sub { color: var(--muted); font-size: 0.8rem; line-height: 1.6; margin-bottom: 1.25rem; }
  .reason { background: var(--card); border: 1px solid var(--border); padding: 0.75rem 1rem; font-size: 0.75rem; text-align: left; margin-bottom: 1.25rem; }
  .reason-label { color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.65rem; }
  .reason-text { color: var(--error); }
  .footer { position: absolute; bottom: 1rem; left: 0; right: 0; text-align: center; font-size: 0.65rem; color: var(--muted); }
  .btn-link { color: var(--fg); font-size: 0.75rem; text-decoration: none; border: 1px solid var(--border); padding: 0.5rem 1.25rem; background: var(--card); display: inline-block; transition: background 0.15s; }
  .btn-link:hover { background: var(--hover); }
  @media (max-width: 480px) { body { padding: 1rem; } .wrap { max-width: 100%; } h1 { font-size: 1.1rem; } }`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
