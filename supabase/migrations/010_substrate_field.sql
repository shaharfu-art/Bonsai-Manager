-- Add substrate (growing medium) field to trees
ALTER TABLE trees ADD COLUMN IF NOT EXISTS substrate text;
