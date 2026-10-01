import type { Car } from '../data/fleet';

export const ADDONS = [
  { id: 'child', label: 'Child seat', rate: 250 },
  { id: 'gps', label: 'GPS navigation', rate: 200 },
  { id: 'km', label: 'Extra kilometre pack', rate: 500 },
] as const;
export const CHAUFFEUR_RATE = 1000;
export const GST = 0.18;

export interface QuoteInput {
  car: Car | undefined;
  from: string;
  ft: string;
  to: string;
  tt: string;
  drv: 'self' | 'chauffeur';
  addons: string[];
}

export interface Quote {
  car: Car;
  days: number;
  base: number;
  driver: number;
  addons: number;
  gst: number;
  total: number;
}

export const calculateQuote = ({ car, from, ft, to, tt, drv, addons }: QuoteInput): Quote | null => {
  const ms = new Date(`${to}T${tt}`).getTime() - new Date(`${from}T${ft}`).getTime();
  const days = Number.isFinite(ms) && ms > 0 ? Math.ceil(ms / 864e5) : 0;
  if (!car || !days) return null;
  const base = car.price * days;
  const driver = drv === 'chauffeur' ? CHAUFFEUR_RATE * days : 0;
  const addonTotal = ADDONS.filter(addon => addons.includes(addon.id)).reduce((sum, addon) => sum + addon.rate * days, 0);
  const gst = (base + driver + addonTotal) * GST;
  return { car, days, base, driver, addons: addonTotal, gst, total: base + driver + addonTotal + gst };
};
