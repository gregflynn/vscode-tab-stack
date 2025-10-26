#!/bin/bash

# Build and package VS Code extension for release

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building Tab Stack Extension...${NC}"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo -e "${BLUE}Version: ${VERSION}${NC}"

# Create releases directory if it doesn't exist
mkdir -p releases

# Compile TypeScript
echo -e "${BLUE}Compiling TypeScript...${NC}"
npm run compile

# Package extension
echo -e "${BLUE}Packaging extension...${NC}"
npx vsce package --out "releases/vscode-tab-stack-${VERSION}.vsix"

echo -e "${GREEN}✓ Extension packaged successfully!${NC}"
echo -e "${GREEN}Release file: releases/vscode-tab-stack-${VERSION}.vsix${NC}"
echo ""
echo "To install locally, run:"
echo "  code --install-extension releases/vscode-tab-stack-${VERSION}.vsix"

