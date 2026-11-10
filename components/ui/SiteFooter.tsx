// components/ui/SiteFooter.tsx
// WitUS ecosystem footer for work.witus.online, built from the shared recipe
// (gemini/witus public/brand/footer-recipe.md; reference fly-witus and stream-witus site-footer.tsx):
// product line, Rise Wellness callout, three columns (Ecosystem, Work.WitUS, Partners & Legal),
// copyright. Palette is Work.WitUS's own: slate neutrals with amber accents. Every link the old
// six-link footer and the home page's inline footer carried is still here (BAM, 2026-11-09:
// "contractor doesn't have entire ecosystem footer").
//
// theme='dark' (default) is the slate-50 surface the public pages sit on; 'light' is white.

import Link from 'next/link';
import { LEARN_WITUS_URL } from '@/lib/ecosystem/learn-witus.mjs';

interface SiteFooterProps {
  theme?: 'dark' | 'light';
}

interface SiblingProduct {
  name: string;
  href: string;
}

// Canonical sibling list from the recipe, minus this app. Keep in step with gemini/witus lib/products.ts.
const SIBLING_PRODUCTS: SiblingProduct[] = [
  { name: 'WitUS.online', href: 'https://witus.online' },
  { name: 'WitUS Inbox', href: 'https://inbox.witus.online' },
  { name: 'CentenarianOS', href: 'https://centenarianos.com' },
  { name: 'Tour Manager OS', href: 'https://tour.witus.online' },
  { name: 'Wanderlust', href: 'https://wanderlust.witus.online' },
  { name: 'Fly.WitUS', href: 'https://fly.witus.online' },
  { name: 'FlashLearnAI', href: 'https://flashlearnai.witus.online' },
  { name: 'Learn.WitUS', href: LEARN_WITUS_URL },
  { name: 'AwesomeWebStore', href: 'https://awesomewebstore.com' },
];

// Every entry is a real route in app/. "Sign in" is the shared-rule label; the header still says
// Login until the Sign-in-label pass renames it.
const APP_LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/for', label: 'Industries' },
  { href: '/tech-roadmap', label: 'Roadmap' },
  { href: '/blog', label: 'Blog' },
  { href: '/community', label: 'Community Conduct' },
  { href: '/safety', label: 'Safety & Resources' },
  { href: '/login', label: 'Sign in' },
];

// The same address the transactional emails sign with (lib/email/templates/layout.ts). The fallback
// is the recipe's Contact address, used by fly, stream, outbox and fdac; set NEXT_PUBLIC_CONTACT_EMAIL
// to override it.
const CONTACT_HREF = `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || 'bam@awews.com'}`;

const linkClasses =
  'inline-flex items-center min-h-7 rounded text-slate-600 hover:text-amber-700 hover:underline transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600';

