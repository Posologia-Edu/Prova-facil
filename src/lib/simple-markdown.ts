/** Lightweight markdown-to-HTML for chat bubbles (no heavy deps). */
export function simpleMarkdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-sm">$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="underline text-primary">$1</a>')
    .replace(/\n/g, "<br/>");
}
