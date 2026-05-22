const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { randomUUID } = require("crypto");
const { pool } = require("../config/database");
const { asyncHandler } = require("../utils/http");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { galleryUpload } = require("../middleware/upload");
const { writeAudit } = require("../services/audit.service");

const router = express.Router();

function toJobPayload(row) {
  return {
    jobId: row.employment_job_listing_id,
    publicUuid: row.public_uuid,
    jobTitle: row.job_title,
    organizationName: row.organization_name,
    jobDescription: row.job_description,
    qualificationsText: row.qualifications_text || "",
    howToApply: row.how_to_apply,
    isActive: Boolean(row.is_active),
    postedAt: row.posted_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at || null
  };
}

function canManageEmploymentJobs(user) {
  if (!user) {
    return false;
  }

  if (["MAIN_ADMIN", "DIRECTOR", "QM"].includes(user.roleCode) || user.permissions?.canAccessAllDepartments) {
    return true;
  }

  return (user.departments || []).some((department) => department.departmentCode === "RESETTLEMENT_EMPLOYMENT");
}

function canManageGallery(user) {
  return Boolean(user && user.accountType === "STAFF");
}

function normalizeText(value, maxLength) {
  const normalized = String(value || "").trim().replace(/\s+\n/g, "\n").replace(/\n\s+/g, "\n");
  return maxLength ? normalized.slice(0, maxLength) : normalized;
}

function hashUploadedFile(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest();
}

function toGalleryPayload(row) {
  return {
    galleryImageId: row.gallery_image_id,
    publicUuid: row.public_uuid,
    title: row.title,
    caption: row.caption || "",
    altText: row.alt_text,
    activityDate: row.activity_date,
    isPublished: Boolean(row.is_published),
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    imageRoute: `/portal/gallery-images/${row.gallery_image_id}/file`
  };
}

router.get(
  "/events",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(
      `SELECT
        portal_event_id,
        title,
        summary,
        location,
        event_date,
        details_route,
        cta_label,
        banner_message,
        is_published,
        show_in_banner
      FROM portal_events
      WHERE is_published = 1
        AND event_date >= UTC_DATE()
      ORDER BY event_date ASC, created_at DESC`
    );

    const events = rows.map((row) => ({
      eventId: row.portal_event_id,
      title: row.title,
      summary: row.summary,
      location: row.location,
      eventDate: row.event_date,
      detailsRoute: row.details_route,
      ctaLabel: row.cta_label,
      bannerMessage: row.banner_message,
      isPublished: Boolean(row.is_published),
      showInBanner: Boolean(row.show_in_banner)
    }));

    return res.json({
      events,
      bannerEvent: events.find((event) => event.showInBanner) || null
    });
  })
);

router.get(
  "/jobs",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(
      `SELECT
        employment_job_listing_id,
        public_uuid,
        job_title,
        organization_name,
        job_description,
        qualifications_text,
        how_to_apply,
        is_active,
        posted_at,
        updated_at,
        closed_at
      FROM employment_job_listings
      WHERE is_active = 1
      ORDER BY posted_at DESC, employment_job_listing_id DESC`
    );

    return res.json({
      jobs: rows.map(toJobPayload)
    });
  })
);

router.get(
  "/gallery",
  asyncHandler(async (_req, res) => {
    const [rows] = await pool.execute(
      `SELECT
        gallery_image_id,
        public_uuid,
        title,
        caption,
        alt_text,
        activity_date,
        is_published,
        is_featured,
        created_at,
        updated_at
      FROM gallery_images
      WHERE is_published = 1
      ORDER BY is_featured DESC, COALESCE(activity_date, DATE(created_at)) DESC, created_at DESC`
    );

    return res.json({
      images: rows.map(toGalleryPayload)
    });
  })
);

router.get(
  "/gallery-images/manage",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!canManageGallery(req.user)) {
      return res.status(403).json({ message: "Gallery management access denied." });
    }

    const [rows] = await pool.execute(
      `SELECT
        gallery_image_id,
        public_uuid,
        title,
        caption,
        alt_text,
        activity_date,
        is_published,
        is_featured,
        created_at,
        updated_at
      FROM gallery_images
      ORDER BY created_at DESC, gallery_image_id DESC`
    );

    return res.json({
      images: rows.map(toGalleryPayload)
    });
  })
);

