import { Component, HostListener, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import {
  AuditLogItem,
  CurrentUser,
  Department,
  IdentityVerificationItem,
  LookupStatus,
  PendingStaffUser,
  PaymentReceiptSummary,
  RequestDetail,
  RequestSummary,
  RoleOption
} from "../../models/app.models";
import { AuthService } from "../../core/services/auth.service";
import { LookupBootstrap, LookupService } from "../../core/services/lookup.service";
import { RequestsService } from "../../core/services/requests.service";
import { buildVeteransIdApplicationPdf } from "../../core/utils/veterans-id-pdf";

interface ApprovalState {
  roleCode: string;
  departmentIds: number[];
  primaryDepartmentId: number | null;
}

interface RequestLane {
  key: string;
  requestTypeCode: string;
  requestTypeName: string;
  departmentName: string;
  requests: RequestSummary[];
}

@Component({
  selector: "app-dashboard-page",
  templateUrl: "./dashboard-page.component.html",
  styleUrls: ["./dashboard-page.component.css"]
})
export class DashboardPageComponent implements OnInit {
  currentUser: CurrentUser | null = null;
  lookup?: LookupBootstrap;
  requests: RequestSummary[] = [];
  requestLanes: RequestLane[] = [];
  selectedRequest: RequestDetail | null = null;
  paymentReceipts: PaymentReceiptSummary[] = [];
  identityVerifications: IdentityVerificationItem[] = [];
  identityVerificationQueue: IdentityVerificationItem[] = [];
  pendingStaff: PendingStaffUser[] = [];
  auditLogs: AuditLogItem[] = [];
  loading = false;
  detailLoading = false;
  openingRequestId: number | null = null;
  attachmentFile: File | null = null;
  paymentReceiptFile: File | null = null;
  identityFiles: Record<number, File | null> = {};
  identityReviewNotes: Record<number, string> = {};
  approvalState: Record<number, ApprovalState> = {};
  feedback = "";
  error = "";
  requestedRequestId: number | null = null;
  statusUpdateFeedback = "";
  statusUpdateError = "";
  outputFeedback = "";
  outputError = "";

  readonly statusForm = this.formBuilder.group({
    statusCode: ["UNDER_REVIEW", Validators.required]
  });

  readonly outputForm = this.formBuilder.group({
    outputCode: ["", Validators.required],
    outputName: ["", Validators.required],
    outputKind: ["LETTER", Validators.required],
    outputStatus: ["READY_FOR_PICKUP", Validators.required],
    pickupLocation: ["Department of Veterans Affairs", Validators.required]
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly formBuilder: FormBuilder,
    public readonly auth: AuthService,
    private readonly lookupService: LookupService,
    private readonly requestsService: RequestsService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const requestId = Number(params.get("request") || 0);
      this.requestedRequestId = requestId > 0 ? requestId : null;
      this.tryOpenRequestFromRoute();
    });

    this.lookupService.getBootstrap().subscribe({
      next: (lookup) => {
        this.lookup = lookup;
        this.currentUser = this.auth.currentUser;
        if (this.currentUser) {
          this.refreshDashboard();
        }
      }
    });

    this.auth.user$.subscribe((user) => {
      this.currentUser = user;
      if (user && this.lookup) {
        this.refreshDashboard();
      }
    });
  }

  get isVeteran(): boolean {
    return this.currentUser?.accountType === "VETERAN";
  }

  get isStaff(): boolean {
    return this.currentUser?.accountType === "STAFF";
  }

  get canApproveStaff(): boolean {
    return ["QM", "DIRECTOR", "MAIN_ADMIN"].includes(this.currentUser?.roleCode || "");
  }

  get canViewAudit(): boolean {
    return ["QM", "DIRECTOR", "MAIN_ADMIN"].includes(this.currentUser?.roleCode || "");
  }

  get canManageEvents(): boolean {
    return ["QM", "DIRECTOR", "MAIN_ADMIN"].includes(this.currentUser?.roleCode || "");
  }

  get canManageGallery(): boolean {
    return this.currentUser?.accountType === "STAFF";
  }

  get canManageUsers(): boolean {
    return ["DIRECTOR", "MAIN_ADMIN"].includes(this.currentUser?.roleCode || "");
  }

  get isAdminRole(): boolean {
    return ["QM", "DIRECTOR", "MAIN_ADMIN"].includes(this.currentUser?.roleCode || "");
  }

  get isWelfareStaff(): boolean {
    return Boolean(this.currentUser?.departments.some((department) => department.departmentCode === "WELFARE_ASSISTANCE"));
  }

  get canReviewAccountVerification(): boolean {
    return this.isAdminRole || this.isWelfareStaff;
  }

  get shouldShowIdentityVerification(): boolean {
    if (this.isVeteran) {
      return Boolean(!this.currentUser?.isIdentityVerified || this.identityVerifications.length);
    }

    if (!this.isStaff) {
      return false;
    }

    return this.canReviewAccountVerification || this.identityVerificationQueue.length > 0;
  }

  get hasOpenAccountVerification(): boolean {
    return this.identityVerifications.some(
      (item) =>
        item.verificationType === "ACCOUNT_VERIFICATION" &&
        ["PENDING_UPLOAD", "UPLOADED", "UNDER_REVIEW"].includes(item.status)
    );
  }

  get statuses(): LookupStatus[] {
    return this.lookup?.statuses || [];
  }

  get departments(): Department[] {
    return this.lookup?.departments || [];
  }

  get staffRoles(): RoleOption[] {
    return (this.lookup?.roles || []).filter((role) => role.is_staff_role === 1 && this.canAssignRole(role.role_code));
  }

  get pickupAlerts(): RequestSummary[] {
    return this.requests.filter((request) => (request.status_code || request.statusCode) === "READY_FOR_PICKUP");
  }

  get departmentSummary(): string {
    if (!this.currentUser?.departments.length) {
      return "Not assigned";
    }

    return this.currentUser.departments.map((department) => department.departmentName).join(", ");
  }

  requestCountLabel(count: number): string {
    return `${count} ${count === 1 ? "request" : "requests"}`;
  }

  get submittedInfoEntries(): Array<{ label: string; value: string }> {
    if (!this.selectedRequest) {
      return [];
    }

    if (this.useCompactIdRequestView) {
      const payload = this.selectedRequest.payload || {};
      const summaryFields: Array<{ key: string; label: string }> = [
        { key: "application_type", label: "Application Type" },
        { key: "surname", label: "Surname" },
        { key: "rank", label: "Rank" },
        { key: "full_name", label: "Full Name" },
        { key: "gender", label: "Gender" }
      ];

      return summaryFields.map((field) => ({
        label: field.label,
        value: this.formatValue(payload[field.key]) || "Not provided"
      }));
    }

    return Object.entries(this.selectedRequest.payload || {})
      .filter(([, value]) => value !== null && value !== "")
      .map(([key, value]) => ({
        label: this.formatKey(key),
        value: this.formatValue(value)
      }));
  }

  get useCompactIdRequestView(): boolean {
    return Boolean(
      this.selectedRequest?.requestTypeCode === "VETERANS_ID_APPLICATION" &&
      this.isStaff &&
      (this.isAdminRole || this.isWelfareStaff)
    );
  }

  get canOpenSelectedIdApplicationPdf(): boolean {
    return this.selectedRequest?.requestTypeCode === "VETERANS_ID_APPLICATION";
  }

  refreshDashboard(): void {
    if (!this.currentUser) {
      return;
    }

    this.loading = true;
    this.error = "";

    const primaryLoad = this.isVeteran
      ? this.requestsService.getMyRequests()
      : this.requestsService.getStaffQueue();

    primaryLoad.subscribe({
      next: ({ requests }) => {
        this.requests = requests;
        this.rebuildRequestLanes();
        this.loading = false;
        this.tryOpenRequestFromRoute();
      },
      error: (error) => {
        this.requests = [];
        this.requestLanes = [];
        this.error = error?.error?.message || "Unable to load dashboard requests.";
        this.loading = false;
      }
    });

    if (this.isStaff) {
      this.requestsService.getPaymentReceipts().subscribe({
        next: ({ receipts }) => {
          this.paymentReceipts = receipts;
        }
      });

      this.requestsService.getIdentityVerificationQueue().subscribe({
        next: ({ identityVerifications }) => {
          this.identityVerificationQueue = identityVerifications;
        }
      });
    }

    if (this.isVeteran) {
      this.requestsService.getMyIdentityVerifications().subscribe({
        next: ({ identityVerifications }) => {
          this.identityVerifications = identityVerifications;
        }
      });
    }

    if (this.canApproveStaff) {
      this.requestsService.getPendingStaff().subscribe({
        next: ({ pendingStaff }) => {
          this.pendingStaff = pendingStaff;
          pendingStaff.forEach((user) => {
            if (!this.approvalState[user.user_id]) {
              const departmentId = Number(user.requested_primary_department_id || this.departments[0]?.department_id || 0);
              this.approvalState[user.user_id] = {
                roleCode: "STAFF",
                departmentIds: departmentId ? [departmentId] : [],
                primaryDepartmentId: departmentId || null
              };
            }
          });
        }
      });
    }

  }

  openRequest(request: RequestSummary, preserveInlineActionStatus = false): void {
    const requestId = Number(request.request_id || request.requestId);
    this.openingRequestId = requestId;
    this.detailLoading = true;
    this.error = "";

    if (!preserveInlineActionStatus) {
      this.clearRequestActionStatus();
    }

    if (this.route.snapshot.queryParamMap.get("request") !== String(requestId)) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { request: requestId },
        queryParamsHandling: "merge",
        replaceUrl: true
      });
    }

    this.requestsService.getRequestDetail(requestId).subscribe({
      next: ({ request: detail }) => {
        this.selectedRequest = detail;
        this.detailLoading = false;
        this.openingRequestId = null;
        this.configureDefaultOutput(detail);
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to load request detail.";
        this.detailLoading = false;
        this.openingRequestId = null;
      }
    });
  }

  closeSelectedRequest(): void {
    this.selectedRequest = null;
    this.attachmentFile = null;
    this.paymentReceiptFile = null;
    this.error = "";
    this.detailLoading = false;
    this.openingRequestId = null;
    this.clearRequestActionStatus();

    if (this.route.snapshot.queryParamMap.has("request")) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { request: null },
        queryParamsHandling: "merge",
        replaceUrl: true
      });
    }
  }

  submitStatusUpdate(): void {
    this.statusUpdateFeedback = "";
    this.statusUpdateError = "";

    if (!this.selectedRequest || this.statusForm.invalid) {
      this.statusForm.markAllAsTouched();
      this.statusUpdateError = "Choose a valid status before updating.";
      return;
    }

    this.requestsService.updateRequestStatus(this.selectedRequest.requestId, String(this.statusForm.value.statusCode)).subscribe({
      next: ({ message }) => {
        this.statusUpdateFeedback = message;
        this.reloadSelectedRequest();
        this.refreshDashboard();
      },
      error: (error) => {
        this.statusUpdateError = error?.error?.message || "Unable to update the request status.";
      }
    });
  }

  submitOutput(): void {
    this.outputFeedback = "";
    this.outputError = "";

    if (!this.selectedRequest || this.outputForm.invalid) {
      this.outputForm.markAllAsTouched();
      this.outputError = "Complete the output fields before creating the output.";
      return;
    }

    this.requestsService.createOutput({
      requestId: this.selectedRequest.requestId,
      outputCode: String(this.outputForm.value.outputCode),
      outputName: String(this.outputForm.value.outputName),
      outputKind: String(this.outputForm.value.outputKind),
      outputStatus: String(this.outputForm.value.outputStatus),
      pickupLocation: String(this.outputForm.value.pickupLocation)
    }).subscribe({
      next: () => {
        this.outputFeedback = "Output recorded successfully.";
        this.reloadSelectedRequest();
        this.refreshDashboard();
      },
      error: (error) => {
        this.outputError = error?.error?.message || "Unable to create the request output.";
      }
    });
  }

  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.attachmentFile = input.files?.[0] || null;
  }

  onPaymentReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.paymentReceiptFile = input.files?.[0] || null;
  }

  onIdentityFileSelected(event: Event, verificationRequestId: number): void {
    const input = event.target as HTMLInputElement;
    this.identityFiles[verificationRequestId] = input.files?.[0] || null;
  }

  uploadSupportingDocument(): void {
    if (!this.selectedRequest || !this.attachmentFile) {
      return;
    }

    this.requestsService.uploadAttachment(this.selectedRequest.requestId, this.attachmentFile).subscribe({
      next: () => {
        this.feedback = "Supporting document uploaded successfully.";
        this.attachmentFile = null;
        this.reloadSelectedRequest();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to upload the supporting document.";
      }
    });
  }

  uploadFuneralReceipt(): void {
    if (!this.selectedRequest || !this.paymentReceiptFile) {
      return;
    }

    this.requestsService.uploadPaymentReceipt(this.selectedRequest.requestId, this.paymentReceiptFile).subscribe({
      next: () => {
        this.feedback = "Funeral payment receipt uploaded successfully.";
        this.paymentReceiptFile = null;
        this.refreshDashboard();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to upload the funeral payment receipt.";
      }
    });
  }

  startAccountVerification(): void {
    this.requestsService.startIdentityVerification().subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.requestsService.getMyIdentityVerifications().subscribe({
          next: ({ identityVerifications }) => {
            this.identityVerifications = identityVerifications;
          }
        });
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to start identity verification right now.";
      }
    });
  }

  uploadIdentityDocument(item: IdentityVerificationItem): void {
    const selectedFile = this.identityFiles[item.verificationRequestId];

    if (!selectedFile) {
      this.error = "Choose an identification image before uploading.";
      return;
    }

    this.requestsService.uploadIdentityVerificationFile(item.verificationRequestId, selectedFile).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.identityFiles[item.verificationRequestId] = null;
        this.refreshDashboard();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to upload the identity document.";
      }
    });
  }

  downloadIdentityVerificationFile(item: IdentityVerificationItem, fileId: number, fileName = "identity-document"): void {
    this.requestsService.downloadIdentityVerificationFile(item.verificationRequestId, fileId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error = "Unable to download the identity document.";
      }
    });
  }

  reviewIdentityVerification(item: IdentityVerificationItem, decision: "APPROVED" | "REJECTED"): void {
    this.requestsService
      .reviewIdentityVerification(item.verificationRequestId, decision, this.identityReviewNotes[item.verificationRequestId] || "")
      .subscribe({
        next: ({ message }) => {
          this.feedback = message;
          this.identityReviewNotes[item.verificationRequestId] = "";
          this.refreshDashboard();
        },
        error: (error) => {
          this.error = error?.error?.message || "Unable to review the identity verification request.";
        }
      });
  }

  downloadAttachment(requestId: number, attachmentId: number, fileName = "attachment"): void {
    this.requestsService.downloadAttachment(requestId, attachmentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.error = "Unable to download the attachment.";
      }
    });
  }

  async openSelectedIdApplicationPdf(): Promise<void> {
    if (!this.selectedRequest || this.selectedRequest.requestTypeCode !== "VETERANS_ID_APPLICATION") {
      return;
    }

    this.error = "";
    const previewWindow = window.open("", "_blank");

    try {
      const pdf = await buildVeteransIdApplicationPdf(this.selectedRequest.payload || {});
      const pdfUrl = pdf.output("bloburl").toString();

      if (previewWindow) {
        previewWindow.location.href = pdfUrl;
        previewWindow.focus();
        return;
      }

      pdf.save("veterans-id-application.pdf");
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }

      this.error = "Unable to open the Veteran ID application PDF right now.";
      console.error(error);
    }
  }

  toggleDepartment(userId: number, departmentId: number, checked: boolean): void {
    const state = this.approvalState[userId];

    if (!state) {
      return;
    }

    if (checked) {
      state.departmentIds = Array.from(new Set([...state.departmentIds, departmentId]));
      if (!state.primaryDepartmentId) {
        state.primaryDepartmentId = departmentId;
      }
    } else {
      state.departmentIds = state.departmentIds.filter((id) => id !== departmentId);
      if (state.primaryDepartmentId === departmentId) {
        state.primaryDepartmentId = state.departmentIds[0] || null;
      }
    }
  }

  approveStaff(user: PendingStaffUser): void {
    const state = this.approvalState[user.user_id];

    if (!state || !state.departmentIds.length || !state.primaryDepartmentId) {
      this.error = "Choose at least one department and a primary department before approval.";
      return;
    }

    this.requestsService.approveStaff(user.user_id, state.roleCode, state.departmentIds, state.primaryDepartmentId).subscribe({
      next: () => {
        this.feedback = `Approved ${user.display_name}.`;
        this.refreshDashboard();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to approve the staff account.";
      }
    });
  }

  rejectStaff(user: PendingStaffUser): void {
    this.requestsService.rejectStaff(user.user_id, "Rejected by administrator.").subscribe({
      next: () => {
        this.feedback = `Rejected ${user.display_name}.`;
        this.refreshDashboard();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to reject the staff account.";
      }
    });
  }

  reviewReceipt(receipt: PaymentReceiptSummary, decision: "ACCEPTED" | "REJECTED"): void {
    this.requestsService.reviewPaymentReceipt(receipt.payment_receipt_id, decision).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.refreshDashboard();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to review the payment receipt.";
      }
    });
  }

  @HostListener("document:keydown.escape")
  onEscapePressed(): void {
    if (this.selectedRequest || this.detailLoading) {
      this.closeSelectedRequest();
    }
  }

  departmentNameById(departmentId: number | null): string {
    if (!departmentId) {
      return "Select primary department";
    }

    return this.departments.find((department) => department.department_id === departmentId)?.department_name || `Department ${departmentId}`;
  }

  verificationLabel(item: IdentityVerificationItem): string {
    return item.verificationType === "ACCOUNT_VERIFICATION"
      ? "Account verification"
      : item.requestTypeName || "Service issuance verification";
  }

  requestReference(value: string | null | undefined): string {
    const code = String(value || "").trim();

    if (!code) {
      return "Reference pending";
    }

    return `Ref ${code.split("-")[0].toUpperCase()}`;
  }

  displayRequestCode(value: string | null | undefined): string {
    const code = String(value || "").trim();

    if (!code) {
      return "";
    }

    return code
      .split("-")
      .map((segment) => segment.toUpperCase())
      .join(" / ");
  }

  formattedRequestCode(value: string | null | undefined): string {
    return this.displayRequestCode(value);

    const code = String(value || "").trim();

    if (!code) {
      return "";
    }

    return code
      .split("-")
      .map((segment) => segment.toUpperCase())
      .join(" • ");
  }

  humanizeCode(value: string | null | undefined): string {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private reloadSelectedRequest(): void {
    if (!this.selectedRequest) {
      return;
    }

    this.openRequest(
      { requestId: this.selectedRequest.requestId, request_id: this.selectedRequest.requestId, priority: "NORMAL" },
      true
    );
  }

  private clearRequestActionStatus(): void {
    this.statusUpdateFeedback = "";
    this.statusUpdateError = "";
    this.outputFeedback = "";
    this.outputError = "";
  }

  private rebuildRequestLanes(): void {
    const lanes = new Map<string, RequestLane>();

    this.requests.forEach((request) => {
      const requestTypeCode = String(request.request_type_code || request.requestTypeCode || "GENERAL");
      const requestTypeName = String(request.request_type_name || request.requestTypeName || "Request");
      const departmentName = String(request.department_name || request.departmentName || "Department Queue");
      const lane = lanes.get(requestTypeCode);

      if (lane) {
        lane.requests.push(request);
        return;
      }

      lanes.set(requestTypeCode, {
        key: requestTypeCode,
        requestTypeCode,
        requestTypeName,
        departmentName,
        requests: [request]
      });
    });

    this.requestLanes = Array.from(lanes.values());
  }

  private tryOpenRequestFromRoute(): void {
    if (!this.requestedRequestId || !this.requests.length) {
      return;
    }

    if (this.openingRequestId === this.requestedRequestId) {
      return;
    }

    if (this.selectedRequest?.requestId === this.requestedRequestId) {
      return;
    }

    const match = this.requests.find((request) => Number(request.request_id || request.requestId) === this.requestedRequestId);

    if (match) {
      this.openRequest(match);
    }
  }

  private configureDefaultOutput(request: RequestDetail): void {
    const defaults: Record<string, { code: string; name: string; kind: string }> = {
      VETERANS_ID_APPLICATION: { code: "VETERANS_ID_CARD", name: "Veteran's ID Card", kind: "ID_CARD" },
      CONFIRMATION_OF_EMPLOYMENT_LETTER: { code: "CONFIRMATION_OF_EMPLOYMENT_LETTER", name: "Confirmation of Employment Letter", kind: "LETTER" },
      CERTIFICATE_OF_SERVICE_OFFICER: { code: "CERTIFICATE_OF_SERVICE_OFFICER", name: "Certificate of Service (Officers)", kind: "CERTIFICATE" },
      CERTIFICATE_OF_SERVICE_BLUE_BOOK: { code: "CERTIFICATE_OF_SERVICE_BLUE_BOOK", name: "Certificate of Service (Blue Book)", kind: "CERTIFICATE" },
      CERTIFICATE_OF_COMMENDATION: { code: "CERTIFICATE_OF_COMMENDATION", name: "Certificate of Commendation", kind: "CERTIFICATE" },
      FUNERAL_SUPPORT_REQUEST: { code: "FUNERAL_SUPPORT_LETTER", name: "Funeral Support Letter", kind: "LETTER" }
    };

    const fallback = { code: `${request.requestTypeCode}_OUTPUT`, name: `${request.requestTypeName} Output`, kind: "LETTER" };
    const config = defaults[request.requestTypeCode] || fallback;

    this.outputForm.patchValue({
      outputCode: config.code,
      outputName: config.name,
      outputKind: config.kind,
      outputStatus: "READY_FOR_PICKUP",
      pickupLocation: "Department of Veterans Affairs"
    });
    this.statusForm.patchValue({ statusCode: request.statusCode || "UNDER_REVIEW" });
  }

  private canAssignRole(roleCode: string): boolean {
    const actorRole = this.currentUser?.roleCode;

    if (actorRole === "MAIN_ADMIN") {
      return true;
    }

    if (actorRole === "DIRECTOR") {
      return roleCode !== "MAIN_ADMIN";
    }

    if (actorRole === "QM") {
      return !["MAIN_ADMIN", "DIRECTOR"].includes(roleCode);
    }

    return false;
  }

  private formatKey(value: string): string {
    return this.humanizeCode(value);
  }

  private formatValue(value: unknown): string {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (value && typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
