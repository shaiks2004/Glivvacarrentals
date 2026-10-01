# Glivva setup

## Frontend

From `glivva-react/`:

```powershell
npm install
npm run dev
```

The frontend accepts only these browser-safe variables:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never expose a Supabase service-role key, database password, private API key, or webhook secret through a `VITE_` variable. Vite embeds `VITE_` variables in the browser bundle.

## Rotate exposed credentials

The local environment previously contained credential-like values. Before any deployment:

1. Rotate the Supabase database password in the Supabase dashboard.
2. Revoke and replace any service-role or server-side API key that may have been exposed.
3. Review Supabase Auth, Storage, Edge Function, and database access logs for unexpected use.
4. Create a restricted browser anon key if the current project key is not already the anon key.
5. Put browser-safe values in `glivva-react/.env.local`, which is ignored by git.
6. Keep service-role credentials only in Supabase Edge Function secrets or the hosting provider's server-side environment.
7. Search the repository and built assets for old credential values before deployment.

## Current repository blockers

The repository does not currently include the `glivva-schema.sql` referenced by the development brief. Do not create migrations or RLS policies until the authoritative schema and business ownership rules are supplied.

Booking and contact forms currently use browser storage as a temporary development fallback. They must be connected to a server-side endpoint before production.
