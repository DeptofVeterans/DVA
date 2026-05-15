import { Component } from "@angular/core";
import { AuthService } from "../../core/services/auth.service";

interface HomeServiceCard {
  kicker: string;
  title: string;
  description: string;
  route: string;
  tone: "records" | "benefits" | "insurance" | "funerals" | "id" | "employment";
  badge: string;
}

interface HomeFeatureHighlight {
  title: string;
  description: string;
  tone: "gold" | "green" | "cream";
  mark: string;
}

@Component({
  selector: "app-home-page",
  templateUrl: "./home-page.component.html",
  styleUrls: ["./home-page.component.css"]
})
export class HomePageComponent {
  constructor(public readonly auth: AuthService) {}

  readonly serviceCards: HomeServiceCard[] = [
    {
      kicker: "Records",
      title: "Records and Certificates",
      description: "Access named document guidance and submit record, certificate, or confirmation requests.",
      route: "/services",
      tone: "records",
      badge: "01"
    },
    {
      kicker: "Benefits",
      title: "Pensions and Benefits",
      description: "Move from retirement timing into pension, gratuity, ex-gratia, and benefit follow-up.",
      route: "/services",
      tone: "benefits",
      badge: "02"
    },
    {
      kicker: "Coverage",
      title: "Insurance Support",
      description: "Review group health guidance, supplemental rates, and insurance support options.",
      route: "/services",
      tone: "insurance",
      badge: "03"
    },
    {
      kicker: "Funerals",
      title: "Funeral Services",
      description: "Open burial, tombing, family coordination, and final rites support.",
      route: "/services",
      tone: "funerals",
      badge: "04"
    },
    {
      kicker: "Identification",
      title: "Veteran ID",
      description: "Read the official guidance, then open the Veteran ID application.",
      route: "/services",
      tone: "id",
      badge: "05"
    },
    {
      kicker: "Transition",
      title: "Employment Services",
      description: "Book resettlement guidance, interview preparation, and job placement support for veterans.",
      route: "/services",
      tone: "employment",
      badge: "06"
    }
  ];

  readonly featureHighlights: HomeFeatureHighlight[] = [
    {
      title: "Secure routing",
      description: "Requests and uploads stay protected and are directed to the responsible department.",
      tone: "gold",
      mark: "01"
    },
    {
      title: "Always connected",
      description: "Veterans can move from guidance into dashboard tracking, pickup alerts, and next-step follow-up.",
      tone: "green",
      mark: "02"
    },
    {
      title: "Support that carries across lanes",
      description: "Records, benefits, welfare, funeral support, and employment preparation stay connected.",
      tone: "cream",
      mark: "03"
    }
  ];
}
