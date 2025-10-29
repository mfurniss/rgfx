#!/bin/bash
# Install git hooks for the RGFX project
# Run this script after cloning the repository to set up pre-commit checks

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GIT_HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "📦 Installing git hooks..."

# Copy pre-commit hook
cp "$SCRIPT_DIR/git-hooks/pre-commit" "$GIT_HOOKS_DIR/pre-commit"
chmod +x "$GIT_HOOKS_DIR/pre-commit"

echo "✅ Pre-commit hook installed successfully!"
echo ""
echo "The hook will run before each commit:"
echo "  1. TypeScript type checking"
echo "  2. ESLint with auto-fix"
echo "  3. Unit tests"
echo ""
echo "All checks must pass before the commit is allowed."
