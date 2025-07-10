#!/bin/bash
# Setup script for Chase P2P Payment Platform development environment

set -e

echo "🚀 Chase P2P Platform - Development Environment Setup"
echo "===================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root!"
   exit 1
fi

# Function to check if we can use sudo
can_use_sudo() {
    if command -v sudo &> /dev/null; then
        # Check if user has sudo privileges
        if sudo -n true 2>/dev/null; then
            return 0
        else
            # Try to prompt for password
            echo "This script needs sudo privileges for some operations."
            if sudo true; then
                return 0
            fi
        fi
    fi
    return 1
}

# Check if PostgreSQL is already installed and running
is_postgres_running() {
    if command -v psql &> /dev/null; then
        if psql -U postgres -c "SELECT 1" &> /dev/null || psql -U $USER -c "SELECT 1" &> /dev/null; then
            return 0
        fi
    fi
    return 1
}

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    print_error "Unsupported OS: $OSTYPE"
    exit 1
fi

print_info "Detected OS: $OS"

# Step 1: Install PostgreSQL
print_info "Checking PostgreSQL installation..."

if is_postgres_running; then
    print_success "PostgreSQL is already installed and running"
else
    print_info "PostgreSQL not found. Attempting to install..."
    
    if [[ "$OS" == "linux" ]]; then
        if ! can_use_sudo; then
            print_error "PostgreSQL is not installed and sudo privileges are required to install it."
            print_error "Please install PostgreSQL manually or run this script with sudo privileges."
            print_info "On Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
            print_info "On CentOS/RHEL: sudo yum install postgresql postgresql-server postgresql-contrib"
            exit 1
        fi
        
        # Ubuntu/Debian
        if command -v apt-get &> /dev/null; then
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            print_success "PostgreSQL installed via apt"
        # CentOS/RHEL/Fedora
        elif command -v yum &> /dev/null; then
            sudo yum install -y postgresql postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
            sudo systemctl enable postgresql
            sudo systemctl start postgresql
            print_success "PostgreSQL installed via yum"
        else
            print_error "Unsupported Linux distribution"
            exit 1
        fi
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install postgresql
            brew services start postgresql
            print_success "PostgreSQL installed via Homebrew"
        else
            print_error "Homebrew not found. Please install Homebrew first."
            exit 1
        fi
    fi
fi

# Step 2: Create database and user
print_info "Setting up PostgreSQL database..."

# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DB_NAME="chase_dev"
DB_USER="chase_user"

