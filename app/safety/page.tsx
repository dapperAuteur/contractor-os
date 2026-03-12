// app/safety/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Heart, ShieldCheck } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';

export const metadata: Metadata = {
  title: 'Safety & Resources | Work.WitUS',
  description:
    'Workplace safety information, disclaimers, and mental health resources for Work.WitUS users.',
};

export default function SafetyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-gray-950 text-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Safety &amp; Resources</h1>
        <p className="text-gray-400 text-sm mb-10">
          Your safety on the job matters. Resources and guidelines for contractors and crew.
        </p>

        {/* Workplace Safety */}
        <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-amber-300 mb-2">Workplace Safety</h2>
              <p className="text-amber-100/80 text-sm leading-relaxed">
                Work.WitUS is a <strong>job tracking and management tool</strong>. It is{' '}
                <strong>NOT a safety compliance service or legal advisor</strong>. Always follow
                your employer&apos;s safety protocols, OSHA guidelines, and local regulations on every
                job site. Your safety is your responsibility.
              </p>
            </div>
          </div>
        </div>

        {/* On-Site Safety Tips */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">On-Site Safety Guidelines</h2>
          <div className="text-gray-300 text-sm leading-relaxed space-y-3">
            <p>
              Whether you&apos;re working events, construction, production, or any other contract
              gig, keep these fundamentals in mind:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="text-white">Know your environment.</strong> Familiarize yourself
                with the job site, emergency exits, first aid kits, and fire extinguishers before
                starting work.
              </li>
              <li>
                <strong className="text-white">Wear proper PPE.</strong> Use personal protective
                equipment appropriate for your role — hard hats, safety glasses, gloves, ear
                protection, high-visibility vests, and steel-toed boots as required.
              </li>
              <li>
                <strong className="text-white">Report hazards immediately.</strong> If you see an
                unsafe condition, report it to your supervisor or crew coordinator right away. Use
                Work.WitUS&apos;s incident report feature to document it.
              </li>
              <li>
                <strong className="text-white">Stay hydrated and rested.</strong> Long shifts in
                demanding conditions require adequate rest and hydration. Know the signs of heat
                exhaustion and fatigue.
              </li>
              <li>
                <strong className="text-white">Communicate clearly.</strong> Use radios, hand
                signals, or other communication methods established by your crew. Never assume
                someone else has communicated a hazard.
              </li>
            </ul>
            <p>
              Work.WitUS, B4C LLC, AwesomeWebStore.com, and Anthony McDonald are held harmless for
              any workplace incidents. See our{' '}
              <Link href="/terms" className="text-amber-400 hover:underline">Terms of Use</Link> for
              full details.
            </p>
          </div>
        </section>

        {/* Incident Reporting */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Documenting Incidents</h2>
          <div className="text-gray-300 text-sm leading-relaxed space-y-3">
            <p>
              Work.WitUS provides tools to document incidents, best practices, and safety notes on each
              job. We encourage all contractors to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Log incident reports promptly while details are fresh</li>
              <li>Share best practices with the community to help others stay safe</li>
              <li>Keep records of safety training and certifications</li>
              <li>Review past incidents before returning to a job site</li>
            </ul>
            <p>
              <strong className="text-white">Important:</strong> Work.WitUS&apos;s incident report
              feature is for personal record-keeping. For workplace injuries, always file official
              reports with your employer, workers&apos; compensation carrier, and OSHA as required
              by law.
            </p>
          </div>
        </section>

        {/* Emergency Numbers */}
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-5 mb-10">
          <h2 className="text-base font-semibold text-red-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Emergency Contacts
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-red-100/80">
            <li>
              <strong className="text-white">Emergency</strong> — Call{' '}
              <a href="tel:911" className="text-red-300 font-bold hover:underline">911</a> for
              immediate danger, injury, or medical emergency
            </li>
            <li>
              <strong className="text-white">OSHA Safety Hotline</strong> — Call{' '}
              <a href="tel:18003216742" className="text-red-300 font-bold hover:underline">1-800-321-OSHA (6742)</a> to
              report unsafe working conditions
            </li>
            <li>
              <strong className="text-white">988 Suicide &amp; Crisis Lifeline</strong> — Call or text{' '}
              <a href="tel:988" className="text-red-300 font-bold hover:underline">988</a> (US)
            </li>
          </ul>
        </div>

        {/* Mental Health Resources */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-semibold text-white">Mental Health Support</h2>
          </div>
          <div className="text-gray-300 text-sm leading-relaxed space-y-3">
            <p>
              Contract work can be demanding on your mental health — irregular schedules, physical
              labor, and financial uncertainty take a toll. If you or someone you know is struggling,
              please reach out to a qualified mental health professional.
            </p>
            <p>
              The <strong className="text-white">988 Suicide &amp; Crisis Lifeline</strong> is available
              24/7 by calling or texting <a href="tel:988" className="text-amber-400 font-semibold hover:underline">988</a> (US).
            </p>
          </div>
        </section>

        </div>
      </main>
      <SiteFooter />
    </>
  );
}
