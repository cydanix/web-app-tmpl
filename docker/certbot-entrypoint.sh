#!/bin/sh
set -e

DOMAIN=${DOMAIN:-localhost}
EMAIL=${EMAIL:-""}
STAGING=${STAGING:-0}

# Wait for nginx to be ready
echo "Waiting for nginx to be ready..."
sleep 10

# Check if certificates already exist
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" ]; then
    echo "SSL certificates already exist for ${DOMAIN}, starting renewal loop..."
else
    echo "SSL certificates not found for ${DOMAIN}, attempting to obtain..."
    
    # Prepare email argument
    if [ -z "$EMAIL" ]; then
        email_arg="--register-unsafely-without-email"
    else
        email_arg="--email $EMAIL"
    fi
    
    # Prepare staging argument
    if [ "$STAGING" = "1" ]; then
        staging_arg="--staging"
        echo "Using Let's Encrypt staging environment (test mode)"
    else
        staging_arg=""
    fi
    
    # Attempt to obtain certificate
    certbot certonly --webroot \
        -w /var/www/certbot \
        $staging_arg \
        $email_arg \
        -d "$DOMAIN" \
        --rsa-key-size 4096 \
        --agree-tos \
        --non-interactive || {
        echo "Failed to obtain certificate. This is normal if:"
        echo "  1. Domain is not pointing to this server"
        echo "  2. Port 80 is not accessible from the internet"
        echo "  3. Using staging mode for testing"
        echo "Will retry on next renewal cycle..."
    }
    
    # Signal nginx to reload if certificate was obtained
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        echo "Certificate obtained! Nginx will detect it on next check."
        # Touch a file to signal nginx to reload (nginx entrypoint can watch for this)
        touch /var/www/certbot/.cert-obtained 2>/dev/null || true
    fi
fi

# Start renewal loop
echo "Starting certificate renewal loop (checks every 12 hours)..."
while :; do
    certbot renew --webroot -w /var/www/certbot --quiet
    
    # Signal that certificates were renewed
    touch /var/www/certbot/.cert-renewed 2>/dev/null || true
    
    sleep 12h
    wait
done

