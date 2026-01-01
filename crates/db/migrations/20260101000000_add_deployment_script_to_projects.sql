-- Add deployment_script column to projects table
ALTER TABLE projects ADD COLUMN deployment_script TEXT DEFAULT NULL;
