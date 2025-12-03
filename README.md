# Commit Time

AI-powered commit message generator

## Tech Stack

- **Frontend**: Next.js 15 (App Router)
- **UI Styling**: TailwindCSS
- **Data Fetch/State**: TanStack Query
- **Backend**: Next.js Route Handlers
- **Database**: Supabase (Postgres)
- **ORM**: Prisma
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **AI**: OpenAI GPT
- **Analytics**: Amplitude
- **Monitoring**: Sentry
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key
- Amplitude account (optional)
- Sentry account (optional)

### Environment Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in the environment variables in `.env.local`

### Installation

```bash
npm install
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
commit-time/
├── app/                  # Next.js app directory
│   ├── api/             # API routes
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── providers.tsx    # Client providers
├── components/          # React components
├── hooks/              # Custom React hooks
├── lib/                # Library code
│   ├── supabase/       # Supabase clients
│   ├── amplitude.ts    # Amplitude setup
│   ├── openai.ts       # OpenAI client
│   └── prisma.ts       # Prisma client
├── prisma/             # Prisma schema and migrations
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── middleware.ts       # Next.js middleware
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio
- `npx prisma migrate dev` - Create and apply migrations

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

Make sure to add all environment variables in the Vercel dashboard before deploying.
