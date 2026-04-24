import { Component, HostListener, OnInit } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { PortalEvent } from './models/app.models';
import { AuthService } from './core/services/auth.service';
import { PortalEventsService } from './core/services/portal-events.service';
import { RequestsService } from './core/services/requests.service';
import { UserProfileService } from './core/services/user-profile.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  notificationsOpen = false;
  unreadAlerts = 0;
  bannerEvent: PortalEvent | null = null;
  showScrollTop = false;
  isRouteChanging = false;

  private routeTransitionTimer: ReturnType<typeof setTimeout> | null = null;
  private lastRoutePath = "";

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly portalEvents: PortalEventsService,
    private readonly requests: RequestsService,
    private readonly profile: UserProfileService
  ) {}

  ngOnInit(): void {
    this.lastRoutePath = this.getRoutePath(this.router.url);

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.isRouteChanging = true;
        return;
      }

      if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
        if (event instanceof NavigationEnd) {
          const nextRoutePath = this.getRoutePath(event.urlAfterRedirects);
          const hasFragment = event.urlAfterRedirects.includes("#");

          if (nextRoutePath !== this.lastRoutePath && !hasFragment) {
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            this.updateScrollTopVisibility();
          }

          this.lastRoutePath = nextRoutePath;
        }

        if (this.routeTransitionTimer) {
          clearTimeout(this.routeTransitionTimer);
        }

        this.routeTransitionTimer = setTimeout(() => {
          this.isRouteChanging = false;
        }, 70);
      }
    });

    this.portalEvents.feed$.subscribe((feed) => {
      this.bannerEvent = feed.bannerEvent;
    });

    this.auth.user$.subscribe((user) => {
      if (user) {
        this.profile.refreshPhoto();
        this.refreshUnreadAlerts();
        return;
      }

      this.profile.clearPhoto();
      this.unreadAlerts = 0;
      this.notificationsOpen = false;
    });

    this.portalEvents.loadPublicFeed().subscribe({
      error: () => {
        this.bannerEvent = null;
      }
    });

    this.updateScrollTopVisibility();
  }

  toggleNotifications(): void {
    if (!this.auth.isAuthenticated) {
      this.router.navigate(['/signin'], { queryParams: { mode: 'login' } });
      return;
    }

    this.notificationsOpen = !this.notificationsOpen;

    if (this.notificationsOpen) {
      this.refreshUnreadAlerts();
    }
  }

  closeNotifications(): void {
    this.notificationsOpen = false;
  }

  updateUnreadAlerts(count: number): void {
    this.unreadAlerts = count;
  }

  logout(): void {
    this.auth.logout();
    this.notificationsOpen = false;
    this.router.navigate(['/']);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  get bannerRoute(): string {
    return this.bannerEvent?.detailsRoute || this.bannerEvent?.details_route || '/';
  }

  get bannerMessage(): string {
    return this.bannerEvent?.bannerMessage || this.bannerEvent?.banner_message || '';
  }

  get bannerLabel(): string {
    return this.bannerEvent?.ctaLabel || this.bannerEvent?.cta_label || 'Open details';
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateScrollTopVisibility();
  }

  private refreshUnreadAlerts(): void {
    if (!this.auth.isAuthenticated) {
      this.unreadAlerts = 0;
      return;
    }

    this.requests.getNotifications().subscribe({
      next: ({ notifications }) => {
        this.unreadAlerts = notifications.filter((notification) => !notification.isRead).length;
      },
      error: () => {
        this.unreadAlerts = 0;
      }
    });
  }

  private updateScrollTopVisibility(): void {
    this.showScrollTop = window.scrollY > 260;
  }

  private getRoutePath(url: string): string {
    return url.split("?")[0].split("#")[0];
  }
}