export default function SiteFooter({ theme = 'dark' }: SiteFooterProps) {
  const year = new Date().getFullYear();
  const surface = theme === 'dark' ? 'bg-slate-50' : 'bg-white';

  return (
    <footer className={`border-t border-slate-200 ${surface} text-slate-900`}>
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            Work<span className="text-amber-600">.WitUS</span>
          </p>
          <p className="text-xs text-slate-600">
            Job tracking, invoicing, travel, and union benefits for crew and production contractors
          </p>
        </div>

        <RiseWellnessCallout />

        <div className="grid grid-cols-1 gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-2 font-semibold text-slate-900">Ecosystem</p>
            <ul className="space-y-1">
              {SIBLING_PRODUCTS.map((p) => (
                <li key={p.href}>
                  <a href={p.href} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                    {p.name}
                    <span className="sr-only"> (opens in new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 font-semibold text-slate-900">Work.WitUS</p>
            <ul className="space-y-1">
              {APP_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClasses}>
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href={LEARN_WITUS_URL} target="_blank" rel="noopener noreferrer" className={linkClasses}>
                  Learn.WitUS guides
                  <span className="sr-only"> (opens in new tab)</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-2 font-semibold text-slate-900">Partners &amp; Legal</p>
            <ul className="space-y-1">
              <li>
                <a
                  href="https://www.centenarianos.com/safety#rise-wellness"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClasses}
                >
                  Rise Wellness
                  <span className="sr-only"> (mental-health partner, opens in new tab)</span>
                </a>
                <p className="text-xs leading-tight text-slate-600">Mental-health partner</p>
              </li>
              <li className="pt-2">
                <Link href="/terms" className={linkClasses}>
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClasses}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href={CONTACT_HREF} className={linkClasses}>
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-center text-xs text-slate-600">
          <p>
            &copy; {year} B4C LLC. An{' '}
            <a
              href="https://awesomewebstore.com"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded text-slate-700 hover:text-amber-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              AwesomeWebStore.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>{' '}
            brand. Powered by{' '}
            <a
              href="https://witus.online"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded text-slate-700 hover:text-amber-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              WitUS.online
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Rise Wellness callout, the recipe's canonical copy. Only the container and color classes are
 * swapped for Work.WitUS's palette and the app-name token (two places) reads Work.WitUS. The
 * non-affiliation disclaimer is partner-vetted: do not edit its wording.
 */
function RiseWellnessCallout() {
  const accentLink =
    'inline-flex items-center min-h-7 rounded font-medium text-amber-700 hover:underline focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600';

  return (
    <section
      aria-labelledby="rise-wellness-heading"
      className="mb-8 rounded-lg border border-amber-200 bg-amber-50/60 p-5 text-sm"
    >
      <header className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
          Mental health support
        </p>
        <h2 id="rise-wellness-heading" className="text-base font-semibold text-slate-900">
          Rise Wellness of Indiana
        </h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Independent mental health provider · Not affiliated with Work.WitUS
        </p>
      </header>

      <p className="leading-relaxed text-slate-700">
        Rise Wellness of Indiana provides compassionate, personalized,
        holistic mental health care: evidence-based medicine, trauma-informed
        care, and a whole-person approach to help you heal, grow, and thrive
        in mind, body, and spirit.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Services</p>
          <ul className="space-y-0.5 text-xs text-slate-700">
            <li>ADHD testing &amp; management (in-person and from home)</li>
            <li>Anxiety &amp; depression</li>
            <li>Maternal mental health</li>
            <li>Medication management</li>
            <li>GeneSight® genetic testing</li>
            <li>Behavioral therapy &amp; coaching</li>
            <li>Routine lab testing</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Visit or call</p>
          <address className="text-xs not-italic leading-relaxed text-slate-700">
            320 North Meridian Street<br />
            Indianapolis, IN 46204<br />
            Mon–Sat by appointment · Sun closed
          </address>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs">
            <a href="tel:+13179650299" className={accentLink}>
              317-965-0299
            </a>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <a href="https://risewellnessofindiana.com" target="_blank" rel="noopener noreferrer" className={accentLink}>
              risewellnessofindiana.com
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <a
              href="https://www.centenarianos.com/safety#rise-wellness"
              target="_blank"
              rel="noopener noreferrer"
              className={accentLink}
            >
              Full safety page
              <span className="sr-only"> on centenarianos.com (opens in new tab)</span>
            </a>
          </div>
        </div>
      </div>

      <blockquote className="mt-4 border-l-2 border-amber-300 pl-3 text-xs italic text-slate-700">
        &ldquo;At Rise Wellness, we believe everyone has the capacity to rise
        above challenges and live a fulfilling, healthy life. Our care is
        guided by the belief that healing is personal, holistic, and rooted
        in compassion.&rdquo;
        <span className="mt-1 block not-italic text-slate-600">
          Rise Wellness of Indiana
        </span>
      </blockquote>

      {/* === NON-NEGOTIABLE DISCLAIMER === Edit ONLY the app name token. */}
      <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
        Rise Wellness of Indiana is an independent organization. They are
        not affiliated with, employed by, or endorsed by Work.WitUS,
        CentenarianOS, B4C LLC, AwesomeWebStore.com, or Anthony McDonald.
        We are grateful for their collaboration on mental health safety
        resources for our community.
      </p>
    </section>
  );
}
