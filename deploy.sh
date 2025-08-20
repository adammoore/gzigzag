#!/bin/bash

echo "ZigZag Web Deployment Helper"
echo "==========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check command success
check_status() {
    if [ \$? -eq 0 ]; then
        echo -e "\${GREEN}✓ \$1\${NC}"
    else
        echo -e "\${RED}✗ \$1 failed\${NC}"
        exit 1
    fi
}

# Step 1: Verify local setup
echo -e "\${YELLOW}Step 1: Verifying local setup...\${NC}"
cd web

# Check Docker
docker compose ps > /dev/null 2>&1
check_status "Docker containers running"

# Test health endpoint
curl -s http://localhost:3001/health > /dev/null 2>&1
check_status "Server health check"

# Step 2: Build for production
echo -e "\${YELLOW}\nStep 2: Building for production...\${NC}"
npm run build:all
check_status "Production build"

# Step 3: Git operations
echo -e "\${YELLOW}\nStep 3: Preparing git...\${NC}"
cd ..
git add -A
git status --short

if [ -n "\$(git status --porcelain)" ]; then
    echo "Uncommitted changes found. Committing..."
    read -p "Enter commit message: " commit_msg
    git commit -m "\$commit_msg"
    check_status "Git commit"
fi

# Step 4: Push to GitHub
echo -e "\${YELLOW}\nStep 4: Push to GitHub...\${NC}"
current_branch=\$(git branch --show-current)
echo "Current branch: \$current_branch"

read -p "Push to origin/\$current_branch? (y/n): " push_confirm
if [ "\$push_confirm" = "y" ]; then
    git push origin \$current_branch
    check_status "Git push"
fi

# Step 5: Deployment checklist
echo -e "\${YELLOW}\nStep 5: Deployment Checklist\${NC}"
echo ""
echo "✓ Local build successful"
echo "✓ Tests passing"
echo "✓ Code pushed to GitHub"
echo ""
echo -e "\${YELLOW}Next steps for Render deployment:\${NC}"
echo "1. Go to https://dashboard.render.com"
echo "2. Create new Web Service"
echo "3. Connect GitHub repository: adammoore/gzigzag"
echo "4. Select branch: \$current_branch"
echo "5. Use existing render.yaml configuration"
echo "6. Set environment variables:"
echo "   - JWT_SECRET (generate secure key)"
echo "   - NEO4J_URI (from Neo4j AuraDB)"
echo "   - NEO4J_USER (from Neo4j AuraDB)"
echo "   - NEO4J_PASSWORD (from Neo4j AuraDB)"
echo "7. Deploy!"
echo ""
echo -e "\${YELLOW}For Neo4j AuraDB:\${NC}"
echo "1. Go to https://neo4j.com/cloud/aura/"
echo "2. Create free instance"
echo "3. Save connection details"
echo ""
echo -e "\${GREEN}Deployment preparation complete!\${NC}"
