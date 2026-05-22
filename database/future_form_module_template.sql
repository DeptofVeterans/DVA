-- Template for adding a future confirmed form or request module
-- Use this after a request flow is confirmed enough to be formalized.

USE jdf_veterans_affairs_portal;

-- 1. Add the request type if it does not already exist.
INSERT INTO request_types (
  request_type_code,
  request_type_name,
  default_department_id,
  requires_identity_verification,
  produces_pickup_item,
  output_kind,
  description
)
SELECT
  'NEW_REQUEST_TYPE_CODE',
  'New Request Type Name',
  d.department_id,
  FALSE,
  FALSE,
  'NONE',
  'Describe the new request'
FROM departments d
WHERE d.department_code = 'REPLACE_WITH_DEPARTMENT_CODE';

-- 2. Register the form and choose whether it is fixed or configurable.
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
  'NEW_FORM_CODE',
  'New Form Name',
  rt.request_type_id,
  rt.default_department_id,
  'CONFIGURABLE',
  'CHANGEABLE',
  'Describe the form'
FROM request_types rt
WHERE rt.request_type_code = 'NEW_REQUEST_TYPE_CODE';

-- 3. Add the first active form version.
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
  'New Form Title',
  'Short intro shown above the form.',
  'Submit request',
  'REQUEST_PAYLOAD',
  NULL,
  JSON_OBJECT(
    'formCode', 'NEW_FORM_CODE',
    'sections', JSON_ARRAY(
      JSON_OBJECT('code', 'SECTION_A', 'title', 'Main details')
    ),
    'fieldCodes', JSON_ARRAY(
      'field_one',
      'field_two'
    )
  ),
  JSON_OBJECT(
    'required', JSON_ARRAY(
      'field_one'
    )
  )
FROM form_definitions fd
WHERE fd.form_code = 'NEW_FORM_CODE';

-- 4. Optional: if the form becomes stable and needs stronger reporting or workflow,
--    create a dedicated table and switch the form version storage strategy.

CREATE TABLE IF NOT EXISTS example_confirmed_requests (
  request_id BIGINT UNSIGNED NOT NULL,
  key_version SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  field_one_ciphertext VARBINARY(2048) NOT NULL,
  field_one_iv BINARY(12) NOT NULL,
  field_one_tag BINARY(16) NOT NULL,
  field_two_ciphertext VARBINARY(2048) NULL,
  field_two_iv BINARY(12) NULL,
  field_two_tag BINARY(16) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (request_id),
  CONSTRAINT fk_example_confirmed_requests_request
    FOREIGN KEY (request_id) REFERENCES service_requests (request_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. When moving to a dedicated table, create a new form version instead of editing history.
UPDATE form_definition_versions fdv
INNER JOIN form_definitions fd
  ON fd.form_definition_id = fdv.form_definition_id
SET
  fdv.storage_strategy = 'DEDICATED_TABLE',
  fdv.dedicated_table_name = 'example_confirmed_requests'
WHERE fd.form_code = 'NEW_FORM_CODE'
  AND fdv.version_number = 1;
