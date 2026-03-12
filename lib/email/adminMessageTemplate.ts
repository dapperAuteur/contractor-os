// lib/email/adminMessageTemplate.ts
// HTML email template for admin → user messages (sent via Resend)

export function adminMessageTemplate({
  subject,
  body,
  siteUrl,
}: {
  subject: string;
  body: string;
  siteUrl: string;
}): string {
  // If body is already HTML (from Tiptap), use it directly; otherwise convert plain text.
  const bodyHtml = body.trimStart().startsWith('<')
    ? body
    : body
        .split('\n')
        .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin:0 0 12px">${line}</p>`))
        .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#171717;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border-radius:12px;overflow:hidden;border:1px solid #333;">
          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;">
              <p style="margin:0;color:#fbbf24;font-size:22px;font-weight:700;">WitUS</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,.6);font-size:12px;">Work.WitUS — Message from Admin</p>
            </td>
          </tr>
          <!-- Subject -->
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#f5f5f5;">${subject}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:16px 40px 32px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="${siteUrl}/dashboard/messages"
                 style="display:inline-block;padding:12px 24px;background:#d97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
                View in Dashboard
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #262626;background:#0a0a0a;color:#a3a3a3;font-size:12px;line-height:1.6;">
              You received this message because you have a Work.WitUS account.
              <br>Your WitUS account works across <a href="https://centenarianos.com" style="color:#fbbf24;text-decoration:none;">CentenarianOS</a> and <a href="https://work.witus.online" style="color:#fbbf24;text-decoration:none;">Work.WitUS</a>.
              <br><br>&copy; ${new Date().getFullYear()} WitUS. Powered by <a href="https://witus.online" style="color:#fbbf24;text-decoration:none;">WitUS.online</a>, a B4C LLC brand.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
