#!/bin/bash
# Build docs and copy to both locations

cd "$(dirname "$0")"

# Build to site/
mkdocs build

# Copy to website folder
rm -rf ../rgfx.io/docs
cp -r site ../rgfx.io/docs

echo "Docs built to public-docs/site/ and rgfx.io/docs/"
