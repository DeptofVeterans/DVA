import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Router } from "@angular/router";
import { CurrentUser } from "../../../models/app.models";

interface NavItem {
  label: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: "app-site-header",
  templateUrl: "./site-header.component.html",
  styleUrls: ["./site-header.component.css"]
})
export class SiteHeaderComponent {
  @Input() currentUser: CurrentUser | null = null;
  @Input() notificationsOpen = false;
  @Input() unreadAlerts = 0;
  @Output() toggleNotificationsRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();

  navOpen = false;

  constructor(private readonly router: Router) {}

  readonly navItems: NavItem[] = [
    { label: "Home", route: "/", exact: true },
    { label: "Services", route: "/services", exact: false },
    { label: "Records", route: "/records" },
    { label: "Pensions", route: "/pensions" },
    { label: "Funerals", route: "/funerals" },
    { label: "ID Card", route: "/id" },
    { label: "Roadmap", route: "/roadmap" },
    { label: "Gallery", route: "/gallery" },
    { label: "Contact", route: "/contact" }
  ];

  private readonly groupedServiceRoutes = [
    "/records",
    "/pensions",
    "/benefits",
    "/insurance",
    "/funerals",
    "/id",
    "/id-application",
    "/employment",
    "/welfare"
  ];

  toggleNav(): void {
    this.navOpen = !this.navOpen;
  }

  closeNav(): void {
    this.navOpen = false;
  }

  get unreadAlertsLabel(): string {
    return this.unreadAlerts > 99 ? "99+" : String(this.unreadAlerts);
  }

  isNavActive(item: NavItem): boolean {
    const currentUrl = this.router.url.split("?")[0].split("#")[0];

    if (item.route === "/services") {
      return currentUrl === "/services" || this.groupedServiceRoutes.some((route) => currentUrl === route);
    }

    return item.exact === true ? currentUrl === item.route : currentUrl.startsWith(item.route);
  }
}
