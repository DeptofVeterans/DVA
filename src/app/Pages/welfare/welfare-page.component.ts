import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { PortalContentService } from "../../core/services/portal-content.service";
import { RequestFormConfig } from "../../models/app.models";

interface WelfareSummaryCard {
  label: string;
  title: string;
  detail: string;
  value: string;
  tone: "gold" | "green" | "ink";
}

interface WelfareLane {
  id: string;
  label: string;
  title: string;
  detail: string;
  requestTypeCode: "WELFARE_ASSISTANCE_REQUEST" | "OUTREACH_QUERY";
  caseType: string;
  audience: string;
  response: string;
}

interface WelfareProgram {
  kicker: string;
  title: string;
  description: string;
  laneId: string;
}

interface WelfareAudience {
  title: string;
  detail: string;
}

@Component({
  selector: "app-welfare-page",
  templateUrl: "./welfare-page.component.html",
  styleUrls: ["./welfare-page.component.css"]
})
export class WelfarePageComponent implements OnInit {
  showRequestModal = false;
  activeLaneId = "medical-review";
  readonly page = this.content.getPage("welfare");
  readonly welfareFormConfig?: RequestFormConfig;

  readonly summaryCards: WelfareSummaryCard[] = [
    {
      label: "Medical and review",
      title: "Consultations and retiree support",
      detail: "Use welfare for medical reviews, retiree health insurance follow-up, and practical wellbeing support.",
      value: "Health + welfare route",
      tone: "green"
    },
    {
      label: "Family and assistance",
      title: "Help extends beyond the veteran alone",
      detail: "Dependants, family members, caregivers, and representatives can all be routed through the right welfare lane.",
      value: "5 applicant groups",
      tone: "gold"
    },
    {
      label: "Outreach and liaison",
      title: "Queries can move into agency and community follow-up",
      detail: "Outreach and communication sits alongside welfare support when the case requires liaison or broader coordination.",
      value: "Welfare + outreach",
      tone: "ink"
    }
  ];

  readonly supportLanes: WelfareLane[] = [
    {
      id: "medical-review",
      label: "Medical review",
      title: "Medical review support",
      detail: "Use this lane for consultations, reviews, retiree medical support, and practical follow-up connected to health or wellbeing.",
      requestTypeCode: "WELFARE_ASSISTANCE_REQUEST",
      caseType: "Medical review support",
      audience: "Veterans, dependants, and caregivers needing review support",
      response: "Welfare assistance"
    },
    {
      id: "insurance-welfare",
      label: "Insurance and care",
      title: "Insurance or welfare support",
      detail: "Route retiree health insurance follow-up, practical care questions, and assistance requests into one tracked welfare lane.",
      requestTypeCode: "WELFARE_ASSISTANCE_REQUEST",
      caseType: "Insurance or welfare support",
      audience: "Veterans, family members, and representatives",
      response: "Welfare assistance"
    },
    {
      id: "general-query",
      label: "General query",
      title: "General veteran query",
      detail: "Use this route when the person needs direction, follow-up, or case clarification before choosing another service area.",
      requestTypeCode: "WELFARE_ASSISTANCE_REQUEST",
      caseType: "General veteran query",
      audience: "Veterans, family members, caregivers, and dependants",
      response: "Welfare assistance"
    },
    {
      id: "funeral-followup",
      label: "Funeral follow-up",
      title: "Funeral arrangements follow-up",
      detail: "Keep funeral coordination, receipts, home visits, and broader family assistance linked to the welfare desk when needed.",
      requestTypeCode: "WELFARE_ASSISTANCE_REQUEST",
      caseType: "Funeral arrangements",
      audience: "Family members, representatives, and caregivers",
      response: "Welfare assistance"
    },
    {
      id: "outreach",
      label: "Outreach and liaison",
      title: "Outreach or liaison request",
      detail: "Use this lane when the case needs veteran-centred outreach, coordination with agencies, or wider communication follow-up.",
      requestTypeCode: "OUTREACH_QUERY",
      caseType: "Outreach or liaison request",
      audience: "Veterans, organizations, and community-facing representatives",
      response: "Outreach and communication"
    }
  ];

