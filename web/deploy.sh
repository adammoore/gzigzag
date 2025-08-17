#!/bin/bash

# ZigZag Web Production Deployment Script
# This script helps deploy ZigZag to Render.com

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="zigzag-web"
RENDER_REGION="oregon"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  ZigZag Web Production Deployment${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Function to check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check for git
    if ! command -v git &> /dev/null; then
        echo -e "${RED}❌ Git is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Git found${NC}"
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js found ($(node --version))${NC}"
    
    # Check for npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ npm found ($(npm --version))${NC}"
    
    # Check if render.yaml exists
    if [ ! -f "render.yaml" ]; then
        echo -e "${RED}❌ render.yaml not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ render.yaml found${NC}"
    
    echo ""
}

# Function to setup environment variables
setup_env() {
    echo -e "${YELLOW}Setting up environment variables...${NC}"
    
    if [ ! -f ".env" ]; then
        echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
        cp .env.example .env
        
        # Generate JWT secret
        JWT_SECRET=$(openssl rand -hex 32)
        sed -i.bak "s/your-secret-key-change-in-production/$JWT_SECRET/" .env
        
        echo -e "${GREEN}✅ .env file created${NC}"
        echo -e "${YELLOW}⚠️  Please update the .env file with your database credentials${NC}"
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
    
    echo ""
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
    echo ""
}

# Function to build the project
build_project() {
    echo -e "${YELLOW}Building project...${NC}"
    npm run build:all
    echo -e "${GREEN}✅ Project built successfully${NC}"
    echo ""
}

# Function to run database migrations
run_migrations() {
    echo -e "${YELLOW}Run database migrations? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Running migrations...${NC}"
        npm run migrate
        echo -e "${GREEN}✅ Migrations completed${NC}"
    fi
    echo ""
}

# Function to deploy to Render
deploy_to_render() {
    echo -e "${YELLOW}Deploy to Render.com? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}======================================${NC}"
        echo -e "${BLUE}  Render.com Deployment Instructions${NC}"
        echo -e "${BLUE}======================================${NC}"
        echo ""
        echo "1. Go to https://render.com and sign in"
        echo "2. Click 'New +' and select 'Blueprint'"
        echo "3. Connect your GitHub repository"
        echo "4. Select this repository: $(git remote get-url origin)"
        echo "5. Name your blueprint: ${PROJECT_NAME}"
        echo "6. Click 'Apply'"
        echo ""
        echo "7. Set these environment variables in Render Dashboard:"
        echo "   - NEO4J_URI: (from Neo4j AuraDB)"
        echo "   - NEO4J_PASSWORD: (from Neo4j AuraDB)"
        echo "   - JWT_SECRET: $(openssl rand -hex 32)"
        echo ""
        echo -e "${YELLOW}Press Enter when you've completed these steps...${NC}"
        read -r
        
        echo -e "${GREEN}✅ Deployment initiated${NC}"
    fi
    echo ""
}

# Function to setup Neo4j AuraDB
setup_neo4j() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Neo4j AuraDB Setup Instructions${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo ""
    echo "1. Go to https://neo4j.com/cloud/aura/"
    echo "2. Click 'Start Free'"
    echo "3. Create a new database:"
    echo "   - Choose 'AuraDB Free' tier"
    echo "   - Select region: ${RENDER_REGION}"
    echo "   - Save the connection URI and password"
    echo ""
    echo "4. Connect to Neo4j Browser and run these commands:"
    echo ""
    echo -e "${YELLOW}CREATE CONSTRAINT cell_id_unique IF NOT EXISTS"
    echo "FOR (c:Cell) REQUIRE c.id IS UNIQUE;"
    echo ""
    echo "CREATE INDEX cell_space_index IF NOT EXISTS"
    echo "FOR (c:Cell) ON (c.space_id);"
    echo ""
    echo "CREATE INDEX connection_dimension_index IF NOT EXISTS"
    echo -e "FOR ()-[r:CONNECTED]-() ON (r.dimension);${NC}"
    echo ""
    echo -e "${YELLOW}Have you completed Neo4j setup? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}✅ Neo4j setup completed${NC}"
    fi
    echo ""
}

# Function to test deployment
test_deployment() {
    echo -e "${YELLOW}Enter your Render.com app URL (e.g., https://zigzag-web.onrender.com):${NC}"
    read -r APP_URL
    
    if [ -n "$APP_URL" ]; then
        echo -e "${YELLOW}Testing deployment...${NC}"
        
        # Test health endpoint
        if curl -s "${APP_URL}/health" | grep -q "healthy"; then
            echo -e "${GREEN}✅ Health check passed${NC}"
        else
            echo -e "${RED}❌ Health check failed${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}🎉 Deployment complete!${NC}"
        echo ""
        echo "Your ZigZag Web application is available at:"
        echo -e "${BLUE}${APP_URL}${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Create an admin user"
        echo "2. Configure custom domain (optional)"
        echo "3. Set up monitoring"
        echo "4. Enable backups"
    fi
    echo ""
}

# Function for local development
setup_local_dev() {
    echo -e "${YELLOW}Setup local development environment? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Setting up Docker containers...${NC}"
        
        if command -v docker-compose &> /dev/null; then
            docker-compose up -d
            echo -e "${GREEN}✅ Docker containers started${NC}"
            echo ""
            echo "Services available at:"
            echo "- Frontend: http://localhost:3000"
            echo "- API: http://localhost:3001"
            echo "- PostgreSQL: localhost:5432"
            echo "- Neo4j Browser: http://localhost:7474"
            echo "- Redis: localhost:6379"
        else
            echo -e "${RED}❌ Docker Compose not found${NC}"
            echo "Please install Docker and Docker Compose first"
        fi
    fi
    echo ""
}

# Main deployment flow
main() {
    check_prerequisites
    
    echo -e "${YELLOW}Select deployment option:${NC}"
    echo "1) Local Development (Docker)"
    echo "2) Production (Render.com)"
    echo "3) Both"
    read -r -p "Enter choice [1-3]: " choice
    
    case $choice in
        1)
            setup_env
            install_dependencies
            setup_local_dev
            ;;
        2)
            setup_env
            install_dependencies
            build_project
            setup_neo4j
            deploy_to_render
            run_migrations
            test_deployment
            ;;
        3)
            setup_env
            install_dependencies
            setup_local_dev
            build_project
            setup_neo4j
            deploy_to_render
            run_migrations
            test_deployment
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  Deployment Script Complete!${NC}"
    echo -e "${GREEN}======================================${NC}"
}

# Run main function
main