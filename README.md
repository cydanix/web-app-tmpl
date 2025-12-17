# Web App Template

A full-stack web application template with Rust Actix backend and Next.js frontend.

## Tech Stack

### Backend
- **Rust** with **Actix-Web** framework
- CORS enabled for cross-origin requests
- JSON API responses
- Environment variable configuration

### Frontend
- **Next.js 14** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Bootstrap** for UI components
- Auto-refresh status updates

## Features

- Real-time server status page
- Server time display with auto-refresh (every 5 seconds)
- Beautiful, responsive UI with dark mode support
- RESTful API endpoints
- CORS enabled for development

## Project Structure

```
web-app-tmpl/
├── backend/           # Rust Actix-Web backend
│   ├── src/
│   │   └── main.rs   # Main server code
│   ├── Cargo.toml    # Rust dependencies
│   └── .env.example  # Environment variables template
│
└── frontend/         # Next.js frontend
    ├── src/
    │   └── app/      # Next.js App Router
    │       ├── page.tsx      # Status page
    │       ├── layout.tsx    # Root layout
    │       └── globals.css   # Global styles
    ├── package.json          # Node dependencies
    ├── tsconfig.json         # TypeScript config
    ├── tailwind.config.ts    # Tailwind config
    └── .env.example          # Environment variables template
```

## Getting Started

### Prerequisites

- **Rust** (1.70 or later) - [Install Rust](https://rustup.rs/)
- **Node.js** (18 or later) - [Install Node.js](https://nodejs.org/)
- **npm** or **yarn** or **pnpm**

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Copy the environment file (optional):
```bash
cp .env.example .env
```

3. Run the backend server:
```bash
cargo run
```

The backend will start at `http://localhost:8080`

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

For development, you'll need two terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
cargo run
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### GET /api/status
Returns the current server status and time.

**Response:**
```json
{
  "status": "ok",
  "server_time": "2025-12-17T10:30:45.123456789-08:00",
  "timestamp": 1734459045
}
```

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

## Environment Variables

### Backend (.env)
```env
HOST=127.0.0.1
PORT=8080
RUST_LOG=info
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Production Build

### Backend
```bash
cd backend
cargo build --release
./target/release/web-app-backend
```

### Frontend
```bash
cd frontend
npm run build
npm run start
```

## Development Tips

- The backend uses Actix-Web's hot-reload in debug mode
- Frontend uses Next.js Fast Refresh for instant updates
- CORS is configured to allow requests from any origin (adjust for production)
- The status page auto-refreshes every 5 seconds

## License

MIT

