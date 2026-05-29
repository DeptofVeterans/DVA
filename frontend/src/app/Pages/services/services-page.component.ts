import { Component } from "@angular/core";
import { AuthService } from "../../core/services/auth.service";

interface ServiceFlowGroup {
  eyebrow: string;
  title: string;
  description: string;
  tone: "records" | "benefits" | "service" | "aftercare";
  items: Array<{
    title: string;
    description: string;
    route: string;
    action: string;
  }>;
}

@Component({
  selector: "app-services-page",
  templateUrl: "./services-page.component.html",
  styleUrls: ["./services-page.component.css"]
})
export class ServicesPageComponent {
  constructor(public readonly auth: AuthService) {}

  readonly flowGroups: ServiceFlowGroup[] = [
    {
      eyebrow: "01 Documents",
      title: "Records and certificates",
      description: "Use this area when you need proof of service, certificates, or official letters.",
      tone: "records",
      items: [
        {
          title: "Service records and letters",
          description: "Request military service records, service certificates, commendation support, or confirmation of employment letters.",
          route: "/records",
          action: "Go to records"
        }
      ]
    },
    {
      eyebrow: "02 Benefits",
      title: "Pensions and benefit support",
      description: "Start here for pension, gratuity, ex-gratia, disability, or death-benefit guidance.",
      tone: "benefits",
      items: [
        {
          title: "Pensions and Benefits",
          description: "Get help with pension applications, gratuity, ex-gratia matters, disability benefits, and death benefits.",
          route: "/pensions",
          action: "Go to benefits"
        }
      ]
    },
    {
      eyebrow: "03 ID and family support",
      title: "Veteran ID and funeral assistance",
      description: "Apply for a Veteran ID card or find the correct support path for funeral and family coordination.",
      tone: "service",
      items: [
        {
          title: "Veteran ID",
          description: "Apply for a new, replacement, lost, or stolen Veteran Identification Access and Medical Card.",
          route: "/id",
          action: "Go to ID"
        },
        {
          title: "Funeral Services",
          description: "Find burial guidance, tombing steps, church or venue support, and final rites coordination.",
          route: "/funerals",
          action: "Go to funerals"
        }
      ]
    },
    {
      eyebrow: "04 Ongoing support",
      title: "Health, work, and welfare follow-up",
      description: "Use these areas for insurance questions, job and resettlement support, or welfare assistance.",
      tone: "aftercare",
      items: [
        {
          title: "Insurance",
          description: "Review group health, supplemental plans, claims guidance, and insurance support requests.",
          route: "/insurance",
          action: "Go to insurance"
        },
        {
          title: "Jobs and Resettlement",
          description: "View opportunities and request resume, placement, workshop, or interview support.",
          route: "/employment",
          action: "Go to jobs"
        },
        {
          title: "Welfare",
          description: "Request welfare assistance, medical coordination, outreach follow-up, or support referrals.",
          route: "/welfare",
          action: "Go to welfare"
        }
      ]
    }
  ];
}
