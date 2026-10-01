# Glivva Car Rentals (React + TypeScript + Vite)

    npm install
    npm run dev        # local development
    npm run build      # type-check + production build into /dist
    npm run preview    # preview the production build

Edit business details in `src/data/site.ts`, marketing content (cities, steps, offers, blog, reviews) in `src/data/content.ts` and cars/prices in `src/data/fleet.ts`.
Optional hero photo: `public/assets/hero.jpg`.
Put car photos in `public/assets/cars/<id>.jpg` (ids: swift, i20, dzire, city, creta, xuv700, innova, eclass).
Deploy `dist/` to Vercel, Netlify or any static host (SPA rewrites are already configured).
Booking and contact forms save to the visitor's browser for now: connect them to your API in `Booking.tsx` and `Contact.tsx` (see TODO).
