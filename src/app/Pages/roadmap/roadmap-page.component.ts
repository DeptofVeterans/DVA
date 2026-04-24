import { Component } from "@angular/core";

@Component({
  selector: "app-roadmap-page",
  templateUrl: "./roadmap-page.component.html",
  styleUrls: ["./roadmap-page.component.css"]
})
export class RoadmapPageComponent {
  readonly stages = [
    {
      kicker: "Start here",
      title: "Certificate of Service",
      description: "Certificate of Service is the starting point, with separate preparation paths for officers and enlisted ranks.",
      route: "/records"
    },
    {
      kicker: "Records",
      title: "Certificate of Commendation",
      description: "A Certificate of Commendation is awarded to enlisted ranks whose conduct at discharge is graded exemplary after at least three years continuous service.",
      route: "/records"
    },
    {
      kicker: "Pension and Gratuity",
      title: "Eligibility for pension and gratuity",
      description: "Apply six months before ROD. Officers and enlisted ranks qualify at different reckonable service thresholds.",
      route: "/pensions"
    },
    {
      kicker: "Ex-Gratia",
      title: "Eligibility for Ex-Gratia",
      description: "Twelve years continuous service in the Jamaica National Reserve is needed for Ex-Gratia payment, and the application is made at ROD.",
      route: "/pensions"
    },
    {
      kicker: "Insurance",
      title: "Insurance after service",
      description: "JDF Group Insurance continues after termination of service, with retiree health and supplemental support available through the portal.",
      route: "/insurance"
    },
    {
      kicker: "Veteran's ID Card",
      title: "Apply for the Veteran's ID Card at the DVA",
      description: "The Veteran's ID Card is issued after the date of ROD and requires at least three years honourable service at termination.",
      route: "/id"
    }
  ];

  readonly notes = [
    {
      kicker: "Clearance certificate",
      title: "Complete clearance before final pay is released",
      body: "A servicemember terminating service with the JDF must complete a clearance certificate before the final twenty-eight days' pay is released."
    },
    {
      kicker: "Reckonable service",
      title: "Some periods are excluded from reckonable service",
      body: "Service before age eighteen, imprisonment, desertion, prolonged absence without leave, and forfeited service can affect eligibility calculations."
    },
    {
      kicker: "ID card access",
      title: "Blue and red strip cards carry different access rules",
      body: "Blue strip cards allow ingress to military bases only, while red strip cards also support HSC consultations and reviews where eligible."
    }
  ];
}
