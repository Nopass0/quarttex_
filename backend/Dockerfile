# Backend Dockerfile
FROM oven/bun:latest

# Install OpenSSL, Node.js and other required dependencies
RUN apt-get update -y && \
    apt-get install -y openssl ca-certificates curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./
COPY prisma ./prisma/

# Install dependencies
RUN bun install

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["bun", "run", "src/index.ts"]