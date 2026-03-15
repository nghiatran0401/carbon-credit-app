# Carbon Credit App

[![CI](https://github.com/nghiatran0401/carbon-credit-app/actions/workflows/ci.yml/badge.svg)](https://github.com/nghiatran0401/carbon-credit-app/actions/workflows/ci.yml)

A full-stack marketplace for exploring, analyzing, and trading carbon credits — built with Next.js 14, Prisma, Supabase, and PayOS.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

**Marketplace & Trading**

- Browse and purchase carbon credits from verified forest projects
- Shopping cart with multi-item checkout via PayOS
- Order history with real-time status tracking
- Digital certificates for completed purchases (PDF generation)

**Analytics & Visualization**

- Interactive map for visualizing carbon credit projects (Leaflet)
- Carbon movement tracking and analysis
- Biomass visualization dashboard
- Graph-based relationship explorer (Neo4j)

**Admin Panel**

- Manage forests, credits, orders, and users
- Full order audit trail (status changes, payment events, failures)
- Immutable transaction ledger via ImmuDB

**Security & Auth**

- User authentication with Supabase (login/register)
- Role-based access control (admin, user)
- Rate limiting on API routes
- Input validation with Zod
- Security headers (HSTS, X-Frame-Options, CSP)

## Tech Stack

| Category         | Technology                                                                         |
| ---------------- | ---------------------------------------------------------------------------------- |
| Framework        | [Next.js 14](https://nextjs.org/) (App Router)                                     |
| Language         | [TypeScript](https://www.typescriptlang.org/)                                      |
| Database         | [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/)    |
| ORM              | [Prisma](https://www.prisma.io/)                                                   |
| Auth             | [Supabase Auth](https://supabase.com/docs/guides/auth)                             |
| Payments         | [PayOS](https://payos.vn/)                                                         |
| Styling          | [Tailwind CSS](https://tailwindcss.com/)                                           |
| UI Components    | [Radix UI](https://www.radix-ui.com/) / [shadcn/ui](https://ui.shadcn.com/)        |
| Data Fetching    | [SWR](https://swr.vercel.app/)                                                     |
| Charts           | [Recharts](https://recharts.org/)                                                  |
| Maps             | [Leaflet](https://leafletjs.com/) / [React Leaflet](https://react-leaflet.js.org/) |
| Graph DB         | [Neo4j](https://neo4j.com/)                                                        |
| Immutable Ledger | [ImmuDB](https://immudb.io/)                                                       |
| PDF Generation   | [jsPDF](https://github.com/parallax/jsPDF) / [PDFKit](https://pdfkit.org/)         |
| Testing          | [Vitest](https://vitest.dev/)                                                      |
| Validation       | [Zod](https://zod.dev/)                                                            |

## Prerequisites

- **Node.js** >= 18
- **npm** >= 8
- **PostgreSQL** database ([Supabase](https://supabase.com/) free tier works)
- **PayOS** account (test mode for development)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/nghiatran0401/carbon-credit-app.git
cd carbon-credit-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) for details on each variable.

### 4. Set up the database

```bash
npx prisma migrate dev
```

### 5. Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
carbon-credit-app/
├── prisma/
│   ├── schema.prisma          # Database schema & models
│   └── migrations/            # Database migrations
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   ├── about/             # About page
│   │   ├── admin/             # Admin panel (forests, credits, orders, users)
│   │   ├── auth/              # Authentication page
│   │   ├── biomass-only/      # Biomass visualization
│   │   ├── carbon-movement/   # Carbon movement tracker
│   │   ├── cart/              # Shopping cart
│   │   ├── certificates/[id]/ # Certificate viewer
│   │   ├── dashboard/         # User dashboard
│   │   ├── history/           # Order history
│   │   ├── immudb-*/          # ImmuDB admin interfaces
│   │   ├── marketplace/       # Credit marketplace
│   │   ├── order-audit/       # Order audit trail
│   │   ├── success/           # Checkout success
│   │   └── api/               # API route handlers
│   ├── components/
│   │   ├── ui/                # Reusable UI primitives (shadcn/ui)
│   │   └── *.tsx              # App-level components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities, services, and business logic
│   └── types/                 # Shared TypeScript interfaces
├── tests/
│   ├── api/                   # API route tests
│   ├── lib/                   # Service/library tests
│   ├── integration/           # Integration tests
│   └── helpers/               # Test utilities and mocks
├── public/                    # Static assets
└── data/                      # Application data files
```

## Scripts

| Command                 | Description                                |
| ----------------------- | ------------------------------------------ |
| `npm run dev`           | Start development server with hot reload   |
| `npm run build`         | Create optimized production build          |
| `npm start`             | Start production server                    |
| `npm run lint`          | Run ESLint                                 |
| `npm run lint:fix`      | Run ESLint with auto-fix                   |
| `npm run type-check`    | Run TypeScript compiler check              |
| `npm run format`        | Format code with Prettier                  |
| `npm run format:check`  | Check code formatting                      |
| `npm test`              | Run all tests                              |
| `npm run test:watch`    | Run tests in watch mode                    |
| `npm run test:ui`       | Launch Vitest interactive UI               |
| `npm run test:coverage` | Run tests with coverage report             |
| `npm run validate`      | Run type-check, lint, and tests together   |
| `npm run db:generate`   | Generate Prisma client                     |
| `npm run db:migrate`    | Create and apply database migrations       |
| `npm run db:push`       | Push schema changes directly (dev only)    |
| `npm run db:studio`     | Open Prisma Studio GUI at `localhost:5555` |

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

| Variable                        | Required | Description                                    |
| ------------------------------- | -------- | ---------------------------------------------- |
| `DATABASE_URL`                  | Yes      | PostgreSQL connection string (pooled)          |
| `DIRECT_URL`                    | Yes      | PostgreSQL direct connection string            |
| `NEXT_PUBLIC_BASE_URL`          | Yes      | Application URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous/public key                  |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role key                      |
| `PAYOS_CLIENT_ID`               | Yes      | PayOS client ID                                |
| `PAYOS_API_KEY`                 | Yes      | PayOS API key                                  |
| `PAYOS_CHECKSUM_KEY`            | Yes      | PayOS checksum key for webhook verification    |
| `NODE_ENV`                      | No       | `development` or `production`                  |

## Database

### Schema

The database is managed with [Prisma](https://www.prisma.io/) and includes the following models:

- **User** — accounts with role-based access (admin/user)
- **Forest** — carbon credit source projects with location, type, area, and status
- **CarbonCredit** — tradeable credits tied to forests with vintage, certification, and pricing
- **Order / OrderItem** — purchase records with multi-currency support
- **Payment** — PayOS payment tracking with status and failure handling
- **OrderHistory** — immutable audit log of order state transitions
- **Certificate** — verifiable purchase certificates with hash integrity
- **CartItem** — per-user shopping cart
- **Bookmark** — saved forest projects
- **ExchangeRate** — currency conversion rates for credits

### Management

Use Prisma Studio for visual database management during development:

```bash
npx prisma studio
```

## API Reference

All routes are under `/api/` and follow RESTful conventions.

### Forests

| Method | Endpoint       | Description             |
| ------ | -------------- | ----------------------- |
| GET    | `/api/forests` | List all forests        |
| POST   | `/api/forests` | Create a forest (admin) |
| PUT    | `/api/forests` | Update a forest (admin) |
| DELETE | `/api/forests` | Delete a forest (admin) |

### Carbon Credits

| Method | Endpoint       | Description             |
| ------ | -------------- | ----------------------- |
| GET    | `/api/credits` | List available credits  |
| POST   | `/api/credits` | Create a credit (admin) |
| PUT    | `/api/credits` | Update a credit (admin) |
| DELETE | `/api/credits` | Delete a credit (admin) |

### Orders

| Method | Endpoint             | Description            |
| ------ | -------------------- | ---------------------- |
| GET    | `/api/orders`        | List user orders       |
| POST   | `/api/orders`        | Create an order        |
| GET    | `/api/orders/audit`  | Get order audit trail  |
| POST   | `/api/orders/verify` | Verify order integrity |

### Cart & Checkout

| Method | Endpoint                | Description                 |
| ------ | ----------------------- | --------------------------- |
| GET    | `/api/cart`             | Get cart contents           |
| POST   | `/api/cart`             | Add item to cart            |
| PUT    | `/api/cart`             | Update cart item            |
| DELETE | `/api/cart`             | Remove item from cart       |
| POST   | `/api/checkout`         | Initiate PayOS checkout     |
| GET    | `/api/checkout/session` | Get checkout session status |

### Other

| Method   | Endpoint            | Description                     |
| -------- | ------------------- | ------------------------------- |
| GET      | `/api/users`        | List users (admin)              |
| GET/POST | `/api/certificates` | Issue and retrieve certificates |
| POST     | `/api/webhook`      | PayOS webhook handler           |
| GET      | `/api/health`       | Health check                    |
| GET      | `/api/analysis`     | Carbon credit analysis          |
| \*       | `/api/neo4j/*`      | Neo4j graph operations          |
| \*       | `/api/immudb/*`     | ImmuDB ledger operations        |

## Testing

Tests are written with [Vitest](https://vitest.dev/) and organized by scope:

```
tests/
├── api/           # API route handler tests
├── lib/           # Service and utility tests
├── integration/   # End-to-end integration tests
└── helpers/       # Shared test utilities and mocks
```

Run the full test suite:

```bash
npm test
```

Run tests in watch mode (re-runs on file changes):

```bash
npm run test:watch
```

Run tests with the interactive UI:

```bash
npm run test:ui
```

Run tests with coverage:

```bash
npm run test:coverage
```

## Development Workflow

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality on every commit:

- **TypeScript/TSX files**: Auto-formatted with Prettier, then linted with ESLint
- **JSON/Markdown/YAML/CSS files**: Auto-formatted with Prettier

Hooks are installed automatically via the `prepare` script when running `npm install`.

### Code Formatting

[Prettier](https://prettier.io/) is configured for consistent formatting. Check or apply formatting:

```bash
npm run format:check   # CI-friendly check
npm run format         # Auto-fix formatting
```

### Full Validation

Run the complete validation pipeline (same checks as CI) before pushing:

```bash
npm run validate
```

### CI/CD Pipeline

GitHub Actions runs on every push and pull request to `main`:

1. **Lint & Type Check** — ESLint, TypeScript compiler, Prettier formatting
2. **Unit Tests** — Full Vitest test suite
3. **Production Build** — Verifies the app builds successfully (runs after lint/tests pass)

### Database Migrations

In **development**, create and apply migrations:

```bash
npm run db:migrate
```

In **production**, apply pending migrations (non-interactive):

```bash
npx prisma migrate deploy
```

## Deployment

### Production Build

```bash
npm run build
npm start
```

### PayOS Webhooks

Configure your PayOS dashboard to send payment events to:

```
https://your-domain.com/api/webhook
```

For local development, use ngrok or a similar tunneling tool to expose your local server:

```bash
ngrok http 3000
```

Then set the webhook URL in your PayOS dashboard to the ngrok URL + `/api/webhook`.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes and verify they pass validation: `npm run validate`
4. Commit your changes (pre-commit hooks will lint and format automatically)
5. Push to the branch (`git push origin feature/your-feature`)
6. Open a Pull Request — CI will run lint, type-check, tests, and build

## License

This project is not yet licensed. See [choosealicense.com](https://choosealicense.com/) for options.
