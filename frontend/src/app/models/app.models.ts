export interface UserDepartment {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  accessLevel: string;
  isPrimary: boolean;
}

export interface CurrentUser {
  userId: number;
  publicUuid: string;
  accountType: "VETERAN" | "STAFF";
  roleCode: string;
  roleName: string;
  staffApprovalStatus: string;
  isEmailVerified: boolean;
  isIdentityVerified: boolean;
  hasProfileImage: boolean;
  displayName: string;
  fullName: string;
  email: string;
  rank: string;
  regimentalNumber: string;
  serviceBranch: "JDF" | "JCA";
  departments: UserDepartment[];
}

export interface Department {
  department_id: number;
  department_code: string;
  department_name: string;
}

export interface RoleOption {
  role_id: number;
  role_code: string;
  role_name: string;
  is_staff_role: number;
}

export interface LookupStatus {
  status_code: string;
  status_name: string;
  display_order: number;
  indicates_ready_for_pickup: number;
}

export interface RequestType {
  request_type_id: number;
  request_type_code: string;
  request_type_name: string;
  default_department_id: number;
  requires_identity_verification: number;
  produces_pickup_item: number;
  output_kind: string;
}

export interface NotificationItem {
  notificationId: number;
  requestId: number | null;
  outputId: number | null;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface RequestSummary {
  request_id?: number;
  requestId?: number;
  public_uuid?: string;
  publicUuid?: string;
  request_type_code?: string;
  requestTypeCode?: string;
  request_type_name?: string;
  requestTypeName?: string;
  department_code?: string;
  departmentCode?: string;
  department_name?: string;
  departmentName?: string;
  status_code?: string;
  statusCode?: string;
  status_name?: string;
  statusName?: string;
  priority: string;
  pickup_required?: boolean;
  pickupRequired?: boolean;
  submitted_at?: string;
  submittedAt?: string;
  updated_at?: string;
  updatedAt?: string;
  requester_user_id?: number;
  requesterUserId?: number;
  requester_display_name?: string | null;
  requesterDisplayName?: string | null;
  requester_full_name?: string | null;
  requesterFullName?: string | null;
}

export interface RequestDetail {
  requestId: number;
  publicUuid: string;
  requesterUserId: number;
  requesterDisplayName?: string | null;
  requesterFullName?: string | null;
  requesterEmail?: string | null;
  requestTypeCode: string;
  requestTypeName: string;
  departmentCode: string;
  departmentName: string;
  owningDepartmentId: number;
  statusCode: string;
  statusName: string;
  priority: string;
  requiresIdentityVerification?: boolean;
  identityVerified?: boolean;
  payload: Record<string, unknown>;
  history: Array<Record<string, unknown>>;
  outputs: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown>>;
}

export interface IdentityVerificationFile {
  verificationFileId: number;
  relativePath: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedAt: string;
  isActive: boolean;
  originalFileName: string;
}

export interface IdentityVerificationItem {
  verificationRequestId: number;
  userId: number;
  relatedRequestId: number | null;
  relatedRequestUuid?: string | null;
  verificationType: "ACCOUNT_VERIFICATION" | "SERVICE_ISSUANCE";
  status: string;
  requestedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  expiresAt: string | null;
  reviewNote?: string;
  owningDepartmentId?: number | null;
  departmentCode?: string | null;
  departmentName?: string | null;
  requestTypeCode?: string | null;
  requestTypeName?: string | null;
  requesterDisplayName?: string;
  requesterFullName?: string;
  requesterEmail?: string;
  files: IdentityVerificationFile[];
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface RequestFieldConfig {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea" | "select" | "date";
  required?: boolean;
  placeholder?: string;
  rows?: number;
  options?: FieldOption[];
}

export interface RequestFormConfig {
  title: string;
  description: string;
  buttonLabel: string;
  fields: RequestFieldConfig[];
  defaultRequestTypeCode?: string;
  resolveRequestTypeCode?: (value: Record<string, unknown>) => string;
}

export interface PendingStaffUser {
  user_id: number;
  public_uuid: string;
  staff_approval_status: string;
  requested_primary_department_id: number | null;
  department_code: string | null;
  department_name: string | null;
  display_name: string;
  full_name: string;
  email: string;
  rank: string;
  regimental_number: string;
}

export interface ManagedUserSummary {
  user_id: number;
  public_uuid: string;
  account_type: "VETERAN" | "STAFF";
  staff_approval_status: string;
  is_active: boolean;
  is_email_verified: boolean;
  is_identity_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  role_code: string;
  role_name: string;
  display_name: string;
  full_name: string;
  email: string;
  rank: string;
  regimental_number: string;
  departments: UserDepartment[];
  can_manage: boolean;
}

export interface PaymentReceiptSummary {
  payment_receipt_id: number;
  request_id: number;
  attachment_id: number;
  receipt_status: string;
  created_at: string;
  relative_path: string;
  request_uuid: string;
}

export interface PublicVeteransIdApplication {
  publicIdApplicationId: number;
  publicUuid: string;
  routingDepartmentId: number;
  departmentCode: string;
  departmentName: string;
  status: string;
  assignedToUserId: number | null;
  reviewedByUserId: number | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
}

export interface AuditLogItem {
  audit_log_id: number;
  actor_user_id: number | null;
  actor_display_name?: string | null;
  actor_full_name?: string | null;
  actor_role_name?: string | null;
  event_code: string;
  entity_type: string;
  entity_id: number | null;
  request_id: number | null;
  target_user_id: number | null;
  target_display_name?: string | null;
  summary: string;
  occurred_at: string;
}

export interface PortalEvent {
  portal_event_id?: number;
  eventId?: number;
  title: string;
  summary: string;
  location: string;
  event_date?: string;
  eventDate?: string;
  details_route?: string;
  detailsRoute?: string;
  cta_label?: string;
  ctaLabel?: string;
  banner_message?: string | null;
  bannerMessage?: string | null;
  is_published?: number | boolean;
  isPublished?: number | boolean;
  show_in_banner?: number | boolean;
  showInBanner?: number | boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PortalEventsFeed {
  events: PortalEvent[];
  bannerEvent: PortalEvent | null;
}

export interface EmploymentJobListing {
  employment_job_listing_id?: number;
  jobId?: number;
  public_uuid?: string;
  publicUuid?: string;
  job_title?: string;
  jobTitle?: string;
  organization_name?: string;
  organizationName?: string;
  job_description?: string;
  jobDescription?: string;
  qualifications_text?: string | null;
  qualificationsText?: string | null;
  how_to_apply?: string;
  howToApply?: string;
  is_active?: number | boolean;
  isActive?: number | boolean;
  posted_at?: string;
  postedAt?: string;
  updated_at?: string;
  updatedAt?: string;
  closed_at?: string | null;
  closedAt?: string | null;
}

export interface GalleryImage {
  galleryImageId?: number;
  gallery_image_id?: number;
  publicUuid?: string;
  public_uuid?: string;
  title: string;
  caption?: string | null;
  altText?: string;
  alt_text?: string;
  activityDate?: string | null;
  activity_date?: string | null;
  isPublished?: boolean | number;
  is_published?: boolean | number;
  isFeatured?: boolean | number;
  is_featured?: boolean | number;
  imageRoute?: string;
  image_route?: string;
  imageUrl?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface PortalPageConfig {
  key: string;
  eyebrow: string;
  title: string;
  lead: string;
  tags: string[];
  highlights: string[];
  serviceCards: Array<{
    kicker: string;
    title: string;
    description: string;
  }>;
  requestForm?: RequestFormConfig;
  tables?: Array<{
    title: string;
    columns: string[];
    rows: string[][];
  }>;
  ctaTitle?: string;
  ctaBody?: string;
}
