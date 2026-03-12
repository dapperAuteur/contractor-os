// app/terms/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';

export const metadata: Metadata = {
  title: 'Terms of Use | Work.WitUS',
  description: 'Terms of Use for Work.WitUS, operated by B4C LLC / AwesomeWebStore.com.',
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-gray-950 text-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Use</h1>
        <p className="text-gray-400 text-sm mb-10">
          Last updated: March 11, 2026 &nbsp;&middot;&nbsp; Operated by B4C LLC / AwesomeWebStore.com
        </p>

        <Section title="1. Acceptance of Terms">
          <p>
            By creating an account or using Work.WitUS (&quot;the Platform,&quot; &quot;we,&quot; &quot;us&quot;), you agree to
            these Terms of Use, our{' '}
            <Link href="/privacy" className="text-amber-400 hover:underline">Privacy Policy</Link>, and our{' '}
            <Link href="/community" className="text-amber-400 hover:underline">Community Code of Conduct</Link>.
            If you do not agree, do not use the Platform.
          </p>
          <p className="mt-3">
            The Platform is operated by B4C LLC and AwesomeWebStore.com. Anthony McDonald is the founder
            and operator. References to &quot;Work.WitUS,&quot; &quot;B4C LLC,&quot; &quot;AwesomeWebStore.com,&quot; and
            &quot;Anthony McDonald&quot; in these terms refer collectively to the same operating entity and its
            principals.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years old to use the Platform. By using the Platform you represent
            that you meet this requirement. If you are under 18, you may not create an account.
          </p>
        </Section>

        <Section title="3. Your Account">
          <p>
            You are responsible for maintaining the security of your account credentials. You agree not
            to share your password or allow others to access your account. You are responsible for all
            activity that occurs under your account.
          </p>
          <p className="mt-3">
            We reserve the right to suspend or terminate accounts that violate these Terms, engage in
            fraudulent activity, or misuse Platform features.
          </p>
        </Section>

        <Section title="4. Platform Description">
          <p>
            Work.WitUS is a contractor management platform that helps freelance contractors and crew
            coordinators track jobs, log time, manage invoices, scan documents, and organize work
            schedules. The Platform provides tools for:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Job tracking, time entry, and invoice generation</li>
            <li>Document scanning and data extraction using AI (Google Gemini)</li>
            <li>Multi-day scheduling with calendar-based date picking</li>
            <li>Push notifications for clock in/out and pay day reminders</li>
            <li>Job board for posting and accepting available work</li>
            <li>Mileage, expense, and trip tracking</li>
            <li>Blog and Academy for community education</li>
          </ul>
        </Section>

        <Section title="5. Financial Data — Your Responsibility">
          <p className="font-semibold text-yellow-400">
            IMPORTANT: Work.WitUS is a record-keeping and productivity tool. It is NOT an accounting
            firm, tax advisor, or financial services provider.
          </p>
          <p className="mt-3">
            Any financial data you enter — including pay rates, invoices, expenses, and mileage — is
            entered voluntarily by you. You are solely responsible for:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>The accuracy of the data you enter</li>
            <li>Tax reporting and compliance with local, state, and federal regulations</li>
            <li>Verifying invoice totals and pay calculations before submitting to clients</li>
            <li>Maintaining your own backup records for tax and legal purposes</li>
          </ul>
          <p className="mt-3">
            <strong>Work.WitUS, B4C LLC, AwesomeWebStore.com, and Anthony McDonald are held harmless
            from any claims, damages, or liability arising from your use of financial tracking tools,
            AI-generated document extractions, or any other feature of the Platform.</strong>
          </p>
        </Section>

        <Section title="6. AI-Generated Content & Document Scanning">
          <p>
            The Platform uses artificial intelligence (Google Gemini) to extract data from scanned
            documents (pay stubs, invoices, call sheets, receipts) and generate insights. AI-generated
            content:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>May be inaccurate, incomplete, or misread from source documents</li>
            <li>Should always be reviewed and verified before use</li>
            <li>Is not a substitute for professional accounting or legal advice</li>
          </ul>
          <p className="mt-3">
            You are responsible for verifying all extracted data before creating jobs, invoices, or
            time entries from scanned documents.
          </p>
        </Section>

        <Section title="7. User-Generated Content">
          <p>
            You retain ownership of content you create on the Platform (blog posts, job documents,
            incident reports, best practices). By publishing content publicly, you grant Work.WitUS a
            non-exclusive, royalty-free license to display and distribute that content through the
            Platform.
          </p>
          <p className="mt-3">
            You agree not to post content that is: unlawful, defamatory, harassing, sexually explicit,
            or that infringes on the intellectual property rights of others. We reserve the right to
            remove content that violates these standards or our{' '}
            <Link href="/community" className="text-amber-400 hover:underline">Community Code of Conduct</Link>.
          </p>
        </Section>

        <Section title="8. Job Board & Shared Information">
          <p>
            When you post a job publicly on the job board, certain job details become visible to other
            users. When a replacement contractor accepts your posted job, contact information may be
            shared based on your sharing preferences.
          </p>
          <p className="mt-3">
            Work.WitUS is not a party to any employment or contractor agreement between users. We do not
            guarantee the quality, reliability, or availability of any contractor or job posting.
          </p>
        </Section>

        <Section title="9. Academy — Courses and Enrollments">
          <p>
            Work.WitUS Academy is a marketplace where independent teachers offer courses. Work.WitUS
            is the platform operator, not the employer or agent of any teacher. Course content reflects
            the views of the individual teacher, not Work.WitUS.
          </p>
          <p className="mt-3">
            Paid course enrollments are processed through Stripe. Refund eligibility is determined by
            the individual teacher&apos;s refund policy. The platform fee is non-refundable.
          </p>
        </Section>

        <Section title="10. Prohibited Uses">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Use the Platform for any unlawful purpose</li>
            <li>Scrape, harvest, or systematically extract data from the Platform</li>
            <li>Attempt to gain unauthorized access to any account, system, or network</li>
            <li>Reproduce, redistribute, or resell Platform content without written permission</li>
            <li>Impersonate another person or entity</li>
            <li>Use the Platform to send unsolicited communications (spam)</li>
            <li>Manipulate job board listings, reviews, or contractor profiles</li>
            <li>Share confidential client or employer information obtained through the Platform</li>
          </ul>
        </Section>

        <Section title="11. Intellectual Property">
          <p>
            The Work.WitUS brand, logo, platform design, and proprietary code are owned by B4C LLC /
            AwesomeWebStore.com. You may not use our trademarks or branding without written permission.
          </p>
        </Section>

        <Section title="12. Disclaimers and Limitation of Liability">
          <p>
            THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS
            OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, WORK.WITUS, B4C LLC,
            AWESOMEWEBSTORE.COM, AND ANTHONY MCDONALD DISCLAIM ALL WARRANTIES, INCLUDING FITNESS FOR A
            PARTICULAR PURPOSE AND NON-INFRINGEMENT.
          </p>
          <p className="mt-3">
            IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL
            DAMAGES ARISING FROM YOUR USE OF THE PLATFORM OR YOUR RELIANCE ON ANY CONTENT, EXTRACTION,
            CALCULATION, OR RECOMMENDATION PROVIDED THROUGH THE PLATFORM.
          </p>
        </Section>

        <Section title="13. Changes to These Terms">
          <p>
            We may update these Terms at any time. We will notify you of material changes by email or
            by displaying a notice on the Platform. Continued use after changes take effect constitutes
            your acceptance of the updated Terms.
          </p>
        </Section>

        <Section title="14. Governing Law">
          <p>
            These Terms are governed by the laws of the State of Indiana, United States, without regard
            to its conflict of law provisions.
          </p>
        </Section>

        <Section title="15. Contact">
          <p>
            Questions about these Terms? Contact us at{' '}
            <a href="mailto:hello@centenarianos.com" className="text-amber-400 hover:underline">
              hello@centenarianos.com
            </a>
            .
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
      <h2 className="text-lg font-semibold text-white mb-3">{title}</h2>
      <div className="text-gray-300 text-sm leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
