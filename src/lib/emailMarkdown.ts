// Minimal, dependency-free Markdown → HTML converter for outreach emails.
// Supports: **bold**, *italic*, headings (#, ##, ###), bullet lists (- / *),
// links [text](url), horizontal rules (---) and paragraphs / line breaks.

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = (s: string) =>
  escapeHtml(s)
    .replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/_([^_\n]+)_/g, "<em>$1</em>");

export function markdownToHtml(markdown: string): string {
  const lines = (markdown || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join("<br />")}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      out.push(`<ul>${list.map(i => `<li>${inline(i)}</li>`).join("")}</ul>`);
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { flushPara(); flushList(); continue; }
    if (/^---+$/.test(line.trim())) { flushPara(); flushList(); out.push("<hr />"); continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      const level = h[1].length + 1;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li) { flushPara(); list.push(li[1]); continue; }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return out.join("\n");
}

// Full HTML document for the email body part of an .eml file.
export function markdownToEmailHtml(markdown: string): string {
  return [
    "<!DOCTYPE html><html><body>",
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">',
    markdownToHtml(markdown),
    "</div></body></html>",
  ].join("");
}

// Plain-text fallback: strip the markdown markers.
export function markdownToPlainText(markdown: string): string {
  return (markdown || "")
    .replace(/^\s{0,3}#{1,3}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, "$1 ($2)")
    .replace(/^\s*[-*]\s+/gm, "• ");
}
