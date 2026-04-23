import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from "@angular/core";
import { SafeUrl } from "@angular/platform-browser";
import { Subscription } from "rxjs";
import { CurrentUser } from "../../../models/app.models";
import { UserProfileService } from "../../../core/services/user-profile.service";

@Component({
  selector: "app-profile-avatar",
  templateUrl: "./profile-avatar.component.html"
})
export class ProfileAvatarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() user: CurrentUser | null = null;
  @Input() size: "sm" | "md" | "lg" = "md";
  @Input() imageUrl: SafeUrl | null = null;

  photoUrl: SafeUrl | null = null;
  private subscription?: Subscription;

  constructor(private readonly profile: UserProfileService) {}

  ngOnInit(): void {
    this.subscription = this.profile.photoUrl$.subscribe((photoUrl) => {
      this.photoUrl = photoUrl;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["user"]?.currentValue?.hasProfileImage && !this.photoUrl) {
      this.profile.refreshPhoto(true);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  get initials(): string {
    const parts = String(this.user?.fullName || this.user?.displayName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!parts.length) {
      return "VA";
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  get altText(): string {
    return this.user ? `${this.user.displayName} profile image` : "Profile image";
  }

  get resolvedImageUrl(): SafeUrl | null {
    return this.imageUrl || this.photoUrl;
  }
}
