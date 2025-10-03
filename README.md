# Carbon Credit App

A modern web application for exploring, analyzing, and trading carbon credits. Built with Next.js, React, TypeScript, Prisma, and Tailwind CSS.

## Features

- Interactive map for visualizing carbon credit projects
- Marketplace for trading carbon credits
- Analytics dashboard
- User authentication (with roles: admin, user)
- Admin panel for managing forests, credits, orders, and users
- Full CRUD for forests, credits, and orders
- Real-time order and payment status tracking (with audit trail)
- Admin panel displays full order history (status changes, payment events, failures, etc.)
- Real-time notification system with WebSocket support
- Toast notifications with variants
- Responsive design for mobile and desktop
- Robust API with full test coverage (Vitest)

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Prisma](https://www.prisma.io/) ORM + MySQL
- [Tailwind CSS](https://tailwindcss.com/)
- [SWR](https://swr.vercel.app/) for data fetching
- [Socket.IO](https://socket.io/) for real-time notifications
- [Stripe](https://stripe.com/) for payment processing
- [Vitest](https://vitest.dev/) for testing

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (v8 or higher)
- MySQL database (local or remote)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nghiatran0401/carbon-credit-app.git
   cd carbon-credit-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in `.env`:

   ```env
   # Database Configuration
   DATABASE_URL="mysql://user:password@localhost:3306/carbon_credit"

   # Stripe Configuration
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."

   # Application URLs
   NEXT_PUBLIC_BASE_URL="http://localhost:3000"

   # Blockchain (Cart transparency logging)
   # Local Ganache example
   BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"
   # Private key of the account used to send logging transactions (DO NOT COMMIT)
   BLOCKCHAIN_PRIVATE_KEY="0xabc123..."
   # Address of deployed CartLogger contract (after truffle migrate)
   CART_LOGGER_ADDRESS="0x..."
   # Token transfer (on payment completion)
   SELLER_PRIVATE_KEY="0x..."           # Private key holding initial CarbonToken supply
   CARBON_TOKEN_ADDRESS="0x..."         # Deployed CarbonToken contract address
   DEFAULT_BUYER_WALLET_ADDRESS="0x..." # Optional fallback if user.walletAddress not set
   ```

### Database Setup

1. Push the schema to your database:
   ```bash
   npx prisma db push
   ```
2. (Optional) Seed the database with initial data:
   ```bash
   npx tsx prisma/seed.ts
   ```

### Performance Testing with Large Dataset

For performance testing and stress testing the application, you can use different seed presets to generate realistic data at various scales:

#### Available Presets

```bash
# Small dataset (quick testing)
npm run migrate:small

# Medium dataset (integration testing)
npm run migrate:medium

# Large dataset (performance testing) - DEFAULT
npm run migrate:large

# Extra large dataset (stress testing)
npm run migrate:extra-large
```

#### Data Volumes by Preset

| Preset      | Users | Forests | Credits | Orders | Notifications | Total Records |
| ----------- | ----- | ------- | ------- | ------ | ------------- | ------------- |
| Small       | 100   | 50      | 800     | 500    | 1,000         | ~3,000        |
| Medium      | 500   | 250     | 3,000   | 2,500  | 12,500        | ~25,000       |
| Large       | 1,000 | 500     | 4,000   | 5,000  | 50,000        | ~100,000      |
| Extra Large | 5,000 | 1,000   | 10,000  | 25,000 | 500,000       | ~600,000      |

#### Large Preset Details (Default)

The large preset creates:

- **1,000 users** (90% regular users, 10% admins)
- **500 forests** across Vietnam with realistic locations and types
- **4,000 carbon credits** (8 per forest across 4 years with 2 certifications each)
- **16,000 exchange rates** (4 per credit)
- **5,000 orders** with realistic statuses and payment flows
- **5,000 payments** for completed orders
- **15,000 order history entries** (3 per order)
- **50,000 notifications** (50 per user)
- **10,000 bookmarks** (10 per user)
- **5,000 cart items** (5 per user)
- **~2,500 certificates** (for completed orders)

The seed uses [Faker.js](https://fakerjs.dev/) to generate realistic data.

**⚠️ Warning**: The extra-large preset will generate approximately **600,000+ database records** and may take 10-15 minutes to complete. Ensure your database can handle this volume of data.

### Database Management with Prisma Studio

Prisma Studio provides a visual interface to view and edit your database data:

```bash
npx prisma studio
```

This will open Prisma Studio in your browser (usually at `http://localhost:5555`), where you can:

- Browse and edit all database tables
- View relationships between models
- Add, edit, or delete records
- Filter and sort data
- Export data in various formats

**Note**: Prisma Studio is a development tool and should not be used in production environments.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

### Running Tests

To run all tests:

```bash
npm test
```

To launch the interactive Vitest UI:

```bash
npm run test:ui
```

Vitest will run all tests in the `tests/` directory, including full CRUD API tests, payment flows, and order history/audit trail.

## Project Structure

- `src/app/` - Application pages and layouts (Next.js App Router)
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and API helpers
- `src/types/` - Shared TypeScript types/interfaces (matches Prisma schema)
- `prisma/` - Prisma schema and seed script
- `public/` - Static assets
- `tests/` - API and integration tests (Vitest)

## API Endpoints

All API routes are under `/api/` and follow RESTful conventions. Example endpoints:

- **Forests:** `/api/forests` (GET, POST, PUT, DELETE)
- **Credits:** `/api/credits` (GET, POST, PUT, DELETE)
- **Orders:** `/api/orders` (GET, POST, PUT, DELETE)
- **Users:** `/api/users` (GET)
- **Auth:** `/api/auth/login` (POST), `/api/auth/register` (POST)
- **Notifications:** `/api/notifications` (GET, POST), `/api/notifications/[id]` (PUT), `/api/notifications/mark-all-read` (POST)
- **Cart:** `/api/cart` (GET, POST, PUT, DELETE)
- **Bookmarks:** `/api/bookmarks` (GET, POST, DELETE)
- **Certificates:** `/api/certificates` (GET, POST)
- **Webhooks:** `/api/webhook` (POST) - Stripe payment webhooks

See the code in `src/app/api/` for request/response details.

## Types & Data Models

All main types/interfaces are defined in [`src/types/index.ts`](src/types/index.ts) and match the Prisma schema:

- `User`, `Forest`, `CarbonCredit`, `Order`, `OrderItem`, `ForestZone`, `Notification`, etc.

## Features

- Real-time order and payment status tracking (with audit trail)
- Admin panel displays full order history (status changes, payment events, failures, etc.)
- Real-time notification system with intelligent polling
- Comprehensive notification management with filtering and bulk operations

## Scripts

- `npm run dev` — Start the development server
- `npm run build` — Build for production
- `npm start` — Start the production server
- `npm run lint` — Run ESLint
- `npm test` — Run Vitest tests
- `npm run test:ui` — Launch the Vitest interactive UI for running and debugging tests
- `npm run migrate` — Push schema to DB && Seed the database with sample data
- `npm run migrate:small` — Push schema to DB && Seed with small dataset (~3K records)
- `npm run migrate:medium` — Push schema to DB && Seed with medium dataset (~25K records)
- `npm run migrate:large` — Push schema to DB && Seed with large dataset (~100K records)
- `npm run migrate:extra-large` — Push schema to DB && Seed with extra large dataset (~600K records)

## Testing

- All API routes are covered by Vitest tests in `tests/api/`
- Run `npm test` to execute all tests

## Admin Panel

- In the admin panel, each order row expands to show a real-time audit trail of all order events (created, paid, failed, etc.)

## Stripe Webhook

- Stripe webhook endpoint: `/api/webhook` (configure your Stripe dashboard to point to this for payment event updates)

## Real-time Features

- **Intelligent Polling**: Real-time notification delivery using efficient polling
- **Intelligent Polling**: Adaptive polling with exponential backoff for reliability
- **Optimistic Updates**: Immediate UI updates with fallback error handling
- **Notification Filtering**: Filter notifications by type (order, credit, payment, system)
- **Bulk Operations**: Mark all notifications as read with a single click

## Blockchain Transparency (Cart Actions)

The application emits on-chain events for cart mutations to provide a public, tamper-evident audit trail.

Contract: `CartLogger.sol` (event-only, minimal gas)

Event schema:

```
event CartAction(
   uint256 indexed userId,
   uint256 indexed carbonCreditId,
   uint256 quantity,
   string action,      // ADD | UPDATE | REMOVE
   uint256 timestamp
);
```

Flow:
1. User performs cart action (add/update/remove).
2. API updates database via Prisma.
3. Server attempts to call `CartLogger.log(...)` using configured RPC + private key.
4. Response includes `{ blockchain: { txHash } }` or an error if logging not configured.

To enable locally:
1. Run a local chain (Ganache, Hardhat node, etc.) exposing an RPC URL.
2. `truffle migrate --network development` to deploy contracts.
3. Copy deployed `CartLogger` address from migration output to `CART_LOGGER_ADDRESS` in `.env.local`.
4. Set `BLOCKCHAIN_PRIVATE_KEY` for the account that deployed the contract (or any funded account).
5. Restart Next.js dev server so env vars load.

If env vars are missing, cart operations still succeed; blockchain logging is skipped gracefully.

Future extensions:
- Restrict `log` function to a specific relayer address.
- Index events off-chain into a queryable table.
- Add per-order payment events to on-chain log.
- Migrate to a rollup / L2 for low fees if moving to public networks.
