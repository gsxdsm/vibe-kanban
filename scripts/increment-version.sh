#!/bin/bash

# Script to increment versions of local node codebases and rust cargo codebases.
# Usage: ./scripts/increment-version.sh [--major|--minor|--patch|--version <val>] [--dry-run]

set -e

VERSION_TYPE=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --major|major)
            VERSION_TYPE="major"
            shift
            ;;
        --minor|minor)
            VERSION_TYPE="minor"
            shift
            ;;
        --patch|patch)
            VERSION_TYPE="patch"
            shift
            ;;
        --version|version)
            if [[ -n "$2" ]] && [[ ! "$2" =~ ^- ]]; then
                VERSION_TYPE="$2"
                shift 2
            else
                echo "Error: --version requires a value"
                exit 1
            fi
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            if [[ -z "$VERSION_TYPE" ]]; then
                VERSION_TYPE="$1"
                shift
            else
                echo "Unknown argument: $1"
                echo "Usage: $0 [--major|--minor|--patch|--version <val>] [--dry-run]"
                exit 1
            fi
            ;;
    esac
done

if [[ -z "$VERSION_TYPE" ]]; then
    echo "Usage: $0 [--major|--minor|--patch|--version <val>] [--dry-run]"
    exit 1
fi

echo "Incrementing version with type/value: $VERSION_TYPE"
if [ "$DRY_RUN" = true ]; then
    echo "--- DRY RUN MODE ---"
fi

# Determine if we are bumping or setting a specific version
IS_BUMP=false
if [[ "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
    IS_BUMP=true
fi

# 1. Update root package.json
echo "Updating root package.json..."
if [ "$DRY_RUN" = true ]; then
    # Calculate next version without modifying files for display
    if [ "$IS_BUMP" = true ]; then
        NEW_VERSION=$(node -e "
            const current = require('./package.json').version;
            const semver = current.split('.').map(Number);
            if ('$VERSION_TYPE' === 'major') { semver[0]++; semver[1] = 0; semver[2] = 0; }
            else if ('$VERSION_TYPE' === 'minor') { semver[1]++; semver[2] = 0; }
            else if ('$VERSION_TYPE' === 'patch') { semver[2]++; }
            console.log(semver.join('.'));
        ")
        echo "[DRY RUN] Would run: npm version $VERSION_TYPE --no-git-tag-version"
    else
        NEW_VERSION="$VERSION_TYPE"
        echo "[DRY RUN] Would run: npm version $NEW_VERSION --no-git-tag-version"
    fi
    echo "[DRY RUN] Calculated new version: $NEW_VERSION"
else
    npm version "$VERSION_TYPE" --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
fi

echo "New version: $NEW_VERSION"

# 2. Sync frontend package.json
echo "Updating frontend/package.json..."
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would run: (cd frontend && npm version $NEW_VERSION --no-git-tag-version --allow-same-version)"
else
    (cd frontend && npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version)
fi

# 3. Sync npx-cli package.json
echo "Updating npx-cli/package.json..."
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would run: (cd npx-cli && npm version $NEW_VERSION --no-git-tag-version --allow-same-version)"
else
    (cd npx-cli && npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version)
fi

# 4. Update Cargo workspace
echo "Updating Cargo workspace..."
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would run: cargo set-version $NEW_VERSION --workspace"
else
    if command -v cargo-set-version >/dev/null 2>&1; then
        cargo set-version "$NEW_VERSION" --workspace
    else
        echo "Warning: cargo-edit (cargo-set-version) not found. Skipping Rust version bump."
        echo "Install it with: cargo install cargo-edit"
    fi
fi

echo "Version increment complete!"
if [ "$DRY_RUN" = false ]; then
    echo "Suggested: git add package.json frontend/package.json npx-cli/package.json Cargo.toml Cargo.lock"
fi
