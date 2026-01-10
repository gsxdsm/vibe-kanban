-- Add ntfy notification columns to projects table
ALTER TABLE projects ADD COLUMN ntfy_enabled BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN ntfy_url TEXT;
ALTER TABLE projects ADD COLUMN ntfy_topic TEXT;
