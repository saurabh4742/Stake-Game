# Crash Betting Game

A real-time crash betting game similar to Aviator, built with Next.js 14, Socket.IO, and modern web technologies.

## Features

- **Real-time Gameplay**: Live multiplier updates and crash mechanics
- **Authentication**: Secure user management with Clerk
- **Payments**: INR deposits via Stripe integration
- **Database**: MongoDB with Prisma ORM for data persistence
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **WebSocket**: Real-time game state and player interactions

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Authentication**: Clerk
- **Database**: MongoDB with Prisma ORM
- **Payments**: Stripe
- **Real-time**: Socket.IO
- **UI**: shadcn/ui components with Radix UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB database
- Stripe account
- Clerk account

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
cd socket && npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local` and fill in your credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
DATABASE_URL="mongodb+srv://..."

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Socket.IO Server
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Set up the database:

```bash
npx prisma db push
npx prisma generate
```

5. Start the development servers:

```bash
# Terminal 1: Start the Socket.IO server
cd socket
npm run dev

# Terminal 2: Start the Next.js app
npm run dev
```

## Project Structure

```
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard page
│   ├── deposit/           # Deposit page
│   ├── game/              # Game page
│   ├── withdraw/          # Withdraw page
│   └── sign-in/           # Auth pages
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── navbar.tsx        # Navigation component
├── lib/                  # Utility libraries
│   ├── prisma.ts         # Database client
│   ├── stripe.ts         # Stripe client
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema
├── socket/               # Socket.IO server
└── public/               # Static assets
```

## Game Mechanics

- **Waiting Phase**: Players place bets during a 5-second countdown
- **Flying Phase**: Multiplier increases exponentially until crash
- **Crash**: Game ends at a random multiplier, uncashed players lose
- **Cash Out**: Players can cash out anytime during the flying phase

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Socket.IO Server (Railway/Render/Fly.io)

1. Create a new service on your preferred platform
2. Set the PORT environment variable
3. Deploy the `socket/` directory

### Database

Use MongoDB Atlas or any MongoDB hosting service.

### Stripe Webhooks

Set up a webhook endpoint pointing to `/api/webhooks/stripe` for handling payment confirmations.

## License

This project is for educational purposes only. Please comply with local gambling regulations.# Stake-Game
