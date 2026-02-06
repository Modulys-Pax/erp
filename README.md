# Spolier ERP

A complete Enterprise Resource Planning (ERP) system for **Transportation and Logistics** companies, built with modern technologies and scalable architecture.

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

## Overview

**Spolier ERP** is a comprehensive solution for managing operations in transportation and logistics companies. The system covers everything from fleet control and maintenance to financial management, human resources, and inventory.

### Key Features

| Module | Description |
|--------|-------------|
| **Fleet Management** | Complete vehicle control, documents, status history, and mileage tracking |
| **Maintenance** | Work orders, preventive maintenance labels, parts and labor control |
| **Inventory** | Product management, stock movements, branch-level control |
| **Financial** | Accounts payable/receivable, wallet, expenses, financial summary |
| **HR** | Employees, payroll, vacations, benefits, employee costs |
| **Internal Chat** | Real-time communication between employees with media support |
| **Audit** | Complete tracking of all system actions |
| **RBAC** | Granular permission-based access control |

## Architecture

```
spolier/
├── backend/                 # NestJS API
│   ├── prisma/              # Schema and migrations
│   ├── src/
│   │   ├── modules/         # Domain modules
│   │   ├── shared/          # Shared code
│   │   └── main.ts          # Entry point
│   └── uploads/             # Uploaded files
│
├── frontend/                # Next.js App
│   ├── app/                 # App Router (pages)
│   ├── components/          # React components
│   └── lib/                 # Utilities and API clients
│
└── docs/                    # Documentation
```

## Tech Stack

### Backend
- **Framework**: [NestJS](https://nestjs.com/) v10
- **ORM**: [Prisma](https://www.prisma.io/) v5
- **Database**: PostgreSQL
- **Authentication**: JWT with Passport
- **WebSockets**: Socket.io for real-time communication
- **File Upload**: Multer + Sharp (images) + FFmpeg (videos)
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator + class-transformer

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) v14 (App Router)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + Radix UI
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query) (React Query)
- **Forms**: React Hook Form + Zod
- **Icons**: [Lucide React](https://lucide.dev/)
- **Notifications**: Sonner
- **Export**: jsPDF + jspdf-autotable

## Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **npm** or **yarn**
- **FFmpeg** (optional, for video compression)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/your-username/spolier.git
cd spolier
```

### 2. Set up the Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

Edit the `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/spolier_db?schema=public"

# JWT
JWT_SECRET="your-very-secure-secret-key"
JWT_EXPIRATION="7d"
JWT_REFRESH_EXPIRATION="30d"

# Server
PORT=3001
```

```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Set up initial admin
npm run setup:admin
```

### 3. Set up the Frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment variables
cp env.example .env.local
```

Edit the `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Start the System

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Access: [http://localhost:3000](http://localhost:3000)

## Available Scripts

### Backend

| Script | Description |
|--------|-------------|
| `npm run start:dev` | Start in development mode (watch) |
| `npm run start:prod` | Start in production mode |
| `npm run build` | Build the project |
| `npm run prisma:migrate` | Run migrations em desenvolvimento (cria/aplica) |
| `npm run prisma:migrate:deploy` | Aplicar migrations em produção (deploy) |
| `npm run prisma:studio` | Open Prisma Studio (database GUI) |
| `npm run prisma:seed` | Populate database with sample data |
| `npm run setup:admin` | Set up company and admin user |
| `npm run lint` | Run linter |
| `npm run test` | Run unit tests |

### Frontend

| Script | Description |
|--------|-------------|
| `npm run dev` | Start in development mode |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run linter |

## System Modules

### Fleet Management (`/vehicles`)
- Vehicle registration with multiple license plates
- Status history (active, in maintenance, inactive)
- Mileage control
- Documents and expiration alerts
- Vehicle markings (fueling, etc.)

### Maintenance (`/maintenance`)
- Complete work orders
- Labor and time control
- Materials and parts tracking
- Event timeline
- Preventive maintenance labels

### Inventory (`/stock`)
- Products with units of measurement
- Stock movements (in/out)
- Branch-level control
- Automatic average cost calculation
- Consumption summary

### Financial (`/financial`)
- **Accounts Payable**: Due dates, payments, settlements
- **Accounts Receivable**: Receipts, settlements
- **Wallet**: Balance by branch, adjustments
- **Expenses**: Categorized expenses
- **Summary**: Consolidated financial overview

### Human Resources
- **Employees** (`/employees`): Complete registration
- **Payroll** (`/payroll`): Monthly processing
- **Vacations** (`/vacations`): Automatic calculations
- **Benefits** (`/benefits`): Transportation, meal vouchers, health plan

### Internal Chat (`/chat`)
- Individual and group conversations
- Image, video, and PDF support
- Automatic media compression
- Real-time presence status
- Unread message notifications

### Administration
- **Branches** (`/branches`): Multi-branch support
- **Users** (`/users`): Access management
- **Permissions** (`/roles`): Granular RBAC
- **Audit** (`/audit`): Complete action logging

## API Documentation

With the backend running, access the Swagger documentation:

```
http://localhost:3001/api
```

### Authentication

All routes (except `/auth/login` and `/health`) require JWT authentication.

```bash
# Login
POST /auth/login
{
  "email": "admin@company.com",
  "password": "your-password"
}

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": { ... }
}
```

Use the `accessToken` in the header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Permission System (RBAC)

The system uses granular permission-based access control:

```
module.action
```

Examples:
- `vehicles.create` - Create vehicles
- `vehicles.read` - View vehicles
- `financial.manage` - Manage financial data
- `employees.delete` - Delete employees

The **Admin** role has automatic bypass (full access).

## Database

### Simplified Diagram

```
Company (1) ─────── (*) Branch
    │                    │
    │                    ├── (*) Employee
    │                    ├── (*) Vehicle
    │                    ├── (*) Product
    │                    ├── (*) Stock
    │                    ├── (*) MaintenanceOrder
    │                    ├── (*) AccountPayable
    │                    ├── (*) AccountReceivable
    │                    └── (*) BranchBalance
    │
    └── (*) User ─────── (1) Role ─────── (*) Permission
