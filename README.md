# Carbon Credit App

A modern web application for exploring, analyzing, and trading carbon credits. Built with Next.js, React, and Tailwind CSS.

## Features

- Interactive map for visualizing carbon credit projects
- Marketplace for trading carbon credits
- Analytics dashboard
- User authentication
- Responsive design for mobile and desktop

## Tech Stack

- [Next.js](https://nextjs.org/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- TypeScript

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm (v8 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone `https://github.com/nghiatran0401/carbon-credit-app.git`
   cd carbon-credit-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

- `src/app/` - Application pages and layouts
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and libraries
- `public/` - Static assets

## Contributing

Contributions are welcome! Please open issues or pull requests for improvements or bug fixes.

## License

This project is licensed under the MIT License.

prisma:

- npx prisma db push
- npx tsx prisma/seed.ts
