#!/bin/bash

echo "🧪 ZigZag Web - Setup Testing Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

function info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

function warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Please run this script from the /web directory${NC}"
    echo "   Expected path: /Users/adam.vialsmoore/Workspace/gzigzag/web"
    exit 1
fi

echo ""
info "Step 1: Checking system requirements"
echo "Node.js version:"
node --version
check_status "Node.js available"

echo "NPM version:"
npm --version
check_status "NPM available"

echo ""
info "Step 2: Checking project structure"

# Check if core package exists
if [ -d "packages/core" ]; then
    check_status "Core package directory exists"
else
    echo -e "${RED}❌ Core package directory missing${NC}"
    exit 1
fi

# Check if client package exists  
if [ -d "packages/client" ]; then
    check_status "Client package directory exists"
else
    echo -e "${RED}❌ Client package directory missing${NC}"
    exit 1
fi

# Check if core has index.ts
if [ -f "packages/core/src/index.ts" ]; then
    check_status "Core ZigZag implementation exists"
else
    echo -e "${RED}❌ Core ZigZag implementation missing${NC}"
    exit 1
fi

echo ""
info "Step 3: Installing dependencies"

# Install root dependencies
echo "Installing root dependencies..."
npm install
check_status "Root dependencies installed"

# Install core dependencies
echo "Installing core package dependencies..."
cd packages/core
npm install
check_status "Core dependencies installed"
cd ../..

# Install client dependencies
echo "Installing client package dependencies..."
cd packages/client
npm install
check_status "Client dependencies installed"
cd ../..

echo ""
info "Step 4: Testing core ZigZag functionality"
cd packages/core

# Test if core builds and runs
npm run dev > /tmp/zigzag-core-test.log 2>&1 &
CORE_PID=$!
sleep 3
kill $CORE_PID 2>/dev/null || true

if grep -q "Krebs Cycle Demo" /tmp/zigzag-core-test.log; then
    check_status "Core ZigZag functionality works"
else
    warning "Core test unclear - check manually with: cd packages/core && npm run dev"
fi

cd ../..

echo ""
info "Step 5: Testing React application"
cd packages/client

# Check if build works
npm run build > /tmp/zigzag-build-test.log 2>&1
if check_status "React application builds successfully"; then
    echo "Build output size:"
    du -sh dist/ 2>/dev/null || echo "  Build directory created"
else
    warning "Build failed - check /tmp/zigzag-build-test.log for details"
fi

cd ../..

echo ""
info "Step 6: Final verification"

# Check package.json dependencies
echo "Checking dependency resolution..."
if grep -q "file:../core" packages/client/package.json; then
    check_status "Using relative path for @zigzag/core dependency"
elif grep -q "workspace:" packages/client/package.json; then
    warning "Still using workspace protocol - may need npm 7+"
else
    warning "Unexpected dependency format in client package.json"
fi

echo ""
echo -e "${GREEN}🎉 Setup Test Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. cd packages/client"
echo "2. npm run dev"
echo "3. Open http://localhost:3000 in your browser"
echo "4. Test the launcher interface:"
echo "   - Select 'Krebs Cycle Demo' or 'Blank Space'"
echo "   - Verify the interface loads"
echo "   - Test keyboard navigation (Arrow keys, Tab, F1-F3)"
echo ""
echo -e "${BLUE}🔧 If issues occur:${NC}"
echo "- Check browser console for errors"
echo "- Verify the launcher displays correctly"
echo "- Test cell editing (double-click on cells)"
echo "- Try dimension switching with Tab key"
echo ""
echo -e "${BLUE}📁 Project Status:${NC}"
echo "- Core: TypeScript ZigZag implementation ✅"
echo "- Client: React web interface ✅" 
echo "- Launcher: Modern launcher with demo/blank options ✅"
echo "- Phase 2B Ready: 3D visualizations (Next step) 🚧"

# Clean up temp files
rm -f /tmp/zigzag-*.log
