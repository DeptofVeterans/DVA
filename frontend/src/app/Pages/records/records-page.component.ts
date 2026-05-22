import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { PortalContentService } from "../../core/services/portal-content.service";
import { RequestFormConfig } from "../../models/app.models";

interface RecordCategory {
  name: string;
  count: number;
  detail: string;
  tone: "gold" | "green" | "blue" | "ink" | "sand" | "olive";
  icon: "archive" | "file-check" | "certificate" | "briefcase" | "clipboard" | "bell";
}

interface RecordRequestRow {
  name: string;
  note: string;
  meta: string;
  type: string;
}

@Component({
  selector: "app-records-page",
  templateUrl: "./records-page.component.html",
  styleUrls: ["./records-page.component.css"]
})
export class RecordsPageComponent implements OnInit {
  searchQuery = "";
  showRequestModal = false;
  readonly recordsFormConfig?: RequestFormConfig;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly content: PortalContentService
  ) {
    this.recordsFormConfig = this.content.getRequestForm("records");
  }

  readonly recordCategories: RecordCategory[] = [
    {
      name: "Military Service Records",
      count: 1,
      detail: "Full service record extracts and historical file review requests.",
      tone: "ink",
      icon: "archive"
    },
    {
      name: "Certificate of Service",
      count: 2,
      detail: "Officer and Blue Book certificate paths are prepared separately.",
      tone: "green",
      icon: "file-check"
    },
    {
      name: "Certificate of Commendation",
      count: 1,
      detail: "Used when discharge conduct and commendation support apply.",
      tone: "gold",
      icon: "certificate"
    },
    {
      name: "Employment Letters",
      count: 1,
      detail: "Confirmation of Employment requests for named organizations.",
      tone: "blue",
      icon: "briefcase"
    },
    {
      name: "Required Details",
      count: 5,
      detail: "Service number, organization, name, email, and phone stay essential.",
      tone: "sand",
      icon: "clipboard"
    },
    {
      name: "Follow-up Alerts",
      count: 2,
      detail: "Status changes and pickup-ready outputs stay visible in the dashboard.",
      tone: "olive",
      icon: "bell"
    }
  ];

  readonly commonRequests: RecordRequestRow[] = [
    {
      name: "Military Service Records",
      note: "Use when a full service record extract or historical review is needed.",
      meta: "Records lane",
      type: "Records"
    },
    {
      name: "Certificate of Service (Officers)",
      note: "Use the officer certificate route when the service record calls for the officer format.",
      meta: "Named certificate",
      type: "PDF"
    },
    {
      name: "Certificate of Service (Blue Book)",
      note: "Use the Blue Book lane for the enlisted certificate path shown on the role board.",
      meta: "Named certificate",
      type: "PDF"
    },
    {
      name: "Certificate of Commendation",
      note: "Used for enlisted ranks whose discharge conduct supports commendation preparation.",
      meta: "Commendation support",
      type: "Certificate"
    },
    {
      name: "Confirmation of Employment Letter",
      note: "Include service number, organization to be addressed to, name, email, and phone number.",
      meta: "Employment letter",
      type: "Letter"
    }
  ];

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(() => {
      this.syncRequestModalFromRoute();
    });
  }

  get filteredCategories(): RecordCategory[] {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      return this.recordCategories;
    }

    return this.recordCategories.filter((item) =>
      [item.name, item.detail, String(item.count)].join(" ").toLowerCase().includes(query)
    );
  }

  get filteredRequests(): RecordRequestRow[] {
    const query = this.searchQuery.trim().toLowerCase();

    if (!query) {
      return this.commonRequests;
    }

    return this.commonRequests.filter((item) =>
      [item.name, item.note, item.meta, item.type].join(" ").toLowerCase().includes(query)
    );
  }

  get hasNoMatches(): boolean {
    return !!this.searchQuery.trim() && !this.filteredCategories.length && !this.filteredRequests.length;
  }

  openRequestModal(): void {
    if (!this.recordsFormConfig) {
      return;
    }

    if (!this.auth.isAuthenticated) {
      this.redirectToAuthForRequest();
      return;
    }

    this.showRequestModal = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { openForm: 1 },
      queryParamsHandling: "merge",
      replaceUrl: true
    });
  }

  closeRequestModal(): void {
    this.showRequestModal = false;

    if (this.route.snapshot.queryParamMap.has("openForm")) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { openForm: null },
        queryParamsHandling: "merge",
        replaceUrl: true
      });
    }
  }

  @HostListener("document:keydown.escape")
  onEscapePressed(): void {
    if (this.showRequestModal) {
      this.closeRequestModal();
    }
  }

  private syncRequestModalFromRoute(): void {
    const wantsOpenForm = Boolean(this.recordsFormConfig && this.route.snapshot.queryParamMap.get("openForm") === "1");

    if (wantsOpenForm && !this.auth.isAuthenticated) {
      this.showRequestModal = false;
      this.redirectToAuthForRequest();
      return;
    }

    this.showRequestModal = wantsOpenForm;
  }

  private redirectToAuthForRequest(): void {
    const redirectTo = this.router.serializeUrl(
      this.router.createUrlTree([], {
        relativeTo: this.route,
        queryParams: { openForm: 1 },
        queryParamsHandling: "merge"
      })
    );

    this.router.navigate(["/signin"], {
      queryParams: {
        mode: "login",
        redirectTo
      }
    });
  }
}
