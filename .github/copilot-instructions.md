# RouteTracker - AI Coding Agent Instructions

## Project Overview

RouteTracker is a mileage reimbursement tracking application with a multi-tier approval workflow. Employees log trips with distance calculations, submit vouchers for approval through a supervisor → VP → COO chain, and approvers can reject with feedback. Built with Vite + React + TypeScript, using Supabase for auth/DB and Google Maps API for route calculations.

## Architecture & Data Flow

### Core Tables (see `supabase/migrations/`)
- **trips**: User trip entries (from_address, to_address, miles, program, purpose)
- **mileage_vouchers**: Monthly submission bundles (status: draft → pending_supervisor → pending_vp → pending_coo → approved/rejected)
- **approval_history**: Audit trail of all approval actions per voucher
- **user_roles**: Role-based access control (admin, supervisor, vp, coo)
- **programs**: Shared organization programs for classification

### Key Data Constraints
- Miles validated 0-999 (CHECK constraint in migrations)
- Unique constraint: one voucher per user+month
- Row-level security (RLS) policies enforce user isolation per role

### Service Boundaries

**Frontend Architecture** (`src/`)
- Pages: `Index` (main), `Auth` (Supabase), `Approvals` (approval queue), `UserManagement` (admin only)
- Contexts: `AuthContext` wraps Supabase auth state, session persistence, signup/signin
- Hooks: `useTrips`, `usePrograms`, `useVouchers` encapsulate Supabase queries + state management
- UI: shadcn-ui components in `src/components/ui/`

**External Integrations**
- **Supabase Edge Functions** (in `supabase/functions/`):
  - `google-maps-route`: Accepts from/to addresses, calls Google Maps API, returns encoded polyline
  - `static-map-proxy`: Generates map image from route data (privacy-safe, no API keys exposed)
  - `send-approval-email`: Sends notifications on status changes
- **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## Developer Workflows

### Commands
```bash
npm run dev              # Start dev server (Vite, HMR on :8080)
npm run build            # Production build (vite build)
npm run lint             # ESLint check
npm test                 # Vitest run once
npm run test:watch       # Vitest watch mode
```

### Testing Setup (`src/test/setup.ts`)
- jsdom environment, globals enabled
- No existing test files—add `.test.ts` or `.spec.ts` files in `src/`
- Use `@testing-library/react` for component tests

### Supabase Local Development
- Run `supabase start` (requires Docker)
- Config at `supabase/config.toml` (project_id: dumhzvkifwhvdgswplew)
- Migrations auto-run on start

## Critical Patterns & Conventions

### Data Fetching Pattern
All queries use Supabase client from `src/integrations/supabase/client.ts`. Hooks (useTrips, usePrograms, useVouchers) handle:
1. User context check (`useAuth()` for auth state)
2. RLS-filtered queries (user_id auto-enforced)
3. Error handling with `toast.error()`
4. Date-based filtering (e.g., trips grouped by month via date-fns)

**Example** (`useTrips.ts`): Fetches only authenticated user's trips for selected month using `gte()`, `lte()` with date boundaries.

### Route Calculation Flow
1. TripForm calls `handleCalculateRoute()` 
2. Calls `supabase.functions.invoke('google-maps-route', { from, to, access_token })`
3. Function returns `{ encodedPolyline, startLat, startLng, endLat, endLng }` (RouteMapData)
4. Store as JSON in `static_map_url` field (legacy URL support also preserved)
5. ProxyMapImage.tsx fetches image from static-map-proxy function

### Voucher Submission State Machine
- Status enum: draft → pending_supervisor → pending_vp → pending_coo → approved/rejected
- `useVouchers.ts` implements state transitions via `getStatusAfterApproval(currentStatus, approverRole)`
- Rejections store reason in `rejection_reason` field; updates `current_approver_id` for next step
- Always update `updated_at` via database trigger for audit trail

### Component Reusability
- Form components accept `Trip[]` and callbacks (e.g., TripForm has `onSubmit`, `onCancel`)
- Dialog components use `Dialog` + `DialogContent` from shadcn-ui
- Icons from lucide-react, styles via Tailwind + shadcn tokens

### TypeScript Paths
- `@/*` resolves to `src/` (configured in `tsconfig.json`)
- Use `@/components`, `@/hooks`, `@/types`, `@/integrations` for clean imports

## Integration Points & Gotchas

### Auth Flow
- Supabase handles OAuth + password auth; `AuthContext.tsx` sets up listeners before checking session
- Token redirects (invite/recovery): `App.tsx` TokenRedirectHandler parses URL hash
- Protected routes wrap components in `ProtectedRoute` to redirect unauthenticated users to `/auth`

### RLS Security
- Policies auto-filter queries; don't bypass with `--bypass-rls` in production
- Admin operations (e.g., ProgramManager) check `isAdmin` flag from user_roles table
- Approvers see vouchers via role-specific RLS policies (check migrations for approval_history policies)

### API Key Exposure Risk
- **Don't** embed static_map_url as raw Google Maps URLs—use static-map-proxy function to generate images
- RouteMapData (encodedPolyline + lat/lng) is safe to store; proxy handles image generation server-side

### Error Handling
- Use `toast.error()` for user-facing errors (Sonner toast library)
- Console.error for debug logs (e.g., session check failures in Index.tsx)
- Always throw in catch blocks after logging

### Known Type Configuration
- `noImplicitAny: false`, `strictNullChecks: false` in tsconfig—intentional lenience for rapid development
- Types generated from Supabase: `src/integrations/supabase/types.ts` (auto-generated, don't edit)

## Common Tasks & Where to Find Them

| Task | Location |
|------|----------|
| Add new program field | Update trips table migration + Trip type + TripForm.tsx |
| Change approval flow | Update voucher_status enum migration + getStatusAfterApproval logic in types/voucher.ts |
| New page/route | Add to src/pages/, add Route in App.tsx, add NavLink if needed |
| Admin-only feature | Check isAdmin from usePrograms hook, wrap with RLS policy |
| New Supabase query | Add to relevant hook (useTrips, usePrograms, useVouchers) |
| Email notification | Update send-approval-email function in supabase/functions/ |

## Notes for AI Agents

- Always check `user` context before queries; null checks prevent runtime errors
- Date filtering uses date-fns; month boundaries via `startOfMonth()` / `endOfMonth()`
- Component state lives in hooks; keep components pure and dumb
- Migrations are append-only; rollback requires manual deletion (backup first)
- Test locally with `supabase start` before pushing
