# RouteTracker

RouteTracker is a mileage-tracking and voucher-reimbursement web application built on **Firebase**. Employees log trips, the app calculates driving distances via Google Maps, and supervisors approve mileage vouchers through a multi-level approval chain.

## Features

- **Trip Logging** — Record trips with origin/destination addresses, auto-calculated mileage, and route maps.
- **Program Management** — Organize trips under configurable programs (admin-managed).
- **Mileage Vouchers** — Generate monthly vouchers summarizing total miles.
- **Multi-Level Approval Workflow** — Vouchers flow through Supervisor → VP → COO approval.
- **Email Notifications** — Automatic email alerts (via SendGrid) on submission, approval, and rejection.
- **AI Trip Purpose Suggestions** — OpenAI-powered suggestions for business-purpose descriptions.
- **Role-Based Access** — Admin, Supervisor, VP, COO, and standard user roles.
- **Static Route Maps** — Proxied Google Static Maps images (no API key exposure to the client).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui, Tailwind CSS, Radix UI, Lucide icons |
| Auth | Firebase Authentication (email/password) |
| Database | Cloud Firestore |
| Backend | Firebase Cloud Functions (v2, Node 20) |
| Hosting | Firebase Hosting |
| Email | SendGrid (via Cloud Function) |
| Maps | Google Maps Directions & Static Maps APIs |
| AI | OpenAI GPT-4o-mini (trip purpose suggestions) |
| Testing | Vitest, React Testing Library, Playwright |

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                   Firebase Hosting                │
│              (Vite SPA → dist/)                   │
├──────────────────────────────────────────────────┤
│               React + TypeScript                  │
│  Auth ←→ Firebase Auth                            │
│  Data ←→ Cloud Firestore                          │
│  APIs ←→ Cloud Functions (v2)                     │
├──────────────────────────────────────────────────┤
│             Firebase Cloud Functions              │
│  googleMapsRoute      – route calculation         │
│  staticMapProxy       – proxied map images        │
│  tripPurposeSuggestions – AI suggestions           │
│  sendVoucherEmail     – email notifications       │
├──────────────────────────────────────────────────┤
│              External Services                    │
│  Google Maps APIs · OpenAI · SendGrid             │
└──────────────────────────────────────────────────┘
```

All Cloud Functions authenticate callers by verifying Firebase ID tokens (`Authorization: Bearer <token>`), so only signed-in users can access backend services.

## Prerequisites

- **Node.js 20+** — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **Firebase CLI** — `npm install -g firebase-tools`
- A **Firebase project** with Authentication and Firestore enabled
- API keys for **Google Maps**, **OpenAI**, and **SendGrid** (for full functionality)

## Getting Started

### 1. Clone and Install

```sh
git clone https://github.com/AmbitiousWays16/routetracker.git
cd routetracker

# Install frontend dependencies
npm install

# Install Cloud Functions dependencies
cd functions && npm install && cd ..
```

### 2. Configure Environment Variables

Copy the example env file and fill in your Firebase project values:

```sh
cp .env.example .env
```

The `.env` file requires the following variables (see `.env.example` for details):

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_GOOGLE_MAPS_API_KEY` | Google Maps API key (client-side, for embedding) |
| `VITE_WORKER_URL` | Cloud Functions base URL, e.g. `https://us-central1-your-project.cloudfunctions.net` |

> **Note:** Never commit the `.env` file. It is already listed in `.gitignore`.

### 3. Set Up Firebase Secrets

Cloud Functions use **Firebase Secret Manager** for sensitive keys. Set each secret from the command line:

```sh
firebase functions:secrets:set GOOGLE_MAPS_API_KEY
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set SENDGRID_FROM_EMAIL
```

### 4. Deploy Firestore Indexes

The project includes composite indexes required for Firestore queries:

```sh
firebase deploy --only firestore:indexes
```

### 5. Run Locally

```sh
# Start the Vite dev server
npm run dev
```

The app will be available at `http://localhost:5173` (or the next available port).

