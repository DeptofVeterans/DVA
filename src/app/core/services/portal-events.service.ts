import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, tap } from "rxjs";
import { PortalEvent, PortalEventsFeed } from "../../models/app.models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class PortalEventsService {
  private readonly feedState = new BehaviorSubject<PortalEventsFeed>({
    events: [],
    bannerEvent: null
  });

  readonly feed$ = this.feedState.asObservable();

  constructor(private readonly api: ApiService) {}

  get currentFeed(): PortalEventsFeed {
    return this.feedState.value;
  }

  loadPublicFeed(force = false): Observable<PortalEventsFeed> {
    if (!force && (this.feedState.value.events.length || this.feedState.value.bannerEvent)) {
      return of(this.feedState.value);
    }

    return this.api.get<PortalEventsFeed>("/portal/events").pipe(
      tap((feed) => this.feedState.next(feed))
    );
  }

  refreshPublicFeed(): void {
    this.loadPublicFeed(true).subscribe({
      error: () => {
        this.feedState.next({ events: [], bannerEvent: null });
      }
    });
  }

  getAdminEvents() {
    return this.api.get<{ events: PortalEvent[] }>("/admin/events");
  }

  createEvent(payload: {
    title: string;
    summary: string;
    location: string;
    eventDate: string;
    detailsRoute?: string;
    ctaLabel?: string;
    bannerMessage?: string;
    isPublished?: boolean;
    showInBanner?: boolean;
  }) {
    return this.api.post<{ message: string; eventId: number }>("/admin/events", payload).pipe(
      tap(() => this.refreshPublicFeed())
    );
  }

  updateEvent(
    eventId: number,
    payload: Partial<{
      title: string;
      summary: string;
      location: string;
      eventDate: string;
      detailsRoute: string;
      ctaLabel: string;
      bannerMessage: string;
      isPublished: boolean;
      showInBanner: boolean;
    }>
  ) {
    return this.api.patch<{ message: string }>(`/admin/events/${eventId}`, payload).pipe(
      tap(() => this.refreshPublicFeed())
    );
  }
}
