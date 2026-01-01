#!/bin/bash

# This script installs Vibe Kanban as a systemd service on Ubuntu.

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$HOME/vibe-kanban"
USER=$(whoami)

# Create the project directory if it doesn't exist
mkdir -p "$PROJECT_ROOT"

# Copy the start-vk.sh script
cp "$SCRIPT_DIR/start-vk.sh" "$PROJECT_ROOT/start-vk.sh"

# Create the systemd service file
cat << EOF > vibe-kanban.service
[Unit]
Description=Vibe Kanban Service
After=network.target

[Service]
Environment="PORT=4000"
Environment="HOST=0.0.0.0"
User=$USER
Group=$USER
WorkingDirectory=$PROJECT_ROOT
ExecStart=/bin/bash -c "$PROJECT_ROOT/start-vk.sh"
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Move the service file to the systemd directory
sudo mv vibe-kanban.service /etc/systemd/system/vibe-kanban.service

# Reload systemd, enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable vibe-kanban.service
sudo systemctl start vibe-kanban.service

echo "Vibe Kanban service installed and started."
