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
   ```

### Database Setup

1. Push the schema to your database:
   ```bash
   npx prisma db push
   ```

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
- `prisma/` - Prisma schema
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
