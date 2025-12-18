# Backend Dockerfile - Rust/Actix-web service

FROM rust:1.91.1 as builder

WORKDIR /app

# Copy external dependency first (needed for backend)
COPY external ./external

# Copy backend files
COPY backend/Cargo.toml backend/Cargo.lock ./backend/
COPY backend/src ./backend/src
COPY backend/migrations ./backend/migrations

# Build in release mode from backend directory
WORKDIR /app/backend
RUN cargo build --release

# Final runtime image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend binary
COPY --from=builder /app/backend/target/release/webapp-backend /usr/local/bin/webapp-backend

# Copy migrations
COPY backend/migrations /app/migrations

# Expose port 8080
EXPOSE 8080

# Run the backend
CMD ["/usr/local/bin/webapp-backend"]

