-- Document-level metadata pulled out by the converters (plan v4.2, T6):
-- title, author, subject, keywords, created, modified, running_header, running_footer,
-- has_toc, page_labels. Values come from customer files: display and filter only, never
-- copied into chunk text.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
