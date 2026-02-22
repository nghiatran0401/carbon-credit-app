# Carbon Credit App

A full-stack marketplace for exploring, analyzing, and trading carbon credits — built with Next.js 14, Prisma, Supabase, and Stripe.

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
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features

**Marketplace & Trading**
- Browse and purchase carbon credits from verified forest projects
- Shopping cart with multi-item checkout via Stripe
- Order history with real-time status tracking
- Digital certificates for completed purchases (PDF generation)
- Bookmark favorite forest projects

**Analytics & Visualization**
- Interactive map for visualizing carbon credit projects (Leaflet)
- Carbon movement tracking and analysis
- Biomass visualization dashboard
- Graph-based relationship explorer (Neo4j)

**Admin Panel**
- Manage forests, credits, orders, and users
- Full order audit trail (status changes, payment events, failures)
- Immutable transaction ledger via ImmuDB

**Real-time & Notifications**
- Adaptive polling with exponential backoff
- Notification filtering by type (order, credit, payment, system)
- Bulk operations (mark all as read)
- Optimistic UI updates with error fallback

**Security & Auth**
- User authentication with Supabase (login/register)
- Role-based access control (admin, user)
- Rate limiting on API routes
- Input validation with Zod
- Security headers (HSTS, X-Frame-Options, CSP)

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Database | [PostgreSQL](https://www.postgresql.org/) via [Supabase](https://supabase.com/) |
| ORM | [Prisma](https://www.prisma.io/) |
| Auth | [Supabase Auth](https://supabase.com/docs/guides/auth) |
| Payments | [Stripe](https://stripe.com/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| UI Components | [Radix UI](https://www.radix-ui.com/) / [shadcn/ui](https://ui.shadcn.com/) |
| Data Fetching | [SWR](https://swr.vercel.app/) |
| Charts | [Recharts](https://recharts.org/) |
| Maps | [Leaflet](https://leafletjs.com/) / [React Leaflet](https://react-leaflet.js.org/) |
| Graph DB | [Neo4j](https://neo4j.com/) |
| Immutable Ledger | [ImmuDB](https://immudb.io/) |
| PDF Generation | [jsPDF](https://github.com/parallax/jsPDF) / [PDFKit](https://pdfkit.org/) |
| Testing | [Vitest](https://vitest.dev/) |
| Validation | [Zod](https://zod.dev/) |

## Prerequisites

- **Node.js** >= 18
- **npm** >= 8
- **PostgreSQL** database ([Supabase](https://supabase.com/) free tier works)
- **Stripe** account (test mode for development)

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
npx prisma db push
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

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Create optimized production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests |
| `npm run test:ui` | Launch Vitest interactive UI |
| `npx prisma studio` | Open database GUI at `localhost:5555` |
| `npx prisma db push` | Push schema changes to the database |

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | Yes | PostgreSQL direct connection string |
| `NEXT_PUBLIC_BASE_URL` | Yes | Application URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `NODE_ENV` | No | `development` or `production` |

## Database

### Schema

The database is managed with [Prisma](https://www.prisma.io/) and includes the following models:

- **User** — accounts with role-based access (admin/user), Stripe customer linking
- **Forest** — carbon credit source projects with location, type, area, and status
- **CarbonCredit** — tradeable credits tied to forests with vintage, certification, and pricing
- **Order / OrderItem** — purchase records with multi-currency support
- **Payment** — Stripe payment tracking with status and failure handling
- **OrderHistory** — immutable audit log of order state transitions
- **Certificate** — verifiable purchase certificates with hash integrity
- **Notification** — in-app notification system with read tracking
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

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new user account |
| POST | `/api/auth/login` | Authenticate and receive session |

### Forests
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/forests` | List all forests |
| POST | `/api/forests` | Create a forest (admin) |
| PUT | `/api/forests` | Update a forest (admin) |
| DELETE | `/api/forests` | Delete a forest (admin) |

### Carbon Credits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/credits` | List available credits |
| POST | `/api/credits` | Create a credit (admin) |
| PUT | `/api/credits` | Update a credit (admin) |
| DELETE | `/api/credits` | Delete a credit (admin) |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders` | List user orders |
| POST | `/api/orders` | Create an order |
| GET | `/api/orders/audit` | Get order audit trail |
| POST | `/api/orders/verify` | Verify order integrity |
| POST | `/api/orders/[id]/complete` | Mark order as complete |

### Cart & Checkout
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart` | Get cart contents |
| POST | `/api/cart` | Add item to cart |
| PUT | `/api/cart` | Update cart item |
| DELETE | `/api/cart` | Remove item from cart |
| POST | `/api/checkout` | Initiate Stripe checkout |
| GET | `/api/checkout/session` | Get checkout session status |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | List notifications |
| POST | `/api/notifications` | Create a notification |
| PUT | `/api/notifications/[id]` | Update notification (mark read) |
| POST | `/api/notifications/mark-all-read` | Mark all as read |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (admin) |
| GET/POST | `/api/bookmarks` | Manage bookmarks |
| GET/POST | `/api/certificates` | Issue and retrieve certificates |
| POST | `/api/webhook` | Stripe webhook handler |
| GET | `/api/health` | Health check |
| GET | `/api/analysis` | Carbon credit analysis |
| * | `/api/neo4j/*` | Neo4j graph operations |
| * | `/api/immudb/*` | ImmuDB ledger operations |

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

Run tests with the interactive UI:

```bash
npm run test:ui
```

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Stripe Webhooks

Configure your Stripe dashboard to send payment events to:

```
https://your-domain.com/api/webhook
```

For local development, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m "Add your feature"`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is not yet licensed. See [choosealicense.com](https://choosealicense.com/) for options.
