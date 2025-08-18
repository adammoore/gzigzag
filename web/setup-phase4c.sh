#!/bin/bash

# Phase 4C: Production Cloud Deployment Setup Script
# This script creates all necessary files for the ZigZag Web modernization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  ZigZag Web Phase 4C Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Get the repository root
REPO_ROOT="${1:-$(pwd)}"

# Verify we're in the right repository
if [ ! -d "$REPO_ROOT/web" ]; then
    echo -e "${RED}Error: This doesn't appear to be the gzigzag repository.${NC}"
    echo -e "${YELLOW}Please run this script from the repository root or provide the path as an argument.${NC}"
    echo "Usage: $0 [/path/to/gzigzag]"
    exit 1
fi

cd "$REPO_ROOT"

echo -e "${YELLOW}Setting up Phase 4C in: $REPO_ROOT${NC}"
echo ""

# Create directory structure
echo -e "${BLUE}Creating directory structure...${NC}"

mkdir -p web/packages/server/src/{routes,database,middleware,websocket,utils,services}
mkdir -p web/packages/server/src/database/migrations
mkdir -p web/scripts
mkdir -p web/logs

echo -e "${GREEN}✅ Directories created${NC}"

# Function to create a file with content
create_file() {
    local filepath=$1
    local content=$2
    
    echo -e "${YELLOW}Creating: $filepath${NC}"
    cat > "$filepath" << 'EOF'
$content
EOF
}

# Create package.json for server
echo -e "${BLUE}Creating server package files...${NC}"

cat > web/packages/server/package.json << 'EOF'
{
  "name": "@zigzag/server",
  "version": "1.0.0",
  "description": "ZigZag Web API Server",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "start:prod": "NODE_ENV=production node dist/server.js",
    "migrate": "tsx src/database/migrate.ts",
    "test": "jest"
  },
  "dependencies": {
    "@zigzag/core": "workspace:*",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "pg": "^8.11.3",
    "neo4j-driver": "^5.15.0",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "uuid": "^9.0.1",
    "ws": "^8.16.0",
    "multer": "^1.4.5-lts.1",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "winston": "^3.11.0",
    "redis": "^4.6.12"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/multer": "^1.4.11",
    "@types/ws": "^8.5.10",
    "@types/compression": "^1.7.5",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11"
  }
}
EOF

# Create TypeScript config
cat > web/packages/server/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "types": ["node", "jest"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@zigzag/core": ["../core/src"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
EOF

# Create environment variables template
cat > web/.env.example << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL=postgresql://zigzag_user:zigzag_password@localhost:5432/zigzag
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=http://localhost:3000

# Optional: AWS S3
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-west-2
EOF

# Create render.yaml
cat > web/render.yaml << 'EOF'
services:
  - type: web
    name: zigzag-web
    runtime: node
    region: oregon
    plan: starter
    buildCommand: |
      npm install
      npm run build:all
    startCommand: npm run start:prod
    healthCheckPath: /health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: FRONTEND_URL
        value: https://zigzag-web.onrender.com
      - key: JWT_SECRET
        generateValue: true
      - key: DATABASE_URL
        fromDatabase:
          name: zigzag-postgres
          property: connectionString
      - key: NEO4J_URI
        sync: false
      - key: NEO4J_USER
        value: neo4j
      - key: NEO4J_PASSWORD
        sync: false

databases:
  - name: zigzag-postgres
    databaseName: zigzag_production
    user: zigzag_admin
    region: oregon
    plan: starter
EOF

# Create docker-compose.yml
cat > web/docker-compose.yml << 'EOF'
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: zigzag-postgres
    environment:
      POSTGRES_DB: zigzag
      POSTGRES_USER: zigzag_user
      POSTGRES_PASSWORD: zigzag_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  neo4j:
    image: neo4j:5-community
    container_name: zigzag-neo4j
    environment:
      NEO4J_AUTH: neo4j/zigzag_password
      NEO4J_PLUGINS: '["apoc"]'
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data

  redis:
    image: redis:7-alpine
    container_name: zigzag-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  neo4j_data:
  redis_data:
EOF

# Create Dockerfile
cat > web/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/server/package*.json ./packages/server/
COPY packages/client/package*.json ./packages/client/
RUN npm ci
COPY . .
RUN npm run build:all
RUN npm prune --production

FROM node:20-alpine
RUN apk add --no-cache postgresql-client curl
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages ./packages
USER nodejs
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD ["node", "packages/server/dist/server.js"]
EOF

# Create deployment script
cat > web/deploy.sh << 'EOF'
#!/bin/bash
set -e

echo "ZigZag Web Production Deployment"
echo "================================"

# Check prerequisites
command -v git >/dev/null 2>&1 || { echo "Git is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }

# Install dependencies
echo "Installing dependencies..."
npm install

# Build project
echo "Building project..."
npm run build:all

# Run migrations if needed
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running migrations..."
    npm run migrate
fi

echo "Deployment ready!"
echo "Push to GitHub and Render.com will automatically deploy."
EOF

chmod +x web/deploy.sh

# Update root package.json
cat > web/package.json << 'EOF'
{
  "name": "zigzag-web",
  "version": "4.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "npm run dev -w @zigzag/server",
    "dev:client": "npm run dev -w @zigzag/client",
    "build:all": "npm run build:core && npm run build:server && npm run build:client",
    "build:core": "npm run build -w @zigzag/core",
    "build:server": "npm run build -w @zigzag/server",
    "build:client": "npm run build -w @zigzag/client",
    "start:prod": "NODE_ENV=production npm run start -w @zigzag/server",
    "migrate": "npm run migrate -w @zigzag/server",
    "test": "npm test --workspaces",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "deploy": "./deploy.sh"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=9.0.0"
  }
}
EOF

# Create .gitignore if it doesn't exist
if [ ! -f web/.gitignore ]; then
cat > web/.gitignore << 'EOF'
node_modules/
.env
.env.local
dist/
build/
*.log
.DS_Store
uploads/
logs/
EOF
fi

# Create README for Phase 4C
cat > web/PHASE_4C_README.md << 'EOF'
# Phase 4C: Production Cloud Deployment

This phase adds production-ready backend infrastructure with:

- Node.js/Express API server
- PostgreSQL for structured data
- Neo4j for graph relationships
- Redis for caching
- WebSocket real-time collaboration
- Docker containerization
- Render.com deployment

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start Docker services:
   ```bash
   docker-compose up -d
   ```

3. Run migrations:
   ```bash
   npm run migrate
   ```

4. Start development:
   ```bash
   npm run dev
   ```

## Deployment

1. Set up Neo4j AuraDB
2. Configure Render.com
3. Run deployment:
   ```bash
   ./deploy.sh
   ```

See DEPLOYMENT.md for detailed instructions.
EOF

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Phase 4C Setup Complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Next steps:"
echo "1. cd web"
echo "2. npm install"
echo "3. Copy .env.example to .env and configure"
echo "4. docker-compose up -d"
echo "5. npm run migrate"
echo "6. npm run dev"
echo ""
echo "The server package structure has been created at:"
echo "  $REPO_ROOT/web/packages/server/"
echo ""
echo "Note: You'll need to create the actual server source files"
echo "in web/packages/server/src/ based on the artifacts provided."
