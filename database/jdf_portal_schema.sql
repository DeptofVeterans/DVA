-- JDF Veterans Affairs Portal
-- MySQL 8.0+ schema
--
-- SECURITY MODEL
-- 1. Passwords must NEVER be encrypted reversibly. Store only Argon2id or bcrypt hashes in password_hash.
-- 2. Full name, email, rank, regimental number, request payloads, private notes, and verification notes
--    should be encrypted in the application layer before insert using AES-256-GCM or libsodium.
-- 3. The *_lookup_hash columns should store HMAC-SHA-256 digests created with an application pepper.
--    These hashes allow secure exact-match lookup for login and uniqueness checks without storing plaintext.
-- 4. Encryption keys must stay outside MySQL in environment variables, a KMS, or an HSM.
-- 5. Display labels such as:
--      EX-JDF 23456 PTE Johnson R
--      EX-JCA 2345 Capt R Johnson
--    should be generated in the application after decrypting the secure profile JSON.
--    Staff labels follow the same pattern without the EX- prefix.
--
-- RECOMMENDED PROFILE JSON SHAPE FOR user_secure_profiles.profile_ciphertext
-- {
--   "full_name": "R Johnson",
--   "email": "user@example.com",
--   "rank": "PTE",
--   "regimental_number": "23456",
--   "surname": "Johnson",
--   "given_names": "R",
--   "initials": "R",
--   "display_name": "EX-JDF 23456 PTE Johnson R"
-- }

CREATE DATABASE IF NOT EXISTS jdf_veterans_affairs_portal
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE jdf_veterans_affairs_portal;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE roles (
  role_id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_code VARCHAR(40) NOT NULL,
  role_name VARCHAR(100) NOT NULL,
  role_level SMALLINT UNSIGNED NOT NULL COMMENT 'Lower number = stronger role',
  is_staff_role BOOLEAN NOT NULL DEFAULT FALSE,
  can_access_all_departments BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_main_admin BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_director BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_qm BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_staff_accounts BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve_staff_signups BOOLEAN NOT NULL DEFAULT FALSE,
  can_assign_departments BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_audit_logs BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_roles BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_request_types BOOLEAN NOT NULL DEFAULT FALSE,
  can_override_request_assignment BOOLEAN NOT NULL DEFAULT FALSE,
  can_close_any_request BOOLEAN NOT NULL DEFAULT FALSE,
  can_publish_notifications BOOLEAN NOT NULL DEFAULT FALSE,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_code (role_code),
  UNIQUE KEY uq_roles_name (role_name)
) ENGINE=InnoDB;

CREATE TABLE departments (
  department_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_code VARCHAR(60) NOT NULL,
  department_name VARCHAR(150) NOT NULL,
  description VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (department_id),
  UNIQUE KEY uq_departments_code (department_code),
  UNIQUE KEY uq_departments_name (department_name)
) ENGINE=InnoDB;

CREATE TABLE request_statuses (
  status_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  status_code VARCHAR(40) NOT NULL,
  status_name VARCHAR(100) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  indicates_ready_for_pickup BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (status_id),
  UNIQUE KEY uq_request_statuses_code (status_code)
) ENGINE=InnoDB;

CREATE TABLE request_types (
  request_type_id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_type_code VARCHAR(80) NOT NULL,
  request_type_name VARCHAR(150) NOT NULL,
  default_department_id SMALLINT UNSIGNED NOT NULL,
  requires_identity_verification BOOLEAN NOT NULL DEFAULT FALSE,
  produces_pickup_item BOOLEAN NOT NULL DEFAULT FALSE,
  output_kind ENUM('NONE', 'ID_CARD', 'LETTER', 'CERTIFICATE', 'OTHER') NOT NULL DEFAULT 'NONE',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (request_type_id),
  UNIQUE KEY uq_request_types_code (request_type_code),
  KEY idx_request_types_department (default_department_id),
  CONSTRAINT fk_request_types_department
    FOREIGN KEY (default_department_id) REFERENCES departments (department_id)
) ENGINE=InnoDB;

