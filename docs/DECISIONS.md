# Decisions

## 2026-10-01

- The existing dark charcoal and gold visual language remains the source theme.
- Phase 0 changes must not invent booking, pricing, role, or database rules.
- The repository does not contain the referenced PostgreSQL schema draft, so backend migrations are blocked until that schema is supplied.
- Browser configuration is limited to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; privileged credentials stay server-side.
