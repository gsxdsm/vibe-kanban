-- Add ntfy notification settings to projects table
ALTER TABLE projects ADD COLUMN ntfy_enabled BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN ntfy_url TEXT DEFAULT 'https://ntfy.sh';
ALTER TABLE projects ADD COLUMN ntfy_topic TEXT;
