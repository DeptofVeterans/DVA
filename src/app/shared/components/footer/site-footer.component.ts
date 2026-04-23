import { Component } from "@angular/core";

@Component({
  selector: "app-site-footer",
  templateUrl: "./site-footer.component.html"
})
export class SiteFooterComponent {
  readonly links = [
    { label: "Roadmap", route: "/roadmap" },
    { label: "Records", route: "/records" },
    { label: "Pensions", route: "/benefits" },
    { label: "Insurance", route: "/insurance" },
    { label: "Funerals", route: "/funerals" },
    { label: "ID Application", route: "/id-application" },
    { label: "ID Guidance", route: "/id-guidance" },
    { label: "Employment", route: "/employment" },
    { label: "Welfare", route: "/welfare" },
    { label: "Gallery", route: "/gallery" },
    { label: "Contact", route: "/contact" }
  ];

  readonly year = new Date().getFullYear();
}
