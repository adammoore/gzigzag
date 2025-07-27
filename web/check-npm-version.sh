#!/bin/bash

# Check npm version
echo "Current npm version:"
npm --version

echo ""
echo "Current node version:"
node --version

echo ""
echo "npm workspaces require npm 7.0.0 or higher"
echo ""
echo "To fix, you can either:"
echo "1. Update npm: npm install -g npm@latest"
echo "2. Use the workaround below"
