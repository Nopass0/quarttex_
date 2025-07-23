#!/bin/bash

# Script to create fullchain certificate from individual certificate files

SSL_DIR="/home/user/projects/chase/ssl"

# Check if certificate files exist
if [ ! -f "$SSL_DIR/certificate.crt" ]; then
    echo "Error: certificate.crt not found!"
    exit 1
fi

if [ ! -f "$SSL_DIR/certificate_ca.crt" ]; then
    echo "Error: certificate_ca.crt not found!"
    exit 1
fi

# Create fullchain by combining certificate and CA bundle
echo "Creating fullchain.crt..."
cat "$SSL_DIR/certificate.crt" "$SSL_DIR/certificate_ca.crt" > "$SSL_DIR/fullchain.crt"

# Verify the certificate chain
echo "Verifying certificate chain..."
openssl verify -CAfile "$SSL_DIR/certificate_ca.crt" "$SSL_DIR/fullchain.crt"

# Show certificate details
echo ""
echo "Certificate details:"
openssl x509 -in "$SSL_DIR/fullchain.crt" -noout -subject -issuer -dates

echo ""
echo "Fullchain.crt created successfully!"
echo "Please restart nginx to apply changes: docker-compose restart nginx"