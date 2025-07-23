#!/bin/sh
set -e

echo "Starting nginx SSL certificate setup..."

# Check if SSL certificates exist
if [ -f "/etc/nginx/ssl/certificate.crt" ] && [ -f "/etc/nginx/ssl/certificate_ca.crt" ]; then
    echo "Creating fullchain certificate..."
    
    # Create fullchain by combining certificate and CA bundle
    cat /etc/nginx/ssl/certificate.crt /etc/nginx/ssl/certificate_ca.crt > /etc/nginx/ssl/fullchain.crt
    
    echo "Fullchain certificate created successfully"
    
    # Set proper permissions
    chmod 644 /etc/nginx/ssl/fullchain.crt
    
    # List SSL directory contents
    echo "SSL directory contents:"
    ls -la /etc/nginx/ssl/
elif [ -f "/etc/nginx/ssl/fullchain.crt" ]; then
    echo "Using existing fullchain.crt"
    ls -la /etc/nginx/ssl/
else
    echo "ERROR: SSL certificates not found!"
    echo "Please ensure one of the following:"
    echo "1. Both certificate.crt and certificate_ca.crt exist"
    echo "2. OR fullchain.crt exists"
    
    # For development/testing, we might want to continue anyway
    if [ "$NGINX_ALLOW_NO_SSL" = "true" ]; then
        echo "NGINX_ALLOW_NO_SSL is set, continuing without SSL..."
    else
        exit 1
    fi
fi

# Execute nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'