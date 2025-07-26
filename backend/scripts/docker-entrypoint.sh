#!/bin/bash
set -e

echo "==================== CONTAINER STARTUP ===================="
echo "Starting backend container at $(date)"

# Function to check database connection
check_db_connection() {
    echo "Checking database connection..."
    if bunx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        echo "✓ Database connection successful"
        return 0
    else
        echo "✗ Database connection failed"
        return 1
    fi
}

# Wait for database to be ready
echo "Waiting for database to be ready..."
max_retries=30
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if check_db_connection; then
        break
    fi
    echo "Database not ready yet, retrying in 2 seconds... ($((retry_count + 1))/$max_retries)"
    sleep 2
    retry_count=$((retry_count + 1))
done

if [ $retry_count -eq $max_retries ]; then
    echo "✗ Database connection failed after $max_retries attempts"
    exit 1
fi

# Run migrations
echo "==================== RUNNING MIGRATIONS ===================="
echo "Current migration status:"
bunx prisma migrate status || true

echo -e "\nApplying migrations..."
if bunx prisma migrate deploy; then
    echo "✓ Migrations applied successfully"
else
    echo "✗ Migration deploy failed, trying db push..."
    if bunx prisma db push --accept-data-loss; then
        echo "✓ Schema pushed successfully"
    else
        echo "✗ Both migration and db push failed"
        exit 1
    fi
fi

# Generate Prisma Client
echo -e "\nGenerating Prisma Client..."
if bunx prisma generate; then
    echo "✓ Prisma Client generated successfully"
else
    echo "✗ Failed to generate Prisma Client"
    exit 1
fi

# Verify schema
echo -e "\n==================== VERIFYING SCHEMA ===================="
echo "Checking required columns..."

echo -e "\nTransaction table:"
bunx prisma db execute --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name IN ('merchantRate', 'traderProfit', 'matchedNotificationId');" || true

echo -e "\nPayout table:"
bunx prisma db execute --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'Payout' AND column_name IN ('methodId', 'profitAmount');" || true

echo -e "\nNotification table:"
bunx prisma db execute --stdin <<< "SELECT column_name FROM information_schema.columns WHERE table_name = 'Notification' AND column_name = 'packageName';" || true

echo "==================== STARTING APPLICATION ===================="
# Start the application
exec "$@"