router.post(
  "/gallery-images",
  requireAuth,
  galleryUpload.single("file"),
  asyncHandler(async (req, res) => {
    if (!canManageGallery(req.user)) {
      return res.status(403).json({ message: "Gallery management access denied." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Gallery image file is required." });
    }

    const title = normalizeText(req.body?.title, 180);
    const caption = normalizeText(req.body?.caption);
    const altText = normalizeText(req.body?.altText, 255);
    const activityDate = normalizeText(req.body?.activityDate, 40);
    const isPublished = String(req.body?.isPublished || "true") !== "false";
    const isFeatured = String(req.body?.isFeatured || "false") === "true";

    if (!title || !altText) {
      return res.status(400).json({ message: "Title and alt text are required." });
    }

    const [result] = await pool.execute(
      `INSERT INTO gallery_images (
        public_uuid,
        title,
        caption,
        alt_text,
        activity_date,
        relative_path,
        mime_type,
        file_size_bytes,
        file_sha256,
        is_published,
        is_featured,
        uploaded_by_user_id,
        updated_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        title,
        caption || null,
        altText,
        activityDate || null,
        path.relative(process.cwd(), req.file.path).replace(/\\/g, "/"),
        req.file.mimetype,
        req.file.size,
        hashUploadedFile(req.file.path),
        isPublished ? 1 : 0,
        isFeatured ? 1 : 0,
        req.user.userId,
        req.user.userId
      ]
    );

    await writeAudit(pool, {
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
      actorDepartmentId: req.user.departments[0]?.departmentId || null,
      eventCode: "GALLERY_IMAGE_CREATED",
      entityType: "GALLERY_IMAGE",
      entityId: result.insertId,
      summary: `Created gallery image ${title}.`
    });

    const [rows] = await pool.execute(
      `SELECT
        gallery_image_id,
        public_uuid,
        title,
        caption,
        alt_text,
        activity_date,
        is_published,
        is_featured,
        created_at,
        updated_at
      FROM gallery_images
      WHERE gallery_image_id = ?
      LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Gallery image uploaded.",
      image: rows[0] ? toGalleryPayload(rows[0]) : null
    });
  })
);

router.patch(
  "/gallery-images/:galleryImageId",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!canManageGallery(req.user)) {
      return res.status(403).json({ message: "Gallery management access denied." });
    }

    const galleryImageId = Number(req.params.galleryImageId);
    const body = req.body || {};
    const titleProvided = Object.prototype.hasOwnProperty.call(body, "title");
    const captionProvided = Object.prototype.hasOwnProperty.call(body, "caption");
    const altTextProvided = Object.prototype.hasOwnProperty.call(body, "altText");
    const activityDateProvided = Object.prototype.hasOwnProperty.call(body, "activityDate");
    const isPublishedProvided = typeof body.isPublished === "boolean";
    const isFeaturedProvided = typeof body.isFeatured === "boolean";

    if (!galleryImageId) {
      return res.status(400).json({ message: "Invalid gallery image." });
    }

    const [result] = await pool.execute(
      `UPDATE gallery_images
      SET title = CASE WHEN ? = 1 THEN ? ELSE title END,
          caption = CASE WHEN ? = 1 THEN ? ELSE caption END,
          alt_text = CASE WHEN ? = 1 THEN ? ELSE alt_text END,
          activity_date = CASE WHEN ? = 1 THEN ? ELSE activity_date END,
          is_published = CASE WHEN ? = 1 THEN ? ELSE is_published END,
          is_featured = CASE WHEN ? = 1 THEN ? ELSE is_featured END,
          updated_by_user_id = ?,
          updated_at = UTC_TIMESTAMP()
      WHERE gallery_image_id = ?`,
      [
        titleProvided ? 1 : 0,
        titleProvided ? normalizeText(body.title, 180) : null,
        captionProvided ? 1 : 0,
        captionProvided ? normalizeText(body.caption) || null : null,
        altTextProvided ? 1 : 0,
        altTextProvided ? normalizeText(body.altText, 255) : null,
        activityDateProvided ? 1 : 0,
        activityDateProvided ? normalizeText(body.activityDate, 40) || null : null,
        isPublishedProvided ? 1 : 0,
        isPublishedProvided ? Number(body.isPublished) : 0,
        isFeaturedProvided ? 1 : 0,
        isFeaturedProvided ? Number(body.isFeatured) : 0,
        req.user.userId,
        galleryImageId
      ]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Gallery image not found." });
    }

    await writeAudit(pool, {
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
      actorDepartmentId: req.user.departments[0]?.departmentId || null,
      eventCode: "GALLERY_IMAGE_UPDATED",
      entityType: "GALLERY_IMAGE",
      entityId: galleryImageId,
      summary: `Updated gallery image ${galleryImageId}.`
    });

    return res.json({ message: "Gallery image updated." });
  })
);

