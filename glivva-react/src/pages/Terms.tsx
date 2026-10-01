import Legal from '../components/Legal';
import type { LegalSection } from '../components/Legal';
import { useMeta } from '../lib/useMeta';

const SECTIONS: LegalSection[] = [
  { t: '1. Eligibility and documents', b: 'Renters must meet the minimum age, hold a valid driving licence and provide government ID and address proof at pickup. We may refuse a rental if documents cannot be verified.' },
  { t: '2. Booking and payment', b: 'A booking is confirmed only after we acknowledge it. The final amount, including taxes and extras, is shared before you pay. Payment can be made by the methods we list at confirmation.' },
  { t: '3. Security deposit', b: 'A refundable deposit is collected at pickup and returned after the vehicle is inspected, less any charges for damage, fines or fuel shortfall.' },
  { t: '4. Fuel and kilometres', b: 'Return the car with the same fuel level recorded at pickup. Kilometres above the plan limit are charged at the rate shown in your quote.' },
  { t: '5. Use of the vehicle', b: 'Only the registered renter or approved drivers may drive. The car may not be used for racing, towing, illegal activity, or driving under the influence of alcohol or drugs. Fines, tolls and challans during the rental are the renter\u2019s responsibility.' },
  { t: '6. Damage, accidents and insurance', b: 'Vehicles are insured, subject to an excess. Report any accident or damage to us immediately. Losses from negligence or a breach of these terms are not covered.' },
  { t: '7. Cancellation and refunds', b: 'Free cancellation applies up to 24 hours before pickup. Later cancellations or no-shows may be charged. Approved refunds are returned to the original payment method.' },
  { t: '8. Late returns', b: 'Late returns are charged by the hour and may affect the next customer. Please call us if you expect a delay.' },
  { t: '9. Governing law', b: 'These terms are governed by the laws of India. Disputes fall under the courts of the city where our registered office is located.' },
];

export default function Terms() {
  useMeta('Terms & Conditions | Glivva Car Rentals', 'Rental terms and conditions.');
  return <Legal title="Terms & conditions" lead="The rules that apply when you rent a car from Glivva Car Rentals." sections={SECTIONS} />;
}
