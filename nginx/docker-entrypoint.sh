#!/bin/sh
# Check if SSL certificates exist and enable HTTPS configuration if they do

echo "Checking for SSL certificates..."

if [ -f "/etc/nginx/ssl/certificate.crt" ] && [ -f "/etc/nginx/ssl/certificate.key" ] && [ -f "/etc/nginx/ssl/certificate_ca.crt" ]; then
    echo "SSL certificates found, enabling HTTPS configuration"
    cp /etc/nginx/conf.d/https.conf.template /etc/nginx/conf.d/https.conf
else
    echo "SSL certificates not found, using HTTP only"
fi

echo "Starting nginx..."
exec nginx -g 'daemon off;'