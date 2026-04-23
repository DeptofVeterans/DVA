import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { Router } from "@angular/router";
import { NotificationItem } from "../../../models/app.models";
import { AuthService } from "../../../core/services/auth.service";
import { RequestsService } from "../../../core/services/requests.service";

@Component({
  selector: "app-notification-drawer",
  templateUrl: "./notification-drawer.component.html"
})
export class NotificationDrawerComponent implements OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() unreadCountChanged = new EventEmitter<number>();

  notifications: NotificationItem[] = [];
  loading = false;
  error = "";
  activeFilter: "ALL" | "UNREAD" | "READ" = "ALL";

  constructor(
    public readonly auth: AuthService,
    private readonly requests: RequestsService,
    private readonly router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["open"]?.currentValue && this.auth.isAuthenticated) {
      this.loadNotifications();
      return;
    }

    if (!this.auth.isAuthenticated) {
      this.notifications = [];
      this.unreadCountChanged.emit(0);
    }
  }

  loadNotifications(): void {
    if (!this.auth.isAuthenticated) {
      return;
    }

    this.loading = true;
    this.error = "";

    this.requests.getNotifications().subscribe({
      next: ({ notifications }) => {
        this.notifications = notifications;
        this.loading = false;
        this.emitUnreadCount();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to load alerts right now.";
        this.loading = false;
      }
    });
  }

  markAsRead(notification: NotificationItem): void {
    if (notification.isRead) {
      return;
    }

    this.requests.markNotificationRead(notification.notificationId).subscribe({
      next: () => {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        this.emitUnreadCount();
      }
    });
  }

  get filteredNotifications(): NotificationItem[] {
    switch (this.activeFilter) {
      case "UNREAD":
        return this.notifications.filter((notification) => !notification.isRead);
      case "READ":
        return this.notifications.filter((notification) => notification.isRead);
      default:
        return this.notifications;
    }
  }

  setFilter(filter: "ALL" | "UNREAD" | "READ"): void {
    this.activeFilter = filter;
  }

  viewRequest(notification: NotificationItem): void {
    if (!notification.requestId) {
      return;
    }

    const navigateToRequest = () => {
      this.router.navigate(["/dashboard"], {
        queryParams: { request: notification.requestId }
      });
      this.closed.emit();
    };

    if (notification.isRead) {
      navigateToRequest();
      return;
    }

    this.requests.markNotificationRead(notification.notificationId).subscribe({
      next: () => {
        notification.isRead = true;
        notification.readAt = new Date().toISOString();
        this.emitUnreadCount();
        navigateToRequest();
      },
      error: () => {
        navigateToRequest();
      }
    });
  }

  humanizeNotificationType(value: string): string {
    return value.replace(/_/g, " ");
  }

  private emitUnreadCount(): void {
    this.unreadCountChanged.emit(this.notifications.filter((notification) => !notification.isRead).length);
  }
}
