import Legal from '../components/Legal';
import type { LegalSection } from '../components/Legal';
import { SITE } from '../data/site';
import { useMeta } from '../lib/useMeta';

const SECTIONS: LegalSection[] = [
  { t: 'Information we collect', b: 'Details you give us when you book or contact us, such as name, phone, email, driving licence and ID details, and trip information. We also collect basic technical data like device and browser type.' },
  { t: 'How we use it', b: 'To confirm and manage your booking, verify eligibility, provide support, process payments and improve our service. With your consent, we may send offers, and you can opt out at any time.' },
  { t: 'Sharing', b: 'We do not sell your data. We share it only with payment providers, insurers, authorities when legally required, and partners who help us run the service under confidentiality terms.' },
  { t: 'Storage and security', b: 'We use reasonable technical and organisational safeguards and keep data only as long as needed for the purposes above or as the law requires.' },
  { t: 'Cookies and local storage', b: 'Our website uses local storage and, where enabled, cookies to remember preferences such as whether you have seen our welcome animation and to keep the site working.' },
  { t: 'Your rights', b: 'You may ask to access, correct or delete your personal data, or withdraw consent, by contacting us at the email below.' },
  { t: 'Contact', b: `Write to us at ${SITE.email} for any privacy questions.` },
];

export default function Privacy() {
  useMeta('Privacy Policy | Glivva Car Rentals', 'How we handle your information.');
  return <Legal title="Privacy policy" lead="How Glivva Car Rentals collects, uses and protects your information." sections={SECTIONS} />;
}
