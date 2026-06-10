import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import hljs from "highlight.js/lib/core";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import sql from "highlight.js/lib/languages/sql";
import xml from "highlight.js/lib/languages/xml";
import json from "highlight.js/lib/languages/json";
import "highlight.js/styles/github-dark.css";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", cpp);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("json", json);

interface RichTextRendererProps {
  text: string;
  className?: string;
}

type Segment =
  | { type: "text"; content: string }
  | { type: "latex-block"; content: string }
  | { type: "latex-inline"; content: string }
  | { type: "code"; lang: string; content: string }
  | { type: "table"; headers: string[]; rows: string[][] };

const TABLE_RE = /(^|\n)([^\n]*\|[^\n]*)\n([ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(?:\|[ \t]*:?-{2,}:?[ \t]*)+\|?[ \t]*)\n((?:[^\n]*\|[^\n]*(?:\n|$))+)/;

function splitRow(line: string): string[] {
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|")) l = l.slice(0, -1);
  return l.split("|").map((c) => c.trim());
}

function parseSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/```(\w*)\n([\s\S]*?)```/);
    const blockLatexMatch = remaining.match(/\$\$([\s\S]*?)\$\$/);
    const inlineLatexMatch = remaining.match(/\$([^\$\n]+?)\$/);
    const tableMatch = remaining.match(TABLE_RE);
    const tableStart = tableMatch
      ? (tableMatch.index ?? 0) + (tableMatch[1] ? tableMatch[1].length : 0)
      : Infinity;

    const positions = [
      { type: "code" as const, match: codeMatch, idx: codeMatch?.index ?? Infinity },
      { type: "latex-block" as const, match: blockLatexMatch, idx: blockLatexMatch?.index ?? Infinity },
      { type: "latex-inline" as const, match: inlineLatexMatch, idx: inlineLatexMatch?.index ?? Infinity },
      { type: "table" as const, match: tableMatch, idx: tableStart },
    ].sort((a, b) => a.idx - b.idx);

    const first = positions[0];

    if (!first.match || first.idx === Infinity) {
      if (remaining) segments.push({ type: "text", content: remaining });
      break;
    }

    if (first.idx > 0) {
      segments.push({ type: "text", content: remaining.slice(0, first.idx) });
    }

    if (first.type === "code") {
      segments.push({ type: "code", lang: first.match[1] || "", content: first.match[2] });
      remaining = remaining.slice(first.idx + first.match[0].length);
    } else if (first.type === "latex-block") {
      segments.push({ type: "latex-block", content: first.match[1] });
      remaining = remaining.slice(first.idx + first.match[0].length);
    } else if (first.type === "latex-inline") {
      segments.push({ type: "latex-inline", content: first.match[1] });
      remaining = remaining.slice(first.idx + first.match[0].length);
    } else {
      const headers = splitRow(first.match[2]);
      const rows = first.match[4]
        .split("\n")
        .filter((r) => r.trim().length > 0)
        .map(splitRow);
      segments.push({ type: "table", headers, rows });
      const matchStart = first.match.index ?? 0;
      const consumed = matchStart + first.match[0].length;
      remaining = remaining.slice(consumed);
    }
  }

  return segments;
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return `<span class="text-destructive">${latex}</span>`;
  }
}

function renderCode(code: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) {
    return hljs.highlight(code, { language: lang }).value;
  }
  return hljs.highlightAuto(code).value;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderTable(headers: string[], rows: string[][]): string {
  const thead =
    "<thead><tr>" +
    headers
      .map(
        (h) =>
          `<th class="border border-border bg-muted/50 px-3 py-2 text-left text-sm font-semibold">${escapeHtml(h)}</th>`,
      )
      .join("") +
    "</tr></thead>";
  const tbody =
    "<tbody>" +
    rows
      .map(
        (r) =>
          "<tr>" +
          r
            .map(
              (c) =>
                `<td class="border border-border px-3 py-2 text-sm align-top">${escapeHtml(c)}</td>`,
            )
            .join("") +
          "</tr>",
      )
      .join("") +
    "</tbody>";
  return `<div class="my-3 overflow-x-auto"><table class="w-full border-collapse border border-border">${thead}${tbody}</table></div>`;
}

export default function RichTextRenderer({ text, className = "" }: RichTextRendererProps) {
  const html = useMemo(() => {
    if (!text) return "";
    const segments = parseSegments(text);
    return segments
      .map((seg) => {
        switch (seg.type) {
          case "text":
            return seg.content
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/\n/g, "<br/>");
          case "latex-block":
            return `<div class="my-3 text-center overflow-x-auto">${renderLatex(seg.content, true)}</div>`;
          case "latex-inline":
            return renderLatex(seg.content, false);
          case "code":
            return `<pre class="my-3 rounded-lg bg-[hsl(var(--muted))] border p-4 overflow-x-auto text-sm"><code class="hljs">${renderCode(seg.content, seg.lang)}</code></pre>`;
          case "table":
            return renderTable(seg.headers, seg.rows);
        }
      })
      .join("");
  }, [text]);

  return (
    <span
      className={`rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
