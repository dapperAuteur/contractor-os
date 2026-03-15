// app/privacy/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';

export const metadata: Metadata = {
  title: 'Privacy Policy | Work.WitUS',
  description: 'Privacy Policy for Work.WitUS, operated by B4C LLC / AwesomeWebStore.com.',
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">
          Last updated: March 11, 2026 &nbsp;&middot;&nbsp; Operated by B4C LLC / AwesomeWebStore.com
        </p>

        <Section title="1. Who We Are">
          <p>
            Work.WitUS (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is a contractor management and job tracking platform
            operated by B4C LLC and AwesomeWebStore.com, founded by Anthony McDonald. This Privacy
            Policy explains how we collect, use, store, and protect your personal information.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <h3 className="font-medium text-slate-900 mb-1">Account Information</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Email address</li>
            <li>Display name and username</li>
            <li>Profile photo (optional)</li>
            <li>Billing information (processed by Stripe — we do not store card numbers)</li>
          </ul>

          <h3 className="font-medium text-slate-900 mt-4 mb-1">Job & Financial Data</h3>
          <p>
            When you use Work.WitUS to track your work, we store the data you enter, including:
            job details, client names, time entries, pay rates, invoices, expenses, mileage logs,
            and estimated pay dates.
          </p>
          <p className="mt-2">
            <strong>This data is private by default.</strong> Only you can see your jobs and
            financial data unless you explicitly choose to post a job on the public board.
          </p>

          <h3 className="font-medium text-slate-900 mt-4 mb-1">Scanned Documents</h3>
          <p>
            When you use the document scanner, images are sent to our server for AI processing.
            Based on your settings, scanned images may or may not be saved to your account. Extracted
            data (text fields, amounts, dates) is stored as part of your job records.
          </p>

          <h3 className="font-medium text-slate-900 mt-4 mb-1">Content You Create</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Blog posts and comments</li>
            <li>Job documents (incident reports, best practices, notes)</li>
            <li>Course enrollment and lesson progress</li>
            <li>Feedback you submit to the platform</li>
          </ul>

          <h3 className="font-medium text-slate-900 mt-4 mb-1">Push Notification Data</h3>
          <p>
            If you enable push notifications, we store your browser push subscription endpoint
            and device user agent to deliver notifications. You can disable notifications at any
            time in Settings.
          </p>

          <h3 className="font-medium text-slate-900 mt-4 mb-1">Usage Data</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>Page views and feature usage (collected by Vercel Analytics, anonymized)</li>
            <li>Device type and browser</li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc pl-5 space-y-1">
            <li>To operate and improve the Platform</li>
            <li>To process document scans and generate data extractions</li>
            <li>To send push notifications for job reminders (clock in, pay day, etc.)</li>
            <li>To process payments and manage subscriptions through Stripe</li>
            <li>To send transactional emails (account creation, billing)</li>
            <li>To display your public content (blog posts, public job listings)</li>
            <li>To analyze how features are used so we can improve them</li>
          </ul>
          <p className="mt-3">
            We do not sell your personal information to third parties.
          </p>
        </Section>

        <Section title="4. AI-Powered Features">
          <p>
            Document scanning and data extraction use Google Gemini, an AI service operated by
            Google. When you scan a document:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>The document image is sent to Google&apos;s API for text extraction</li>
            <li>Your name, email, and account ID are never included in AI prompts</li>
            <li>Google&apos;s data handling is governed by the{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 hover:underline"
              >
                Google Privacy Policy
              </a>
            </li>
          </ul>
        </Section>

        <Section title="5. Service Providers (Data Processors)">
          <p>We share data with the following trusted service providers only as necessary to operate the Platform:</p>
          <div className="mt-3 space-y-2">
            <Provider name="Supabase" purpose="Database hosting and authentication (PostgreSQL + row-level security)" />
            <Provider name="Stripe" purpose="Payment processing and subscription management" />
            <Provider name="Cloudinary" purpose="Media storage (images and documents you upload)" />
            <Provider name="Google Gemini" purpose="AI-powered document scanning and data extraction" />
            <Provider name="Vercel" purpose="Platform hosting, edge functions, and analytics" />
          </div>
          <p className="mt-3">
            Each provider is contractually bound to protect your data and use it only for the services
            they provide to us.
          </p>
        </Section>

        <Section title="6. Financial Data — Special Protections">
          <p>
            Job data, time entries, invoices, and financial records you enter are stored in your
            private account only. This data is:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Protected by row-level security — only you and authorized server processes can read it</li>
            <li>Never shared with other users without your explicit consent (e.g., posting a job publicly)</li>
            <li>Not used for advertising or profiling</li>
            <li>Accessible to you in full — you can export or delete it at any time</li>
          </ul>
        </Section>

        <Section title="7. Cookies and Session Storage">
          <p>
            We use session cookies required for authentication (managed by Supabase Auth). We do not
            use third-party advertising cookies. Vercel Analytics uses anonymized, cookie-free
            analytics that does not track individuals across sites.
          </p>
        </Section>

        <Section title="8. Offline Data & Service Worker">
          <p>
            Work.WitUS works offline using a service worker and IndexedDB. Data created while offline
            is stored locally on your device and synced to the server when connectivity is restored.
            This local data is not accessible to other websites or applications.
          </p>
        </Section>

        <Section title="9. Data Retention">
          <p>
            We retain your account data for as long as your account is active. If you delete your
            account, your personal data (profile, jobs, financial records, and private content) is
            deleted within 30 days. Public content (blog posts you published) may be retained in
            anonymized form unless you explicitly request full deletion.
          </p>
        </Section>

        <Section title="10. Your Rights">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Access:</strong> Request a copy of the data we hold about you</li>
            <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
            <li><strong>Deletion:</strong> Request deletion of your account and personal data</li>
            <li><strong>Portability:</strong> Export your job and financial data</li>
            <li><strong>Opt-out:</strong> Disable push notifications, scan image saving, or public job listings at any time</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, email us at{' '}
            <a href="mailto:hello@centenarianos.com" className="text-amber-600 hover:underline">
              hello@centenarianos.com
            </a>
            .
          </p>
        </Section>

        <Section title="11. Children's Privacy">
          <p>
            The Platform is not directed at children under 18. We do not knowingly collect personal
            information from minors. If you believe a minor has created an account, contact us for
            immediate removal.
          </p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>
            We may update this Privacy Policy periodically. Material changes will be communicated by
            email or by a notice on the Platform. Your continued use after changes take effect
            constitutes acceptance.
          </p>
        </Section>

        <Section title="13. Contact">
          <p>
            Privacy questions or requests:{' '}
            <a href="mailto:hello@centenarianos.com" className="text-amber-600 hover:underline">
              hello@centenarianos.com
            </a>
            <br />
            B4C LLC / AwesomeWebStore.com — Indianapolis, Indiana, USA
          </p>
          <p className="mt-3">
            See also: <Link href="/terms" className="text-amber-600 hover:underline">Terms of Use</Link> | <Link href="/community" className="text-amber-600 hover:underline">Community Code of Conduct</Link>
          </p>
        </Section>

        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-slate-900 mb-3">{title}</h2>
      <div className="text-slate-700 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Provider({ name, purpose }: { name: string; purpose: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-slate-900 font-medium w-28 shrink-0">{name}</span>
      <span className="text-slate-500">{purpose}</span>
    </div>
  );
}
