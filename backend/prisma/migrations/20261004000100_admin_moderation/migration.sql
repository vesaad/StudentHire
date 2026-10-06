ALTER TABLE users ADD COLUMN revision INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN status_reason TEXT NULL,
  ADD COLUMN status_changed_at DATETIME(3) NULL;
ALTER TABLE skills ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN moderation_reason TEXT NULL,
  ADD COLUMN moderated_at DATETIME(3) NULL,
  ADD COLUMN moderated_by_id INTEGER UNSIGNED NULL;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_moderated_by_id_fkey
  FOREIGN KEY (moderated_by_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE notifications MODIFY COLUMN type ENUM('company_decision','application_received','application_status_changed','account_status_changed','opportunity_moderated') NOT NULL;
