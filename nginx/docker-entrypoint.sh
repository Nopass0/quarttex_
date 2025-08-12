#!/bin/sh
set -e

echo "Starting nginx configuration..."

# Check if SSL certificates exist
SSL_AVAILABLE=false
if [ -f "/etc/nginx/ssl/fullchain.crt" ]; then
    echo "✓ Using existing fullchain.crt"
    SSL_AVAILABLE=true
elif [ -f "/etc/nginx/ssl/certificate.crt" ] && [ -f "/etc/nginx/ssl/certificate_ca.crt" ]; then
    echo "✓ Found certificate.crt and certificate_ca.crt"
    # Try to create fullchain.crt if possible
    if [ -w "/etc/nginx/ssl/" ]; then
        cat /etc/nginx/ssl/certificate.crt /etc/nginx/ssl/certificate_ca.crt > /etc/nginx/ssl/fullchain.crt
        echo "✓ Created fullchain.crt from individual certificates"
        SSL_AVAILABLE=true
    else
        echo "✓ Using individual certificates (read-only volume)"
        SSL_AVAILABLE=true
    fi
fi

# Configure nginx based on SSL availability
if [ "$SSL_AVAILABLE" = "true" ]; then
    echo "✓ SSL certificates found - using HTTPS configuration"
    # Check if default.conf exists, if not copy the appropriate config
    if [ ! -f "/etc/nginx/conf.d/default.conf" ]; then
        echo "! No default.conf found, using quattrex.pro.conf"
    fi
else
    echo "⚠ No SSL certificates found - using HTTP-only configuration"
    echo ""
    echo "To enable HTTPS, add SSL certificates to the ssl/ directory:"
    echo "  - fullchain.crt and certificate.key (recommended)"
    echo "  - OR certificate.crt, certificate_ca.crt, and certificate.key"
    echo ""
    
    # Use HTTP-only configuration
    if [ -f "/etc/nginx/conf.d/default.conf" ]; then
        # Backup original if it exists
        mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak 2>/dev/null || true
    fi
    
    # Copy HTTP-only config to default.conf if it exists
    if [ -f "/etc/nginx/conf.d/default-http-only.conf" ]; then
        cp /etc/nginx/conf.d/default-http-only.conf /etc/nginx/conf.d/default.conf
        echo "✓ Using HTTP-only configuration"
    fi
fi

# Execute nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'