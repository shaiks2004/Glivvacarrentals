export const SITE = {
  name: 'Glivva Car Rentals',
  phone: '+91 92968 79793',
  wa: '92968 79793',
  email: 'glivvacarrentals@gmail.com',
  addr: 'Your street address, City, State, PIN',
  hours: 'Open daily, 7 am to 10 pm',
};

export const SERVICES: { title: string; icon: string; desc: string; points: string[] }[] = [
  {
    title: 'Self Drive Rentals',
    icon: '🚗',
    desc: 'Flexible car hire for city commutes, business trips and quick weekend escapes.',
    points: ['Verified cars', 'Flexible pickup windows', 'No driver required'],
  },
  {
    title: 'Airport Transfers',
    icon: '✈️',
    desc: 'A smooth pickup or drop-off experience when you want zero waiting around.',
    points: ['Airport pickup', 'Doorstep delivery', 'Punctual assistance'],
  },
  {
    title: 'Corporate Travel',
    icon: '💼',
    desc: 'Reliable vehicle support for executives, teams and business guests.',
    points: ['Bulk bookings', 'Dedicated support', 'Simple billing'],
  },
];

export const FAQS: { q: string; a: string }[] = [
  { q: 'Which cities do you operate in?', a: 'We currently serve the cities listed on our website. Choose your pickup city and travel dates to see the cars available.' },
  { q: 'Do I need a driver?', a: 'No. You drive the car yourself, on your own schedule. If you would rather have a driver, ask us about chauffeur-driven options.' },
  { q: 'What documents do I need?', a: 'A valid driving licence held for at least one year and a government photo ID. Verification is done online, so there is no need to visit an office.' },
  { q: 'Is airport pickup available?', a: 'Yes. Cars can be handed over near the airport or delivered to your location. The team confirms the exact spot with you on WhatsApp.' },
  { q: 'Can I take the car on an outstation trip?', a: 'Yes. Outstation travel is allowed. Please tell us your route when you book so we can plan for it.' },
  { q: 'Is insurance included?', a: 'Every car is insured. You can add optional extra cover at checkout, and the total is shown before you pay.' },
  { q: 'What is the cancellation policy?', a: 'Free cancellation up to 24 hours before pickup. Later cancellations may carry a fee. See the full refund and cancellation policy.' },
  { q: 'What is the fuel policy?', a: 'Fuel is at the renter\u2019s expense. The car is handed over at an agreed level and should be returned at the same level.' },
];
