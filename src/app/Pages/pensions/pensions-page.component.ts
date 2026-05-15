import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { PortalContentService } from "../../core/services/portal-content.service";
import { RequestFormConfig } from "../../models/app.models";

interface BenefitSnapshot {
  label: string;
  value: string;
  note: string;
  tone: "gold" | "green";
}

interface BenefitLane {
  title: string;
  timing: string;
  detail: string;
  tone: "gold" | "green" | "ink" | "sand" | "olive";
}

interface SupportLink {
  title: string;
  detail: string;
  route: string;
  actionLabel: string;
}

@Component({
  selector: "app-pensions-page",
  templateUrl: "./pensions-page.component.html",
  styleUrls: ["./pensions-page.component.css"]
})
export class PensionsPageComponent implements OnInit {
  showRequestModal = false;
  readonly page = this.content.getPage("benefits");
  readonly benefitsFormConfig?: RequestFormConfig;

  readonly snapshots: BenefitSnapshot[] = [
    {
      label: "Pension and gratuity",
      value: "6 months before ROD",
      note: "Start these benefit applications before retirement on discharge so the file can be prepared in time.",
      tone: "gold"
    },
    {
      label: "Ex-Gratia",
      value: "At ROD",
      note: "Use the ex-gratia lane when the retirement on discharge point is reached.",
      tone: "green"
    }
  ];

  readonly preparationChecklist: string[] = [
    "Confirm whether the case is pension, gratuity, ex-gratia, disability benefit, or death benefit support.",
    "Have service history, retirement timing, and contact details ready before opening the intake form.",
    "Use records and certificates support when the benefits case depends on service verification."
  ];

  readonly benefitLanes: BenefitLane[] = [
    {
      title: "Pension",
      timing: "Before ROD",
      detail: "Use this lane for pension support tied to retirement service history and pre-ROD preparation.",
      tone: "ink"
    },
    {
      title: "Gratuity",
      timing: "Before ROD",
      detail: "Gratuity applications should be prepared within the same six-month window before ROD.",
      tone: "gold"
    },
    {
      title: "Ex-Gratia",
      timing: "At ROD",
      detail: "Open this lane when the case reaches retirement on discharge and ex-gratia support applies.",
      tone: "green"
    },
    {
      title: "Disability Benefit",
      timing: "Case review",
      detail: "Use this route when disability-related follow-up, documentation, or benefit support is needed.",
      tone: "sand"
    },
    {
      title: "Death Benefit",
      timing: "Family support",
      detail: "Families or representatives can use this lane when a death benefit case needs coordination and updates.",
      tone: "olive"
    }
  ];

  readonly supportLinks: SupportLink[] = [
    {
      title: "Records and certificates",
      detail: "Service records, certificates, and employment letters often support pension and gratuity cases.",
      route: "/records",
      actionLabel: "Open records"
    },
    {
      title: "Retirement roadmap",
      detail: "Use the roadmap page to understand what should happen before ROD, at ROD, and after service.",
      route: "/roadmap",
      actionLabel: "View roadmap"
    },
    {
      title: "Insurance after service",
      detail: "Veterans often move from benefits into retiree health and supplemental plan questions after service.",
      route: "/insurance",
      actionLabel: "Open insurance"
    },
    {
      title: "Secure status follow-up",
      detail: "After submission, request updates and pickup-ready notices stay visible in the private dashboard.",
      route: "/dashboard",
      actionLabel: "Open dashboard"
    }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly content: PortalContentService
  ) {
    this.benefitsFormConfig = this.content.getRequestForm("benefits");
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(() => {
      this.syncRequestModalFromRoute();
    });
  }

  openRequestModal(): void {
    if (!this.benefitsFormConfig) {
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
    const wantsOpenForm = Boolean(this.benefitsFormConfig && this.route.snapshot.queryParamMap.get("openForm") === "1");

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
