USE jdf_veterans_affairs_portal;

CREATE TABLE IF NOT EXISTS public_veterans_id_applications (
  public_id_application_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_uuid CHAR(36) NOT NULL,
  routing_department_id SMALLINT UNSIGNED NOT NULL,
  status ENUM('NEW', 'UNDER_REVIEW', 'APPROVED', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'COLLECTED', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'NEW',
  email_lookup_hash BINARY(32) NULL,
  service_number_lookup_hash BINARY(32) NULL,
  payload_ciphertext LONGBLOB NOT NULL,
  payload_iv BINARY(12) NOT NULL,
  payload_tag BINARY(16) NOT NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  submitted_by_user_id BIGINT UNSIGNED NULL,
  assigned_to_user_id BIGINT UNSIGNED NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (public_id_application_id),
  UNIQUE KEY uq_public_veterans_id_applications_uuid (public_uuid),
  KEY idx_public_veterans_id_applications_department (routing_department_id, status, created_at),
  KEY idx_public_veterans_id_applications_status (status, updated_at),
  KEY idx_public_veterans_id_applications_email (email_lookup_hash, created_at),
  KEY idx_public_veterans_id_applications_service_number (service_number_lookup_hash, created_at),
  CONSTRAINT fk_public_veterans_id_applications_department
    FOREIGN KEY (routing_department_id) REFERENCES departments (department_id),
  CONSTRAINT fk_public_veterans_id_applications_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_public_veterans_id_applications_assigned_to
    FOREIGN KEY (assigned_to_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_public_veterans_id_applications_reviewed_by
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;