```

### Main Entities

| Entity | Description |
|--------|-------------|
| `Company` | Company (single-tenant, multi-tenant ready) |
| `Branch` | Company branches |
| `User` | System users |
| `Employee` | Employees |
| `Vehicle` | Fleet vehicles |
| `Product` | Inventory products |
| `MaintenanceOrder` | Maintenance orders |
| `AccountPayable` | Accounts payable |
| `AccountReceivable` | Accounts receivable |

## Deployment

### Migrations no servidor (importante)

**As migrations não rodam sozinhas no deploy.** Ao subir o backend no servidor (SSH, Docker, etc.), é preciso aplicar as migrations no banco de produção manualmente ou no seu script de deploy.

No servidor, na pasta do backend, com `DATABASE_URL` apontando para o banco de produção:

```bash
cd backend
npm run prisma:migrate:deploy
```

Ou diretamente:

```bash
npx prisma migrate deploy
```

Recomendação: inclua esse comando no seu processo de deploy (script de deploy, CI/CD ou entrypoint do container) **antes** de iniciar a aplicação, para que novas migrations sejam aplicadas a cada release.

**Com Docker:** o backend já está configurado para rodar `prisma migrate deploy` ao subir o container (ver `backend/Dockerfile`). Basta garantir que `DATABASE_URL` esteja definida no ambiente do container.

### Comandos Docker (build e subir)

Na raiz do projeto, com `.env` (ou variáveis de ambiente) configurado:

```bash
# Build de todas as imagens
docker compose build --no-cache

# Subir em background (PostgreSQL, backend, frontend, nginx, certbot)
docker compose up -d
```

O backend aplica as migrations automaticamente na inicialização. Para rebuildar só um serviço:

```bash
docker compose build backend --no-cache
docker compose up -d backend
```

Variáveis obrigatórias no `.env` na raiz (para o `docker-compose.yml`): `DB_PASSWORD`, `JWT_SECRET`. Opcionais: `DB_USER`, `DB_NAME`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`.

### Environment Variables (Production)

**Backend:**
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=super-secret-production-key
JWT_EXPIRATION=1d
JWT_REFRESH_EXPIRATION=7d
PORT=3001
```

**Frontend:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Docker (Recommended)

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a branch for your feature (`git checkout -b feature/new-feature`)
3. Commit your changes following Conventional Commits
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

### Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) specification with **commitlint** and **husky** to ensure consistent commit messages.

#### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(auth): add password recovery` |
| `fix` | Bug fix | `fix(vehicles): resolve pagination issue` |
| `docs` | Documentation changes | `docs: update API examples` |
| `style` | Code style (formatting, no logic change) | `style: fix indentation` |
| `refactor` | Code refactoring | `refactor(stock): simplify calculations` |
| `perf` | Performance improvements | `perf(queries): add database indexes` |
| `test` | Adding or fixing tests | `test(auth): add login unit tests` |
| `build` | Build system or dependencies | `build: upgrade Next.js to v14` |
| `ci` | CI/CD configuration | `ci: add coverage report to workflow` |
| `chore` | General maintenance | `chore: clean up unused imports` |
| `revert` | Revert a commit | `revert: undo last migration` |

#### Scope (Optional)

The scope provides additional context about what part of the codebase is affected:

- `auth` - Authentication
- `vehicles` - Fleet management
- `stock` - Inventory
- `financial` - Financial module
- `employees` - HR module
- `chat` - Internal chat
- `api` - API changes
- `ui` - UI components

#### Examples

```bash
# Feature with scope
git commit -m "feat(chat): add file attachment support"

# Bug fix
git commit -m "fix(financial): correct wallet balance calculation"

# Documentation
git commit -m "docs: add deployment instructions"

# Breaking change (with footer)
git commit -m "feat(api)!: change authentication endpoint

BREAKING CHANGE: /auth/login now requires email instead of username"
```

#### Validation

Commits are automatically validated before being created. Invalid messages will be rejected:

```bash
# ❌ Invalid - will be rejected
git commit -m "fixed bug"
git commit -m "WIP"
git commit -m "update"

# ✅ Valid - will be accepted
git commit -m "fix(auth): resolve token expiration issue"
git commit -m "feat: add dashboard statistics"
git commit -m "docs: update README"
```

### Code Standards

- **Commits**: Conventional Commits (enforced by commitlint)
- **Branches**: `feature/`, `fix/`, `refactor/`, `docs/`
- **TypeScript**: Strict mode enabled
- **Lint**: ESLint + Prettier
- **Tests**: Jest (minimum 85% coverage)

## License

This project is proprietary and for private use. All rights reserved.

---

Built with dedication to optimize the management of transportation and logistics companies.