To test Cloud Functions locally with the Firebase emulator:

```sh
cd functions
npm run serve
```

## Firestore Data Model

RouteTracker uses the following Firestore collections:

| Collection | Purpose | Key Fields |
|---|---|---|
| `trips` | Individual mileage trips | `user_id`, `date`, `fromAddress`, `toAddress`, `miles`, `program`, `businessPurpose`, `routeMapData` |
| `mileage_vouchers` | Monthly mileage voucher summaries | `user_id`, `month`, `total_miles`, `status`, `submitted_at`, `current_approver_id` |
| `approval_history` | Audit trail of voucher approvals/rejections | `voucher_id`, `approver_id`, `approver_role`, `action`, `comments` |
| `programs` | Configurable program names for categorizing trips | `name`, `created_by` |
| `profiles` | User profile information | `user_id`, `full_name`, `email`, `job_title` |
| `user_roles` | Role assignments (admin, supervisor, vp, coo) | `user_id`, `role` |

### Voucher Approval Chain

Vouchers progress through these statuses:

```
draft → pending_supervisor → pending_vp → pending_coo → approved
                  ↓                ↓              ↓
               rejected         rejected       rejected
```

At any stage an approver can reject the voucher, returning it to the employee for corrections.

## Cloud Functions

All functions are defined in `functions/src/index.ts` and deployed as Firebase Cloud Functions v2.

| Function | Method | Description |
|---|---|---|
| `googleMapsRoute` | POST | Geocodes two addresses, calculates driving distance and returns miles, route URL, and encoded polyline |
| `staticMapProxy` | GET | Proxies Google Static Maps API to return a route map image without exposing the API key to the client |
| `tripPurposeSuggestions` | POST | Uses OpenAI to generate a professional business-purpose description for a trip |
| `sendVoucherEmail` | POST | Sends voucher notification emails via SendGrid (submit, approve, reject, final approval) |

### Deploying Cloud Functions

```sh
# Build and deploy all functions
cd functions
npm run deploy

# Or from the project root
firebase deploy --only functions
```

## Deployment

### Firebase Hosting

Build the frontend and deploy to Firebase Hosting:

```sh
# Build the production bundle
npm run build

# Deploy hosting + functions together
firebase deploy

# Or deploy only hosting
firebase deploy --only hosting
```

The hosting configuration (`firebase.json`) serves the Vite-built SPA from the `dist/` directory with a catch-all rewrite to `index.html` for client-side routing.

## Testing

This project has a comprehensive testing suite. See [TESTING.md](./TESTING.md) for full documentation.

### Quick Start

```sh
# Run all unit/integration tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run E2E tests (Playwright)
npm run test:e2e
```

### Coverage

The project maintains **≥ 80% code coverage** on core business logic (`src/lib/`).

Test types include:
- **Unit Tests** — Utility functions, email service, map utilities
- **Component Tests** — React components (ProxyMapImage, TokenRedirectHandler)
- **Integration Tests** — Route calculation, authentication flows
- **E2E Tests** — Full user workflows via Playwright

## Project Structure

```
routetracker/
├── functions/              # Firebase Cloud Functions (Node 20, TypeScript)
│   └── src/index.ts        # All function definitions
├── src/
│   ├── components/         # React UI components
│   ├── contexts/           # React context providers (AuthContext)
│   ├── hooks/              # Custom hooks (useTrips, useVouchers, usePrograms, etc.)
│   ├── lib/                # Core logic (firebase.ts, mapUtils.ts, emailService.ts, utils.ts)
│   ├── pages/              # Route-level page components
│   ├── test/               # Test files and fixtures
│   └── types/              # TypeScript type definitions
├── e2e/                    # Playwright E2E tests
├── .env.example            # Environment variable template
├── firebase.json           # Firebase Hosting & Firestore config
├── firestore.indexes.json  # Firestore composite indexes
├── TESTING.md              # Detailed testing documentation
└── package.json            # Frontend dependencies and scripts
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run all unit tests (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run preview` | Preview production build locally |

## License

This project is private.

