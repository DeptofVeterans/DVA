const { randomUUID } = require("crypto");
const express = require("express");
const { transaction } = require("../config/database");
const { optionalAuth } = require("../middleware/auth");
const { writeAudit } = require("../services/audit.service");
const { emailLookupHash, encryptJson, regimentalLookupHash } = require("../utils/crypto");
const { asyncHandler } = require("../utils/http");

const router = express.Router();

const CONTACT_TYPES = new Set([
  "GENERAL_INQUIRY",
  "CALLBACK_REQUEST",
  "PARTNER_ORGANIZATION"
]);

const DEPARTMENT_CODES = new Set([
  "HISTORICAL_RECORDS",
  "PENSION_BENEFITS",
  "RESETTLEMENT_EMPLOYMENT",
  "WELFARE_ASSISTANCE",
  "OUTREACH_COMMUNICATION"
]);

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function cleanOptionalText(value, maxLength) {
  const normalized = cleanText(value, maxLength);
  return normalized || null;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function validateDepartmentCode(value) {
  const code = cleanText(value, 60).toUpperCase();
  return DEPARTMENT_CODES.has(code) ? code : "";
}

function sanitizeGeneralInquiry(formData) {
  const fullName = cleanText(formData.fullName, 180);
  const email = cleanText(formData.email, 180).toLowerCase();
  const phone = cleanOptionalText(formData.phone, 40);
  const audience = cleanOptionalText(formData.audience, 80);
  const departmentCode = validateDepartmentCode(formData.departmentCode) || "OUTREACH_COMMUNICATION";
  const subject = cleanText(formData.subject, 180);
  const message = cleanText(formData.message, 5000);

  if (!fullName) {
    return { error: "Full name is required." };
  }

  if (!email || !isValidEmail(email)) {
    return { error: "A valid email address is required." };
  }

  if (!subject) {
    return { error: "Subject is required." };
  }

  if (message.length < 12) {
    return { error: "Please add a little more detail to your message." };
  }

  return {
    departmentCode,
    email,
    summary: subject,
    payload: {
      fullName,
      email,
      phone,
      audience,
      subject,
      message
    }
  };
}

function sanitizeCallbackRequest(formData) {
  const fullName = cleanText(formData.fullName, 180);
  const phone = cleanText(formData.phone, 40);
  const email = cleanOptionalText(formData.email, 180)?.toLowerCase() || null;
  const departmentCode = validateDepartmentCode(formData.departmentCode) || "OUTREACH_COMMUNICATION";
  const callbackWindow = cleanText(formData.callbackWindow, 120);
  const serviceNumber = cleanOptionalText(formData.serviceNumber, 30);
  const reason = cleanText(formData.reason, 180);
  const message = cleanText(formData.message, 5000);

  if (!fullName) {
    return { error: "Full name is required." };
  }

  if (!phone) {
    return { error: "Phone number is required for callback requests." };
  }

  if (email && !isValidEmail(email)) {
    return { error: "If you include an email address, it must be valid." };
  }

  if (!reason) {
    return { error: "Reason for callback is required." };
  }

  if (message.length < 12) {
    return { error: "Please add the key details for the callback request." };
  }

  return {
    departmentCode,
    email,
    summary: reason,
    payload: {
      fullName,
      phone,
      email,
      callbackWindow,
      serviceNumber,
      reason,
      message
    }
  };
}

function sanitizePartnerOrganization(formData) {
  const organizationName = cleanText(formData.organizationName, 180);
  const contactPerson = cleanText(formData.contactPerson, 180);
  const email = cleanText(formData.email, 180).toLowerCase();
  const phone = cleanOptionalText(formData.phone, 40);
  const website = cleanOptionalText(formData.website, 255);
  const departmentCode = validateDepartmentCode(formData.departmentCode) || "OUTREACH_COMMUNICATION";
  const partnershipType = cleanText(formData.partnershipType, 120);
  const message = cleanText(formData.message, 5000);

  if (!organizationName) {
    return { error: "Organization name is required." };
  }

  if (!contactPerson) {
    return { error: "Contact person is required." };
  }

  if (!email || !isValidEmail(email)) {
    return { error: "A valid email address is required." };
  }

  if (!partnershipType) {
    return { error: "Partnership type is required." };
  }

  if (message.length < 12) {
    return { error: "Please add the partnership details or enquiry." };
  }

  return {
    departmentCode,
    email,
    summary: `${organizationName} - ${partnershipType}`,
    payload: {
      organizationName,
      contactPerson,
      email,
      phone,
      website,
      partnershipType,
      message
    }
  };
}

function sanitizeSubmission(contactType, formData) {
  const normalizedType = cleanText(contactType, 80).toUpperCase();

  if (!CONTACT_TYPES.has(normalizedType)) {
    return { error: "Contact form type is invalid." };
  }

  switch (normalizedType) {
    case "GENERAL_INQUIRY":
      return { contactType: normalizedType, ...sanitizeGeneralInquiry(formData) };
    case "CALLBACK_REQUEST":
      return { contactType: normalizedType, ...sanitizeCallbackRequest(formData) };
    case "PARTNER_ORGANIZATION":
      return { contactType: normalizedType, ...sanitizePartnerOrganization(formData) };
    default:
      return { error: "Contact form type is invalid." };
  }
}

function sanitizeVeteransIdApplication(formData) {
  const applicationType = cleanText(formData.application_type, 40);
  const surname = cleanText(formData.surname, 100);
  const rank = cleanOptionalText(formData.rank, 80);
  const fullName = cleanText(formData.full_name, 180);
  const gender = cleanText(formData.gender, 20);
  const dateOfBirth = cleanText(formData.date_of_birth, 20);
  const enlistmentDate = cleanOptionalText(formData.enlistment_date, 20);
  const dischargeDate = cleanOptionalText(formData.discharge_date, 20);
  const totalService = cleanOptionalText(formData.total_service, 80);
  const terminationReason = cleanOptionalText(formData.termination_reason, 180);
  const serviceNumber = cleanOptionalText(formData.service_number, 30);
  const referenceNumber = cleanOptionalText(formData.reference_number, 80);
  const bloodGroup = cleanOptionalText(formData.blood_group, 10);
  const identificationType = cleanText(formData.identification_type, 80);
  const phone = cleanText(formData.phone, 40);
  const email = cleanOptionalText(formData.email, 180)?.toLowerCase() || null;
  const homeAddress = cleanText(formData.home_address, 500);
  const signatureName = cleanText(formData.signature_name, 180);
  const applicationDate = cleanText(formData.application_date, 20);
  const notes = cleanOptionalText(formData.notes, 1000);
  const allowedApplicationTypes = new Set(["New", "Replacement", "Stolen", "Lost"]);
  const allowedGenders = new Set(["Male", "Female"]);

  if (!allowedApplicationTypes.has(applicationType)) {
    return { error: "Choose a valid application type." };
  }

  if (!surname) {
    return { error: "Surname is required." };
  }

  if (!fullName) {
    return { error: "Forenames are required." };
  }

  if (!allowedGenders.has(gender)) {
    return { error: "Choose a valid gender." };
  }

  if (!dateOfBirth) {
    return { error: "Date of birth is required." };
  }

  if (!identificationType) {
    return { error: "Type of identification is required." };
  }

  if (!phone) {
    return { error: "Telephone number is required." };
  }

  if (email && !isValidEmail(email)) {
    return { error: "If you include an email address, it must be valid." };
  }

  if (!homeAddress) {
    return { error: "Home address is required." };
  }

  if (!signatureName) {
    return { error: "Applicant signature or typed name is required." };
  }

  if (!applicationDate) {
    return { error: "Application date is required." };
  }

  return {
    email,
    serviceNumber,
    payload: {
      application_type: applicationType,
      surname,
      rank,
      full_name: fullName,
      gender,
      date_of_birth: dateOfBirth,
      enlistment_date: enlistmentDate,
      discharge_date: dischargeDate,
      total_service: totalService,
      termination_reason: terminationReason,
      service_number: serviceNumber,
      reference_number: referenceNumber,
      blood_group: bloodGroup,
      identification_type: identificationType,
      phone,
      email,
      home_address: homeAddress,
      declaration:
        "I, the undersigned, apply for the issue of a Veterans Identification Access and Medical Card. I declare that the information given in this application is correct and to the best of my knowledge and belief.",
      signature_name: signatureName,
      application_date: applicationDate,
      notes
    }
  };
}

router.post(
  "/contact-submissions",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { contactType, formData } = req.body || {};

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "Contact form data is required." });
    }

    const submission = sanitizeSubmission(contactType, formData);

    if (submission.error || !submission.payload || !submission.departmentCode || !submission.contactType) {
      return res.status(400).json({ message: submission.error || "Contact submission is invalid." });
    }

    const result = await transaction(async (connection) => {
      const [departmentRows] = await connection.execute(
        `SELECT department_id, department_name
        FROM departments
        WHERE department_code = ?
          AND is_active = 1
        LIMIT 1`,
        [submission.departmentCode]
      );

      const department = departmentRows[0];

      if (!department) {
        return {
          statusCode: 400,
          body: { message: "Selected contact lane is not available right now." }
        };
      }

      const publicUuid = randomUUID();
      const encryptedPayload = encryptJson({
        ...submission.payload,
        contactType: submission.contactType,
        departmentCode: submission.departmentCode,
        departmentName: department.department_name,
        submittedByAuthenticatedUser: Boolean(req.user),
        submittedAt: new Date().toISOString()
      });

      const [insertResult] = await connection.execute(
        `INSERT INTO public_contact_submissions (
          public_uuid,
          submitted_by_user_id,
          routing_department_id,
          contact_type,
          status,
          email_lookup_hash,
          payload_ciphertext,
          payload_iv,
          payload_tag,
          key_version,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 'NEW', ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          publicUuid,
          req.user?.userId || null,
          department.department_id,
          submission.contactType,
          submission.email ? emailLookupHash(submission.email) : null,
          encryptedPayload.ciphertext,
          encryptedPayload.iv,
          encryptedPayload.tag,
          encryptedPayload.keyVersion
        ]
      );

      await writeAudit(connection, {
        actorUserId: req.user?.userId || null,
        actorRoleId: req.user?.roleId || null,
        actorDepartmentId: req.user?.departments?.[0]?.departmentId || null,
        eventCode: "PUBLIC_CONTACT_SUBMISSION_CREATED",
        entityType: "PUBLIC_CONTACT_SUBMISSION",
        entityId: insertResult.insertId,
        targetUserId: req.user?.userId || null,
        summary: `Created public contact submission ${submission.contactType} for ${department.department_name}.`
      });

      return {
        statusCode: 201,
        body: {
          message: "Your contact form was submitted successfully.",
          publicUuid
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

router.post(
  "/veterans-id-applications",
  optionalAuth,
  asyncHandler(async (req, res) => {
    const { formData } = req.body || {};

    if (!formData || typeof formData !== "object") {
      return res.status(400).json({ message: "Veteran ID application data is required." });
    }

    const application = sanitizeVeteransIdApplication(formData);

    if (application.error || !application.payload) {
      return res.status(400).json({ message: application.error || "Veteran ID application is invalid." });
    }

    const result = await transaction(async (connection) => {
      const [departmentRows] = await connection.execute(
        `SELECT department_id, department_name
        FROM departments
        WHERE department_code = 'WELFARE_ASSISTANCE'
          AND is_active = 1
        LIMIT 1`
      );

      const department = departmentRows[0];

      if (!department) {
        return {
          statusCode: 400,
          body: { message: "Veteran ID applications are not available right now." }
        };
      }

      const publicUuid = randomUUID();
      const encryptedPayload = encryptJson({
        ...application.payload,
        requestTypeCode: "VETERANS_ID_APPLICATION",
        requestTypeName: "Veterans ID Application",
        departmentCode: "WELFARE_ASSISTANCE",
        departmentName: department.department_name,
        submittedByAuthenticatedUser: Boolean(req.user),
        submittedAt: new Date().toISOString()
      });

      const [insertResult] = await connection.execute(
        `INSERT INTO public_veterans_id_applications (
          public_uuid,
          routing_department_id,
          status,
          email_lookup_hash,
          service_number_lookup_hash,
          payload_ciphertext,
          payload_iv,
          payload_tag,
          key_version,
          submitted_by_user_id,
          created_at,
          updated_at
        ) VALUES (?, ?, 'NEW', ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
        [
          publicUuid,
          department.department_id,
          application.email ? emailLookupHash(application.email) : null,
          application.serviceNumber ? regimentalLookupHash(application.serviceNumber) : null,
          encryptedPayload.ciphertext,
          encryptedPayload.iv,
          encryptedPayload.tag,
          encryptedPayload.keyVersion,
          req.user?.userId || null
        ]
      );

      await writeAudit(connection, {
        actorUserId: req.user?.userId || null,
        actorRoleId: req.user?.roleId || null,
        actorDepartmentId: req.user?.departments?.[0]?.departmentId || department.department_id,
        eventCode: "PUBLIC_VETERANS_ID_APPLICATION_CREATED",
        entityType: "PUBLIC_VETERANS_ID_APPLICATION",
        entityId: insertResult.insertId,
        targetUserId: req.user?.userId || null,
        summary: `Created public Veteran ID application for ${department.department_name}.`
      });

      return {
        statusCode: 201,
        body: {
          message: "Veteran ID application submitted successfully.",
          publicUuid
        }
      };
    });

    return res.status(result.statusCode).json(result.body);
  })
);

module.exports = router;
