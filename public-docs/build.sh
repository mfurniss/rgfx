#!/bin/bash
set -e

cd "$(dirname "$0")"

# Download latest stable Mermaid
echo "Updating Mermaid..."
curl -sL https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js -o docs/assets/js/mermaid.min.js

# Build to site/
echo "Building docs..."
.venv/bin/mkdocs build

# Copy to website folder
rm -rf ../rgfx.io/docs
cp -r site ../rgfx.io/docs

echo "Docs built to public-docs/site/ and rgfx.io/docs/"
