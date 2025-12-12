-- Ensure new columns exist when upgrading an existing H2 file DB.
ALTER TABLE IF EXISTS recurring_rule ADD COLUMN IF NOT EXISTS note VARCHAR(500);
ALTER TABLE IF EXISTS recurring_rule ADD COLUMN IF NOT EXISTS note_text VARCHAR(500);
-- If the legacy note_text exists, copy into note.
UPDATE recurring_rule SET note = note_text WHERE note IS NULL AND note_text IS NOT NULL;
