import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import {
  AuditLogItem,
  IdentityVerificationItem,
  ManagedUserSummary,
  NotificationItem,
  PaymentReceiptSummary,
  PendingStaffUser,
  RequestDetail,
  RequestSummary
} from "../../models/app.models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class RequestsService {
  constructor(private readonly api: ApiService) {}

  createRequest(requestTypeCode: string, formData: Record<string, unknown>) {
    return this.api.post<{ requestId: number; publicUuid: string }>("/requests", {
      requestTypeCode,
      formData
    });
  }

  getMyRequests(): Observable<{ requests: RequestSummary[] }> {
    return this.api.get<{ requests: RequestSummary[] }>("/requests/mine");
  }

  getRequestDetail(requestId: number): Observable<{ request: RequestDetail }> {
    return this.api.get<{ request: RequestDetail }>(`/requests/${requestId}`);
  }

  uploadAttachment(requestId: number, file: File, attachmentType = "SUPPORTING_DOCUMENT") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("attachmentType", attachmentType);
    return this.api.postForm<{ attachmentId: number }>(`/requests/${requestId}/attachments`, formData);
  }

  uploadPaymentReceipt(requestId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.api.postForm<{ paymentReceiptId: number }>(`/requests/${requestId}/payment-receipts`, formData);
  }

  downloadAttachment(requestId: number, attachmentId: number) {
    return this.api.getBlob(`/requests/${requestId}/attachments/${attachmentId}/download`);
  }

  getNotifications(): Observable<{ notifications: NotificationItem[] }> {
    return this.api.get<{ notifications: NotificationItem[] }>("/requests/notifications/inbox");
  }

  getMyIdentityVerifications(): Observable<{ identityVerifications: IdentityVerificationItem[] }> {
    return this.api.get<{ identityVerifications: IdentityVerificationItem[] }>("/requests/identity-verifications");
  }

  startIdentityVerification() {
    return this.api.post<{ message: string; verificationRequestId: number }>("/requests/identity-verifications", {});
  }

  uploadIdentityVerificationFile(verificationRequestId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.api.postForm<{ message: string; verificationFileId: number }>(
      `/requests/identity-verifications/${verificationRequestId}/files`,
      formData
    );
  }

  downloadIdentityVerificationFile(verificationRequestId: number, fileId: number) {
    return this.api.getBlob(`/requests/identity-verifications/${verificationRequestId}/files/${fileId}/download`);
  }

  markNotificationRead(notificationId: number) {
    return this.api.patch<{ message: string }>(`/requests/notifications/${notificationId}/read`, {});
  }

  getStaffQueue(): Observable<{ requests: RequestSummary[] }> {
    return this.api.get<{ requests: RequestSummary[] }>("/staff/queue");
  }

  updateRequestStatus(requestId: number, statusCode: string) {
    return this.api.patch<{ message: string }>(`/staff/requests/${requestId}/status`, { statusCode });
  }

  createOutput(payload: {
    requestId: number;
    outputCode: string;
    outputName: string;
    outputKind: string;
    outputStatus: string;
    pickupLocation?: string;
  }) {
    return this.api.post<{ outputId: number }>(`/staff/requests/${payload.requestId}/outputs`, payload);
  }

  getPaymentReceipts() {
    return this.api.get<{ receipts: PaymentReceiptSummary[] }>("/staff/payment-receipts");
  }

  getIdentityVerificationQueue() {
    return this.api.get<{ identityVerifications: IdentityVerificationItem[] }>("/staff/identity-verifications");
  }

  reviewIdentityVerification(verificationRequestId: number, decision: "APPROVED" | "REJECTED", note = "") {
    return this.api.patch<{ message: string }>(`/staff/identity-verifications/${verificationRequestId}/review`, {
      decision,
      note
    });
  }

  reviewPaymentReceipt(paymentReceiptId: number, decision: "ACCEPTED" | "REJECTED", pickupLocation?: string) {
    return this.api.patch<{ message: string; outputId?: number }>(
      `/staff/payment-receipts/${paymentReceiptId}/review`,
      { decision, pickupLocation }
    );
  }

  getPendingStaff() {
    return this.api.get<{ pendingStaff: PendingStaffUser[] }>("/admin/staff/pending");
  }

  approveStaff(userId: number, roleCode: string, departmentIds: number[], primaryDepartmentId: number) {
    return this.api.patch<{ message: string }>(`/admin/staff/${userId}/approve`, {
      roleCode,
      departmentIds,
      primaryDepartmentId
    });
  }

  rejectStaff(userId: number, reason: string) {
    return this.api.patch<{ message: string }>(`/admin/staff/${userId}/reject`, { reason });
  }

  getAuditLogs() {
    return this.api.get<{ auditLogs: AuditLogItem[] }>("/admin/audit-logs");
  }

  getManagedUsers() {
    return this.api.get<{ users: ManagedUserSummary[] }>("/admin/users");
  }

  updateManagedUser(userId: number, payload: {
    roleCode: string;
    isActive: boolean;
    departmentIds?: number[];
    primaryDepartmentId?: number | null;
  }) {
    return this.api.patch<{ message: string; user: ManagedUserSummary | null }>(`/admin/users/${userId}`, payload);
  }
}
