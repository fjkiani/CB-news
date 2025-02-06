# CB News Feature Frontend

The frontend application for the CB News Feature, built with React, TypeScript, and Vite.

## Features

- Real-time financial news display
- AI-powered sentiment analysis visualization
- Market impact assessment interface
- Responsive design with Tailwind CSS
- Real-time data updates with TanStack Query

## Tech Stack

- React 18
- TypeScript
- Vite
- TanStack Query
- Tailwind CSS
- Lucide React for icons
- Supabase Client

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file with:
```
VITE_BACKEND_URL=http://localhost:3001
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build

To create a production build:
```bash
npm run build
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Create production build
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Project Structure

```
src/
├── components/     # React components
├── services/      # API and service integrations
├── hooks/         # Custom React hooks
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── styles/        # Global styles and Tailwind config
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request 