router.get(
  "/gallery-images/:galleryImageId/file",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const galleryImageId = Number(req.params.galleryImageId);

    if (!galleryImageId) {
      return res.status(404).end();
    }

    const [rows] = await pool.execute(
      `SELECT
        relative_path,
        mime_type,
        is_published
      FROM gallery_images
      WHERE gallery_image_id = ?
      LIMIT 1`,
      [galleryImageId]
    );

    const image = rows[0];

    if (!image) {
      return res.status(404).end();
    }

    if (!image.is_published && !canManageGallery(req.user)) {
      return res.status(404).end();
    }

    const resolvedPath = path.resolve(process.cwd(), image.relative_path);

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).end();
    }

    if (image.mime_type) {
      res.type(image.mime_type);
    }

    return res.sendFile(resolvedPath);
  })
);

router.post(
  "/jobs",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!canManageEmploymentJobs(req.user)) {
      return res.status(403).json({ message: "You do not have permission to post employment opportunities." });
    }

    const jobTitle = normalizeText(req.body?.jobTitle, 180);
    const organizationName = normalizeText(req.body?.organizationName, 180);
    const jobDescription = normalizeText(req.body?.jobDescription);
    const qualificationsText = normalizeText(req.body?.qualificationsText);
    const howToApply = normalizeText(req.body?.howToApply);

    if (!jobTitle || !organizationName || !jobDescription || !howToApply) {
      return res.status(400).json({
        message: "Job title, organization name, job description, and how to apply are required."
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO employment_job_listings (
        public_uuid,
        job_title,
        organization_name,
        job_description,
        qualifications_text,
        how_to_apply,
        posted_by_user_id,
        updated_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        jobTitle,
        organizationName,
        jobDescription,
        qualificationsText || null,
        howToApply,
        req.user.userId,
        req.user.userId
      ]
    );

    await writeAudit(pool, {
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
      actorDepartmentId: req.user.departments[0]?.departmentId || null,
      eventCode: "EMPLOYMENT_JOB_CREATED",
      entityType: "EMPLOYMENT_JOB_LISTING",
      entityId: result.insertId,
      summary: `Created employment job listing ${jobTitle}.`
    });

    const [rows] = await pool.execute(
      `SELECT
        employment_job_listing_id,
        public_uuid,
        job_title,
        organization_name,
        job_description,
        qualifications_text,
        how_to_apply,
        is_active,
        posted_at,
        updated_at,
        closed_at
      FROM employment_job_listings
      WHERE employment_job_listing_id = ?
      LIMIT 1`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Employment opportunity posted.",
      job: rows[0] ? toJobPayload(rows[0]) : null
    });
  })
);

router.patch(
  "/jobs/:jobId/close",
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!canManageEmploymentJobs(req.user)) {
      return res.status(403).json({ message: "You do not have permission to close employment opportunities." });
    }

    const jobId = Number(req.params.jobId);

    if (!Number.isInteger(jobId) || jobId <= 0) {
      return res.status(400).json({ message: "Invalid job listing." });
    }

    const [result] = await pool.execute(
      `UPDATE employment_job_listings
      SET is_active = 0,
          closed_at = UTC_TIMESTAMP(),
          updated_by_user_id = ?,
          closed_by_user_id = ?,
          updated_at = UTC_TIMESTAMP()
      WHERE employment_job_listing_id = ?
        AND is_active = 1`,
      [req.user.userId, req.user.userId, jobId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: "Open job listing not found." });
    }

    await writeAudit(pool, {
      actorUserId: req.user.userId,
      actorRoleId: req.user.roleId,
      actorDepartmentId: req.user.departments[0]?.departmentId || null,
      eventCode: "EMPLOYMENT_JOB_CLOSED",
      entityType: "EMPLOYMENT_JOB_LISTING",
      entityId: jobId,
      summary: `Closed employment job listing ${jobId}.`
    });

    return res.json({ message: "Employment opportunity closed." });
  })
);

module.exports = router;
