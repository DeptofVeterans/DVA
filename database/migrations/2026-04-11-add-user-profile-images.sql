USE jdf_veterans_affairs_portal;

CREATE TABLE IF NOT EXISTS user_profile_images (
  user_profile_image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  storage_disk ENUM('PRIVATE_UPLOADS') NOT NULL DEFAULT 'PRIVATE_UPLOADS',
  relative_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(150) NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  file_sha256 BINARY(32) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_profile_image_id),
  KEY idx_user_profile_images_user (user_id, is_active, created_at),
  CONSTRAINT fk_user_profile_images_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_profile_images_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;
