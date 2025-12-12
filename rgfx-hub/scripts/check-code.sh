#!/bin/bash
# Code quality check script
# Runs: TypeScript type check, ESLint, and ts-unused-exports

set -e

cd "$(dirname "$0")/.."

echo "🔍 Running TypeScript type check..."
npm run typecheck
echo "✅ TypeScript passed"

echo "🔧 Running ESLint..."
npm run lint
echo "✅ ESLint passed"

echo "🔍 Checking for unused exports..."
npm run unused-exports
echo "✅ No unused exports found"
