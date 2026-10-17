// File: scripts/email-preview.ts
// Render every Work.WitUS email to .email-preview/ so you can open them in a browser.
// Run: npm run email:preview
//
// The Supabase auth templates (supabase-*.html) are the paste-ready HTML for Supabase Dashboard →
// Authentication → Email Templates. Their footer contact line uses NEXT_PUBLIC_CONTACT_EMAIL from
// your shell, so set it before running if you want an email address in the footer. Nothing is sent.
// Read the SHARED PROJECT note at the top of lib/email/supabase-templates.ts before pasting any.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderAllPreviews } from '../lib/email/templates/previews.ts';
import { SUPABASE_AUTH_TEMPLATES } from '../lib/email/supabase-templates.ts';

const out = join(process.cwd(), '.email-preview');
mkdirSync(out, { recursive: true });

const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
const previews = renderAllPreviews(contact);
const index: string[] = [];
for (const p of previews) {
  writeFileSync(join(out, `${p.key}.html`), p.html);
  if (p.text) writeFileSync(join(out, `${p.key}.txt`), `Subject: ${p.subject}\n\n${p.text}\n`);
  index.push(`<li><a href="${p.key}.html">${p.key}</a> (${p.kind}) — ${p.subject.replace(/</g, '&lt;')}${p.text ? ` · <a href="${p.key}.txt">text</a>` : ''}</li>`);
}
writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html><html lang="en"><meta charset="utf-8"><title>Work.WitUS email previews</title><body style="font-family:sans-serif;padding:24px"><h1>Work.WitUS email previews</h1><ul>${index.join('')}</ul>
<h2>Supabase subjects</h2><p><strong>Do not paste while the Supabase project is shared with CentenarianOS</strong>; that changes CentenarianOS login emails too.</p><ul>${SUPABASE_AUTH_TEMPLATES.map((t) => `<li>${t.dashboardName}: ${t.subject}</li>`).join('')}</ul></body></html>`,
);
console.log(`Wrote ${previews.length} emails to ${out}/ (open index.html)`);
