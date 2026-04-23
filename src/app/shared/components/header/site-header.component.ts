import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CurrentUser } from "../../../models/app.models";

interface NavItem {
  label: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: "app-site-header",
  templateUrl: "./site-header.component.html"
})
export class SiteHeaderComponent {
  @Input() currentUser: CurrentUser | null = null;
  @Input() notificationsOpen = false;
  @Input() unreadAlerts = 0;
  @Output() toggleNotificationsRequested = new EventEmitter<void>();
  @Output() logoutRequested = new EventEmitter<void>();

  navOpen = false;

  readonly navItems: NavItem[] = [
    { label: "Home", route: "/", exact: true },
    { label: "Roadmap", route: "/roadmap" },
    { label: "Records", route: "/records" },
    { label: "Pensions", route: "/benefits" },
    { label: "Insurance", route: "/insurance" },
    { label: "Funerals", route: "/funerals" },
    { label: "ID", route: "/id-application" },
    { label: "Employment", route: "/employment" },
    { label: "Welfare", route: "/welfare" },
    { label: "Gallery", route: "/gallery" },
    { label: "Contact", route: "/contact" }
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
}
