#!/bin/bash

# Find the latest vibe-kanban .tgz file in the project folder
SOURCE_DIR="." 
DEST_DIR="$HOME/vibe-kanban"
if [ ! -d "$DEST_DIR" ]; then
  mkdir -p "$DEST_DIR"
fi
DEST_FILE="$DEST_DIR/vibe-kanban-latest.tgz"

# Get the latest file by modification time
LATEST_FILE=$(ls -t "$SOURCE_DIR"/vibe-kanban-*.tgz 2>/dev/null | head -n 1)

if [ -z "$LATEST_FILE" ]; then
  echo "No vibe-kanban-*.tgz files found in $SOURCE_DIR"
  exit 1
fi

echo "Copying $LATEST_FILE to $DEST_FILE"
cp "$LATEST_FILE" "$DEST_FILE"
START_SCRIPT="$SOURCE_DIR/scripts/start-vk.sh"
cp "$START_SCRIPT" "$DEST_DIR/start-vk.sh"
chmod +x "$DEST_DIR/start-vk.sh"

# Run the start script if the user passes the --start flag
if [ "$1" == "--start" ]; then
  cd "$DEST_DIR"
  echo "Starting vibe-kanban"
  exec "./start-vk.sh"
fi

# Restart the service if the user passes the --restart-service flag
if [ "$1" == "--restart-service" ]; then
  if [ -f "/etc/systemd/system/vibe-kanban.service" ]; then
    echo "Restarting vibe-kanban service"
    sudo systemctl restart vibe-kanban.service
  else
    echo "Vibe Kanban service not found."
  fi
fi