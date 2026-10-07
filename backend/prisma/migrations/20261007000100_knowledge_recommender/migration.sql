-- Additive migration: existing requirements remain required, weight 1.
ALTER TABLE `opportunity_skills`
  ADD COLUMN `requirement_type` ENUM('required', 'preferred') NOT NULL DEFAULT 'required',
  ADD COLUMN `weight` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  ADD CONSTRAINT `opportunity_skill_weight_range` CHECK (`weight` BETWEEN 1 AND 3);
ALTER TABLE `skills` ADD COLUMN `category_id` INTEGER UNSIGNED NULL;
ALTER TABLE `students`
  ADD COLUMN `preferred_field` VARCHAR(40) NULL,
  ADD COLUMN `preferred_job_type` ENUM('job', 'internship') NULL,
  ADD COLUMN `preferred_location` VARCHAR(150) NULL,
  ADD COLUMN `preferred_work_mode` VARCHAR(20) NULL;
CREATE TABLE `skill_categories` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `is_generic` BOOLEAN NOT NULL DEFAULT false,
  UNIQUE INDEX `skill_categories_name_key` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `field_skills` (
  `field` VARCHAR(40) NOT NULL,
  `skill_id` INTEGER UNSIGNED NOT NULL,
  `relevance_weight` DOUBLE NOT NULL DEFAULT 1,
  INDEX `field_skills_skill_id_idx` (`skill_id`),
  PRIMARY KEY (`field`, `skill_id`),
  CONSTRAINT `field_skill_weight_range` CHECK (`relevance_weight` > 0 AND `relevance_weight` <= 1),
  CONSTRAINT `field_skill_canonical` CHECK (`field` IN ('administration','design','education','engineering','finance','health','law','logistics','marketing','technology','tourism'))
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `skill_relationships` (
  `skill_id` INTEGER UNSIGNED NOT NULL,
  `related_skill_id` INTEGER UNSIGNED NOT NULL,
  `relation_type` VARCHAR(30) NOT NULL DEFAULT 'related',
  `similarity_weight` DOUBLE NOT NULL,
  INDEX `skill_relationships_related_skill_id_idx` (`related_skill_id`),
  PRIMARY KEY (`skill_id`, `related_skill_id`),
  CONSTRAINT `skill_similarity_range` CHECK (`similarity_weight` > 0 AND `similarity_weight` < 1)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE `skills` ADD CONSTRAINT `skills_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `skill_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `field_skills` ADD CONSTRAINT `field_skills_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `skill_relationships` ADD CONSTRAINT `skill_relationships_skill_id_fkey` FOREIGN KEY (`skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `skill_relationships` ADD CONSTRAINT `skill_relationships_related_skill_id_fkey` FOREIGN KEY (`related_skill_id`) REFERENCES `skills` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
