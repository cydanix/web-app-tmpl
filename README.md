# Web App Template

A full-stack web application template with Rust Actix backend and Next.js frontend, featuring complete authentication, database integration, and Docker deployment.

## Tech Stack

### Backend
- **Rust** with **Actix-Web** framework
- **PostgreSQL** database with SQLx
- **nano-iam** for authentication and identity management
- Database migrations support
- CORS enabled for cross-origin requests
- JSON API responses
- Environment variable configuration
- Bearer token authentication

### Frontend
- **Next.js 16** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **React Bootstrap** for UI components
- Authentication context with token management
- Auto-refresh status updates

### Infrastructure
- **Docker** and **Docker Compose** for containerization
- **Nginx** reverse proxy with SSL/TLS support
- **Certbot** for Let's Encrypt certificates
- **GitHub Actions** for CI/CD

## Features

- **Complete Authentication System**
  - User signup with email verification
  - Email/password login
  - Google OAuth login (partially implemented)
  - Token-based authentication with refresh tokens
  - Password change and account management
  - Protected routes and API endpoints

- **Pages**
  - **Landing Page** (/) with hero section, features, testimonials, and pricing
  - **About Page** (/about) with team, values, and company story
  - **Sign Up** (/signup) with email verification flow
  - **Sign In** (/signin) with email/password and Google OAuth
  - **Email Verification** (/verify) for account activation
  - **Dashboard** (/dashboard) - protected user dashboard
  - **Status Page** (/status) with auto-refresh (every 5 seconds)
  - **Custom Error Pages** (404 and 500) with user-friendly messaging

- **Additional Features**
  - Reusable Components (Header, Footer, Dashboard Sidebar, Account Settings)
  - Responsive Design with dark mode support
  - RESTful API endpoints
  - CORS enabled for development
  - Modern UI with React Bootstrap and Tailwind CSS
  - Database migrations
  - Docker containerization
  - Production-ready deployment configuration

## Project Structure

```
web-app-tmpl/
├── backend/                  # Rust Actix-Web backend
│   ├── src/
│   │   ├── main.rs          # Main server code
│   │   ├── auth.rs          # Authentication middleware
│   │   ├── handlers.rs      # API route handlers
│   │   └── models.rs        # Data models
│   ├── migrations/          # Database migrations
│   │   └── 001_create_accounts_table.sql
│   ├── Cargo.toml           # Rust dependencies
│   ├── version              # Backend version
│   └── .env.example         # Environment variables template
│
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── page.tsx         # Landing page (/)
│   │   │   ├── about/
│   │   │   │   └── page.tsx     # About page (/about)
│   │   │   ├── signup/
│   │   │   │   └── page.tsx     # Sign up page (/signup)
│   │   │   ├── signin/
│   │   │   │   └── page.tsx     # Sign in page (/signin)
│   │   │   ├── verify/
│   │   │   │   └── page.tsx     # Email verification (/verify)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx     # Dashboard (/dashboard)
│   │   │   ├── status/
│   │   │   │   └── page.tsx     # Status page (/status)
│   │   │   ├── not-found.tsx    # 404 error page
│   │   │   ├── error.tsx        # 500 error page
│   │   │   ├── layout.tsx       # Root layout with header
│   │   │   └── globals.css      # Global styles
│   │   ├── components/      # Reusable components
│   │   │   ├── header.tsx       # Navigation header
│   │   │   ├── footer.tsx       # Site footer
│   │   │   ├── dashboard-sidebar.tsx
│   │   │   └── account-settings.tsx
│   │   ├── backend/         # Backend API client
│   │   │   ├── auth.ts          # Authentication API
│   │   │   ├── account.ts       # Account API
│   │   │   ├── status.ts        # Status API
│   │   │   ├── verify.ts         # Verification API
│   │   │   └── config.ts         # API configuration
│   │   └── contexts/        # React contexts
│   │       └── auth-context.tsx # Authentication context
│   ├── package.json         # Node dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── tailwind.config.ts   # Tailwind config
│   ├── next.config.js       # Next.js config
│   ├── version              # Frontend version
│   └── .env.example         # Environment variables template
│
├── docker/                  # Dockerfiles
│   ├── backend.Dockerfile
│   └── frontend.Dockerfile
│
├── deploy/                  # Deployment configuration
│   ├── docker-compose.yml   # Production docker-compose
│   ├── nginx.conf           # Nginx configuration
│   ├── nginx-init.conf      # Nginx init config
│   ├── nginx-entrypoint.sh # Nginx entrypoint script
│   ├── certbot-entrypoint.sh # Certbot entrypoint script
│   └── .env.example         # Deployment env template
│
├── .github/
│   └── workflows/           # GitHub Actions workflows
│       ├── build-all.yml
│       ├── build-backend.yml
│       └── build-frontend.yml
│
├── external/               # External dependencies
│   └── nano-iam/          # Authentication library (git submodule)
│
├── Makefile                # Convenience commands
└── README.md               # This file
```

## Getting Started

### Prerequisites

