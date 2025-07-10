#!/bin/sh
# Check if SSL certificates exist and enable HTTPS configuration if they do

echo "Checking for SSL certificates..."

if [ -f "/etc/nginx/ssl/certificate.crt" ] && [ -f "/etc/nginx/ssl/certificate.key" ] && [ -f "/etc/nginx/ssl/certificate_ca.crt" ]; then
    echo "SSL certificates found, enabling HTTPS configuration"
    if [ -f "/etc/nginx/conf.d/https.conf.template" ]; then
        cp /etc/nginx/conf.d/https.conf.template /etc/nginx/conf.d/https.conf
    fi
else
    echo "SSL certificates not found, using HTTP only"
    # Ensure HTTP-only config is active
    if [ -f "/etc/nginx/conf.d/default-http-only.conf" ]; then
        cp /etc/nginx/conf.d/default-http-only.conf /etc/nginx/conf.d/default.conf
    fi
fi

echo "Starting nginx..."
exec nginx -g 'daemon off;'