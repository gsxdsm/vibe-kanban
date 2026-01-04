#!/bin/bash

# Kill any existing instance
killall vibe-kanban 2>/dev/null || true

# Set default environment variables if not preset
export PORT="${PORT:-4000}"
export HOST="${HOST:-0.0.0.0}"
export VK_AUTO_OPEN_APP="${VK_AUTO_OPEN_APP:-false}"
export VK_AUTO_OPEN_PR="${VK_AUTO_OPEN_PR:-false}"

# System dependencies paths
export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}"
export CARGO_TARGET_DIR="${CARGO_TARGET_DIR:-$HOME/.cargo/shared-target}"
export RUSTC_WRAPPER="${RUSTC_WRAPPER:-sccache}"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# Update PATH to include common tool locations
export PATH="$PATH:$PNPM_HOME/bin:$HOME/.cargo/bin"

# Start the application
npx --yes vibe-kanban-latest.tgz
