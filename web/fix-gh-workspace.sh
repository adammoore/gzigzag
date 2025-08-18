#!/bin/bash

# Script to fix NPM workspace issues and setup GitHub authentication

echo "================================================="
echo "  Fixing NPM and GitHub Authentication Issues"
echo "================================================="
echo ""

# Fix 1: NPM Workspace Issue
echo "📦 Fixing NPM workspace configuration..."
echo ""

cd /Users/adamvialsmoore/Workspace/gzigzag/web

# Update the root package.json to remove workspace: protocol
cat > package.json << 'EOF'
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

# Update server package.json to use version instead of workspace:*
if [ -f "packages/server/package.json" ]; then
  cat > packages/server/package.json << 'EOF'
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
    "@zigzag/core": "file:../core",
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
fi

# Ensure client package.json also exists and is correct
if [ -f "packages/client/package.json" ]; then
  # Update client to use file: protocol for core
  sed -i.bak 's/"@zigzag\/core": "workspace:\*"/"@zigzag\/core": "file:..\/core"/' packages/client/package.json
fi

# Ensure core package.json exists
if [ ! -f "packages/core/package.json" ]; then
  mkdir -p packages/core
  cat > packages/core/package.json << 'EOF'
{
  "name": "@zigzag/core",
  "version": "1.0.0",
  "description": "ZigZag core implementation",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "jest": "^29.7.0"
  }
}
EOF
fi

echo "✅ NPM workspace configuration fixed!"
echo ""

# Clean up any existing lock files and node_modules
echo "🧹 Cleaning up old dependencies..."
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules packages/*/package-lock.json

# Try npm install again
echo "📦 Installing dependencies..."
npm install

echo ""
echo "================================================="
echo "  GitHub Authentication Setup"
echo "================================================="
echo ""

echo "GitHub has disabled password authentication. You need to use a Personal Access Token (PAT)."
echo ""
echo "Follow these steps:"
echo ""
echo "1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)"
echo "   Or visit: https://github.com/settings/tokens"
echo ""
echo "2. Click 'Generate new token (classic)'"
echo ""
echo "3. Give it a name like 'MacBook Pro Git Access'"
echo ""
echo "4. Select scopes:"
echo "   ✓ repo (all)"
echo "   ✓ workflow (if you use GitHub Actions)"
echo ""
echo "5. Click 'Generate token' and COPY IT NOW (you won't see it again!)"
echo ""
echo "6. Configure Git to use the token:"
echo ""

# Provide the git configuration commands
echo "Option 1: Use GitHub CLI (Recommended - easier)"
echo "----------------------------------------"
echo "brew install gh"
echo "gh auth login"
echo "# Choose: GitHub.com → HTTPS → Login with a web browser"
echo ""

echo "Option 2: Configure Git credentials manually"
echo "----------------------------------------"
echo "# Set up credential helper"
echo "git config --global credential.helper osxkeychain"
echo ""
echo "# When you push, use:"
echo "# Username: adammoore"
echo "# Password: [PASTE YOUR PERSONAL ACCESS TOKEN HERE]"
echo ""

echo "Option 3: Use token in remote URL"
echo "----------------------------------------"
echo "git remote set-url origin https://adammoore:YOUR_PERSONAL_ACCESS_TOKEN@github.com/adammoore/gzigzag.git"
echo ""

echo "================================================="
echo "  Quick GitHub CLI Setup (Recommended)"
echo "================================================="
echo ""

# Check if GitHub CLI is installed
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI is installed"
    echo ""
    echo "Run: gh auth login"
    echo "Then follow the prompts to authenticate"
else
    echo "📦 Installing GitHub CLI..."
    echo ""
    echo "Run these commands:"
    echo "brew install gh"
    echo "gh auth login"
fi

echo ""
echo "================================================="
echo "  Test Your Setup"
echo "================================================="
echo ""
echo "After setting up GitHub authentication, test with:"
echo ""
echo "cd /Users/adamvialsmoore/Workspace/gzigzag"
echo "git push origin phase-4c-cloud-deployment"
echo ""
echo "If npm install still fails, try:"
echo "npm install --legacy-peer-deps"
