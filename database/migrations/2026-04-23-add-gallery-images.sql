USE jdf_veterans_affairs_portal;

CREATE TABLE IF NOT EXISTS gallery_images (
  gallery_image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_uuid CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL,
  caption TEXT NULL,
  alt_text VARCHAR(255) NOT NULL,
  activity_date DATE NULL,
  storage_disk ENUM('PUBLIC_UPLOADS') NOT NULL DEFAULT 'PUBLIC_UPLOADS',
  relative_path VARCHAR(500) NOT NULL,
  mime_type VARCHAR(150) NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  file_sha256 BINARY(32) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (gallery_image_id),
  UNIQUE KEY uq_gallery_images_public_uuid (public_uuid),
  KEY idx_gallery_images_public (is_published, is_featured, activity_date, created_at),
  KEY idx_gallery_images_uploaded_by (uploaded_by_user_id, created_at),
  CONSTRAINT fk_gallery_images_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_gallery_images_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;
