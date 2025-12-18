#!/bin/sh
set -e

DOMAIN=${DOMAIN:-localhost}

# Install gettext for envsubst if not available
if ! command -v envsubst >/dev/null 2>&1; then
    apk add --no-cache gettext
fi

# Function to setup nginx config
setup_nginx() {
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
        echo "SSL certificates found for ${DOMAIN}, using HTTPS configuration"
        # Use nginx.conf with SSL, substitute DOMAIN variable
        export DOMAIN
        envsubst '$$DOMAIN' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.active
        return 0
    else
        echo "SSL certificates not found for ${DOMAIN}, using HTTP-only configuration"
        # Use nginx-init.conf without SSL
        cp /etc/nginx/nginx-init.conf /etc/nginx/nginx.conf.active
        return 1
    fi
}

# Initial setup
setup_nginx
was_https=$?

# Start nginx in background and watch for certificate changes
nginx -c /etc/nginx/nginx.conf.active -g "daemon off;" &
NGINX_PID=$!

# Watch for certificate changes (check every 30 seconds)
while :; do
    sleep 30
    
    # Check if certificates now exist (if we were using HTTP)
    if [ $was_https -eq 1 ]; then
        if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
            echo "SSL certificates detected! Switching to HTTPS configuration..."
            setup_nginx
            was_https=0
            # Reload nginx
            kill -HUP $NGINX_PID 2>/dev/null || true
        fi
    fi
done

wait $NGINX_PID

