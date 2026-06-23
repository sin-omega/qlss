import { marked } from "marked";
import {
  createHighlighter,
  type Highlighter,
} from "shiki";

// ─── Configuration ────────────────────────────────────────────────────────
const SHIKI_THEMES = ["github-light", "github-dark"] as const;
const SHIKI_LANGS = [
  "javascript",
  "typescript",
  "bash",
  "shell",
  "json",
  "python",
  "html",
  "css",
  "tsx",
  "jsx",
  "go",
  "rust",
  "sql",
  "markdown",
  "yaml",
  "xml",
  "diff",
] as const;

let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [...SHIKI_THEMES],
      langs: [...SHIKI_LANGS],
    });
  }
  return highlighterPromise;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Server-side markdown → HTML with Shiki syntax highlighting.
 *
 * marked renders the markdown first (escaping code-block content), then each
 * fenced code block is re-highlighted with Shiki for both light & dark themes.
 */
export async function renderMarkdown(content: string): Promise<string> {
  marked.setOptions({
    gfm: true,
    breaks: false,
  });

  const raw = await marked.parse(content, { async: true });
  const html = typeof raw === "string" ? raw : String(raw);

  let highlighter: Highlighter | null = null;
  try {
    highlighter = await getHighlighter();
  } catch (err) {
    console.warn("[markdown] shiki init failed, serving unstyled code:", err);
  }

  if (!highlighter) return html;

  // Match both `<pre><code class="language-xxx">…</code></pre>` and plain
  // `<pre><code>…</code></pre>` blocks produced by marked.
  const highlighted = html.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    (_match, lang: string | undefined, code: string) => {
      const decoded = decodeEntities(code);
      const language = (lang || "").trim() || "text";
      try {
        if ((SHIKI_LANGS as readonly string[]).includes(language)) {
          return highlighter!.codeToHtml(decoded, {
            lang: language,
            themes: { light: "github-light", dark: "github-dark" },
          });
        }
        // Unknown language — highlight as plain text
        return highlighter!.codeToHtml(decoded, {
          lang: "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
      } catch {
        return `<pre><code>${code}</code></pre>`;
      }
    },
  );

  // Strip any <script> tags injected by shiki — React will warn about them
  // and they are never executed on the client anyway.
  return highlighted.replace(/<script[\s\S]*?<\/script>/gi, "");
}

/**
 * Lightweight client-side markdown → HTML (no syntax highlighting).
 * Used by the markdown editor's live preview.
 */
export function renderMarkdownClient(content: string): string {
  marked.setOptions({ gfm: true, breaks: false });
  const raw = marked.parse(content);
  return typeof raw === "string" ? raw : String(raw);
}

/** Sanitize a string for safe embedding in an OG meta tag content attribute. */
export function sanitizeOgText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 300);
}
