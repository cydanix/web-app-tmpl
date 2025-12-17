# Backend - Rust Actix-Web

This is the backend server built with Rust and Actix-Web framework.

## Features

- RESTful API endpoints
- CORS enabled
- JSON responses
- Request logging
- Environment configuration

## API Endpoints

- `GET /api/status` - Get server status and current time
- `GET /api/health` - Health check endpoint

## Running

```bash
cargo run
```

## Building for Production

```bash
cargo build --release
./target/release/web-app-backend
```

## Environment Variables

See `.env.example` for available configuration options.

