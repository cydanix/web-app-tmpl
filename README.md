# Web App Template

A full-stack web application template with Rust Actix backend and Next.js frontend, featuring complete authentication, RBAC, multi-tenant organizations, blog, notifications, and Docker deployment.

## Tech Stack

### Backend
- **Rust** with **Actix-Web** framework
- **PostgreSQL** (two separate databases: app + IAM) with SQLx
- **nano-iam** (git submodule) for authentication, RBAC, and identity management
- Structured logging with `tracing` / `tracing-actix-web`
- Rate limiting with `actix-governor`
- Database migrations (numbered from 100 to avoid conflicts with nano-iam migrations)
- CORS configurable per environment
- Bearer token authentication with automatic refresh

### Frontend
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **React Bootstrap** for UI components
- **Tailwind CSS** for utility styling
- Unified API client with automatic JWT handling and 401 retry
- Multi-language support (English, Spanish, French, Portuguese, German)
- Server-side rendered blog (Markdown)
- Authentication context with token management

### Infrastructure
- **Docker** and **Docker Compose** for containerization
- **Nginx** reverse proxy with SSL/TLS support
- **Certbot** for Let's Encrypt certificates
- **GitHub Actions** for CI/CD

## Features

- **Complete Authentication System**
  - User signup with email verification
  - Optional invitation code at signup to join an existing organization
  - Email/password login
  - Google OAuth login (enabled when `GOOGLE_OAUTH_CLIENT_ID` is set)
  - Token-based authentication with refresh tokens
  - Password change and self-service account deletion
  - Protected routes and API endpoints

- **RBAC + Multi-tenant Organizations**
  - Every user belongs to exactly one organization
  - Roles: `admin`, `member`, `viewer` with fine-grained permissions
  - Admins can invite members via shareable invitation codes (7-day expiry)
  - Admins can remove members (full account deletion: tokens revoked, IAM soft-deleted, profile removed)
  - Admins can change member roles
  - Audit log of all organization and auth actions

- **Notifications**
  - System notifications with levels: `info`, `warning`, `error`
  - Mark individual or batch notifications read/unread
  - Select and delete notifications
  - Unread count displayed on console overview
  - Sign-in event automatically creates an info notification

- **Console (Protected User Area)**
  - Overview with stats (users, sessions, unread notifications)
  - Organization management (members, roles, invitations)
  - Account settings (username/display name)
  - Notifications page with human-readable timestamps

- **Public Pages**
  - Landing page with hero, features, testimonials, and pricing
  - About page
  - Blog (Markdown articles, SSR for SEO, `/blog/article-slug` URLs)
  - Pricing page (Free, Basic, Pro plans)
  - Terms of Service and Privacy Policy
  - Status page (auto-refresh every 5 seconds)
  - Custom 404 and 500 error pages

- **Additional Features**
  - Favicon and `sitemap.xml` / `robots.txt`
  - i18n: 5 languages (en, es, fr, pt, de), switchable in header
  - Reusable components: Header (shows Console button when logged in), Footer, Console Sidebar, Pricing Plans, Blog components
  - Responsive design with React Bootstrap

## Project Structure

