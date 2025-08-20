#!/bin/bash

# ZigZag Web Project Status Check Script
# Run this at the start of each session to see current state

echo "================================================="
echo "  ZigZag Web Project Status Check"
echo "  $(date)"
echo "================================================="
echo ""

# Check location
echo "📍 Repository Location:"
if [ -d "/Users/adamvialsmoore/Workspace/gzigzag/web" ]; then
    echo "   ✅ /Users/adamvialsmoore/Workspace/gzigzag/web"
    cd /Users/adamvialsmoore/Workspace/gzigzag/web
else
    echo "   ❌ Repository not found!"
    exit 1
fi
echo ""

# Check Git status
echo "🌿 Git Status:"
cd /Users/adamvialsmoore/Workspace/gzigzag
echo "   Branch: $(git branch --show-current)"
echo "   Uncommitted files: $(git status --porcelain | wc -l | xargs)"
echo "   Last commit: $(git log -1 --format='%h %s' 2>/dev/null || echo 'No commits')"
cd web
echo ""

# Check Docker status
echo "🐳 Docker Status:"
if docker info > /dev/null 2>&1; then
    echo "   ✅ Docker is running"
    
    # Check containers
    POSTGRES_STATUS=$(docker compose ps postgres --format json 2>/dev/null | jq -r '.State' 2>/dev/null || echo "not running")
    NEO4J_STATUS=$(docker compose ps neo4j --format json 2>/dev/null | jq -r '.State' 2>/dev/null || echo "not running")
    REDIS_STATUS=$(docker compose ps redis --format json 2>/dev/null | jq -r '.State' 2>/dev/null || echo "not running")
    
    echo "   PostgreSQL: $POSTGRES_STATUS"
    echo "   Neo4j: $NEO4J_STATUS"
    echo "   Redis: $REDIS_STATUS"
else
    echo "   ❌ Docker is not running"
    echo "   Run: open -a Docker"
fi
echo ""

# Check Node/npm
echo "📦 Node.js Environment:"
echo "   Node: $(node --version)"
echo "   npm: $(npm --version)"
echo "   TypeScript: $(npx tsc --version 2>/dev/null || echo 'Not installed')"
echo ""

# Check package status
echo "📚 Package Status:"
for package in core client server; do
    if [ -d "packages/$package" ]; then
        if [ -f "packages/$package/dist/index.js" ] || [ -d "packages/$package/dist" ]; then
            echo "   $package: ✅ Built"
        else
            echo "   $package: ❌ Not built"
        fi
    else
        echo "   $package: ❌ Missing"
    fi
done
echo ""

# Check server status
echo "🚀 Server Status:"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Server is running on port 3001"
    HEALTH=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "unknown")
    echo "   Health: $HEALTH"
else
    echo "   ❌ Server is not running"
    echo "   Run: npm run dev"
fi

if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Frontend is running on port 3000"
else
    echo "   ❌ Frontend is not running"
fi
echo ""

# Check database connectivity
echo "🗄️ Database Connectivity:"
if [ "$POSTGRES_STATUS" = "running" ]; then
    if docker exec zigzag-postgres pg_isready -U zigzag_user > /dev/null 2>&1; then
        echo "   PostgreSQL: ✅ Ready"
        # Check if tables exist
        TABLE_COUNT=$(docker exec zigzag-postgres psql -U zigzag_user -d zigzag -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | xargs)
        echo "   Tables: $TABLE_COUNT"
    else
        echo "   PostgreSQL: ❌ Not ready"
    fi
else
    echo "   PostgreSQL: ❌ Container not running"
fi

if [ "$REDIS_STATUS" = "running" ]; then
    if docker exec zigzag-redis redis-cli ping > /dev/null 2>&1; then
        echo "   Redis: ✅ Ready"
    else
        echo "   Redis: ❌ Not ready"
    fi
else
    echo "   Redis: ❌ Container not running"
fi

if [ "$NEO4J_STATUS" = "running" ]; then
    if curl -s http://localhost:7474 > /dev/null 2>&1; then
        echo "   Neo4j: ✅ Browser accessible"
    else
        echo "   Neo4j: ⏳ Starting..."
    fi
else
    echo "   Neo4j: ❌ Container not running"
fi
echo ""

# Check for common issues
echo "⚠️ Known Issues:"
ISSUES=0

if [ ! -f ".env" ]; then
    echo "   - Missing .env file (copy from .env.example)"
    ISSUES=$((ISSUES + 1))
fi

if [ ! -d "node_modules" ]; then
    echo "   - Missing node_modules (run: npm install)"
    ISSUES=$((ISSUES + 1))
fi

if ! docker info > /dev/null 2>&1; then
    echo "   - Docker not running (run: open -a Docker)"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo "   ✅ No known issues detected"
fi
echo ""

# Provide next steps
echo "📋 Quick Commands:"
echo "   Start everything:  npm run dev"
echo "   Start Docker:      docker compose up -d"
echo "   View logs:         docker compose logs -f"
echo "   Run migrations:    npm run migrate"
echo "   Test API:          curl http://localhost:3001/health"
echo "   Stop everything:   docker compose down && pkill -f tsx"
echo ""

# Check for uncommitted changes
if [ $(git status --porcelain | wc -l) -gt 0 ]; then
    echo "⚠️ You have uncommitted changes!"
    echo "   Run: git status"
    echo ""
fi

echo "================================================="
echo "  Status check complete!"
echo "================================================="