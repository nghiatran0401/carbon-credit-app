# Carbon Credit App

A modern web application for exploring, analyzing, and trading carbon credits. Built with Next.js, React, TypeScript, Prisma, and Tailwind CSS.

## Features

- Interactive map for visualizing carbon credit projects
- Marketplace for trading carbon credits
- Analytics dashboard
- User authentication (with roles: admin, user)
- Admin panel for managing forests, credits, orders, and users
- Full CRUD for forests, credits, and orders
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
3. Set up your database connection in `.env`:
   ```env
   DATABASE_URL="mysql://user:password@localhost:3306/carbon_credit"
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

```bash
npm test
```

Vitest will run all tests in the `tests/` directory, including full CRUD API tests.

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

See the code in `src/app/api/` for request/response details.

## Types & Data Models

All main types/interfaces are defined in [`src/types/index.ts`](src/types/index.ts) and match the Prisma schema:

- `User`, `Forest`, `CarbonCredit`, `Order`, `OrderItem`, `ForestZone`, etc.

## Scripts

- `npm run dev` — Start the development server
- `npm run build` — Build for production
- `npm start` — Start the production server
- `npm run lint` — Run ESLint
- `npm test` — Run Vitest tests
- `npm run migrate` — Push schema to DB && Seed the database (make sure you create database "carbon_credit" first with your root account)

## Testing

- All API routes are covered by Vitest tests in `tests/api/`
- Run `npm test` to execute all tests
