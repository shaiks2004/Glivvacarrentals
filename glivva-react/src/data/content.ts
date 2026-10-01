// All marketing content lives here. Replace the sample text with the client's own.

export interface City { slug: string; name: string; state: string; blurb: string; areas: string[] }
export const CITIES: City[] = [
  { slug: 'ranchi', name: 'Ranchi', state: 'Jharkhand', blurb: 'Self-drive cars for city trips, airport pickups and weekend escapes.', areas: ['City centre', 'Railway station', 'Airport', 'Main market'] },
  { slug: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha', blurb: 'Reliable cars for city travel, business trips and coastal road journeys.', areas: ['City centre', 'Railway station', 'Airport', 'Main market'] },
  { slug: 'jamshedpur', name: 'Jamshedpur', state: 'Jharkhand', blurb: 'Flexible rentals for local travel, family plans and outstation drives.', areas: ['City centre', 'Railway station', 'Airport', 'Main market'] },
  { slug: 'dhanbad', name: 'Dhanbad', state: 'Jharkhand', blurb: 'Well-kept cars for work trips, family travel and longer road journeys.', areas: ['City centre', 'Railway station', 'Airport', 'Main market'] },
];

export const STEPS = [
  { t: 'Browse and select', d: 'Choose a car and dates.' },
  { t: 'Quick verification', d: 'Share your documents online.' },
  { t: 'Confirm and pay', d: 'Review the price before payment.' },
  { t: 'Collect and drive', d: 'Meet the team and take the keys.' },
];

export const WHY = [
  { i: '\u2713', t: 'Inspected cars', d: 'Checked, clean and ready.' },
  { i: '\u26A1', t: 'Fast verification', d: 'Upload documents from your phone.' },
  { i: '\u20B9', t: 'No driver cost', d: 'Keep the trip on your terms.' },
  { i: '\u2708', t: 'Airport pickup', d: 'Collect near the airport or request delivery.' },
  { i: '\u25CE', t: 'Clear pricing', d: 'See the daily rate upfront.' },
  { i: '\u27A4', t: 'Outstation allowed', d: 'Take the car beyond the city.' },
];

export const POLICIES = [
  { i: '\u20B9', t: 'Transparent pricing', d: 'The price is shown upfront.' },
  { i: '\u26E8', t: 'Optional extra cover', d: 'Add protection when you need it.' },
  { i: '\u21BA', t: 'Clear cancellation', d: 'Review the policy before you book.' },
  { i: '\u260E', t: '24/7 roadside support', d: 'Call or WhatsApp during your rental.' },
  { i: '\u26FD', t: 'Simple fuel policy', d: 'Return the car at the agreed level.' },
  { i: '\u2605', t: 'Rated by guests', d: 'See feedback from past trips.' },
];

// Sample cards so the layout is visible. Replace with real guest reviews (or leave the array empty to hide the section).
export const REVIEWS = [
  { name: 'Guest name', text: 'Replace this with a genuine review from one of your customers about the booking and the car.' },
  { name: 'Guest name', text: 'Add a second real review here. Short, specific reviews build the most trust.' },
  { name: 'Guest name', text: 'Add a third real review here, ideally mentioning delivery, car condition or support.' },
];

export interface Offer { title: string; desc: string; code: string }
export const OFFERS: Offer[] = [
  { title: 'Weekend getaway', desc: 'Rent for a full weekend and enjoy a special flat rate on selected cars.', code: 'WEEKEND' },
  { title: 'Weekly plans', desc: 'Need a car for 7 days or more? Save more with our weekly rates.', code: 'WEEKLY' },
  { title: 'First booking', desc: 'New to Glivva? Get a welcome discount on your first self-drive rental.', code: 'WELCOME' },
];

export interface Post { slug: string; title: string; excerpt: string; date: string; body: string[] }
export const POSTS: Post[] = [
  {
    slug: 'self-drive-vs-chauffeur', title: 'Self-drive or chauffeur: which is right for your trip?', excerpt: 'A simple way to decide based on distance, group size and budget.', date: '2026-09-01',
    body: ['Self-drive gives you freedom. You choose the route, the stops and the timing, and you avoid paying for a driver\u2019s daily allowance.', 'A chauffeur makes sense for long travel days, unfamiliar roads or business trips where you want to work on the way.', 'If you love driving and the trip is under a few hundred kilometres a day, self-drive usually costs less and feels more flexible.']
  },
  {
    slug: 'first-time-self-drive-checklist', title: 'First-time self-drive checklist', excerpt: 'Documents, deposit, inspection and return: what to know before your first rental.', date: '2026-09-08',
    body: ['Carry your original driving licence and a government photo ID. Keep digital copies handy for faster verification.', 'At pickup, walk around the car with our team and note any scratches. Take photos so the condition is documented on both sides.', 'Return the car with the same fuel level and keep your handover checklist until your deposit is refunded.']
  },
  {
    slug: 'road-trip-planning-tips', title: 'Road trip planning: how far should you drive in a day?', excerpt: 'Pace your journey, plan fuel stops and pick the right car for the road.', date: '2026-09-15',
    body: ['Most drivers are comfortable with five to six hours behind the wheel. Break longer journeys into two days and enjoy the stops.', 'Plan fuel and rest stops in advance, and download offline maps in case the signal drops on remote stretches.', 'Choose a car to match the road: an SUV for hills and rough patches, a sedan for highway comfort, a hatchback for the city.']
  },
];