  readonly programs: WelfareProgram[] = [
    {
      kicker: "Medical support",
      title: "Medical for retired veterans consultations and reviews",
      description: "Practical review support for veterans who need welfare help connected to consultations, reviews, or follow-up coordination.",
      laneId: "medical-review"
    },
    {
      kicker: "Retiree cover",
      title: "Retiree health insurance support",
      description: "Use welfare when the issue crosses over into retiree health coordination or insurance-related welfare follow-up.",
      laneId: "insurance-welfare"
    },
    {
      kicker: "Mental health",
      title: "Mental health and wellbeing support",
      description: "Route wellbeing, counselling direction, and sensitive follow-up through a welfare lane that can be handled privately.",
      laneId: "medical-review"
    },
    {
      kicker: "ID and practical help",
      title: "Veteran ID, transport, and home visits",
      description: "Welfare also supports Veteran ID follow-up, medical transportation, and home visit coordination where needed.",
      laneId: "insurance-welfare"
    },
    {
      kicker: "Family coordination",
      title: "Funeral and family assistance follow-up",
      description: "Use welfare when family support needs to stay connected to funeral arrangements and practical case movement.",
      laneId: "funeral-followup"
    },
    {
      kicker: "Outreach",
      title: "Liaison with agencies and veteran-centred outreach",
      description: "Coordinate outreach projects, agency contact, and broader veteran queries through the outreach-linked support lane.",
      laneId: "outreach"
    }
  ];

  readonly audienceGroups: WelfareAudience[] = [
    {
      title: "Veterans",
      detail: "Veterans can use welfare for reviews, queries, transport, insurance-linked support, and case follow-up."
    },
    {
      title: "Dependants and family members",
      detail: "Dependants and family members can seek help when the case affects the veteran’s household or family welfare."
    },
    {
      title: "Caregivers and representatives",
      detail: "Caregivers and representatives can use this route when they are supporting the veteran through a practical or sensitive case."
    }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly content: PortalContentService
  ) {
    this.welfareFormConfig = this.content.getRequestForm("welfare");
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(() => {
      this.syncRequestModalFromRoute();
    });
  }

  get activeLane(): WelfareLane {
    return this.supportLanes.find((lane) => lane.id === this.activeLaneId) || this.supportLanes[0];
  }

  get requestFormInitialValues(): Record<string, unknown> {
    return {
      requestTypeCode: this.activeLane.requestTypeCode,
      support_lane: this.activeLane.caseType
    };
  }

  get activePrograms(): WelfareProgram[] {
    return this.programs.filter((program) => program.laneId === this.activeLaneId);
  }

  selectLane(laneId: string): void {
    const lane = this.supportLanes.find((item) => item.id === laneId);

    if (!lane) {
      return;
    }

    this.activeLaneId = lane.id;
  }

  openRequestModal(laneId = this.activeLaneId): void {
    if (!this.welfareFormConfig) {
      return;
    }

    this.selectLane(laneId);

    if (!this.auth.isAuthenticated) {
      this.redirectToAuthForRequest();
      return;
    }

    this.showRequestModal = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        openForm: 1,
        lane: this.activeLane.id
      },
      queryParamsHandling: "merge",
      replaceUrl: true
    });
  }

  closeRequestModal(): void {
    this.showRequestModal = false;

    if (this.route.snapshot.queryParamMap.has("openForm") || this.route.snapshot.queryParamMap.has("lane")) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          openForm: null,
          lane: null
        },
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
    const lane = this.route.snapshot.queryParamMap.get("lane");

    if (lane) {
      this.selectLane(lane);
    }

    const wantsOpenForm = Boolean(this.welfareFormConfig && this.route.snapshot.queryParamMap.get("openForm") === "1");

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
        queryParams: {
          openForm: 1,
          lane: this.activeLane.id
        },
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
