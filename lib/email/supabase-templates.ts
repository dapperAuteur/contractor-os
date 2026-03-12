// lib/email/supabase-templates.ts
// HTML email templates for Supabase Auth email configuration.
// Copy the HTML from each export and paste into Supabase Dashboard → Authentication → Email Templates.
// Variables: {{ .ConfirmationURL }}, {{ .Token }}, {{ .SiteURL }}

const HEADER = `
          <!-- Header -->
          <tr>
            <td style="background:#0a0a0a;padding:32px 40px;">
              <p style="margin:0;color:#fbbf24;font-size:22px;font-weight:700;">WitUS</p>
              <p style="margin:6px 0 0;color:rgba(255,255,255,.6);font-size:12px;">Work.WitUS — Powered by WitUS.online</p>
            </td>
          </tr>`;

const FOOTER = `
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #262626;background:#0a0a0a;color:#a3a3a3;font-size:12px;line-height:1.6;">
              If you did not request this email, you can safely ignore it.
              <br>Your WitUS account works across <a href="https://centenarianos.com" style="color:#fbbf24;text-decoration:none;">CentenarianOS</a> and <a href="https://work.witus.online" style="color:#fbbf24;text-decoration:none;">Work.WitUS</a>.
              <br><br>&copy; ${new Date().getFullYear()} WitUS. Powered by <a href="https://witus.online" style="color:#fbbf24;text-decoration:none;">WitUS.online</a>, a B4C LLC brand.
            </td>
          </tr>`;

function wrap(title: string, bodyRows: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#171717;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#171717;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#1c1c1c;border-radius:12px;overflow:hidden;border:1px solid #333;">
${HEADER}
${bodyRows}
${FOOTER}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Confirm Signup — sent when a user signs up to verify their email.
 * Supabase variable: {{ .ConfirmationURL }}
 */
export const confirmSignup = wrap(
  'Confirm Your Email',
  `
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#f5f5f5;">Welcome to Work.WitUS</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 24px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">Thanks for signing up! Please confirm your email address to get started.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;padding:14px 28px;background:#d97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Confirm Email Address
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;color:#a3a3a3;font-size:13px;">
              Or copy and paste this link into your browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#fbbf24;word-break:break-all;">{{ .ConfirmationURL }}</a>
            </td>
          </tr>`,
);

/**
 * Magic Link — sent when a user requests a passwordless login.
 * Supabase variable: {{ .ConfirmationURL }}
 */
export const magicLink = wrap(
  'Your Sign-In Link',
  `
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#f5f5f5;">Sign In to Work.WitUS</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 24px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">Click the button below to sign in. This link expires in 24 hours and can only be used once.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;padding:14px 28px;background:#d97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Sign In
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;color:#a3a3a3;font-size:13px;">
              Or copy and paste this link into your browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#fbbf24;word-break:break-all;">{{ .ConfirmationURL }}</a>
            </td>
          </tr>`,
);

/**
 * Change Email Address — sent when a user requests to change their email.
 * Supabase variable: {{ .ConfirmationURL }}
 */
export const changeEmail = wrap(
  'Confirm Email Change',
  `
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#f5f5f5;">Confirm Your New Email</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 24px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">You requested to change your email address on Work.WitUS. Click the button below to confirm this change.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;padding:14px 28px;background:#d97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Confirm New Email
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;color:#a3a3a3;font-size:13px;">
              Or copy and paste this link into your browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#fbbf24;word-break:break-all;">{{ .ConfirmationURL }}</a>
            </td>
          </tr>`,
);

/**
 * Reset Password — sent when a user requests a password reset.
 * Supabase variable: {{ .ConfirmationURL }}
 */
export const resetPassword = wrap(
  'Reset Your Password',
  `
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#f5f5f5;">Reset Your Password</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 24px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">We received a request to reset your password. Click the button below to choose a new one.</p>
              <p style="margin:0 0 16px;color:#a3a3a3;font-size:14px;">This link expires in 24 hours. If you didn&rsquo;t request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;padding:14px 28px;background:#d97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Reset Password
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;color:#a3a3a3;font-size:13px;">
              Or copy and paste this link into your browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#fbbf24;word-break:break-all;">{{ .ConfirmationURL }}</a>
            </td>
          </tr>`,
);

/**
 * Reauthentication — sent when a user needs to verify identity for a sensitive action.
 * Supabase variable: {{ .ConfirmationURL }}
 */
export const reauthentication = wrap(
  'Verify Your Identity',
  `
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#f5f5f5;">Verify Your Identity</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 24px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">For your security, please verify your identity to continue with the requested action on Work.WitUS.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;padding:14px 28px;background:#d97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Verify Identity
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;color:#a3a3a3;font-size:13px;">
              Or copy and paste this link into your browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#fbbf24;word-break:break-all;">{{ .ConfirmationURL }}</a>
            </td>
          </tr>`,
);

/**
 * Invite User — sent when an admin invites a new user via Supabase auth.
 * Supabase variable: {{ .ConfirmationURL }}
 */
export const invite = wrap(
  "You're Invited to Work.WitUS",
  `
          <tr>
            <td style="padding:32px 40px 0;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#f5f5f5;">You&rsquo;re Invited!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 24px;color:#d4d4d4;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 16px;">You&rsquo;ve been invited to join Work.WitUS — job tracking, invoicing, and business tools for independent contractors.</p>
              <p style="margin:0 0 16px;">Click the button below to accept your invitation and set up your account.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="{{ .ConfirmationURL }}"
                 style="display:inline-block;padding:14px 28px;background:#d97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                Accept Invitation
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;color:#a3a3a3;font-size:13px;">
              Or copy and paste this link into your browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#fbbf24;word-break:break-all;">{{ .ConfirmationURL }}</a>
            </td>
          </tr>`,
);
