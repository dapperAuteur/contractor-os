// app/safety/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { Phone, MapPin, Clock, ExternalLink, AlertTriangle, Heart, ShieldCheck } from 'lucide-react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/ui/SiteFooter';

export const metadata: Metadata = {
  title: 'Safety & Resources | JobHub',
  description:
    'Workplace safety information, disclaimers, and mental health resources for JobHub users.',
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
                JobHub is a <strong>job tracking and management tool</strong>. It is{' '}
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
                JobHub&apos;s incident report feature to document it.
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
              JobHub, B4C LLC, AwesomeWebStore.com, and Anthony McDonald are held harmless for
              any workplace incidents. See our{' '}
              <Link href="/terms" className="text-fuchsia-400 hover:underline">Terms of Use</Link> for
              full details.
            </p>
          </div>
        </section>

        {/* Incident Reporting */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-3">Documenting Incidents</h2>
          <div className="text-gray-300 text-sm leading-relaxed space-y-3">
            <p>
              JobHub provides tools to document incidents, best practices, and safety notes on each
              job. We encourage all contractors to:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Log incident reports promptly while details are fresh</li>
              <li>Share best practices with the community to help others stay safe</li>
              <li>Keep records of safety training and certifications</li>
              <li>Review past incidents before returning to a job site</li>
            </ul>
            <p>
              <strong className="text-white">Important:</strong> JobHub&apos;s incident report
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

        {/* Rise Wellness */}
        <section id="rise-wellness" className="mb-10 scroll-mt-20">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-fuchsia-400" />
            <h2 className="text-xl font-semibold text-white">Mental Health Support</h2>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Rise Wellness of Indiana</h3>
            <p className="text-fuchsia-300 text-xs font-medium mb-4 uppercase tracking-wide">
              Independent Mental Health Provider — Not affiliated with JobHub
            </p>

            <p className="text-gray-300 text-sm leading-relaxed mb-4">
              Contract work can be demanding on your mental health — irregular schedules, physical
              labor, and financial uncertainty take a toll. Rise Wellness of Indiana provides
              compassionate, personalized mental health care to help you heal, grow, and thrive.
            </p>

            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-100 mb-2">Services offered:</h4>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-400">
                <li>• ADHD Testing &amp; Management</li>
                <li>• Anxiety &amp; Depression</li>
                <li>• Maternal Mental Health</li>
                <li>• Medication Management</li>
                <li>• GeneSight® Genetic Testing</li>
                <li>• Behavioral Therapy &amp; Coaching</li>
                <li>• Comprehensive ADHD Testing (from home)</li>
                <li>• Routine Lab Testing</li>
              </ul>
            </div>

            <div className="space-y-2 mb-5 text-sm">
              <div className="flex items-start gap-2 text-gray-300">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-gray-500" />
                <span>320 North Meridian Street, Indianapolis, IN 46204</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-4 h-4 shrink-0 text-gray-500" />
                <span>Monday – Saturday by appointment &nbsp;&middot;&nbsp; Sunday closed</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Phone className="w-4 h-4 shrink-0 text-gray-500" />
                <a
                  href="tel:+13179650299"
                  className="text-fuchsia-400 font-semibold hover:underline"
                >
                  317-965-0299
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="tel:+13179650299"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg font-semibold text-sm transition"
              >
                <Phone className="w-4 h-4" />
                Call Rise Wellness
              </a>
              <a
                href="https://risewellnessofindiana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg font-semibold text-sm transition"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </a>
            </div>

            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              Rise Wellness of Indiana is an independent organization. They are not affiliated with,
              employed by, or endorsed by JobHub, B4C LLC, AwesomeWebStore.com, or Anthony
              McDonald. We are grateful for their collaboration on mental health safety resources for
              our community.
            </p>
          </div>
        </section>

        </div>
      </main>
      <SiteFooter />
    </>
  );
}
