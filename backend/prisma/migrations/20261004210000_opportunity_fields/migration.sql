ALTER TABLE `opportunities`
  ADD COLUMN `field` VARCHAR(40) NULL,
  ADD COLUMN `work_mode` VARCHAR(20) NULL;
CREATE INDEX `opportunities_status_field_idx` ON `opportunities` (`status`, `field`);
