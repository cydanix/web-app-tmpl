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
    else
        echo "SSL certificates not found for ${DOMAIN}, using HTTP-only configuration"
        # Use nginx-init.conf without SSL, but still substitute DOMAIN variable
        export DOMAIN
        envsubst '$$DOMAIN' < /etc/nginx/nginx-init.conf > /etc/nginx/nginx.conf.active
    fi
}

# Initial setup
setup_nginx

# Test nginx configuration before starting
echo "Testing nginx configuration..."
nginx -t -c /etc/nginx/nginx.conf.active || {
    echo "ERROR: nginx configuration test failed!"
    echo "Configuration file contents:"
    cat /etc/nginx/nginx.conf.active
    exit 1
}

# Start nginx in foreground (daemon off)
echo "Starting nginx..."
exec nginx -c /etc/nginx/nginx.conf.active -g "daemon off;"

