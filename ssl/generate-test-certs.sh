#!/bin/bash

# This script generates self-signed certificates for testing purposes only
# DO NOT USE THESE IN PRODUCTION!

echo "Generating test certificates for development..."
echo "WARNING: These are self-signed certificates for testing only!"

# Generate private key
openssl genrsa -out certificate.key 2048

# Generate certificate signing request
openssl req -new -key certificate.key -out certificate.csr \
    -subj "/C=US/ST=Test/L=Test/O=Test/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in certificate.csr -signkey certificate.key -out certificate.crt

# Create a fake CA certificate for testing
openssl req -new -x509 -days 365 -key certificate.key -out certificate_ca.crt \
    -subj "/C=US/ST=Test/L=Test/O=Test CA/CN=Test CA"

# Clean up CSR
rm certificate.csr

echo "Test certificates generated:"
ls -la *.crt *.key

echo ""
echo "To use these for local testing with docker-compose:"
echo "1. The fullchain.crt will be automatically created when nginx starts"
echo "2. Add NGINX_ALLOW_NO_SSL=true to your .env file if needed"