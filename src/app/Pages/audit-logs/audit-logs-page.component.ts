import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { RequestsService } from "../../core/services/requests.service";
import { AuditLogItem, CurrentUser } from "../../models/app.models";

@Component({
  selector: "app-audit-logs-page",
  templateUrl: "./audit-logs-page.component.html",
  styleUrls: ["./audit-logs-page.component.css"]
})
export class AuditLogsPageComponent implements OnInit {
  currentUser: CurrentUser | null = null;
  auditLogs: AuditLogItem[] = [];
  searchTerm = "";
  loading = false;
  feedback = "";
  error = "";

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly requestsService: RequestsService
  ) {}

  ngOnInit(): void {
    if (this.auth.currentUser) {
      this.handleUser(this.auth.currentUser);
    } else if (this.auth.getToken()) {
      this.auth.loadCurrentUser().subscribe({
        next: (user) => {
          if (!user) {
            this.router.navigate(["/auth"], { queryParams: { mode: "login" } });
          }
        }
      });
    } else {
      this.router.navigate(["/auth"], { queryParams: { mode: "login" } });
    }

    this.auth.user$.subscribe((user) => {
      this.handleUser(user);
    });
  }

  get filteredAuditLogs(): AuditLogItem[] {
    const query = this.searchTerm.trim().toLowerCase();

    if (!query) {
      return this.auditLogs;
    }

    return this.auditLogs.filter((item) =>
      [
        this.actorName(item),
        item.actor_role_name || "",
        item.event_code,
        item.entity_type,
        item.summary,
        item.target_display_name || ""
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  reloadLogs(): void {
    if (!this.currentUser || !this.canOpenPage(this.currentUser)) {
      return;
    }

    this.loading = true;
    this.error = "";

    this.requestsService.getAuditLogs().subscribe({
      next: ({ auditLogs }) => {
        this.auditLogs = auditLogs;
        this.loading = false;
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to load audit logs right now.";
        this.loading = false;
      }
    });
  }

  actorName(item: AuditLogItem): string {
    return item.actor_display_name || item.actor_full_name || "System";
  }

  humanizeCode(value: string | null | undefined): string {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private handleUser(user: CurrentUser | null): void {
    this.currentUser = user;

    if (!user) {
      return;
    }

    if (!this.canOpenPage(user)) {
      this.router.navigate(["/dashboard"]);
      return;
    }

    if (!this.auditLogs.length && !this.loading) {
      this.reloadLogs();
    }
  }

  private canOpenPage(user: CurrentUser): boolean {
    return ["QM", "DIRECTOR", "MAIN_ADMIN"].includes(user.roleCode);
  }
}
