const express = require("express");
const { pool } = require("../config/database");
const { asyncHandler } = require("../utils/http");

const router = express.Router();

router.get(
  "/bootstrap",
  asyncHandler(async (_req, res) => {
    const connection = await pool.getConnection();

    try {
      const [mainAdminRows] = await connection.execute(
        `SELECT EXISTS(
          SELECT 1
          FROM users u
          INNER JOIN roles r
            ON r.role_id = u.role_id
          WHERE r.role_code = 'MAIN_ADMIN'
        ) AS has_main_admin`
      );
      const [departments] = await connection.execute(
        "SELECT department_id, department_code, department_name FROM departments WHERE is_active = 1 ORDER BY department_name"
      );
      const [requestTypes] = await connection.execute(
        `SELECT
          request_type_id,
          request_type_code,
          request_type_name,
          default_department_id,
          requires_identity_verification,
          produces_pickup_item,
          output_kind
        FROM request_types
        WHERE is_active = 1
        ORDER BY request_type_name`
      );
      const [statuses] = await connection.execute(
        `SELECT status_code, status_name, display_order, indicates_ready_for_pickup
        FROM request_statuses
        ORDER BY display_order`
      );
      const [roles] = await connection.execute(
        `SELECT
          role_id,
          role_code,
          role_name,
          is_staff_role
        FROM roles
        ORDER BY role_level ASC, role_name ASC`
      );

      return res.json({
        hasMainAdmin: Boolean(mainAdminRows[0]?.has_main_admin),
        departments,
        requestTypes,
        statuses,
        roles
      });
    } finally {
      connection.release();
    }
  })
);

module.exports = router;
