// Formats generated outreach letters as one plain-text block that is easy to
// copy and paste into Outlook: recipient on one line, subject on one line,
// then the letter body with the saved signature block removed (the sender adds
// their own Outlook signature).

const CONTACT_LINE = /(@|https?:\/\/|www\.|\+\d|\bwww\b)/i;

export const stripSignature = (body: string, signature?: string): string => {
  let out = (body || "").replace(/\r\n/g, "\n");

  const sig = (signature || "").replace(/\r\n/g, "\n").trim();
  if (sig) {
    out = out.split(sig).join("");
    // also try line-by-line removal for lightly reformatted signatures
    const sigLines = sig.split("\n").map(l => l.trim()).filter(Boolean);
    if (sigLines.length > 1) {
      out = out
        .split("\n")
        .filter(l => !(l.trim() && sigLines.includes(l.trim()) && CONTACT_LINE.test(l)))
        .join("\n");
    }
  }

  // Drop trailing contact-detail lines (email, website, phone) after the name.
  const lines = out.split("\n");
  while (lines.length) {
    const last = lines[lines.length - 1].trim();
    if (!last || CONTACT_LINE.test(last)) {
      lines.pop();
      continue;
    }
    break;
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
};

export interface CopyBlockInput {
  email: string;
  subject: string;
  body: string;
  signature?: string;
}

export const formatCopyBlock = ({ email, subject, body, signature }: CopyBlockInput): string =>
  [
    "Email to:",
    email || "(no email)",
    "",
    "Subject:",
    subject || "(no subject)",
    "",
    stripSignature(body, signature),
  ].join("\n");

export const formatCopyBlocks = (items: CopyBlockInput[]): string =>
  items.map(formatCopyBlock).join("\n\n" + "—".repeat(30) + "\n\n");
