export type Category = 'Hatchback' | 'Sedan' | 'SUV' | 'MPV' | 'Luxury';
export interface Car { id: string; name: string; cat: Category; seats: number; fuel: string; gear: string; price: number }

// Sample data: replace with your real fleet and prices.
export const FLEET: Car[] = [
  { id: 'swift', name: 'Maruti Swift', cat: 'Hatchback', seats: 5, fuel: 'Petrol', gear: 'Manual', price: 1800 },
  { id: 'i20', name: 'Hyundai i20', cat: 'Hatchback', seats: 5, fuel: 'Petrol', gear: 'Manual / Auto', price: 2200 },
  { id: 'dzire', name: 'Maruti Dzire', cat: 'Sedan', seats: 5, fuel: 'Petrol', gear: 'Manual', price: 2200 },
  { id: 'city', name: 'Honda City', cat: 'Sedan', seats: 5, fuel: 'Petrol', gear: 'Automatic', price: 3200 },
  { id: 'creta', name: 'Hyundai Creta', cat: 'SUV', seats: 5, fuel: 'Diesel', gear: 'Automatic', price: 3800 },
  { id: 'xuv700', name: 'Mahindra XUV700', cat: 'SUV', seats: 7, fuel: 'Diesel', gear: 'Automatic', price: 5200 },
  { id: 'innova', name: 'Toyota Innova Crysta', cat: 'MPV', seats: 7, fuel: 'Diesel', gear: 'Manual', price: 4800 },
  { id: 'eclass', name: 'Mercedes-Benz E-Class', cat: 'Luxury', seats: 5, fuel: 'Petrol', gear: 'Automatic', price: 12500 },
];
export const FEATURED = ['swift', 'creta', 'xuv700', 'innova', 'city', 'eclass'];
export const CATEGORIES: ('All' | Category)[] = ['All', 'Hatchback', 'Sedan', 'SUV', 'MPV', 'Luxury'];
