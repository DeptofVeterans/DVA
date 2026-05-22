import { Injectable } from "@angular/core";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { BehaviorSubject, Observable, catchError, finalize, of, tap } from "rxjs";
import { CurrentUser } from "../../models/app.models";
import { ApiService } from "./api.service";
import { AuthService } from "./auth.service";

interface ProfileResponse {
  message: string;
  user: CurrentUser;
}

@Injectable({ providedIn: "root" })
export class UserProfileService {
  private readonly photoUrlState = new BehaviorSubject<SafeUrl | null>(null);
  readonly photoUrl$ = this.photoUrlState.asObservable();
  private objectUrl: string | null = null;
  private refreshInFlight = false;

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly sanitizer: DomSanitizer
  ) {
    this.auth.user$.subscribe((user) => {
      if (!user?.hasProfileImage) {
        this.clearPhoto();
        return;
      }

      this.refreshPhoto(true);
    });
  }

  updateProfile(payload: { fullName: string; email: string; rank: string }): Observable<ProfileResponse> {
    return this.api.patch<ProfileResponse>("/auth/profile", payload).pipe(
      tap(({ user }) => {
        this.auth.setCurrentUser(user);
      })
    );
  }

  uploadProfilePhoto(file: File): Observable<ProfileResponse> {
    const formData = new FormData();
    formData.append("file", file);

    return this.api.postForm<ProfileResponse>("/auth/profile/photo", formData).pipe(
      tap(({ user }) => {
        this.auth.setCurrentUser(user);
        this.setPhotoUrl(URL.createObjectURL(file));
        this.refreshPhoto(true);
      })
    );
  }

  refreshPhoto(force = false): void {
    if (!this.auth.isAuthenticated || !this.auth.currentUser?.hasProfileImage) {
      this.clearPhoto();
      return;
    }

    if (this.refreshInFlight) {
      return;
    }

    const cacheKey = force ? `?t=${Date.now()}` : "";
    this.refreshInFlight = true;

    this.api.getBlob(`/auth/profile/photo${cacheKey}`).pipe(
      tap((blob) => {
        const nextUrl = URL.createObjectURL(blob);
        this.setPhotoUrl(nextUrl);
      }),
      catchError(() => {
        this.clearPhoto();
        return of(null);
      }),
      finalize(() => {
        this.refreshInFlight = false;
      })
    ).subscribe();
  }

  clearPhoto(): void {
    this.setPhotoUrl(null);
  }

  private setPhotoUrl(nextUrl: string | null): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    this.objectUrl = nextUrl;
    this.photoUrlState.next(nextUrl ? this.sanitizer.bypassSecurityTrustUrl(nextUrl) : null);
  }
}
