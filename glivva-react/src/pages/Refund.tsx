import Legal from '../components/Legal';
import type { LegalSection } from '../components/Legal';
import { useMeta } from '../lib/useMeta';

const SECTIONS: LegalSection[] = [
  { t: 'Cancelling your booking', b: 'You can cancel from your booking confirmation or by contacting us. Free cancellation applies up to 24 hours before the scheduled pickup time.' },
  { t: 'Late cancellations and no-shows', b: 'Cancellations within 24 hours of pickup and no-shows may be charged a fee, up to the first day\u2019s rental. The exact amount is shown in your booking confirmation.' },
  { t: 'Refund timelines', b: 'Eligible refunds are initiated within 3 to 5 working days to the original payment method. Your bank may take additional time to show the credit.' },
  { t: 'Security deposit', b: 'The security deposit is refunded after the car is returned and inspected, less any charges for damage, fines or fuel shortfall.' },
  { t: 'Changing your dates', b: 'You can request a change of dates up to 24 hours before pickup, subject to availability. Any difference in rental price will be shown before you confirm.' },
];

export default function Refund() {
  useMeta('Refund & Cancellation | Glivva Car Rentals', 'Our refund and cancellation policy.');
  return <Legal title="Refund & cancellation policy" lead="What happens when plans change." sections={SECTIONS} />;
}
