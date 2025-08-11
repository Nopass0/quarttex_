#!/bin/bash
set -e

# Setup SSL certificates for quattrex.pro
DOMAIN="quattrex.pro"
SSL_DIR="./ssl/$DOMAIN"
EMAIL="admin@quattrex.pro"

echo "==============================================="
echo "SSL Certificate Setup for $DOMAIN"
echo "==============================================="

# Create SSL directory
mkdir -p "$SSL_DIR"

# Check if running with Docker
if command -v docker &> /dev/null; then
    echo "Docker detected. Using certbot container..."
    
    # Stop nginx if running
    docker compose -f docker-compose.prod.yml stop nginx 2>/dev/null || true
    
    # Get certificates using certbot
    docker run -it --rm \
        -v "$(pwd)/ssl:/etc/letsencrypt" \
        -v "$(pwd)/ssl-challenge:/var/www/certbot" \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN"
    
    # Copy certificates to the right location
    if [ -d "ssl/live/$DOMAIN" ]; then
        cp "ssl/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
        cp "ssl/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
        echo "✅ SSL certificates copied to $SSL_DIR"
    else
        echo "❌ Failed to obtain certificates"
        exit 1
    fi
    
else
    echo "Docker not found. Using system certbot..."
    
    # Check if certbot is installed
    if ! command -v certbot &> /dev/null; then
        echo "Installing certbot..."
        if [ -f /etc/debian_version ]; then
            sudo apt-get update
            sudo apt-get install -y certbot
        elif [ -f /etc/redhat-release ]; then
            sudo yum install -y certbot
        else
            echo "❌ Unsupported OS. Please install certbot manually."
            exit 1
        fi
    fi
    
    # Get certificates
    sudo certbot certonly \
        --standalone \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN,www.$DOMAIN"
    
    # Copy certificates
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
        sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
        sudo chown -R $USER:$USER "$SSL_DIR"
        echo "✅ SSL certificates copied to $SSL_DIR"
    else
        echo "❌ Failed to obtain certificates"
        exit 1
    fi
fi

# Create renewal script
cat > renew-ssl.sh << 'EOF'
#!/bin/bash
set -e

DOMAIN="quattrex.pro"
SSL_DIR="./ssl/$DOMAIN"

echo "Renewing SSL certificates for $DOMAIN..."

if command -v docker &> /dev/null; then
    docker run -it --rm \
        -v "$(pwd)/ssl:/etc/letsencrypt" \
        -v "$(pwd)/ssl-challenge:/var/www/certbot" \
        certbot/certbot renew
    
    if [ -d "ssl/live/$DOMAIN" ]; then
        cp "ssl/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
        cp "ssl/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
        echo "✅ Certificates renewed and copied"
        
        # Reload nginx
        docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
    fi
else
    sudo certbot renew
    
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/"
        sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/"
        sudo chown -R $USER:$USER "$SSL_DIR"
        echo "✅ Certificates renewed and copied"
        
        # Reload nginx if using Docker
        if docker ps | grep -q quattrex_nginx; then
            docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
        fi
    fi
fi
EOF

chmod +x renew-ssl.sh

echo ""
echo "==============================================="
echo "SSL Setup Complete!"
echo "==============================================="
echo ""
echo "Certificates location: $SSL_DIR"
echo "  - fullchain.pem"
echo "  - privkey.pem"
echo ""
echo "To renew certificates, run: ./renew-ssl.sh"
echo ""
echo "Add to crontab for auto-renewal:"
echo "0 0 1 * * cd $(pwd) && ./renew-ssl.sh"
echo ""