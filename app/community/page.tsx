// app/community/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';

export const metadata: Metadata = {
  title: 'Community Conduct | Work.WitUS',
  description: 'Community guidelines and code of conduct for Work.WitUS, operated by B4C LLC / AwesomeWebStore.com.',
};

export default function CommunityPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-gray-950 text-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Community Code of Conduct</h1>
        <p className="text-gray-400 text-sm mb-10">
          Last updated: March 11, 2026 &nbsp;&middot;&nbsp; Operated by B4C LLC / AwesomeWebStore.com
        </p>

        <Section title="1. Purpose">
          <p>
            Work.WitUS is a professional platform for contractors, listers, and crew coordinators to manage
            jobs, track time, share knowledge, and build community. This Code of Conduct ensures a safe,
            respectful, and productive environment for all users.
          </p>
        </Section>

        <Section title="2. Expected Behavior">
          <p>All community members are expected to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Treat all users with respect, professionalism, and courtesy</li>
            <li>Communicate constructively in blog posts, comments, and reviews</li>
            <li>Share accurate and honest information about jobs, experiences, and best practices</li>
            <li>Respect the privacy and confidentiality of other users, clients, and employers</li>
            <li>Support fellow contractors by sharing safety tips, incident reports, and lessons learned</li>
            <li>Follow all applicable laws and regulations related to your profession</li>
          </ul>
        </Section>

        <Section title="3. Prohibited Behavior">
          <p>The following behaviors are not tolerated:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Harassment, discrimination, or hate speech based on race, gender, age, religion, disability, sexual orientation, or any protected characteristic</li>
            <li>Bullying, threats, intimidation, or personal attacks</li>
            <li>Sharing false, misleading, or defamatory information about other users or companies</li>
            <li>Posting spam, unsolicited advertisements, or promotional content outside designated areas</li>
            <li>Sharing confidential client or employer information without authorization</li>
            <li>Impersonating another person, contractor, or organization</li>
            <li>Posting content that is obscene, violent, or illegal</li>
            <li>Attempting to manipulate reviews, ratings, or job board listings</li>
            <li>Using the platform to engage in fraudulent activity</li>
          </ul>
        </Section>

        <Section title="4. Job Board & Public Listings">
          <p>
            When posting or accepting jobs on the public board, you agree to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Provide accurate job details, pay rates, and scheduling information</li>
            <li>Honor commitments made through the platform</li>
            <li>Communicate promptly about schedule changes or cancellations</li>
            <li>Not use the platform to undercut or unfairly compete with other contractors</li>
            <li>Respect shared contact information and use it only for its intended purpose</li>
          </ul>
        </Section>

        <Section title="5. Content Guidelines">
          <p>
            User-generated content — including blog posts, comments, incident reports, and best
            practice documents — must:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Be relevant to the contractor and crew community</li>
            <li>Not contain copyrighted material without proper attribution or permission</li>
            <li>Not include personal contact information of third parties without their consent</li>
            <li>Be appropriate for a professional audience</li>
          </ul>
        </Section>

        <Section title="6. Safety Reporting">
          <p>
            Work.WitUS encourages users to document workplace incidents, safety concerns, and best
            practices through the job documents feature. When reporting incidents:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Be factual and objective in your descriptions</li>
            <li>Do not include identifying information about individuals unless necessary for safety</li>
            <li>Report any immediate safety hazards to the appropriate authorities first</li>
            <li>Use incident reports to help the community learn and improve safety standards</li>
          </ul>
        </Section>

        <Section title="7. Enforcement">
          <p>
            Violations of this Code of Conduct may result in:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Warning</strong> — a private message explaining the violation</li>
            <li><strong>Content removal</strong> — offending posts or listings may be removed</li>
            <li><strong>Temporary suspension</strong> — access restricted for a defined period</li>
            <li><strong>Permanent ban</strong> — account terminated for serious or repeated violations</li>
          </ul>
          <p className="mt-3">
            We reserve the right to take action at our discretion. Decisions may be appealed by
            contacting us at{' '}
            <a href="mailto:hello@centenarianos.com" className="text-amber-400 hover:underline">
              hello@centenarianos.com
            </a>.
          </p>
        </Section>

        <Section title="8. Reporting Violations">
          <p>
            If you witness or experience a violation of this Code of Conduct, please report it to{' '}
            <a href="mailto:hello@centenarianos.com" className="text-amber-400 hover:underline">
              hello@centenarianos.com
            </a>{' '}
            with as much detail as possible. All reports are reviewed confidentially.
          </p>
        </Section>

        <Section title="9. Relationship to Other Policies">
          <p>
            This Code of Conduct works alongside our{' '}
            <Link href="/terms" className="text-amber-400 hover:underline">Terms of Use</Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-amber-400 hover:underline">Privacy Policy</Link>.
            In the event of a conflict, the Terms of Use take precedence.
          </p>
        </Section>

        <Section title="10. Changes">
          <p>
            We may update this Code of Conduct as our community grows. Material changes will be
            communicated through the platform. Continued use after changes constitutes acceptance.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions or concerns? Reach us at{' '}
            <a href="mailto:hello@centenarianos.com" className="text-amber-400 hover:underline">
              hello@centenarianos.com
            </a>.
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