# Function to execute PostgreSQL commands
execute_psql() {
    local sql="$1"
    
    # Try different methods to connect to PostgreSQL
    if psql -U postgres -c "$sql" 2>/dev/null; then
        return 0
    elif psql -U $USER -c "$sql" 2>/dev/null; then
        return 0
    elif can_use_sudo && sudo -u postgres psql -c "$sql" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to execute PostgreSQL commands with database
execute_psql_db() {
    local db="$1"
    local sql="$2"
    
    if psql -U postgres -d "$db" -c "$sql" 2>/dev/null; then
        return 0
    elif psql -U $USER -d "$db" -c "$sql" 2>/dev/null; then
        return 0
    elif can_use_sudo && sudo -u postgres psql -d "$db" -c "$sql" 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Check if database already exists
if execute_psql "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}';" | grep -q 1; then
    print_info "Database '${DB_NAME}' already exists"
    # Generate new credentials for existing database
    print_info "Updating database credentials..."
    execute_psql "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" || true
else
    # Create user and database
    print_info "Creating database user and database..."
    
    # Create user (ignore error if already exists)
    execute_psql "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" || true
    
    # Create database
    if ! execute_psql "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"; then
        print_error "Failed to create database. Please check your PostgreSQL installation."
        print_info "You may need to create the database manually:"
        print_info "  CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"
        print_info "  CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
        print_info "  GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
        exit 1
    fi
    
    # Grant privileges
    execute_psql "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" || true
    
    # Create extensions
    execute_psql_db "${DB_NAME}" "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" || true
fi

print_success "Database '${DB_NAME}' created with user '${DB_USER}'"

# Step 3: Create project directories if they don't exist
print_info "Setting up project structure..."
mkdir -p backend
mkdir -p frontend
mkdir -p .gpt

# Step 4: Create .env files
print_info "Creating environment configuration files..."

# Root .env file
cat > .env <<EOF
# Chase P2P Platform - Root Environment Configuration
# Generated on $(date)

# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# Environment
NODE_ENV=development
EOF

# Backend .env file
cat > backend/.env <<EOF
# Chase P2P Platform - Backend Environment Configuration
# Generated on $(date)

# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"

# Server
PORT=3000
HOST=localhost

# JWT
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')

# Admin
ADMIN_KEY=admin-dev-$(openssl rand -hex 16)
SUPER_ADMIN_KEY=super-admin-dev-$(openssl rand -hex 16)

# File uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=15728640

# Telegram Bot (optional - update with your values)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Email (optional - update with your SMTP settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@chase.local

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Development
LOG_LEVEL=debug
EOF

# Frontend .env.local file
cat > frontend/.env.local <<EOF
# Chase P2P Platform - Frontend Environment Configuration
# Generated on $(date)

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000/api/ws

# App
NEXT_PUBLIC_APP_NAME="Chase P2P"
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Features
NEXT_PUBLIC_ENABLE_WEBSOCKET=true
NEXT_PUBLIC_ENABLE_TELEGRAM=true
EOF

print_success "Environment files created"

# Step 5: Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
    cat > .gitignore <<EOF
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output

# Next.js
.next/
out/
build/
dist/

# Production
*.production
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Project specific
uploads/
.gpt/logs/
*.log
*.pid
*.seed
*.pid.lock

# Database
*.sqlite
*.sqlite3
postgres-data/

# Temporary files
tmp/
temp/
EOF
    print_success ".gitignore created"
fi

# Step 6: Install dependencies
print_info "Installing project dependencies..."

# Install backend dependencies
if [ -f backend/package.json ]; then
    cd backend
    if command -v bun &> /dev/null; then
        bun install
        print_success "Backend dependencies installed with Bun"
    else
        npm install
        print_success "Backend dependencies installed with npm"
    fi
    cd ..
else
    print_info "Skipping backend dependencies (package.json not found)"
fi

# Install frontend dependencies
if [ -f frontend/package.json ]; then
    cd frontend
    npm install
    print_success "Frontend dependencies installed"
    cd ..
else
    print_info "Skipping frontend dependencies (package.json not found)"
fi

# Step 7: Run database migrations
if [ -f backend/prisma/schema.prisma ]; then
    print_info "Running database migrations..."
    cd backend
    npx prisma generate
    npx prisma migrate deploy
    print_success "Database migrations completed"
    cd ..
else
    print_info "Skipping migrations (Prisma schema not found)"
fi

# Step 8: Create helper scripts directory
print_info "Creating AI agent helper scripts..."
mkdir -p .gpt

# Create helper scripts (we'll add more later)
cat > .gpt/check-status.sh <<'EOF'
#!/bin/bash
echo "🔍 Checking project status..."
echo ""

# Check if backend is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running"
fi

# Check if frontend is running
if curl -s http://localhost:3001 > /dev/null; then
    echo "✅ Frontend is running"
else
    echo "❌ Frontend is not running"
fi

# Check database connection
echo ""
echo "📊 Database status:"
if PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1" > /dev/null 2>&1; then
    echo "✅ Database is accessible"
else
    echo "❌ Database connection failed"
fi
EOF

chmod +x .gpt/check-status.sh

# Summary
echo ""
echo "===================================================="
print_success "Development environment setup completed!"
echo ""
echo "📋 Database Credentials:"
echo "   Database: ${DB_NAME}"
echo "   User: ${DB_USER}"
echo "   Password: ${DB_PASSWORD}"
echo "   Connection: postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo "🚀 Next steps:"
echo "   1. cd backend && bun dev"
echo "   2. cd frontend && npm run dev"
echo "   3. Access the app at http://localhost:3001"
echo ""
echo "💡 Use scripts in .gpt/ directory for development tasks"
echo ""