CREATE TABLE users (
  user_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_uuid CHAR(36) NOT NULL COMMENT 'Application-generated UUID',
  account_type ENUM('VETERAN', 'STAFF') NOT NULL,
  role_id TINYINT UNSIGNED NOT NULL,
  staff_approval_status ENUM('NOT_APPLICABLE', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'NOT_APPLICABLE',
  email_lookup_hash BINARY(32) NOT NULL COMMENT 'HMAC-SHA-256(lower(trim(email)), pepper)',
  regimental_number_lookup_hash BINARY(32) NOT NULL COMMENT 'HMAC-SHA-256(digits_only_reg_number, pepper)',
  service_branch ENUM('JDF', 'JCA') NOT NULL,
  regimental_number_digits TINYINT UNSIGNED NOT NULL,
  password_hash VARBINARY(255) NOT NULL COMMENT 'Argon2id/bcrypt hash only',
  password_algorithm ENUM('ARGON2ID', 'BCRYPT') NOT NULL DEFAULT 'ARGON2ID',
  password_changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by_user_id BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  rejected_by_user_id BIGINT UNSIGNED NULL,
  rejected_at DATETIME NULL,
  rejection_reason VARCHAR(500) NULL,
  last_login_at DATETIME NULL,
  last_login_ip VARBINARY(16) NULL COMMENT 'INET6_ATON(ip_address)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_public_uuid (public_uuid),
  UNIQUE KEY uq_users_email_lookup_hash (email_lookup_hash),
  UNIQUE KEY uq_users_regimental_lookup_hash (regimental_number_lookup_hash),
  KEY idx_users_role (role_id),
  KEY idx_users_account_type (account_type),
  KEY idx_users_staff_approval_status (staff_approval_status),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_id) REFERENCES roles (role_id),
  CONSTRAINT fk_users_approved_by
    FOREIGN KEY (approved_by_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_users_rejected_by
    FOREIGN KEY (rejected_by_user_id) REFERENCES users (user_id),
  CONSTRAINT chk_users_regimental_length
    CHECK (
      (service_branch = 'JDF' AND regimental_number_digits = 5) OR
      (service_branch = 'JCA' AND regimental_number_digits = 4)
    )
) ENGINE=InnoDB;

CREATE TABLE user_secure_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  profile_schema_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  profile_ciphertext LONGBLOB NOT NULL COMMENT 'Encrypted JSON: full_name, email, rank, regimental_number, parsed name parts, display_name cache',
  profile_iv BINARY(12) NOT NULL COMMENT 'AES-GCM IV/nonce',
  profile_tag BINARY(16) NOT NULL COMMENT 'AES-GCM auth tag',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_user_secure_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_profile_images (
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

CREATE TABLE staff_profiles (
  user_id BIGINT UNSIGNED NOT NULL,
  requested_primary_department_id SMALLINT UNSIGNED NULL,
  assigned_primary_department_id SMALLINT UNSIGNED NULL,
  employment_status ENUM('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'INACTIVE') NOT NULL DEFAULT 'PENDING_APPROVAL',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at DATETIME NULL,
  assigned_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_staff_profiles_requested_department (requested_primary_department_id),
  KEY idx_staff_profiles_assigned_department (assigned_primary_department_id),
  CONSTRAINT fk_staff_profiles_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_profiles_requested_department
    FOREIGN KEY (requested_primary_department_id) REFERENCES departments (department_id),
  CONSTRAINT fk_staff_profiles_assigned_department
    FOREIGN KEY (assigned_primary_department_id) REFERENCES departments (department_id),
  CONSTRAINT fk_staff_profiles_assigned_by
    FOREIGN KEY (assigned_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE staff_department_access (
  staff_department_access_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  department_id SMALLINT UNSIGNED NOT NULL,
  access_level ENUM('VIEW', 'WORK', 'SUPERVISE', 'MANAGE') NOT NULL DEFAULT 'WORK',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by_user_id BIGINT UNSIGNED NULL,
  granted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_by_user_id BIGINT UNSIGNED NULL,
  revoked_at DATETIME NULL,
  PRIMARY KEY (staff_department_access_id),
  UNIQUE KEY uq_staff_department_access_user_department (user_id, department_id),
  KEY idx_staff_department_access_department (department_id, is_active),
  CONSTRAINT fk_staff_department_access_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_department_access_department
    FOREIGN KEY (department_id) REFERENCES departments (department_id),
  CONSTRAINT fk_staff_department_access_granted_by
    FOREIGN KEY (granted_by_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_staff_department_access_revoked_by
    FOREIGN KEY (revoked_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE account_approval_history (
  approval_history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  previous_role_id TINYINT UNSIGNED NULL,
  new_role_id TINYINT UNSIGNED NULL,
  previous_status ENUM('NOT_APPLICABLE', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NULL,
  new_status ENUM('NOT_APPLICABLE', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL,
  acted_by_user_id BIGINT UNSIGNED NOT NULL,
  reason_ciphertext VARBINARY(2048) NULL,
  reason_iv BINARY(12) NULL,
  reason_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (approval_history_id),
  KEY idx_account_approval_history_user (user_id, created_at),
  CONSTRAINT fk_account_approval_history_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_account_approval_history_previous_role
    FOREIGN KEY (previous_role_id) REFERENCES roles (role_id),
  CONSTRAINT fk_account_approval_history_new_role
    FOREIGN KEY (new_role_id) REFERENCES roles (role_id),
  CONSTRAINT fk_account_approval_history_actor
    FOREIGN KEY (acted_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE user_sessions (
  session_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  refresh_token_hash BINARY(32) NOT NULL COMMENT 'HMAC-SHA-256(refresh token, pepper)',
  ip_address VARBINARY(16) NULL COMMENT 'INET6_ATON(ip_address)',
  user_agent VARCHAR(500) NULL,
  issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revoked_reason VARCHAR(255) NULL,
  PRIMARY KEY (session_id),
  UNIQUE KEY uq_user_sessions_refresh_token_hash (refresh_token_hash),
  KEY idx_user_sessions_user (user_id, expires_at),
  CONSTRAINT fk_user_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE user_one_time_tokens (
  token_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_type ENUM('PASSWORD_RESET', 'EMAIL_VERIFY', 'MFA_SETUP', 'ACCOUNT_VERIFICATION') NOT NULL,
  token_hash BINARY(32) NOT NULL COMMENT 'HMAC-SHA-256(token, pepper)',
  created_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  PRIMARY KEY (token_id),
  UNIQUE KEY uq_user_one_time_tokens_hash (token_hash),
  KEY idx_user_one_time_tokens_user (user_id, token_type, expires_at),
  CONSTRAINT fk_user_one_time_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_one_time_tokens_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE user_mfa_methods (
  mfa_method_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  method_type ENUM('TOTP', 'EMAIL_OTP', 'SMS_OTP') NOT NULL,
  method_label VARCHAR(100) NULL,
  secret_ciphertext VARBINARY(1024) NOT NULL,
  secret_iv BINARY(12) NOT NULL,
  secret_tag BINARY(16) NOT NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  PRIMARY KEY (mfa_method_id),
  KEY idx_user_mfa_methods_user (user_id, is_active),
  CONSTRAINT fk_user_mfa_methods_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE form_definitions (
  form_definition_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  form_code VARCHAR(100) NOT NULL,
  form_name VARCHAR(180) NOT NULL,
  request_type_id SMALLINT UNSIGNED NOT NULL,
  owning_department_id SMALLINT UNSIGNED NOT NULL,
  form_mode ENUM('FIXED', 'CONFIGURABLE') NOT NULL DEFAULT 'CONFIGURABLE',
  stability_level ENUM('CONFIRMED', 'SEMI_STABLE', 'CHANGEABLE') NOT NULL DEFAULT 'CHANGEABLE',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (form_definition_id),
  UNIQUE KEY uq_form_definitions_code (form_code),
  KEY idx_form_definitions_request_type (request_type_id),
  KEY idx_form_definitions_department (owning_department_id),
  CONSTRAINT fk_form_definitions_request_type
    FOREIGN KEY (request_type_id) REFERENCES request_types (request_type_id),
  CONSTRAINT fk_form_definitions_department
    FOREIGN KEY (owning_department_id) REFERENCES departments (department_id)
) ENGINE=InnoDB;

CREATE TABLE form_definition_versions (
  form_definition_version_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  form_definition_id BIGINT UNSIGNED NOT NULL,
  version_number SMALLINT UNSIGNED NOT NULL,
  version_status ENUM('DRAFT', 'ACTIVE', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
  title VARCHAR(180) NOT NULL,
  intro_text VARCHAR(500) NULL,
  submit_label VARCHAR(120) NOT NULL DEFAULT 'Submit',
  storage_strategy ENUM('REQUEST_PAYLOAD', 'DEDICATED_TABLE') NOT NULL DEFAULT 'REQUEST_PAYLOAD',
  dedicated_table_name VARCHAR(100) NULL,
  schema_json JSON NOT NULL COMMENT 'Field definitions, labels, validation rules, and UI layout metadata',
  validation_json JSON NULL COMMENT 'Cross-field validation and conditional logic rules',
  created_by_user_id BIGINT UNSIGNED NULL,
  activated_by_user_id BIGINT UNSIGNED NULL,
  activated_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (form_definition_version_id),
  UNIQUE KEY uq_form_definition_versions_form_version (form_definition_id, version_number),
  KEY idx_form_definition_versions_status (form_definition_id, version_status),
  CONSTRAINT fk_form_definition_versions_definition
    FOREIGN KEY (form_definition_id) REFERENCES form_definitions (form_definition_id) ON DELETE CASCADE,
  CONSTRAINT fk_form_definition_versions_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_form_definition_versions_activated_by
    FOREIGN KEY (activated_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE identity_verification_requests (
  verification_request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  related_request_id BIGINT UNSIGNED NULL,
  verification_type ENUM('ACCOUNT_VERIFICATION', 'SERVICE_ISSUANCE') NOT NULL,
  status ENUM('PENDING_UPLOAD', 'UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING_UPLOAD',
  requested_by_user_id BIGINT UNSIGNED NULL,
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME NULL,
  reviewed_at DATETIME NULL,
  expires_at DATETIME NULL,
  review_note_ciphertext VARBINARY(4096) NULL,
  review_note_iv BINARY(12) NULL,
  review_note_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  PRIMARY KEY (verification_request_id),
  KEY idx_identity_verification_requests_user (user_id, status),
  KEY idx_identity_verification_requests_request (related_request_id),
  CONSTRAINT fk_identity_verification_requests_user
    FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_identity_verification_requests_requested_by
    FOREIGN KEY (requested_by_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_identity_verification_requests_reviewed_by
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE service_requests (
  request_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_uuid CHAR(36) NOT NULL COMMENT 'Application-generated UUID',
  requester_user_id BIGINT UNSIGNED NOT NULL,
  submitted_by_user_id BIGINT UNSIGNED NOT NULL COMMENT 'May be receptionist/staff creating the request for a veteran',
  request_type_id SMALLINT UNSIGNED NOT NULL,
  owning_department_id SMALLINT UNSIGNED NOT NULL,
  current_status_id SMALLINT UNSIGNED NOT NULL,
  assigned_to_user_id BIGINT UNSIGNED NULL,
  priority ENUM('LOW', 'NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL',
  intake_channel ENUM('PORTAL', 'RECEPTION', 'STAFF_DESK', 'PHONE', 'EMAIL') NOT NULL DEFAULT 'PORTAL',
  requires_identity_verification BOOLEAN NOT NULL DEFAULT FALSE,
  identity_verified BOOLEAN NOT NULL DEFAULT FALSE,
  latest_verification_request_id BIGINT UNSIGNED NULL,
  pickup_required BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_at DATETIME NULL,
  completed_at DATETIME NULL,
  closed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  UNIQUE KEY uq_service_requests_public_uuid (public_uuid),
  KEY idx_service_requests_requester (requester_user_id, created_at),
  KEY idx_service_requests_department_status (owning_department_id, current_status_id, created_at),
  KEY idx_service_requests_assigned (assigned_to_user_id, current_status_id),
  KEY idx_service_requests_type (request_type_id),
  CONSTRAINT fk_service_requests_requester
    FOREIGN KEY (requester_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_service_requests_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_service_requests_request_type
    FOREIGN KEY (request_type_id) REFERENCES request_types (request_type_id),
  CONSTRAINT fk_service_requests_owning_department
    FOREIGN KEY (owning_department_id) REFERENCES departments (department_id),
  CONSTRAINT fk_service_requests_current_status
    FOREIGN KEY (current_status_id) REFERENCES request_statuses (status_id),
  CONSTRAINT fk_service_requests_assigned_to
    FOREIGN KEY (assigned_to_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_service_requests_latest_verification
    FOREIGN KEY (latest_verification_request_id) REFERENCES identity_verification_requests (verification_request_id)
) ENGINE=InnoDB;

ALTER TABLE identity_verification_requests
  ADD CONSTRAINT fk_identity_verification_requests_related_request
  FOREIGN KEY (related_request_id) REFERENCES service_requests (request_id);

CREATE TABLE service_request_payloads (
  request_id BIGINT UNSIGNED NOT NULL,
  form_definition_version_id BIGINT UNSIGNED NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  payload_schema_code VARCHAR(100) NOT NULL,
  payload_ciphertext LONGBLOB NOT NULL COMMENT 'Encrypted JSON payload for dynamic request data',
  payload_iv BINARY(12) NOT NULL,
  payload_tag BINARY(16) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  KEY idx_service_request_payloads_form_version (form_definition_version_id),
  CONSTRAINT fk_service_request_payloads_form_version
    FOREIGN KEY (form_definition_version_id) REFERENCES form_definition_versions (form_definition_version_id),
  CONSTRAINT fk_service_request_payloads_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE request_assignment_history (
  assignment_history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  from_department_id SMALLINT UNSIGNED NULL,
  to_department_id SMALLINT UNSIGNED NULL,
  from_user_id BIGINT UNSIGNED NULL,
  to_user_id BIGINT UNSIGNED NULL,
  assigned_by_user_id BIGINT UNSIGNED NOT NULL,
  reason_ciphertext VARBINARY(2048) NULL,
  reason_iv BINARY(12) NULL,
  reason_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  assigned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (assignment_history_id),
  KEY idx_request_assignment_history_request (request_id, assigned_at),
  CONSTRAINT fk_request_assignment_history_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE CASCADE,
  CONSTRAINT fk_request_assignment_history_from_department
    FOREIGN KEY (from_department_id) REFERENCES departments (department_id),
  CONSTRAINT fk_request_assignment_history_to_department
    FOREIGN KEY (to_department_id) REFERENCES departments (department_id),
  CONSTRAINT fk_request_assignment_history_from_user
    FOREIGN KEY (from_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_request_assignment_history_to_user
    FOREIGN KEY (to_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_request_assignment_history_assigned_by
    FOREIGN KEY (assigned_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE request_status_history (
  status_history_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  from_status_id SMALLINT UNSIGNED NULL,
  to_status_id SMALLINT UNSIGNED NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  is_visible_to_requester BOOLEAN NOT NULL DEFAULT TRUE,
  note_ciphertext VARBINARY(4096) NULL,
  note_iv BINARY(12) NULL,
  note_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (status_history_id),
  KEY idx_request_status_history_request (request_id, created_at),
  CONSTRAINT fk_request_status_history_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE CASCADE,
  CONSTRAINT fk_request_status_history_from_status
    FOREIGN KEY (from_status_id) REFERENCES request_statuses (status_id),
  CONSTRAINT fk_request_status_history_to_status
    FOREIGN KEY (to_status_id) REFERENCES request_statuses (status_id),
  CONSTRAINT fk_request_status_history_changed_by
    FOREIGN KEY (changed_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE request_notes (
  request_note_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  author_user_id BIGINT UNSIGNED NOT NULL,
  author_department_id SMALLINT UNSIGNED NULL,
  visibility ENUM('INTERNAL', 'REQUESTER') NOT NULL DEFAULT 'INTERNAL',
  note_ciphertext LONGBLOB NOT NULL,
  note_iv BINARY(12) NOT NULL,
  note_tag BINARY(16) NOT NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (request_note_id),
  KEY idx_request_notes_request (request_id, created_at),
  CONSTRAINT fk_request_notes_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE CASCADE,
  CONSTRAINT fk_request_notes_author
    FOREIGN KEY (author_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_request_notes_author_department
    FOREIGN KEY (author_department_id) REFERENCES departments (department_id)
) ENGINE=InnoDB;

CREATE TABLE request_outputs (
  output_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  output_code VARCHAR(80) NOT NULL,
  output_name VARCHAR(150) NOT NULL,
  output_kind ENUM('ID_CARD', 'LETTER', 'CERTIFICATE', 'REPORT', 'OTHER') NOT NULL,
  output_status ENUM('NOT_STARTED', 'IN_PRODUCTION', 'READY_FOR_PICKUP', 'COLLECTED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'NOT_STARTED',
  storage_disk ENUM('UPLOADS', 'PRIVATE_UPLOADS', 'S3') NOT NULL DEFAULT 'PRIVATE_UPLOADS',
  relative_path VARCHAR(500) NULL COMMENT 'Path within backend storage, e.g. uploads/letters/file.pdf',
  mime_type VARCHAR(150) NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  file_sha256 BINARY(32) NULL,
  ready_for_pickup_at DATETIME NULL,
  pickup_location VARCHAR(200) NULL,
  picked_up_at DATETIME NULL,
  issued_by_user_id BIGINT UNSIGNED NULL,
  issued_at DATETIME NULL,
  notes_ciphertext VARBINARY(4096) NULL,
  notes_iv BINARY(12) NULL,
  notes_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (output_id),
  KEY idx_request_outputs_request (request_id),
  KEY idx_request_outputs_status (output_status, ready_for_pickup_at),
  CONSTRAINT fk_request_outputs_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE CASCADE,
  CONSTRAINT fk_request_outputs_issued_by
    FOREIGN KEY (issued_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE request_attachments (
  attachment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  attachment_type ENUM('SUPPORTING_DOCUMENT', 'IDENTITY_IMAGE', 'PAYMENT_RECEIPT', 'LETTER_DRAFT', 'OTHER') NOT NULL DEFAULT 'SUPPORTING_DOCUMENT',
  storage_disk ENUM('UPLOADS', 'PRIVATE_UPLOADS', 'S3') NOT NULL DEFAULT 'PRIVATE_UPLOADS',
  relative_path VARCHAR(500) NOT NULL,
  original_filename_ciphertext VARBINARY(1024) NULL,
  original_filename_iv BINARY(12) NULL,
  original_filename_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  mime_type VARCHAR(150) NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  file_sha256 BINARY(32) NULL,
  is_visible_to_requester BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (attachment_id),
  KEY idx_request_attachments_request (request_id),
  CONSTRAINT fk_request_attachments_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE CASCADE,
  CONSTRAINT fk_request_attachments_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE request_payment_receipts (
  payment_receipt_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_id BIGINT UNSIGNED NOT NULL,
  attachment_id BIGINT UNSIGNED NOT NULL COMMENT 'Must reference a PAYMENT_RECEIPT attachment',
  submitted_by_user_id BIGINT UNSIGNED NOT NULL,
  receipt_status ENUM('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'SUBMITTED',
  reviewed_by_user_id BIGINT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  proof_letter_output_id BIGINT UNSIGNED NULL COMMENT 'Generated proof-of-payment letter output',
  proof_letter_generated_at DATETIME NULL,
  review_note_ciphertext VARBINARY(4096) NULL,
  review_note_iv BINARY(12) NULL,
  review_note_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_receipt_id),
  UNIQUE KEY uq_request_payment_receipts_attachment (attachment_id),
  KEY idx_request_payment_receipts_request (request_id, receipt_status),
  KEY idx_request_payment_receipts_proof_output (proof_letter_output_id),
  CONSTRAINT fk_request_payment_receipts_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE CASCADE,
  CONSTRAINT fk_request_payment_receipts_attachment
    FOREIGN KEY (attachment_id) REFERENCES request_attachments (attachment_id) ON DELETE CASCADE,
  CONSTRAINT fk_request_payment_receipts_submitted_by
    FOREIGN KEY (submitted_by_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_request_payment_receipts_reviewed_by
    FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_request_payment_receipts_output
    FOREIGN KEY (proof_letter_output_id) REFERENCES request_outputs (output_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE identity_verification_files (
  verification_file_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  verification_request_id BIGINT UNSIGNED NOT NULL,
  storage_disk ENUM('UPLOADS', 'PRIVATE_UPLOADS', 'S3') NOT NULL DEFAULT 'UPLOADS',
  relative_path VARCHAR(500) NOT NULL COMMENT 'Backend uploads path for ID image',
  original_filename_ciphertext VARBINARY(1024) NULL,
  original_filename_iv BINARY(12) NULL,
  original_filename_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  mime_type VARCHAR(150) NULL,
  file_size_bytes BIGINT UNSIGNED NULL,
  file_sha256 BINARY(32) NULL,
  uploaded_by_user_id BIGINT UNSIGNED NOT NULL,
  uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (verification_file_id),
  KEY idx_identity_verification_files_request (verification_request_id, is_active),
  CONSTRAINT fk_identity_verification_files_request
    FOREIGN KEY (verification_request_id) REFERENCES identity_verification_requests (verification_request_id) ON DELETE CASCADE,
  CONSTRAINT fk_identity_verification_files_uploaded_by
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

CREATE TABLE portal_events (
  portal_event_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(180) NOT NULL,
  summary VARCHAR(500) NOT NULL,
  location VARCHAR(180) NOT NULL,
  event_date DATE NOT NULL,
  details_route VARCHAR(255) NOT NULL DEFAULT '/',
  cta_label VARCHAR(60) NOT NULL DEFAULT 'Open details',
  banner_message VARCHAR(255) NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_banner BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id BIGINT UNSIGNED NULL,
  updated_by_user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (portal_event_id),
  KEY idx_portal_events_date (event_date, is_published),
  KEY idx_portal_events_banner (show_in_banner, is_published),
  CONSTRAINT fk_portal_events_created_by
    FOREIGN KEY (created_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL,
  CONSTRAINT fk_portal_events_updated_by
    FOREIGN KEY (updated_by_user_id) REFERENCES users (user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE employment_job_listings (
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

CREATE TABLE public_contact_submissions (
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

CREATE TABLE gallery_images (
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

CREATE TABLE notifications (
  notification_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_user_id BIGINT UNSIGNED NOT NULL,
  request_id BIGINT UNSIGNED NULL,
  output_id BIGINT UNSIGNED NULL,
  notification_type ENUM(
    'STATUS_UPDATE',
    'READY_FOR_PICKUP',
    'ACCOUNT_APPROVED',
    'ACCOUNT_REJECTED',
    'IDENTITY_VERIFICATION_REQUIRED',
    'IDENTITY_VERIFIED',
    'IDENTITY_VERIFICATION_REJECTED',
    'GENERAL'
  ) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message_ciphertext VARBINARY(4096) NOT NULL,
  message_iv BINARY(12) NOT NULL,
  message_tag BINARY(16) NOT NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_notifications_user_unread (recipient_user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (recipient_user_id) REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE SET NULL,
  CONSTRAINT fk_notifications_output
    FOREIGN KEY (output_id) REFERENCES request_outputs (output_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE audit_logs (
  audit_log_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_role_id TINYINT UNSIGNED NULL,
  actor_department_id SMALLINT UNSIGNED NULL,
  event_code VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  request_id BIGINT UNSIGNED NULL,
  target_user_id BIGINT UNSIGNED NULL,
  ip_address VARBINARY(16) NULL COMMENT 'INET6_ATON(ip_address)',
  user_agent VARCHAR(500) NULL,
  summary VARCHAR(255) NOT NULL,
  details_ciphertext LONGBLOB NULL,
  details_iv BINARY(12) NULL,
  details_tag BINARY(16) NULL,
  key_version SMALLINT UNSIGNED NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_log_id),
  KEY idx_audit_logs_request (request_id, occurred_at),
  KEY idx_audit_logs_target_user (target_user_id, occurred_at),
  KEY idx_audit_logs_actor (actor_user_id, occurred_at),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_logs_actor_user
    FOREIGN KEY (actor_user_id) REFERENCES users (user_id),
  CONSTRAINT fk_audit_logs_actor_role
    FOREIGN KEY (actor_role_id) REFERENCES roles (role_id),
  CONSTRAINT fk_audit_logs_actor_department
    FOREIGN KEY (actor_department_id) REFERENCES departments (department_id),
  CONSTRAINT fk_audit_logs_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id),
  CONSTRAINT fk_audit_logs_target_user
    FOREIGN KEY (target_user_id) REFERENCES users (user_id)
) ENGINE=InnoDB;

INSERT INTO roles (
  role_code,
  role_name,
  role_level,
  is_staff_role,
  can_access_all_departments,
  can_manage_main_admin,
  can_manage_director,
  can_manage_qm,
  can_manage_staff_accounts,
  can_approve_staff_signups,
  can_assign_departments,
  can_view_audit_logs,
  can_manage_roles,
  can_manage_request_types,
  can_override_request_assignment,
  can_close_any_request,
  can_publish_notifications,
  description
) VALUES
  ('VETERAN', 'Veteran User', 900, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 'Portal user account'),
  ('STAFF', 'Department Staff', 500, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, 'Department-scoped staff account'),
  ('RECEPTION', 'Reception', 400, TRUE, TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE, FALSE, FALSE, 'Can see and work requests for all departments'),
  ('QM', 'QM', 300, TRUE, TRUE, FALSE, FALSE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'Cross-department operational access; cannot alter Director or Main Admin roles'),
  ('DIRECTOR', 'Director', 200, TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'Full operational access except altering Main Admin'),
  ('MAIN_ADMIN', 'Main Admin', 100, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 'Developer-level full access');

INSERT INTO departments (department_code, department_name, description) VALUES
  ('HISTORICAL_RECORDS', 'Historical Records', 'Military service records, certificates, and confirmation letters'),
  ('PENSION_BENEFITS', 'Pension and Other Benefits', 'Pensions, gratuities, ex-gratia, disability, and death benefits'),
  ('RESETTLEMENT_EMPLOYMENT', 'Resettlement and Employment', 'Resume support, workshops, job bank, and placement'),
  ('WELFARE_ASSISTANCE', 'Welfare and Assistance', 'Welfare support, medical reviews, retiree support, funerals, and ID services'),
  ('OUTREACH_COMMUNICATION', 'Outreach and Communication', 'Outreach projects, liaison, and veteran queries');

INSERT INTO request_statuses (
  status_code,
  status_name,
  display_order,
  is_public,
  is_terminal,
  indicates_ready_for_pickup
) VALUES
  ('SUBMITTED', 'Submitted', 10, TRUE, FALSE, FALSE),
  ('UNDER_REVIEW', 'Under Review', 20, TRUE, FALSE, FALSE),
  ('PENDING_VERIFICATION', 'Pending Verification', 30, TRUE, FALSE, FALSE),
  ('PENDING_DOCUMENTS', 'Pending Documents', 40, TRUE, FALSE, FALSE),
  ('APPROVED', 'Approved', 50, TRUE, FALSE, FALSE),
  ('IN_PROGRESS', 'In Progress', 60, TRUE, FALSE, FALSE),
  ('PRINTED', 'Printed', 70, TRUE, FALSE, FALSE),
  ('READY_FOR_PICKUP', 'Ready for Pickup', 80, TRUE, FALSE, TRUE),
  ('DELIVERED', 'Delivered', 90, TRUE, TRUE, FALSE),
  ('COLLECTED', 'Collected', 100, TRUE, TRUE, FALSE),
  ('REJECTED', 'Rejected', 110, TRUE, TRUE, FALSE),
  ('CANCELLED', 'Cancelled', 120, TRUE, TRUE, FALSE),
  ('CLOSED', 'Closed', 130, FALSE, TRUE, FALSE);

INSERT INTO request_types (
  request_type_code,
  request_type_name,
  default_department_id,
  requires_identity_verification,
  produces_pickup_item,
  output_kind,
  description
)
SELECT 'MILITARY_SERVICE_RECORDS', 'Military Service Records', department_id, FALSE, FALSE, 'NONE', 'Historical records request'
FROM departments WHERE department_code = 'HISTORICAL_RECORDS'
UNION ALL
SELECT 'CERTIFICATE_OF_SERVICE_OFFICER', 'Certificate of Service (Officers)', department_id, FALSE, TRUE, 'CERTIFICATE', 'Officer certificate of service'
FROM departments WHERE department_code = 'HISTORICAL_RECORDS'
UNION ALL
SELECT 'CERTIFICATE_OF_SERVICE_BLUE_BOOK', 'Certificate of Service (Blue Book)', department_id, FALSE, TRUE, 'CERTIFICATE', 'Blue book certificate of service'
FROM departments WHERE department_code = 'HISTORICAL_RECORDS'
UNION ALL
SELECT 'CERTIFICATE_OF_COMMENDATION', 'Certificate of Commendation', department_id, FALSE, TRUE, 'CERTIFICATE', 'Certificate of commendation'
FROM departments WHERE department_code = 'HISTORICAL_RECORDS'
UNION ALL
SELECT 'CONFIRMATION_OF_EMPLOYMENT_LETTER', 'Confirmation of Employment Letter', department_id, FALSE, TRUE, 'LETTER', 'Employment confirmation letter'
FROM departments WHERE department_code = 'HISTORICAL_RECORDS'
UNION ALL
SELECT 'PENSION_APPLICATION', 'Pension Application', department_id, TRUE, FALSE, 'NONE', 'Pension request'
FROM departments WHERE department_code = 'PENSION_BENEFITS'
UNION ALL
SELECT 'GRATUITY_APPLICATION', 'Gratuity Application', department_id, TRUE, FALSE, 'NONE', 'Gratuity request'
FROM departments WHERE department_code = 'PENSION_BENEFITS'
UNION ALL
SELECT 'EX_GRATIA_APPLICATION', 'Ex-Gratia Application', department_id, TRUE, FALSE, 'NONE', 'Ex-gratia request'
FROM departments WHERE department_code = 'PENSION_BENEFITS'
UNION ALL
SELECT 'DISABILITY_BENEFIT_REQUEST', 'Disability Benefit Request', department_id, TRUE, FALSE, 'NONE', 'Disability benefits request'
FROM departments WHERE department_code = 'PENSION_BENEFITS'
UNION ALL
SELECT 'DEATH_BENEFIT_REQUEST', 'Death Benefit Request', department_id, TRUE, FALSE, 'NONE', 'Death benefits request'
FROM departments WHERE department_code = 'PENSION_BENEFITS'
UNION ALL
SELECT 'INSURANCE_SUPPORT_REQUEST', 'Insurance Support Request', department_id, TRUE, FALSE, 'NONE', 'Insurance questions and enrolment support'
FROM departments WHERE department_code = 'WELFARE_ASSISTANCE'
UNION ALL
SELECT 'VETERANS_ID_APPLICATION', 'Veterans ID Application', department_id, TRUE, TRUE, 'ID_CARD', 'Veterans identification card application'
FROM departments WHERE department_code = 'WELFARE_ASSISTANCE'
UNION ALL
SELECT 'FUNERAL_SUPPORT_REQUEST', 'Funeral Support Request', department_id, TRUE, TRUE, 'OTHER', 'Funeral arrangements and final rites support'
FROM departments WHERE department_code = 'WELFARE_ASSISTANCE'
UNION ALL
SELECT 'WELFARE_ASSISTANCE_REQUEST', 'Welfare Assistance Request', department_id, TRUE, FALSE, 'NONE', 'General welfare assistance'
FROM departments WHERE department_code = 'WELFARE_ASSISTANCE'
UNION ALL
SELECT 'EMPLOYMENT_SUPPORT_REQUEST', 'Employment Support Request', department_id, FALSE, FALSE, 'NONE', 'Employment and resettlement support'
FROM departments WHERE department_code = 'RESETTLEMENT_EMPLOYMENT'
UNION ALL
SELECT 'JOB_OPPORTUNITY_REQUEST', 'Job Opportunity Request', department_id, FALSE, FALSE, 'NONE', 'Veteran job opportunity request'
FROM departments WHERE department_code = 'RESETTLEMENT_EMPLOYMENT'
UNION ALL
SELECT 'OUTREACH_QUERY', 'Outreach and Communication Query', department_id, FALSE, FALSE, 'NONE', 'General outreach and veteran query'
FROM departments WHERE department_code = 'OUTREACH_COMMUNICATION'
UNION ALL
SELECT 'DISCOUNT_PARTNER_SUBMISSION', 'Discount Partner Submission', department_id, FALSE, FALSE, 'NONE', 'Organization offering discounts to veterans'
FROM departments WHERE department_code = 'OUTREACH_COMMUNICATION';

INSERT INTO portal_events (
  title,
  summary,
  location,
  event_date,
  details_route,
  cta_label,
  banner_message,
  is_published,
  show_in_banner
) VALUES
  (
    'Veterans Wellness and Insurance Briefing',
    'Join the team for a wellness and insurance briefing covering retiree health support, plan guidance, and service follow-up.',
    'Up Park Camp, Kingston 5',
    '2026-05-14',
    '/insurance',
    'Open insurance',
    'Upcoming event on May 14, 2026: Veterans Wellness and Insurance Briefing at Up Park Camp, Kingston 5.',
    TRUE,
    TRUE
  ),
  (
    'Veterans Employment Workshop',
    'Resume support, interview preparation, and job bank onboarding for veterans preparing for civilian employment.',
    'Resettlement and Employment Unit',
    '2026-07-09',
    '/employment',
    'Open employment',
    NULL,
    TRUE,
    FALSE
  );

INSERT INTO form_definitions (
  form_code,
  form_name,
  request_type_id,
  owning_department_id,
  form_mode,
  stability_level,
  description
)
SELECT
  'VETERANS_ID_APPLICATION_FORM',
  'Veterans ID Application Form',
  rt.request_type_id,
  rt.default_department_id,
  'FIXED',
  'CONFIRMED',
  'Confirmed Veterans Identification Access and Medical Card application'
FROM request_types rt
WHERE rt.request_type_code = 'VETERANS_ID_APPLICATION';

INSERT INTO form_definitions (
  form_code,
  form_name,
  request_type_id,
  owning_department_id,
  form_mode,
  stability_level,
  description
)
SELECT
  'FUNERAL_SUPPORT_FORM',
  'Funeral Support Form',
  rt.request_type_id,
  rt.default_department_id,
  'CONFIGURABLE',
  'SEMI_STABLE',
  'Funeral support form with home address captured for proof-of-payment letter generation after receipt submission'
FROM request_types rt
WHERE rt.request_type_code = 'FUNERAL_SUPPORT_REQUEST';

INSERT INTO form_definition_versions (
  form_definition_id,
  version_number,
  version_status,
  title,
  intro_text,
  submit_label,
  storage_strategy,
  dedicated_table_name,
  schema_json,
  validation_json
)
SELECT
  fd.form_definition_id,
  1,
  'ACTIVE',
  'Veterans Identification Access and Medical Card Application',
  'Confirmed application flow for the Veterans ID card.',
  'Submit ID request',
  'REQUEST_PAYLOAD',
  NULL,
  JSON_OBJECT(
    'formCode', 'VETERANS_ID_APPLICATION_FORM',
    'sections', JSON_ARRAY(
      JSON_OBJECT('code', 'SECTION_A', 'title', 'Type of application'),
      JSON_OBJECT('code', 'SECTION_B', 'title', 'Personal information'),
      JSON_OBJECT('code', 'SECTION_C', 'title', 'Declaration and signature'),
      JSON_OBJECT('code', 'SECTION_D', 'title', 'Official use only')
    ),
    'fieldCodes', JSON_ARRAY(
      'application_type',
      'surname',
      'rank',
      'full_name',
      'gender',
      'date_of_birth',
      'enlistment_date',
      'discharge_date',
      'total_service',
      'termination_reason',
      'service_number',
      'reference_number',
      'blood_group',
      'identification_type',
      'phone',
      'email',
      'home_address',
      'declaration',
      'signature_name',
      'application_date',
      'notes'
    )
  ),
  JSON_OBJECT(
    'required', JSON_ARRAY(
      'application_type',
      'surname',
      'full_name',
      'gender',
      'date_of_birth',
      'identification_type',
      'phone',
      'signature_name',
      'application_date'
    )
  )
FROM form_definitions fd
WHERE fd.form_code = 'VETERANS_ID_APPLICATION_FORM';

INSERT INTO form_definition_versions (
  form_definition_id,
  version_number,
  version_status,
  title,
  intro_text,
  submit_label,
  storage_strategy,
  dedicated_table_name,
  schema_json,
  validation_json
)
SELECT
  fd.form_definition_id,
  1,
  'ACTIVE',
  'Funeral Support Request',
  'Funeral support form with home address captured for payment-letter follow-up.',
  'Submit funeral request',
  'REQUEST_PAYLOAD',
  NULL,
  JSON_OBJECT(
    'formCode', 'FUNERAL_SUPPORT_FORM',
    'sections', JSON_ARRAY(
      JSON_OBJECT('code', 'SECTION_A', 'title', 'Veteran and requestor details'),
      JSON_OBJECT('code', 'SECTION_B', 'title', 'Support details'),
      JSON_OBJECT('code', 'SECTION_C', 'title', 'Payment and follow-up')
    ),
    'fieldCodes', JSON_ARRAY(
      'veteran_name',
      'requestor_name',
      'requestor_role',
      'phone',
      'email',
      'home_address',
      'support_type',
      'preferred_follow_up',
      'burial_date_target',
      'notes',
      'payment_receipt_attachment'
    ),
    'generatedOutputs', JSON_ARRAY(
      JSON_OBJECT(
        'code', 'FUNERAL_PROOF_OF_PAYMENT_LETTER',
        'name', 'Funeral Proof of Payment Letter',
        'outputKind', 'LETTER',
        'trigger', 'PAYMENT_RECEIPT_ACCEPTED',
        'usesFields', JSON_ARRAY('home_address')
      )
    )
  ),
  JSON_OBJECT(
    'required', JSON_ARRAY(
      'veteran_name',
      'requestor_name',
      'phone',
      'home_address',
      'support_type'
    ),
    'receiptWorkflow', JSON_OBJECT(
      'attachmentType', 'PAYMENT_RECEIPT',
      'acceptedStatus', 'ACCEPTED',
      'outputCode', 'FUNERAL_PROOF_OF_PAYMENT_LETTER'
    )
  )
FROM form_definitions fd
WHERE fd.form_code = 'FUNERAL_SUPPORT_FORM';

CREATE VIEW vw_requests_ready_for_pickup AS
SELECT
  sr.request_id,
  sr.public_uuid AS request_uuid,
  sr.requester_user_id,
  rt.request_type_code,
  rt.request_type_name,
  d.department_code,
  d.department_name,
  ro.output_id,
  ro.output_code,
  ro.output_name,
  ro.output_kind,
  ro.output_status,
  ro.ready_for_pickup_at,
  ro.pickup_location
FROM service_requests sr
INNER JOIN request_outputs ro
  ON ro.request_id = sr.request_id
INNER JOIN request_types rt
  ON rt.request_type_id = sr.request_type_id
INNER JOIN departments d
  ON d.department_id = sr.owning_department_id
WHERE ro.output_status = 'READY_FOR_PICKUP';

CREATE VIEW vw_department_request_queue AS
SELECT
  sr.request_id,
  sr.public_uuid AS request_uuid,
  sr.requester_user_id,
  sr.owning_department_id,
  d.department_code,
  d.department_name,
  rt.request_type_code,
  rt.request_type_name,
  rs.status_code,
  rs.status_name,
  sr.priority,
  sr.assigned_to_user_id,
  sr.pickup_required,
  sr.requires_identity_verification,
  sr.identity_verified,
  sr.submitted_at,
  sr.updated_at
FROM service_requests sr
INNER JOIN departments d
  ON d.department_id = sr.owning_department_id
INNER JOIN request_types rt
  ON rt.request_type_id = sr.request_type_id
INNER JOIN request_statuses rs
  ON rs.status_id = sr.current_status_id;
