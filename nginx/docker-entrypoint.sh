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

    # Try to create fullchain.crt; suppress errors if volume is read-only
    if sh -c 'cat /etc/nginx/ssl/certificate.crt /etc/nginx/ssl/certificate_ca.crt > /etc/nginx/ssl/fullchain.crt' 2>/dev/null; then

        echo "✓ Created fullchain.crt from individual certificates"
    else
        echo "✗ Failed to create fullchain.crt (read-only volume)"
    fi
    SSL_AVAILABLE=true
fi

# Configure nginx based on SSL availability
if [ "$SSL_AVAILABLE" = "true" ]; then
    echo "✓ SSL certificates found - using HTTPS configuration"
    # Ensure default.conf exists by copying the HTTPS template if missing
    if [ ! -f "/etc/nginx/conf.d/default.conf" ]; then
        echo "! No default.conf found, using quattrex.pro.conf"
        cp /etc/nginx/conf.d/quattrex.pro.conf /etc/nginx/conf.d/default.conf
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
