# ⚽ Footbal Tracker

A web application to manage footbal match expenses and track balances per player within a group of friends.

## What It Does

- **Player management** — Add, edit, and remove players in your group
- **Match creation** — Create matches with date, location, and total cost; select participants
- **Automatic calculation** — Cost per player is calculated instantly and updated as participants change
- **Balance tracking** — See each player's total debt, payments, and net balance at a glance
- **Payment recording** — Mark who has paid, view full payment history per player

---

## Quick Start (SQLite — No Setup Required)

Runs with Node.js only. No database installation needed.

### Requirements

- [Node.js](https://nodejs.org/) v18 or higher

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/football-tracker.git
cd football-tracker

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env

# 4. Create the database
npm run db:push

# 5. Start the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Setup with PostgreSQL + Docker

Use this if you want a persistent, production-ready database.

### Requirements

- [Node.js](https://nodejs.org/) v18 or higher
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/football-tracker.git
cd football-tracker

# 2. Install dependencies
npm install

# 3. Start the PostgreSQL container
docker compose up -d

# 4. Set up environment variables
cp .env.example .env
```

Open `.env` and set the PostgreSQL connection string:

```env
DATABASE_URL="postgresql://football:football123@localhost:5432/football"
```

Open `prisma/schema.prisma` and update the provider:

```prisma
datasource db {
  provider = "postgresql"   # was "sqlite"
  url      = env("DATABASE_URL")
}
```

```bash
# 5. Push the schema to the database
npm run db:push

# 6. Start the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Useful Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Sync database schema
npm run db:studio    # Open Prisma Studio (visual DB browser)
```

## Tech Stack

- [Next.js 15](https://nextjs.org/) — Frontend + API routes
- [Prisma](https://www.prisma.io/) — Database ORM
- [SQLite](https://www.sqlite.org/) / [PostgreSQL](https://www.postgresql.org/) — Database
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [TypeScript](https://www.typescriptlang.org/) — Type safety