```
web-app-tmpl/
├── backend/                  # Rust Actix-Web backend
│   ├── src/
│   │   ├── main.rs           # Server setup, routes, middleware
│   │   ├── auth.rs           # JWT middleware, AuthenticatedUser extractor
│   │   ├── handlers.rs       # API route handlers
│   │   ├── models.rs         # Request/response data models
│   │   ├── dba.rs            # Database access layer (app DB)
│   │   ├── config.rs         # AppConfig from environment variables
│   │   └── errors.rs         # Centralized AppError type
│   ├── migrations/           # App database migrations (numbered from 100)
│   │   ├── 100_create_user_profiles_table.sql
│   │   ├── 101_create_notifications_table.sql
│   │   ├── 102_create_audit_log_table.sql
│   │   ├── 103_create_organizations_table.sql
│   │   ├── 104_add_org_id_to_tables.sql
│   │   └── 105_create_org_invitations_table.sql
│   ├── Cargo.toml            # Rust dependencies
│   └── version               # Backend version
│
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   │   ├── page.tsx          # Landing page (/)
│   │   │   ├── about/            # About (/about)
│   │   │   ├── blog/             # Blog list (/blog) + articles (/blog/[slug])
│   │   │   ├── pricing/          # Pricing (/pricing)
│   │   │   ├── terms/            # Terms of Service (/terms)
│   │   │   ├── privacy/          # Privacy Policy (/privacy)
│   │   │   ├── signup/           # Sign Up (/signup)
│   │   │   ├── signin/           # Sign In (/signin)
│   │   │   ├── verify/           # Email verification (/verify)
│   │   │   ├── invite/[code]/    # Invitation acceptance (/invite/:code)
│   │   │   ├── console/          # Protected console (/console)
│   │   │   │   ├── page.tsx      #   Overview
│   │   │   │   ├── settings/     #   Account settings (/console/settings)
│   │   │   │   └── org/          #   Organization management (/console/org)
│   │   │   ├── notifications/    # Notifications (/notifications)
│   │   │   ├── status/           # Status (/status)
│   │   │   ├── not-found.tsx     # 404 page
│   │   │   └── error.tsx         # 500 page
│   │   ├── backend/          # Backend API client modules
│   │   │   ├── api-client.ts     # Unified HTTP client (auth, retry, error handling)
│   │   │   ├── auth.ts           # Auth API (signup, login, google, refresh, etc.)
│   │   │   ├── org.ts            # Organization & invitation API
│   │   │   ├── notifications.ts  # Notifications API
│   │   │   ├── account-settings.ts # Profile settings API
│   │   │   ├── account.ts        # Account info API
│   │   │   ├── google-oauth.ts   # Google OAuth helper
│   │   │   ├── status.ts         # Status API
│   │   │   ├── verify.ts         # Email verification API
│   │   │   └── config.ts         # API base URL configuration
│   │   ├── components/       # Reusable UI components
│   │   │   ├── header.tsx        # Nav header (Console button when logged in)
│   │   │   ├── footer.tsx        # Site footer
│   │   │   ├── console-sidebar.tsx # Sidebar for console pages
│   │   │   ├── account-settings.tsx # Account info display
│   │   │   ├── pricing-plans.tsx # Shared pricing component
│   │   │   ├── google-signin-button.tsx
│   │   │   ├── language-switcher.tsx
│   │   │   ├── blog-card.tsx
│   │   │   ├── blog-list.tsx
│   │   │   └── blog-content.tsx
│   │   ├── contexts/
│   │   │   ├── auth-context.tsx  # Auth state, login, signup, logout
│   │   │   └── i18n-context.tsx  # i18n provider and useI18n hook
│   │   ├── lib/
│   │   │   ├── blog.ts           # Blog post loading from Markdown
│   │   │   ├── google-oauth.ts   # Google OAuth client-side helper
│   │   │   └── i18n/
│   │   │       ├── messages/     # Translation files (en, es, fr, pt, de)
│   │   │       └── ...
│   │   └── blog/                 # Markdown blog articles (.md files)
│   ├── public/
│   │   ├── robots.txt
│   │   └── sitemap.xml (or generated)
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── version                   # Frontend version
│
├── external/
│   └── nano-iam/             # IAM library (git submodule)
│       └── src/migrations/   # IAM schema migrations (1, 2 — RBAC)
│
├── docker/
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
│
├── deploy/                   # Production deployment
│   ├── docker-compose.yml
│   ├── nginx.conf
│   ├── nginx-init.conf
│   ├── nginx-entrypoint.sh
│   ├── certbot-entrypoint.sh
│   └── .env.example
│
├── .github/workflows/        # GitHub Actions CI/CD
│   ├── build-all.yml
│   ├── build-backend.yml
│   └── build-frontend.yml
│
├── Makefile                  # Convenience commands
└── README.md
```

## Getting Started

### Prerequisites

