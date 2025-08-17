#!/bin/bash

# ZigZag Web Production Startup Script
# This script ensures all services are ready before starting the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  ZigZag Web Production Startup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | sed 's/#.*//g' | xargs)
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Function to check PostgreSQL
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"
    
    for i in {1..30}; do
        if pg_isready -h ${DATABASE_URL%/*} 2>/dev/null; then
            echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
            return 0
        fi
        echo -e "${YELLOW}Waiting for PostgreSQL... ($i/30)${NC}"
        sleep 2
    done
    
    echo -e "${RED}❌ PostgreSQL connection failed${NC}"
    return 1
}

# Function to check Neo4j
check_neo4j() {
    echo -e "${YELLOW}Checking Neo4j connection...${NC}"
    
    NEO4J_HOST=$(echo $NEO4J_URI | sed 's/.*\/\///' | sed 's/:.*//')
    NEO4J_PORT=$(echo $NEO4J_URI | sed 's/.*://')
    
    for i in {1..30}; do
        if nc -z $NEO4J_HOST $NEO4J_PORT 2>/dev/null; then
            echo -e "${GREEN}✅ Neo4j is ready${NC}"
            return 0
        fi
        echo -e "${YELLOW}Waiting for Neo4j... ($i/30)${NC}"
        sleep 2
    done
    
    echo -e "${RED}❌ Neo4j connection failed${NC}"
    return 1
}

# Function to check Redis
check_redis() {
    echo -e "${YELLOW}Checking Redis connection...${NC}"
    
    REDIS_HOST=$(echo $REDIS_URL | sed 's/.*\/\///' | sed 's/:.*//')
    REDIS_PORT=$(echo $REDIS_URL | sed 's/.*://')
    
    for i in {1..30}; do
        if nc -z $REDIS_HOST $REDIS_PORT 2>/dev/null; then
            echo -e "${GREEN}✅ Redis is ready${NC}"
            return 0
        fi
        echo -e "${YELLOW}Waiting for Redis... ($i/30)${NC}"
        sleep 2
    done
    
    echo -e "${YELLOW}⚠️  Redis not available (optional)${NC}"
    return 0  # Don't fail if Redis is not available
}

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    
    if npm run migrate; then
        echo -e "${GREEN}✅ Migrations completed${NC}"
    else
        echo -e "${RED}❌ Migration failed${NC}"
        exit 1
    fi
}

# Function to check disk space
check_disk_space() {
    echo -e "${YELLOW}Checking disk space...${NC}"
    
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $DISK_USAGE -gt 90 ]; then
        echo -e "${RED}⚠️  Warning: Disk usage is at ${DISK_USAGE}%${NC}"
    else
        echo -e "${GREEN}✅ Disk space available (${DISK_USAGE}% used)${NC}"
    fi
}

# Function to check memory
check_memory() {
    echo -e "${YELLOW}Checking memory...${NC}"
    
    if command -v free &> /dev/null; then
        MEM_AVAILABLE=$(free -m | awk 'NR==2 {print $7}')
        if [ $MEM_AVAILABLE -lt 512 ]; then
            echo -e "${YELLOW}⚠️  Warning: Low memory available (${MEM_AVAILABLE}MB)${NC}"
        else
            echo -e "${GREEN}✅ Memory available (${MEM_AVAILABLE}MB)${NC}"
        fi
    fi
}

# Function to create required directories
create_directories() {
    echo -e "${YELLOW}Creating required directories...${NC}"
    
    mkdir -p logs
    mkdir -p uploads
    mkdir -p temp
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to start the application
start_application() {
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Starting ZigZag Web Server${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    
    # Check if we should use PM2 for process management
    if command -v pm2 &> /dev/null; then
        echo -e "${YELLOW}Starting with PM2...${NC}"
        pm2 start packages/server/dist/server.js --name zigzag-web \
            --instances 2 \
            --max-memory-restart 500M \
            --log logs/pm2.log \
            --error logs/pm2-error.log \
            --merge-logs
        
        echo -e "${GREEN}✅ Application started with PM2${NC}"
        echo -e "${YELLOW}View logs: pm2 logs zigzag-web${NC}"
        echo -e "${YELLOW}Monitor: pm2 monit${NC}"
    else
        echo -e "${YELLOW}Starting with Node.js...${NC}"
        
        # Use node directly
        exec node packages/server/dist/server.js
    fi
}

# Main startup sequence
main() {
    echo -e "${YELLOW}Starting production environment checks...${NC}"
    echo ""
    
    # System checks
    check_disk_space
    check_memory
    create_directories
    
    # Service checks
    check_postgres || exit 1
    check_neo4j || exit 1
    check_redis
    
    # Database setup
    if [ "$RUN_MIGRATIONS" != "false" ]; then
        run_migrations
    fi
    
    echo ""
    echo -e "${GREEN}✅ All checks passed!${NC}"
    
    # Start the application
    start_application
}

# Handle shutdown gracefully
trap 'echo -e "\n${YELLOW}Shutting down...${NC}"; exit 0' SIGINT SIGTERM

# Run main function
main