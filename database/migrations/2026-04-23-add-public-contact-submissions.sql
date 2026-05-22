USE jdf_veterans_affairs_portal;

CREATE TABLE IF NOT EXISTS public_contact_submissions (
  public_contact_submission_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_uuid CHAR(36) NOT NULL,
  submitted_by_user_id BIGINT UNSIGNED NULL,
  routing_department_id SMALLINT UNSIGNED NOT NULL,
  contact_type ENUM('GENERAL_INQUIRY', 'CALLBACK_REQUEST', 'PARTNER_ORGANIZATION') NOT NULL,
  status ENUM('NEW', 'UNDER_REVIEW', 'RESPONDED', 'CLOSED') NOT NULL DEFAULT 'NEW',
  email_lookup_hash BINARY(32) NULL,
  payload_ciphertext LONGBLOB NOT NULL,
  payload_iv BINARY(12) NOT NULL,
  payload_tag BINARY(16) NOT NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (public_contact_submission_id),
  UNIQUE KEY uq_public_contact_submissions_public_uuid (public_uuid),
  KEY idx_public_contact_submissions_department (routing_department_id, status, created_at),
  KEY idx_public_contact_submissions_user (submitted_by_user_id, created_at),
  KEY idx_public_contact_submissions_email (email_lookup_hash, created_at),
  CONSTRAINT fk_public_contact_submissions_user
    FOREIGN KEY (submitted_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_public_contact_submissions_department
    FOREIGN KEY (routing_department_id) REFERENCES departments (department_id)
) ENGINE=InnoDB;
