# Temerachi Coffee Export Portal

Management system for Temerachi coffee export operations.

| Folder | Stack |
| --- | --- |
| `frontend` | Next.js and Tailwind CSS |
| `backend` | NestJS API |
| `database` | Prisma schema, seed data, and PostgreSQL Compose file |

## Modules

1. Supplier & farmer management
2. Coffee purchasing
3. Warehouse & inventory
4. Quality control
5. Export order management
6. Export documentation
7. International buyers
8. Finance & accounting
9. Employee management
10. Reports & executive dashboard

## Prerequisites

- Node.js 20+
- PostgreSQL 18 (local install is fine), or Docker for the Compose file in `database/`

## Setup

1. Create the database (PowerShell), or run `npm run db:up` if you use Docker:

```powershell
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE temerachi;"
```

2. Copy env files and set your Postgres password:

- `database/.env` — `DATABASE_URL` for Prisma
- `backend/.env` — `DATABASE_URL`, `JWT_SECRET`, `PORT`
- `frontend/.env.local` — `NEXT_PUBLIC_API_URL`

Example `DATABASE_URL`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/temerachi?schema=public"
```

3. Install, generate the Prisma client, push the schema, and seed from the project root:

```powershell
cd "C:\Users\Eyob Assefa\Desktop\Temerachi portal"
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Demo login

- Email: `admin@temerachi.com`
- Password: `Admin123!`

API docs: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
