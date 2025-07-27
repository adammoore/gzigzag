#!/bin/bash

echo "Installing ZigZag Web dependencies without npm workspaces..."
echo ""

# Install root dependencies
echo "1. Installing root dependencies..."
cd /Users/adam.vialsmoore/Workspace/gzigzag/web
npm install --no-save

# Install core dependencies
echo ""
echo "2. Installing core package dependencies..."
cd packages/core
npm install

# Build core (so it's available for client)
echo ""
echo "3. Building core package..."
npm run build

# Install client dependencies
echo ""
echo "4. Installing client package dependencies..."
cd ../client
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "To run the development server:"
echo "cd /Users/adam.vialsmoore/Workspace/gzigzag/web/packages/client"
echo "npm run dev"
