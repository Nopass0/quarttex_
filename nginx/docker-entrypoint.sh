#!/bin/sh
# Simple entrypoint that just verifies SSL certificates exist

echo "Checking for SSL certificates..."
if [ -f "/etc/nginx/ssl/certificate.crt" ] && [ -f "/etc/nginx/ssl/certificate.key" ]; then
    echo "SSL certificates found - HTTPS will be enabled"
    ls -la /etc/nginx/ssl/
else
    echo "WARNING: SSL certificates not found in /etc/nginx/ssl/"
    echo "The site will not work properly without SSL certificates"
fi

echo "Starting nginx..."
exec nginx -g 'daemon off;'