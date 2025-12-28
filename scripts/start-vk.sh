#!/bin/bash
killall vibe-kanban
PORT=4000 HOST=0.0.0.0 npx --yes vibe-kanban-latest.tgz
