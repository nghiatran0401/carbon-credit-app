# Carbon Credit App

[![CI](https://github.com/nghiatran0401/carbon-credit-app/actions/workflows/ci.yml/badge.svg)](https://github.com/nghiatran0401/carbon-credit-app/actions/workflows/ci.yml)

A full-stack marketplace for exploring, analyzing, and trading carbon credits — built with Next.js 14, Prisma, Supabase, and PayOS.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Blockchain Feature (Optional)](#blockchain-feature-optional)
- [Docker Quick Start](#docker-quick-start)
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
cp .env.blockchain-off .env
```

See [Environment Variables](#environment-variables) for details on each variable.

The app will be available at [http://localhost:3000](http://localhost:3000).

---

### 4. Blockchain Feature (Optional)

The blockchain layer is **optional and loosely coupled**. The platform runs fully without it — marketplace, checkout, certificates, and admin all work in DB-only mode. Enabling blockchain adds on-chain ERC-1155 token minting, credit transfers, and retirement on the Ethereum Sepolia testnet.

> **Quick toggle:** The feature turns on when three env vars are present (`BASE_RPC_URL`, `ADMIN_WALLET_PRIVATE_KEY`, `FOREST_1155_CONTRACT_ADDRESS`) and turns off when any of them is missing. No code changes needed.

---

#### Step 1 — Create a Wallet (Admin Wallet)

##### What is the Admin Wallet?

The **admin wallet** is an Ethereum account that the server uses to sign blockchain transactions on behalf of the platform. It is **not a user account** — it is a server-side key that:

- Mints ERC-1155 carbon credit tokens when a new forest is created
- Transfers tokens to a buyer's wallet after a purchase
- Burns (retires) tokens when a user retires their credits

Think of it as the platform's "operator key" — similar to how a payment gateway has a secret API key, this wallet has a private key that authorises transactions on-chain.

##### How to create one (MetaMask — recommended for beginners)

1. Install [MetaMask](https://metamask.io/download/) browser extension
2. Create a new wallet → save your seed phrase securely
3. In MetaMask, click your account icon → **Account Details** → **Show private key**
4. Enter your MetaMask password to reveal the private key
5. Copy the private key — this is your `ADMIN_WALLET_PRIVATE_KEY`
6. Copy the wallet address (starts with `0x...`) — this is your `ADMIN_WALLET_ADDRESS`

> [!CAUTION]
> **Never share your private key or commit it to Git.** Anyone with this key can drain the wallet and sign transactions as your platform. Always keep it in `.env` (which is gitignored).

> [!TIP]
> Create a **dedicated** wallet just for this app — do not use your personal MetaMask wallet. That way, even if the key is accidentally exposed, your personal funds are safe.

---

#### Step 2 — Get Testnet ETH (Gas Money)

The admin wallet needs ETH to pay for gas fees on Sepolia testnet. This is free test ETH — not real money.

1. Go to the [Sepolia Faucet](https://sepoliafaucet.com) (requires Alchemy account, free)
   - Alternative: [Chainlink Faucet](https://faucets.chain.link/sepolia) (no account needed)
2. Paste your `ADMIN_WALLET_ADDRESS`
3. Request 0.5 ETH — this is enough for hundreds of test transactions
4. Wait ~30 seconds, then verify on [Sepolia Etherscan](https://sepolia.etherscan.io) by searching your address

---

#### Step 3 — Set the RPC URL

An **RPC URL** is the HTTP endpoint your server uses to communicate with the Ethereum network. You can use a free public one:

```env
BASE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
BASE_CHAIN_ID=11155111
```

For better reliability in production, get a free private RPC from [Alchemy](https://alchemy.com) or [Infura](https://infura.io) and use their Sepolia endpoint URL instead.

---

#### Step 4 — Deploy the Smart Contract

The `ForestCredit1155` contract must be deployed to Sepolia before the platform can mint tokens. The deploy script is already included in the project.

##### 4a. Add deploy credentials to `.env`

```env
BASE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
BASE_CHAIN_ID=11155111
ADMIN_WALLET_PRIVATE_KEY=<your-private-key-from-step-1>
ADMIN_WALLET_ADDRESS=<your-wallet-address-from-step-1>
```

##### 4b. (Optional) Customise token name/symbol

```powershell
# Windows PowerShell
$env:FOREST_TOKEN_NAME="Forest Carbon Credits"
$env:FOREST_TOKEN_SYMBOL="FCC"
```

```bash
# Mac / Linux
export FOREST_TOKEN_NAME="Forest Carbon Credits"
export FOREST_TOKEN_SYMBOL="FCC"
```

##### 4c. Run the deploy script

```bash
npm run contract:deploy:forest
```

The terminal will print something like:

```
Deploying ForestCredit1155...
Contract deployed at: 0x5620d49F168aC65DFAfA07813E81129C6956f28f
Transaction hash: 0xabc123...
```

##### 4d. Save the contract address to `.env`

```env
FOREST_1155_CONTRACT_ADDRESS=0x5620d49F168aC65DFAfA07813E81129C6956f28f
```

You can also verify the deployment on [Sepolia Etherscan](https://sepolia.etherscan.io) by searching the contract address.

---

#### Step 5 — Grant MINTER_ROLE to the Admin Wallet

The `ForestCredit1155` contract uses **role-based access control** (OpenZeppelin). By default only the deployer has `MINTER_ROLE`. If you deployed using `ADMIN_WALLET_PRIVATE_KEY`, the role is already granted automatically.

To verify, look for this log line when you create an ACTIVE forest:

```
Minted X forest credits for forest Y. Tx: 0x...
```

If you see `Admin wallet does not have MINTER_ROLE`, it means the private key used for deployment is different from the one in `ADMIN_WALLET_PRIVATE_KEY`. In that case, run the grant-role script (or use the deployer key):

```bash
npm run contract:deploy:forest
# Re-deploy with the correct ADMIN_WALLET_PRIVATE_KEY
# so the deployer automatically gets MINTER_ROLE.
```

---

#### Step 6 — Configure the Buyer Wallet

##### What is the Buyer Wallet and why is it needed?

When a user purchases carbon credits, the platform needs to know **which on-chain address to send the ERC-1155 tokens to**. This is the **buyer wallet address**.

There are two ways this address is resolved:

| Source                                        | How it works                                                                                                                                        |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User's own wallet** (default)               | Each user can enter their wallet address in their profile. The platform reads this from the database when processing payment.                       |
| **`BUYER_WALLET_ADDRESS` env var** (override) | If set, this address overrides the user's wallet for all transfers. Useful for development/demo where you want all tokens to go to one test wallet. |

##### For development / demo use

Set a fixed recipient so you can observe transfered tokens without needing each test user to have a real wallet:

```env
BUYER_WALLET_ADDRESS=0xca185EaEEFF8108eff820912DE88ff6E8B2e291D
```

This can be your own MetaMask address (or the admin wallet address). After a mock payment, open Sepolia Etherscan → search the address → go to the **ERC-1155** tab to see the received tokens.

##### For production use

Leave `BUYER_WALLET_ADDRESS` unset. Instruct users to connect their wallet in the profile page. Each user's `walletAddress` field in the database will be used automatically.

---

#### Step 7 — Final `.env` Checklist

Here are all the blockchain env vars, with a short explanation for each:

```env
# ── Required to enable blockchain ──────────────────────────────────────
BASE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
# ^ The HTTP endpoint used to talk to the Ethereum network

BASE_CHAIN_ID=11155111
# ^ 11155111 = Sepolia testnet  |  8453 = Base mainnet (real money!)

ADMIN_WALLET_PRIVATE_KEY=0x<your-private-key>
# ^ The server's signing key — authorises every on-chain transaction

ADMIN_WALLET_ADDRESS=0x<your-wallet-address>
# ^ The public address matching the private key above (MetaMask shows this)

FOREST_1155_CONTRACT_ADDRESS=0x<deployed-contract-address>
# ^ Copied from the deploy output in Step 4

# ── Optional ────────────────────────────────────────────────────────────
BUYER_WALLET_ADDRESS=0x<test-recipient-address>
# ^ Fixed wallet for receiving tokens in dev/demo. Remove in production.

NEXT_PUBLIC_BLOCK_EXPLORER_TX_URL=https://sepolia.etherscan.io/tx
# ^ Base URL for generating Etherscan links in the UI

# ── Audit Anchoring (separate feature) ─────────────────────────────────
ANCHOR_PRIVATE_KEY=0x<your-anchor-wallet-private-key>
ANCHOR_CONTRACT_ADDRESS=0x<deployed-AuditAnchor-address>
# ^ Only needed if you also deploy the AuditAnchor contract
```

> [!IMPORTANT]
> After changing `.env`, **restart the dev server** (`Ctrl+C` then `npm run dev`). Next.js does not hot-reload environment changes.

---

#### How the Feature Toggle Works

The platform automatically detects whether blockchain is enabled by calling `isBlockchainReady()` on every relevant request:

| State              | Condition                                                                                        | What happens                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Blockchain ON**  | All three vars set: `BASE_RPC_URL` + `ADMIN_WALLET_PRIVATE_KEY` + `FOREST_1155_CONTRACT_ADDRESS` | On-chain operations run normally                                                |
| **Blockchain OFF** | Any one of the three vars is missing                                                             | Platform falls back to DB-only mode — no errors, just a server-side warning log |

| Endpoint                     | Blockchain ON                           | Blockchain OFF                           |
| ---------------------------- | --------------------------------------- | ---------------------------------------- |
| `POST /api/forests`          | Creates forest + mints ERC-1155 tokens  | Creates forest in DB only                |
| `PUT /api/forests` (approve) | Mints tokens on approval                | Skips mint, still approves               |
| `POST /api/webhook`          | Queues on-chain token transfer to buyer | Skips transfer, order still completes    |
| `POST /api/mock-payment`     | Transfers tokens to buyer immediately   | Completes order in DB only               |
| `POST /api/credits/retire`   | Burns tokens on-chain + updates DB      | Updates DB only, `transactionHash: null` |

---

#### Verifying It Works

After completing Steps 1–7 and restarting:

1. Log in as admin → **Admin Panel → Forests → Create Forest**
2. Set status to `ACTIVE` and enter an `initialCreditsToMint` value (e.g. `100`)
3. Submit — the server will mint tokens and return `mintTxHash` in the response
4. Open `https://sepolia.etherscan.io/tx/<mintTxHash>` to see the transaction
5. To test a purchase: add a credit to cart → `POST /api/mock-payment` → check `transactionHash` in the response

---

#### Two Ready-Made Presets

The repository includes two preset `.env` files for quickly switching modes:

```powershell
# Windows — enable blockchain
Copy-Item .env.blockchain-on .env

# Windows — disable blockchain (DB-only)
Copy-Item .env.blockchain-off .env
```

```bash
# Mac / Linux
cp .env.blockchain-on .env
cp .env.blockchain-off .env
```

Restart the dev server after switching.

---

### 5. Start docker and intilize every needed services

```bash
docker compose up --build
```

This starts:

- `app` (Next.js on `http://localhost:3000`)
- `postgres` (local PostgreSQL)
- `neo4j` (graph DB)
- `immudb` (immutable audit DB)

`migrate` runs automatically before `app` starts to apply Prisma migrations.

### 6. Team image build (Mac + Windows/Linux)

Use Docker Buildx to publish a multi-arch image:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <your-org>/carbon-credit-app:latest \
  --push .
```

Then teammates can run:

```bash
docker pull <your-org>/carbon-credit-app:latest
docker compose up
```

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

| Command                          | Description                                                         |
| -------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                    | Start development server with hot reload                            |
| `npm run build`                  | Create optimized production build                                   |
| `npm start`                      | Start production server                                             |
| `npm run lint`                   | Run ESLint                                                          |
| `npm run lint:fix`               | Run ESLint with auto-fix                                            |
| `npm run type-check`             | Run TypeScript compiler check                                       |
| `npm run format`                 | Format code with Prettier                                           |
| `npm run format:check`           | Check code formatting                                               |
| `npm test`                       | Run all tests                                                       |
| `npm run test:watch`             | Run tests in watch mode                                             |
| `npm run test:ui`                | Launch Vitest interactive UI                                        |
| `npm run test:coverage`          | Run tests with coverage report                                      |
| `npm run validate`               | Run type-check, lint, and tests together                            |
| `npm run db:generate`            | Generate Prisma client                                              |
| `npm run db:migrate`             | Create and apply database migrations                                |
| `npm run db:push`                | Push schema changes directly (dev only)                             |
| `npm run db:studio`              | Open Prisma Studio GUI at `localhost:5555`                          |
| `npm run contract:compile`       | Compile Solidity contracts to `/contracts/*.json`                   |
| `npm run contract:deploy`        | Deploy contract set by `CONTRACT_NAME` env (default: `AuditAnchor`) |
| `npm run contract:deploy:forest` | Deploy `ForestCredit1155` ERC-1155 forest token contract            |
| `npm run contract:deploy:audit`  | Deploy `AuditAnchor` Merkle root anchor contract                    |

## Environment Variables

Create a `.env` file in the project root (see `.env.example`):

| Variable                        | Required | Description                                                     |
| ------------------------------- | -------- | --------------------------------------------------------------- |
| `DATABASE_URL`                  | Yes      | PostgreSQL connection string (pooled)                           |
| `DIRECT_URL`                    | Yes      | PostgreSQL direct connection string                             |
| `NEXT_PUBLIC_BASE_URL`          | Yes      | Application URL (e.g. `http://localhost:3000`)                  |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous/public key                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role key                                       |
| `PAYOS_CLIENT_ID`               | Yes      | PayOS client ID                                                 |
| `PAYOS_API_KEY`                 | Yes      | PayOS API key                                                   |
| `PAYOS_CHECKSUM_KEY`            | Yes      | PayOS checksum key for webhook verification                     |
| `BASE_RPC_URL`                  | No       | RPC URL for Sepolia/Base used by blockchain service             |
| `BASE_CHAIN_ID`                 | No       | Chain ID (defaults to `84532`)                                  |
| `FOREST_1155_CONTRACT_ADDRESS`  | No       | Deployed ERC-1155 contract address                              |
| `ADMIN_WALLET_PRIVATE_KEY`      | No       | Relayer/admin wallet private key for mint and transfer          |
| `BUYER_WALLET_ADDRESS`          | No       | Optional fixed recipient wallet for credit transfer at checkout |
| `NODE_ENV`                      | No       | `development` or `production`                                   |

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

For local development, use ngrok to expose your local server:

```bash
ngrok http 3000
```

Then set the webhook URL in your PayOS dashboard to the ngrok URL + `/api/webhook`.

## Smart Contracts

For full smart contract setup — including wallet creation, testnet faucet, deployment, and role granting — see the [Blockchain Feature](#blockchain-feature-optional) section near the top of this README.

### Contract commands

```bash
npm run contract:compile          # Compile Solidity to /contracts/*.json
npm run contract:deploy:forest    # Deploy ForestCredit1155 ERC-1155 contract
npm run contract:deploy:audit     # Deploy AuditAnchor Merkle root contract
```

### Core functions in `ForestCredit1155`

- `mintForestCredits(to, forestId, amount, data)` — mint tokens to a wallet
- `mintBatchForestCredits(to, forestIds, amounts, data)` — batch mint
- `retireForestCredits(from, forestId, amount)` — burn / retire tokens
- `setForestUri(forestId, tokenUri)` — update token metadata

Only accounts with `MINTER_ROLE` can mint/retire. Only `URI_MANAGER_ROLE` can update URIs.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes and verify they pass validation: `npm run validate`
4. Commit your changes (pre-commit hooks will lint and format automatically)
5. Push to the branch (`git push origin feature/your-feature`)
6. Open a Pull Request — CI will run lint, type-check, tests, and build

## License

This project is not yet licensed. See [choosealicense.com](https://choosealicense.com/) for options.
