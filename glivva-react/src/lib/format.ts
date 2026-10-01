export const inr = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const IST = 'Asia/Kolkata';

export const formatDate = (date: Date = new Date(), timeZone = IST): string => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const addDays = (days: number, date: Date = new Date(), timeZone = IST): string => {
  const current = formatDate(date, timeZone).split('-').map(Number);
  const shifted = new Date(Date.UTC(current[0], current[1] - 1, current[2] + days, 12));
  return formatDate(shifted, timeZone);
};

export const todayIST = (): string => formatDate();
export const tomorrowIST = (): string => addDays(1);