- **Rust** (1.70 or later) — [Install Rust](https://rustup.rs/)
- **Node.js** (18 or later) — [Install Node.js](https://nodejs.org/)
- **PostgreSQL** (15 or later) — [Install PostgreSQL](https://www.postgresql.org/download/)
- **Docker** and **Docker Compose** (optional, for containerized deployment)

### Database Setup

The app uses two separate PostgreSQL databases: one for the IAM layer (`nano-iam`) and one for app data. By default both point to the same database instance but different logical databases.

Start both databases (using Docker):
```bash
make run-db
```

Or manually:
```bash
# App database
docker run -d --name webapp-postgres -p 5432:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=webapp postgres

# IAM database (can be the same instance, different DB name)
docker exec webapp-postgres psql -U postgres -c "CREATE DATABASE webapp_iam;"
```

### Backend Setup

1. Set environment variables (or copy `.env.example`):
```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webapp
export IAM_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webapp_iam
```

2. Run the backend:
```bash
cd backend && cargo run
# or
make run-backend
```

The backend will start at `http://localhost:8080` and automatically:
- Connect to both databases
- Run nano-iam schema migrations (IAM DB)
- Run app migrations 100–105 (app DB)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`.

### Running Everything

```bash
make run-db        # Terminal 1 — databases
make run-backend   # Terminal 2 — backend API
make run-frontend  # Terminal 3 — Next.js dev server
```

> **Note:** In development, email verification codes are printed to the backend log instead of being sent by email.

## Available Pages

| URL | Description | Auth required |
|-----|-------------|---------------|
| `/` | Landing page | No |
| `/about` | About page | No |
| `/blog` | Blog article list | No |
| `/blog/[slug]` | Blog article | No |
| `/pricing` | Pricing plans | No |
| `/terms` | Terms of Service | No |
| `/privacy` | Privacy Policy | No |
| `/signin` | Sign In | No |
| `/signup` | Sign Up (with optional invite code) | No |
| `/verify` | Email verification | No |
| `/invite/[code]` | Invitation acceptance | No |
| `/status` | Server status (auto-refresh) | No |
| `/console` | Console overview | Yes |
| `/console/settings` | Account settings | Yes |
| `/console/org` | Organization management | Yes (admin) |
| `/notifications` | Notifications | Yes |

## API Endpoints

All protected endpoints require `Authorization: Bearer <access_token>`.

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Server status |
| GET | `/api/health` | Health check |
| GET | `/api/auth/google-oauth-config` | Google OAuth client ID (if configured) |
| GET | `/api/org/invitations/{code}/info` | Invitation details (public) |

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register (optional `invite_code`) |
| POST | `/api/auth/verify-email` | Verify email with code |
| POST | `/api/auth/resend-verification` | Resend verification email |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/google` | Google OAuth login |
| POST | `/api/auth/refresh` | Refresh access token |

### Protected — Auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/logout` | Logout / revoke tokens |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/delete-account` | Delete own account |

### Protected — Account Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/account/settings` | Get profile settings |
| PUT | `/api/account/settings` | Update profile settings |

### Protected — Notifications

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications` | List notifications (paginated) |
| POST | `/api/notifications` | Create notification |
| GET | `/api/notifications/unread-count` | Unread count |
| PUT | `/api/notifications/batch` | Batch mark read/unread |
| DELETE | `/api/notifications/batch` | Batch delete |
| PUT | `/api/notifications/{id}` | Update single notification |
| DELETE | `/api/notifications/{id}` | Delete single notification |

### Protected — Organization

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/org` | Get org + members |
| POST | `/api/org/invitations` | Create invitation code |
| GET | `/api/org/invitations` | List active invitations |
| DELETE | `/api/org/invitations/{id}` | Revoke invitation |
| DELETE | `/api/org/members/{profile_id}` | Remove member (full account deletion) |
| PUT | `/api/org/members/{profile_id}/role` | Update member role |

### Protected — Audit Log

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/audit-log` | Paginated audit log |

## Environment Variables

### Backend

```env
HOST=127.0.0.1
PORT=8080
RUST_LOG=info
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webapp
IAM_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webapp_iam
CORS_ORIGIN=                        # empty = allow all; comma-separated origins for production
GOOGLE_OAUTH_CLIENT_ID=             # optional — enables Google OAuth
SERVICE_NAME=WebApp                 # used in emails and UI
DB_MAX_CONNECTIONS=10
DB_IDLE_TIMEOUT_SECS=300
ACCESS_TOKEN_TTL_HOURS=1
REFRESH_TOKEN_TTL_DAYS=30
```

### Frontend

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=   # optional — enables Google Sign-In button
```

### Deployment (`deploy/.env`)

```env
DOMAIN=yourdomain.com
EMAIL=admin@yourdomain.com
HTTP_PORT=80
HTTPS_PORT=443
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=webapp
NEXT_PUBLIC_API_URL=/api
STAGING=0
```

## Production Build

### Using Docker Compose

```bash
cd deploy
cp .env.example .env
# Edit .env with your configuration
docker-compose up -d
```

Starts: PostgreSQL, Backend, Frontend (Next.js), Nginx (SSL), Certbot.

### Using Docker directly

```bash
make build-docker-backend
make build-docker-frontend
```

### Manual build

```bash
# Backend
cd backend && cargo build --release
./target/release/webapp-backend

# Frontend
cd frontend && npm run build && npm run start
```

## CI/CD

GitHub Actions workflows build and publish Docker images to `ghcr.io` on git tag pushes:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Version numbers are read from `backend/version` and `frontend/version`.

## Development Tips

- Email verification codes are printed to the **backend log** in development (no SMTP needed)
- Access tokens expire after **1 hour**, refresh tokens after **30 days** (configurable)
- The frontend auto-refreshes access tokens every 5 minutes
- RBAC roles and permissions are seeded by nano-iam migrations
- App DB migrations are numbered from **100** to avoid conflicts with nano-iam's migrations (1, 2)
- Blog articles are `.md` files in `frontend/src/blog/` — add front matter (`title`, `date`) and content
- The `robots.txt` disallows `/console` crawling
- Google OAuth is **opt-in**: leave `GOOGLE_OAUTH_CLIENT_ID` empty to hide the Google Sign-In button

## License

MIT
