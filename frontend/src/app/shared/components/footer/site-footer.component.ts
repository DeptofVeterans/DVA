import { Component } from "@angular/core";

@Component({
  selector: "app-site-footer",
  templateUrl: "./site-footer.component.html",
  styleUrls: ["./site-footer.component.css"]
})
export class SiteFooterComponent {
  readonly serviceLinks = [
    { label: "Services", route: "/services" },
    { label: "Records", route: "/records" },
    { label: "Pensions", route: "/pensions" },
    { label: "Veteran ID", route: "/id" }
  ];

  readonly portalLinks = [
    { label: "Roadmap", route: "/roadmap" },
    { label: "Gallery", route: "/gallery" },
    { label: "Contact", route: "/contact" },
    { label: "Sign in", route: "/signin" },
    { label: "Dashboard", route: "/dashboard" }
  ];

  readonly supportNotes = [
    "Secure digital access to requests, alerts, and follow-up",
    "Department-based support and approval handling",
    "Support for records, pensions, insurance, funerals, ID, employment, and welfare services"
  ];

  readonly year = new Date().getFullYear();
}
