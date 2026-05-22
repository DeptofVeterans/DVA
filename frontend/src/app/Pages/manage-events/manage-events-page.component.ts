import { Component, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { PortalEventsService } from "../../core/services/portal-events.service";
import { CurrentUser, PortalEvent } from "../../models/app.models";

@Component({
  selector: "app-manage-events-page",
  templateUrl: "./manage-events-page.component.html",
  styleUrls: ["./manage-events-page.component.css"]
})
export class ManageEventsPageComponent implements OnInit {
  currentUser: CurrentUser | null = null;
  portalEvents: PortalEvent[] = [];
  loading = false;
  feedback = "";
  error = "";

  readonly eventForm = this.formBuilder.group({
    title: ["", Validators.required],
    summary: ["", Validators.required],
    location: ["", Validators.required],
    eventDate: ["", Validators.required],
    detailsRoute: ["/roadmap", Validators.required],
    ctaLabel: ["Open details", Validators.required],
    bannerMessage: [""],
    isPublished: [true],
    showInBanner: [false]
  });

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly formBuilder: FormBuilder,
    private readonly portalEventsService: PortalEventsService
  ) {}

  ngOnInit(): void {
    if (this.auth.currentUser) {
      this.handleUser(this.auth.currentUser);
    } else if (this.auth.getToken()) {
      this.auth.loadCurrentUser().subscribe({
        next: (user) => {
          if (!user) {
            this.router.navigate(["/signin"], { queryParams: { mode: "login" } });
          }
        }
      });
    } else {
      this.router.navigate(["/signin"], { queryParams: { mode: "login" } });
    }

    this.auth.user$.subscribe((user) => {
      this.handleUser(user);
    });
  }

  reloadEvents(): void {
    if (!this.currentUser || !this.canOpenPage(this.currentUser)) {
      return;
    }

    this.loading = true;
    this.error = "";

    this.portalEventsService.getAdminEvents().subscribe({
      next: ({ events }) => {
        this.portalEvents = events;
        this.loading = false;
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to load portal events right now.";
        this.loading = false;
      }
    });
  }

  get totalEvents(): number {
    return this.portalEvents.length;
  }

  get publishedEvents(): number {
    return this.portalEvents.filter((event) => Boolean(event.is_published || event.isPublished)).length;
  }

  get bannerEvents(): number {
    return this.portalEvents.filter((event) => Boolean(event.show_in_banner || event.showInBanner)).length;
  }

  submitEvent(): void {
    this.feedback = "";
    this.error = "";

    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      this.error = "Complete the event details before publishing.";
      return;
    }

    this.portalEventsService.createEvent({
      title: String(this.eventForm.value.title),
      summary: String(this.eventForm.value.summary),
      location: String(this.eventForm.value.location),
      eventDate: String(this.eventForm.value.eventDate),
      detailsRoute: String(this.eventForm.value.detailsRoute || "/"),
      ctaLabel: String(this.eventForm.value.ctaLabel || "Open details"),
      bannerMessage: String(this.eventForm.value.bannerMessage || ""),
      isPublished: Boolean(this.eventForm.value.isPublished),
      showInBanner: Boolean(this.eventForm.value.showInBanner)
    }).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.eventForm.reset({
          title: "",
          summary: "",
          location: "",
          eventDate: "",
          detailsRoute: "/roadmap",
          ctaLabel: "Open details",
          bannerMessage: "",
          isPublished: true,
          showInBanner: false
        });
        this.reloadEvents();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to publish the event.";
      }
    });
  }

  setBannerEvent(event: PortalEvent): void {
    this.feedback = "";
    this.error = "";

    const eventId = Number(event.portal_event_id || event.eventId);
    const eventDate = String(event.event_date || event.eventDate || "");
    const location = String(event.location || "Department of Veterans Affairs");
    const bannerMessage =
      event.banner_message ||
      event.bannerMessage ||
      `Upcoming event on ${eventDate}: ${event.title} at ${location}.`;

    this.portalEventsService.updateEvent(eventId, {
      showInBanner: true,
      bannerMessage
    }).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.reloadEvents();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to place this event in the site banner.";
      }
    });
  }

  clearBannerEvent(event: PortalEvent): void {
    this.feedback = "";
    this.error = "";

    const eventId = Number(event.portal_event_id || event.eventId);

    this.portalEventsService.updateEvent(eventId, {
      showInBanner: false
    }).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.reloadEvents();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to remove this event from the banner.";
      }
    });
  }

  setEventPublished(event: PortalEvent, isPublished: boolean): void {
    this.feedback = "";
    this.error = "";

    const eventId = Number(event.portal_event_id || event.eventId);

    this.portalEventsService.updateEvent(eventId, { isPublished }).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.reloadEvents();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to update the event visibility.";
      }
    });
  }

  eventRoute(event: PortalEvent): string {
    return String(event.details_route || event.detailsRoute || "/");
  }

  private handleUser(user: CurrentUser | null): void {
    this.currentUser = user;

    if (!user) {
      return;
    }

    if (!this.canOpenPage(user)) {
      this.router.navigate(["/dashboard"]);
      return;
    }

    if (!this.portalEvents.length && !this.loading) {
      this.reloadEvents();
    }
  }

  private canOpenPage(user: CurrentUser): boolean {
    return ["QM", "DIRECTOR", "MAIN_ADMIN"].includes(user.roleCode);
  }
}
