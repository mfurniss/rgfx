#!/bin/bash
set -e

cd "$(dirname "$0")"

# Check if rebuild is needed by comparing source and output timestamps
# Sources: docs/, mkdocs.yml, requirements.txt
# Output: site/index.html (marker file)
needs_rebuild=false

if [ ! -f site/index.html ]; then
    needs_rebuild=true
else
    # Find any source file newer than the built output
    if find docs/ mkdocs.yml requirements.txt -newer site/index.html 2>/dev/null | grep -q .; then
        needs_rebuild=true
    fi
fi

if [ "$needs_rebuild" = false ]; then
    echo "Docs are up to date (no source changes detected)"
    exit 0
fi

# Download latest stable Mermaid
echo "Updating Mermaid..."
curl -sL https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js -o docs/assets/js/mermaid.min.js

# Build to site/
echo "Building docs..."
.venv/bin/mkdocs build

echo "Docs built to public-docs/site/"
