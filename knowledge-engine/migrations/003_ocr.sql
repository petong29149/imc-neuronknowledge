-- OCR of scanned pages and images (KNOW-13): JPG / PNG uploads, and quality_flag 'ocr' for
-- documents whose text (some or all of it) was read by OCR. Constraint names are Postgres'
-- defaults from 001_init.sql.
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_file_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_file_type_check
  CHECK (file_type IN ('pdf','docx','pptx','txt','md','jpg','png'));

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_quality_flag_check;
ALTER TABLE documents ADD CONSTRAINT documents_quality_flag_check
  CHECK (quality_flag IN ('ok','partial_garbled','garbled','needs_ocr','ocr'));
