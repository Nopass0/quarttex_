#!/bin/sh
# Check if SSL certificates exist and enable HTTPS configuration if they do

echo "Checking for SSL certificates..."
echo "Looking in /etc/nginx/ssl/ directory..."
ls -la /etc/nginx/ssl/ 2>/dev/null || echo "SSL directory not found or empty"

# Check for SSL certificates with more flexible naming
SSL_CERT=""
SSL_KEY=""
SSL_CA=""

# Look for certificate files
for cert in /etc/nginx/ssl/certificate.crt /etc/nginx/ssl/*.crt; do
    if [ -f "$cert" ]; then
        SSL_CERT="$cert"
        echo "Found certificate: $cert"
        break
    fi
done

# Look for key files
for key in /etc/nginx/ssl/certificate.key /etc/nginx/ssl/*.key; do
    if [ -f "$key" ]; then
        SSL_KEY="$key"
        echo "Found key: $key"
        break
    fi
done

# Look for CA files (optional)
for ca in /etc/nginx/ssl/certificate_ca.crt /etc/nginx/ssl/*ca*.crt; do
    if [ -f "$ca" ]; then
        SSL_CA="$ca"
        echo "Found CA certificate: $ca"
        break
    fi
done

if [ -n "$SSL_CERT" ] && [ -n "$SSL_KEY" ]; then
    echo "SSL certificates found, enabling HTTPS configuration"
    if [ -f "/etc/nginx/conf.d/https.conf.template" ]; then
        # Replace paths in template before copying
        sed -e "s|/etc/nginx/ssl/certificate.crt|$SSL_CERT|g" \
            -e "s|/etc/nginx/ssl/certificate.key|$SSL_KEY|g" \
            -e "s|/etc/nginx/ssl/certificate_ca.crt|${SSL_CA:-$SSL_CERT}|g" \
            /etc/nginx/conf.d/https.conf.template > /etc/nginx/conf.d/https.conf
        echo "HTTPS configuration enabled"
    else
        echo "Warning: https.conf.template not found"
    fi
else
    echo "SSL certificates not found (cert: $SSL_CERT, key: $SSL_KEY), using HTTP only"
    # Remove any existing HTTPS config
    rm -f /etc/nginx/conf.d/https.conf
    # Default config is already in place
fi

echo "Final nginx configuration:"
ls -la /etc/nginx/conf.d/

echo "Starting nginx..."
exec nginx -g 'daemon off;'