- **Rust** (1.70 or later) - [Install Rust](https://rustup.rs/)
- **Node.js** (18 or later) - [Install Node.js](https://nodejs.org/)
- **npm** or **yarn** or **pnpm**
- **PostgreSQL** (15 or later) - [Install PostgreSQL](https://www.postgresql.org/download/)
- **Docker** and **Docker Compose** (optional, for containerized deployment)

### Database Setup

1. Start PostgreSQL database (using Docker):
```bash
make run-db
```

Or manually:
```bash
docker run -d --name webapp-postgres -p 5432:5432 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=webapp \
  postgres
```

2. The database will be available at `localhost:5432` with:
   - User: `postgres`
   - Password: `postgres`
   - Database: `webapp`

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Copy the environment file (optional):
```bash
cp .env.example .env
```

3. Set the database URL (if not using default):
```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webapp
```

4. Run the backend server:
```bash
cargo run
```

Or use the Makefile:
```bash
make run-backend
```

The backend will start at `http://localhost:8080` and automatically:
- Connect to the database
- Initialize nano-iam schema
- Run database migrations

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Copy the environment file (optional):
```bash
cp .env.example .env
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

The frontend will start at `http://localhost:3000`

### Running Both Servers

For development, you'll need three terminal windows:

**Terminal 1 (Database):**
```bash
make run-db
```

**Terminal 2 (Backend):**
```bash
make run-backend
```

**Terminal 3 (Frontend):**
```bash
make run-frontend
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

**Note:** In development mode, verification codes are logged to the backend console instead of being sent via email. Check the backend logs for verification codes.

## Available Pages

- **Home**: http://localhost:3000/
- **About**: http://localhost:3000/about
- **Sign Up**: http://localhost:3000/signup
- **Sign In**: http://localhost:3000/signin
- **Email Verification**: http://localhost:3000/verify
- **Dashboard**: http://localhost:3000/dashboard (protected, requires authentication)
- **Status**: http://localhost:3000/status

## API Endpoints

### Public Endpoints

#### GET /api/status
Returns the current server status and time.

**Response:**
```json
{
  "status": "ok",
  "server_time": "2025-12-17T10:30:45.123456789-08:00",
  "timestamp": 1734459045
}
```

#### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

### Authentication Endpoints

#### POST /api/auth/signup
Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "email": "user@example.com",
  "account_id": "uuid-here",
  "message": "Account created. Please check your email for verification code."
}
```

#### POST /api/auth/verify-email
Verify email address with verification code.

**Request:**
```json
{
  "account_id": "uuid-here",
  "code": "123456"
}
```

#### POST /api/auth/resend-verification
Resend verification email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

#### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "account": {
    "id": "uuid-here",
    "iam_account_id": "uuid-here",
    "email": "user@example.com",
    "display_name": "user@example.com",
    "avatar_url": null,
    "auth_type": "email"
  },
  "access_token": "jwt-token-here",
  "refresh_token": "refresh-token-here",
  "access_token_expires_at": "2025-12-17T11:30:45Z",
  "refresh_token_expires_at": "2026-01-16T10:30:45Z"
}
```

#### POST /api/auth/google
Login with Google OAuth token.

**Request:**
```json
{
  "id_token": "google-id-token-here"
}
```

**Response:** Same as login endpoint.

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Request:**
```json
{
  "refresh_token": "refresh-token-here"
}
```

**Response:** Same as login endpoint.

### Protected Endpoints (Require Bearer Token)

#### GET /api/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "uuid-here",
  "iam_account_id": "uuid-here",
  "email": "user@example.com",
  "display_name": "user@example.com",
  "avatar_url": null,
  "auth_type": "email"
}
```

#### POST /api/auth/logout
Logout and revoke tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "access_token": "access-token-here"
}
```

#### POST /api/auth/change-password
Change user password.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "old_password": "oldpassword123",
  "new_password": "newpassword123"
}
```

#### POST /api/auth/delete-account
Delete user account.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "password": "currentpassword123"
}
```

## Environment Variables

### Backend (.env)
```env
HOST=127.0.0.1
PORT=8080
RUST_LOG=info
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webapp
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Deployment (.env in deploy/ directory)
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

### Using Docker

Build backend image:
```bash
make build-docker-backend
# or
docker build -f docker/backend.Dockerfile -t webapp-backend:latest .
```

Build frontend image:
```bash
make build-docker-frontend
# or
docker build -f docker/frontend.Dockerfile -t webapp-frontend:latest .
```

### Using Docker Compose

1. Navigate to deploy directory:
```bash
cd deploy
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration (domain, email, passwords, etc.)

4. Start all services:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Backend API service
- Frontend Next.js service
- Nginx reverse proxy with SSL
- Certbot for Let's Encrypt certificates

### Manual Build

#### Backend
```bash
cd backend
cargo build --release
./target/release/webapp-backend
```

#### Frontend
```bash
cd frontend
npm run build
npm run start
```

## CI/CD

The project includes GitHub Actions workflows for automated builds:

- **build-all.yml**: Builds and publishes both backend and frontend Docker images on tag pushes
- **build-backend.yml**: Builds and publishes backend image
- **build-frontend.yml**: Builds and publishes frontend image

Images are published to GitHub Container Registry (`ghcr.io`). To trigger a build, create a git tag:

```bash
git tag v0.0.1
git push origin v0.0.1
```

The workflows read version numbers from `backend/version` and `frontend/version` files.

## Development Tips

- The backend uses Actix-Web's hot-reload in debug mode
- Frontend uses Next.js Fast Refresh for instant updates
- CORS is configured to allow requests from any origin (adjust for production)
- The status page auto-refreshes every 5 seconds
- In development, email verification codes are logged to the backend console (check logs)
- Use `make run-db` to quickly start a PostgreSQL container for development
- The authentication system uses `nano-iam` library (included as a git submodule)
- Database migrations run automatically on backend startup
- Access tokens expire after 1 hour, refresh tokens after 30 days
- The frontend automatically refreshes access tokens every 5 minutes

## License

MIT

