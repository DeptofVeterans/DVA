USE jdf_veterans_affairs_portal;

CREATE TABLE IF NOT EXISTS employment_job_listings (
  employment_job_listing_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_uuid CHAR(36) NOT NULL,
  job_title VARCHAR(180) NOT NULL,
  organization_name VARCHAR(180) NOT NULL,
  job_description TEXT NOT NULL,
  qualifications_text TEXT NULL,
  how_to_apply TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  posted_by_user_id BIGINT UNSIGNED NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  closed_by_user_id BIGINT UNSIGNED NULL,
  posted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (employment_job_listing_id),
  UNIQUE KEY uq_employment_job_listings_public_uuid (public_uuid),
  KEY idx_employment_job_listings_active (is_active, posted_at),
  KEY idx_employment_job_listings_org (organization_name),
  CONSTRAINT fk_employment_job_listings_posted_by
    FOREIGN KEY (posted_by_user_id) REFERENCES users (user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_employment_job_listings_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_employment_job_listings_closed_by
    FOREIGN KEY (closed_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;
