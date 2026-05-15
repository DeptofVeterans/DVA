import { Component } from "@angular/core";

interface RoadmapStepItem {
  title: string;
  description: string;
  route: string;
}

interface RoadmapMilestone {
  step: string;
  title: string;
  status: string;
  tone: "start" | "prepare" | "apply" | "continue";
  items: RoadmapStepItem[];
}

@Component({
  selector: "app-roadmap-page",
  templateUrl: "./roadmap-page.component.html",
  styleUrls: ["./roadmap-page.component.css"]
})
export class RoadmapPageComponent {
  readonly milestones: RoadmapMilestone[] = [
    {
      step: "01",
      title: "Start with service records and certificates",
      status: "Start here",
      tone: "start",
      items: [
        {
          title: "Certificate of Service",
          description: "Certificate of Service is the starting point, with separate preparation paths for officers and enlisted ranks.",
          route: "/records"
        },
        {
          title: "Certificate of Commendation",
          description: "A Certificate of Commendation supports enlisted ranks whose discharge conduct is graded exemplary after at least three years continuous service.",
          route: "/records"
        }
      ]
    },
    {
      step: "02",
      title: "Prepare retirement benefits before ROD",
      status: "Before ROD",
      tone: "prepare",
      items: [
        {
          title: "Eligibility for pension and gratuity",
          description: "Apply six months before ROD. Officers and enlisted ranks qualify at different reckonable service thresholds.",
          route: "/pensions"
        }
      ]
    },
    {
      step: "03",
      title: "Apply the correct retirement-on-duty benefit",
      status: "At ROD",
      tone: "apply",
      items: [
        {
          title: "Eligibility for Ex-Gratia",
          description: "Twelve years continuous service in the Jamaica National Reserve is needed for Ex-Gratia payment, and the application is made at ROD.",
          route: "/pensions"
        }
      ]
    },
    {
      step: "04",
      title: "Continue support after service",
      status: "After service",
      tone: "continue",
      items: [
        {
          title: "Insurance after service",
          description: "JDF Group Insurance continues after termination of service, with retiree health and supplemental support available through the portal.",
          route: "/insurance"
        },
        {
          title: "Apply for the Veteran's ID Card at the DVA",
          description: "The Veteran's ID Card is issued after the date of ROD and requires at least three years honourable service at termination.",
          route: "/id"
        }
      ]
    }
  ];

  readonly notes = [
    "Complete the clearance certificate before final twenty-eight days' pay is released.",
    "Some periods are excluded from reckonable service and can affect eligibility calculations.",
    "Blue and red strip Veteran ID cards carry different access rules after issue."
  ];
}
