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
      eyebrow: "01 Start here",
      title: "Records and certificates",
      description: "Begin with the official records, certificates, and letters needed before other requests move forward.",
      tone: "records",
      items: [
        {
          title: "Records and Certificates",
          description: "Request service records, certificates, commendation support, and confirmation of employment letters.",
          route: "/records",
          action: "Open records"
        }
      ]
    },
    {
      eyebrow: "02 Before ROD",
      title: "Retirement benefits preparation",
      description: "Prepare pension and gratuity requests early, with related benefit information kept together.",
      tone: "benefits",
      items: [
        {
          title: "Pensions and Benefits",
          description: "Open pension, gratuity, ex-gratia, disability, and death benefit support.",
          route: "/pensions",
          action: "Open benefits"
        }
      ]
    },
    {
      eyebrow: "03 At ROD",
      title: "Applications and family support",
      description: "Handle identification, final rites, and time-sensitive support around retirement or after a passing.",
      tone: "service",
      items: [
        {
          title: "Veteran ID",
          description: "Apply for or replace the Veteran Identification Access and Medical Card.",
          route: "/id",
          action: "Open ID"
        },
        {
          title: "Funeral Services",
          description: "Request funeral assistance, burial coordination, tombing guidance, and final rites support.",
          route: "/funerals",
          action: "Open funerals"
        }
      ]
    },
    {
      eyebrow: "04 After service",
      title: "Ongoing support after service",
      description: "Continue with insurance, welfare, resettlement, and employment support after retirement.",
      tone: "aftercare",
      items: [
        {
          title: "Insurance",
          description: "Review group health, supplemental plans, and insurance support requests.",
          route: "/insurance",
          action: "Open insurance"
        },
        {
          title: "Jobs and Resettlement",
          description: "Find job opportunities and request resume, placement, or interview support.",
          route: "/employment",
          action: "Open jobs"
        },
        {
          title: "Welfare",
          description: "Request welfare assistance, outreach follow-up, medical coordination, and support referrals.",
          route: "/welfare",
          action: "Open welfare"
        }
      ]
    }
  ];
}
