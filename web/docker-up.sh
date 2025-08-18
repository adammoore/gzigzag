#!/bin/bash

echo "================================================="
echo "  Starting ZigZag Docker Environment"
echo "================================================="
echo ""

cd /Users/adamvialsmoore/Workspace/gzigzag/web

# First, fix the docker-compose.yml to remove the version warning
echo "📝 Updating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
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
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zigzag_user -d zigzag"]
      interval: 10s
      timeout: 5s
      retries: 5

  neo4j:
    image: neo4j:5-community
    container_name: zigzag-neo4j
    environment:
      NEO4J_AUTH: neo4j/zigzag_password
      NEO4J_PLUGINS: '["apoc"]'
      NEO4J_dbms_memory_pagecache_size: 512M
      NEO4J_dbms_memory_heap_max__size: 512M
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:7474"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: zigzag-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  neo4j_data:
  neo4j_logs:
  redis_data:

networks:
  default:
    name: zigzag-network
    driver: bridge
EOF

echo "✅ docker-compose.yml updated"
echo ""

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker compose down 2>/dev/null || true

echo ""
echo "🚀 Starting Docker containers..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."

# Function to check if a service is healthy
check_service() {
    local service=$1
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker compose ps --format json | grep -q "\"Service\":\"$service\".*\"Health\":\"healthy\""; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
        printf "."
    done
    return 1
}

# Check PostgreSQL
echo -n "Waiting for PostgreSQL"
if check_service "postgres"; then
    echo " ✅"
else
    echo " ⚠️ (may need more time)"
fi

# Check Redis
echo -n "Waiting for Redis"
if check_service "redis"; then
    echo " ✅"
else
    echo " ⚠️ (may need more time)"
fi

# Neo4j takes longer to start
echo -n "Waiting for Neo4j (this may take 30-60 seconds)"
sleep 10  # Give Neo4j extra time
if check_service "neo4j"; then
    echo " ✅"
else
    echo " ⚠️ (may need more time)"
fi

echo ""
echo "================================================="
echo "  Container Status"
echo "================================================="
echo ""
docker compose ps

echo ""
echo "================================================="
echo "  Testing Connections"
echo "================================================="
echo ""

# Test PostgreSQL
echo -n "Testing PostgreSQL connection: "
if docker exec zigzag-postgres pg_isready -U zigzag_user -d zigzag > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Failed"
fi

# Test Redis
echo -n "Testing Redis connection: "
if docker exec zigzag-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "❌ Failed"
fi

# Test Neo4j
echo -n "Testing Neo4j connection: "
if curl -s http://localhost:7474 > /dev/null 2>&1; then
    echo "✅ Connected"
else
    echo "⚠️ Still starting (this is normal, Neo4j takes time)"
fi

echo ""
echo "================================================="
echo "  Services Available At"
echo "================================================="
echo ""
echo "📊 PostgreSQL: localhost:5432"
echo "   Database: zigzag"
echo "   User: zigzag_user"
echo "   Password: zigzag_password"
echo ""
echo "🔗 Neo4j Browser: http://localhost:7474"
echo "   User: neo4j"
echo "   Password: zigzag_password"
echo ""
echo "💾 Redis: localhost:6379"
echo "   No authentication required"
echo ""

echo "================================================="
echo "  Next Steps"
echo "================================================="
echo ""
echo "1. Check Neo4j Browser:"
echo "   open http://localhost:7474"
echo ""
echo "2. View container logs:"
echo "   docker compose logs -f"
echo ""
echo "3. Create .env file (if not exists):"
echo "   cp .env.example .env"
echo ""
echo "4. Run database migrations:"
echo "   npm run migrate"
echo ""
echo "5. Start the development server:"
echo "   npm run dev"
echo ""
echo "================================================="
echo "  Useful Docker Commands"
echo "================================================="
echo ""
echo "• View logs:         docker compose logs -f [service]"
echo "• Stop all:          docker compose down"
echo "• Stop & remove:     docker compose down -v"
echo "• Restart service:   docker compose restart [service]"
echo "• Enter container:   docker exec -it zigzag-postgres psql -U zigzag_user -d zigzag"
echo "• Check status:      docker compose ps"
