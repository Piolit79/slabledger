# SLAB Ledger — Project Context

## What This App Does
Construction project management web app replacing Excel. Tracks projects, budgets, contracts, payments (5 categories), draws, and shared vendor/sub directory across all projects. 4 user roles: Admin, Bookkeeper, Employee, Client.

## Live URL
https://slab-ledger.vercel.app (set after Vercel deploy)

## GitHub
https://github.com/Piolit79/slab-ledger (create this repo)

## Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui
- **Backend/DB**: Supabase (Auth + Postgres + RLS)
- **Deployment**: Vercel
- **Data import**: Node.js xlsx script in `scripts/`

## Key Files
| File | Purpose |
|------|---------|
| `src/pages/Dashboard.tsx` | All-project summary — metric cards + project list with per-project financials |
| `src/pages/ProjectDetail.tsx` | 5-tab project view: Overview, Budget, Contracts, Payments, Draws |
| `src/pages/Vendors.tsx` | Global vendor/sub directory |
| `src/pages/Settings.tsx` | Create projects, user management instructions |
| `src/pages/Login.tsx` | Supabase auth login |
| `src/pages/ClientPortal.tsx` | Read-only client view at /client/:projectId (no vendor names) |
| `src/context/AuthContext.tsx` | Auth + role fetching from user_roles table |
| `src/components/AppSidebar.tsx` | Navigation sidebar (collapses, mobile hamburger) |
| `src/integrations/supabase/client.ts` | Supabase client (untyped for simplicity) |
| `src/integrations/supabase/types.ts` | TypeScript types for all 7 tables |
| `src/hooks/useProjects.ts` | CRUD for projects |
| `src/hooks/useVendors.ts` | CRUD for vendors |
| `src/hooks/useContracts.ts` | CRUD for contracts |
| `src/hooks/usePayments.ts` | CRUD for payments |
| `src/hooks/useDraws.ts` | CRUD for draws |
| `src/hooks/useBudget.ts` | CRUD for budget_items |
| `supabase/migrations/001_initial_schema.sql` | Full schema + RLS policies — run in Supabase SQL editor |
| `scripts/import-asd-backyard.ts` | One-time Excel data import (ASD Backyard) |

## Database Tables (7)
- `projects` — project records with draw_limit
- `vendors` — shared sub/vendor directory
- `contracts` — per project: Contract, Change Order, Credit
- `payments` — per project, 5 categories: contracted, materials_vendors, fixtures_fittings, soft_costs, field_labor
- `draws` — loan draws per project
- `budget_items` — line items by section (SITE, EXTERIOR, INTERIOR, etc.)
- `user_roles` — extends auth.users with role + optional project_id for clients

## User Roles
| Role | Access |
|------|--------|
| admin | Full access + user management |
| bookkeeper | Enter payments + view all |
| employee | View only |
| client | Read-only portal at /client/:projectId, no vendor names |

## Dashboard Metrics
- Contract Owed = Σ(Contract + Change Order) - Σ(Credits)
- Contract Balance = Owed - Paid
- Total Paid = contracted + materials + fixtures + soft_costs + field_labor
- Draw Balance = draw_limit - Σ(draws)

## Session Log

### 2026-03-05 (Session 1)
- **Built from scratch**: Full React + TypeScript + Vite + Supabase app
- All pages, hooks, components written
- Supabase migration SQL with 7 tables + RLS policies
- ASD Backyard Excel import script (scripts/import-asd-backyard.ts)
- Build passes: `npm run build` ✓
- Initial commit made — ready to push to GitHub

## Setup Instructions (First Time)
1. Create Supabase project at supabase.com
2. Run `supabase/migrations/001_initial_schema.sql` in SQL editor
3. Create first admin user in Supabase → Authentication → Users
4. Add their role: insert into user_roles (user_id, role) values ('...', 'admin')
5. Create `.env.local` with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
6. Run: `npm install && npm run dev`
7. Import ASD Backyard: `npx tsx scripts/import-asd-backyard.ts "path/to/excel.xlsx"` (needs SUPABASE_SERVICE_KEY in .env.local)
8. Push to GitHub and connect to Vercel with env vars

## Notes
- Supabase client uses untyped `as any` to avoid TS conflicts — works fine at runtime
- Tailwind v3.4.17 pinned (v4 breaks PostCSS config)
- Client portal is accessible without auth at /client/:projectId (RLS enforces data access)
- Build warning about chunk size is normal — no functional impact
