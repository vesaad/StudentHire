ALTER TABLE `companies` ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `company_approvals`
  ADD COLUMN `from_account_status` ENUM('active', 'suspended') NULL,
  ADD COLUMN `to_account_status` ENUM('active', 'suspended') NULL;
