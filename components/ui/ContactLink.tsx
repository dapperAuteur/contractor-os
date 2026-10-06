// File: components/ui/ContactLink.tsx
// The public contact point on the legal and policy pages (privacy, terms, community).
//
// The address comes from NEXT_PUBLIC_CONTACT_EMAIL. These pages used to hardcode a CentenarianOS
// address; Work.WitUS is a separate app now, and its contact address is BAM's to choose, so none is
// guessed here (authoritative-values rule).
//
// FALLBACK: when NEXT_PUBLIC_CONTACT_EMAIL is unset, link to the in-app feedback page instead, the
// existing way to reach the Work.WitUS team (sign-in required).

import Link from 'next/link';

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

export default function ContactLink() {
  if (CONTACT_EMAIL) {
    return (
      <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-600 hover:underline">
        {CONTACT_EMAIL}
      </a>
    );
  }
  // Fallback: no contact email configured.
  return (
    <Link href="/dashboard/feedback" className="text-amber-600 hover:underline">
      the feedback page in your dashboard
    </Link>
  );
}
