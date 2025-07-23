#!/bin/bash

# Script to create fullchain certificate from individual certificate files

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SSL_DIR="$SCRIPT_DIR"

echo "SSL Directory: $SSL_DIR"

# Check if certificate files exist
if [ ! -f "$SSL_DIR/certificate.crt" ]; then
    echo "Error: certificate.crt not found in $SSL_DIR!"
    exit 1
fi

if [ ! -f "$SSL_DIR/certificate_ca.crt" ]; then
    echo "Error: certificate_ca.crt not found in $SSL_DIR!"
    exit 1
fi

# Create fullchain by combining certificate and CA bundle
echo "Creating fullchain.crt..."
cat "$SSL_DIR/certificate.crt" "$SSL_DIR/certificate_ca.crt" > "$SSL_DIR/fullchain.crt"

if [ -f "$SSL_DIR/fullchain.crt" ]; then
    echo "✓ fullchain.crt created successfully!"
    
    # Set proper permissions
    chmod 644 "$SSL_DIR/fullchain.crt"
    
    # Verify the certificate chain
    echo ""
    echo "Verifying certificate chain..."
    openssl verify -CAfile "$SSL_DIR/certificate_ca.crt" "$SSL_DIR/fullchain.crt" 2>/dev/null || echo "Note: Certificate verification failed (this is normal for self-signed certificates)"
    
    # Show certificate details
    echo ""
    echo "Certificate details:"
    openssl x509 -in "$SSL_DIR/fullchain.crt" -noout -subject -issuer -dates
    
    echo ""
    echo "Next steps:"
    echo "1. If nginx is running: docker-compose restart nginx"
    echo "2. If not running: docker-compose up -d"
else
    echo "Error: Failed to create fullchain.crt"
    exit 1
fi