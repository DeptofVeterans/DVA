import { Component, OnInit } from "@angular/core";
import { AuthService } from "../../core/services/auth.service";
import { PortalEvent } from "../../models/app.models";
import { PortalEventsService } from "../../core/services/portal-events.service";

interface HomeCard {
  kicker: string;
  title: string;
  description: string;
  route: string;
}

interface HomeAction {
  label: string;
  route: string;
  fragment?: string;
  queryParams?: Record<string, string | number>;
}

@Component({
  selector: "app-home-page",
  templateUrl: "./home-page.component.html",
  styleUrls: ["./home-page.component.css"]
})
export class HomePageComponent implements OnInit {
  events: PortalEvent[] = [];
  eventsError = "";

  constructor(
    private readonly portalEvents: PortalEventsService,
    public readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.portalEvents.loadPublicFeed().subscribe({
      next: (feed) => {
        this.events = feed.events;
      },
      error: () => {
        this.eventsError = "Unable to load upcoming events right now.";
      }
    });
  }

  readonly servicePills = [
    "Records",
    "Pensions",
    "Insurance",
    "Funerals",
    "Veteran ID",
    "Employment",
    "Welfare",
    "Assistance",
    "Jobs",
    "Discounts"
  ];

  readonly applicationActions: HomeAction[] = [
    { label: "Apply for Veteran ID", route: "/id", queryParams: { openForm: 1 } },
    { label: "Request Records", route: "/records", queryParams: { openForm: 1 } },
    { label: "Apply for Benefits", route: "/pensions", queryParams: { openForm: 1 } },
    { label: "Request Insurance Support", route: "/insurance", queryParams: { openForm: 1 } },
    { label: "Request Funeral Support", route: "/funerals", queryParams: { openForm: 1 } },
    { label: "Book Employment Support", route: "/employment", queryParams: { openForm: 1 } },
    { label: "Request Welfare Support", route: "/welfare", queryParams: { openForm: 1 } }
  ];

  readonly roleGroups: HomeCard[] = [
    {
      kicker: "Ex-Services Historical Records",
      title: "Military service records and named certificate preparation",
      description: "Includes service records, certificate of service, certificate of commendation, and employment letters.",
      route: "/records"
    },
    {
      kicker: "Pension and Other Benefits",
      title: "Pensions, gratuities, ex-gratia, and related benefits",
      description: "This lane follows the roadmap into pension, gratuity, ex-gratia, disability, and death benefits.",
      route: "/pensions"
    },
    {
      kicker: "Resettlement and Employment",
      title: "Resume creation, workshops, job bank, and placement support",
      description: "Supports interviewing workshops, resettlement plans, job bank access, and placement preparation.",
      route: "/employment"
    },
    {
      kicker: "Welfare and Assistance",
      title: "Medical reviews, home visits, insurance support, and family care",
      description: "Routes medical consultations, retiree health insurance, welfare fund support, and case follow-up.",
      route: "/welfare"
    },
    {
      kicker: "Outreach and Communication",
      title: "Veteran liaison, outreach projects, and response to veteran queries",
      description: "Covers liaison with veteran agencies, network building, outreach projects, and general queries.",
      route: "/welfare"
    }
  ];

  eventDate(event: PortalEvent): string {
    return String(event.eventDate || event.event_date || "");
  }

  eventRoute(event: PortalEvent): string {
    return String(event.detailsRoute || event.details_route || "/");
  }

  eventLabel(event: PortalEvent): string {
    return String(event.ctaLabel || event.cta_label || "Open details");
  }

  isBannerEvent(event: PortalEvent): boolean {
    return Boolean(event.showInBanner || event.show_in_banner);
  }
}
