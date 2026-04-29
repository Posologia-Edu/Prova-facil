/** Lightweight markdown-to-HTML for chat bubbles (no heavy deps).
 * Supports: bold, italic, inline code, links, GFM tables, line breaks.
 */
export function simpleMarkdownToHtml(md: string): string {
  // Escape HTML first
  let text = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // ---- GFM tables ----
  // Detect blocks: header line | header line, separator line with --- and dashes, then body rows
  text = text.replace(
    /(^|\n)([^\n]*\|[^\n]*)\n([ \t]*\|?[ \t]*:?-{2,}:?[ \t]*(\|[ \t]*:?-{2,}:?[ \t]*)+\|?[ \t]*)\n((?:[^\n]*\|[^\n]*(?:\n|$))+)/g,
    (_match, lead, headerLine, _sep, _sepRest, bodyBlock) => {
      const splitRow = (line: string) => {
        let l = line.trim();
        if (l.startsWith("|")) l = l.slice(1);
        if (l.endsWith("|")) l = l.slice(0, -1);
        return l.split("|").map((c) => c.trim());
      };
      const headers = splitRow(headerLine);
      const rows = bodyBlock
        .split("\n")
        .filter((r: string) => r.trim().length > 0)
        .map(splitRow);

      const thead =
        "<thead><tr>" +
        headers.map((h) => `<th class="border border-border bg-muted/50 px-2 py-1 text-left text-xs font-semibold">${h}</th>`).join("") +
        "</tr></thead>";
      const tbody =
        "<tbody>" +
        rows
          .map(
            (r: string[]) =>
              "<tr>" +
              r
                .map(
                  (c) =>
                    `<td class="border border-border px-2 py-1 text-xs align-top">${c}</td>`
                )
                .join("") +
              "</tr>"
          )
          .join("") +
        "</tbody>";

      return `${lead}<div class="my-2 overflow-x-auto"><table class="w-full border-collapse border border-border text-xs">${thead}${tbody}</table></div>`;
    }
  );

  // Inline formatting (skip inside table HTML — already emitted as HTML, regexes below are safe)
  text = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="underline text-primary">$1</a>');

  // Convert remaining newlines to <br/>, but NOT inside our generated table block.
  // Strategy: temporarily protect <table>...</table> blocks.
  const tables: string[] = [];
  text = text.replace(/<div class="my-2 overflow-x-auto">[\s\S]*?<\/div>/g, (m) => {
    tables.push(m);
    return `\u0000TABLE${tables.length - 1}\u0000`;
  });
  text = text.replace(/\n/g, "<br/>");
  text = text.replace(/\u0000TABLE(\d+)\u0000/g, (_m, i) => tables[Number(i)]);

  return text;
}
