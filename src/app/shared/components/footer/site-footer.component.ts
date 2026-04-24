import { Component } from "@angular/core";

@Component({
  selector: "app-site-footer",
  templateUrl: "./site-footer.component.html"
})
export class SiteFooterComponent {
  readonly serviceLinks = [
    { label: "Records", route: "/records" },
    { label: "Pensions", route: "/pensions" },
    { label: "Insurance", route: "/insurance" },
    { label: "Funerals", route: "/funerals" },
    { label: "Employment", route: "/employment" },
    { label: "Welfare", route: "/welfare" }
  ];

  readonly portalLinks = [
    { label: "Roadmap", route: "/roadmap" },
    { label: "Veteran ID", route: "/id" },
    { label: "Gallery", route: "/gallery" },
    { label: "Contact", route: "/contact" },
    { label: "Sign in", route: "/signin" },
    { label: "Dashboard", route: "/dashboard" }
  ];

  readonly supportNotes = [
    "Secure digital access to requests, alerts, and follow-up",
    "Department-based staff workflows and approval routing",
    "Support for records, pensions, insurance, funerals, ID, employment, and welfare services"
  ];

  readonly year = new Date().getFullYear();
}
