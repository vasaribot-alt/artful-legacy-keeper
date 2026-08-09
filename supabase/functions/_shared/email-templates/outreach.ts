// Branded HTML wrapper for outreach emails sent via Brevo.
// Mirrors the GARF monochrome design system — serif wordmark, sans body, generous spacing.

export function outreachEmailHtml(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:24px 0;">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;padding:0 32px;">
        <tr><td>
          <p style="font-family:'DM Serif Display',Georgia,'Times New Roman',serif;font-size:18px;color:#0a0a0a;letter-spacing:0.01em;margin:0 0 4px;">Global Artist Registry Foundation</p>
          <p style="font-family:'DM Sans',sans-serif;font-size:11px;text-transform:uppercase;letter-spacing:0.14em;color:#737373;margin:0 0 0;">Preserving Artist Legacies · 100-Year Plan</p>
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0 32px;" />
          <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#404040;">
            ${bodyHtml}
          </div>
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:32px 0 24px;" />
          <p style="font-family:'DM Sans',sans-serif;font-size:12px;color:#8a8a8a;line-height:1.6;margin:0;">
            Global Artist Registry Foundation — Stichting<br />
            Jan Pieterszoon Coenstraat 7, The Hague, 2595 WP, The Netherlands<br />
            <a href="https://globalartistregistry.org" style="color:#0a0a0a;text-decoration:underline;">https://globalartistregistry.org</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
