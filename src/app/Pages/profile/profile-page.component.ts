import { Component, OnDestroy, OnInit } from "@angular/core";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { Router } from "@angular/router";
import { FormBuilder, Validators } from "@angular/forms";
import { CurrentUser } from "../../models/app.models";
import { AuthService } from "../../core/services/auth.service";
import { UserProfileService } from "../../core/services/user-profile.service";

@Component({
  selector: "app-profile-page",
  templateUrl: "./profile-page.component.html",
  styleUrls: ["./profile-page.component.css"]
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  currentUser: CurrentUser | null = null;
  selectedFile: File | null = null;
  previewUrl: SafeUrl | null = null;
  saving = false;
  uploading = false;
  feedback = "";
  error = "";
  private readonly allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  private previewObjectUrl: string | null = null;

  readonly profileForm = this.formBuilder.group({
    fullName: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    rank: ["", Validators.required]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly sanitizer: DomSanitizer,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly profile: UserProfileService
  ) {}

  ngOnInit(): void {
    if (this.auth.currentUser) {
      this.applyUser(this.auth.currentUser);
    } else if (this.auth.getToken()) {
      this.auth.loadCurrentUser().subscribe({
        next: (user) => {
          if (!user) {
            this.router.navigate(["/auth"], { queryParams: { mode: "login" } });
          }
        }
      });
    }

    this.auth.user$.subscribe((user) => {
      if (!user) {
        this.currentUser = null;
        return;
      }

      this.applyUser(user);
    });
  }

  get departmentSummary(): string {
    if (!this.currentUser?.departments.length) {
      return this.currentUser?.accountType === "VETERAN" ? "Veteran account" : "No departments assigned";
    }

    return this.currentUser.departments.map((department) => department.departmentName).join(", ");
  }

  get selectedFileName(): string {
    return this.selectedFile?.name || "No image selected";
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.feedback = "";
    this.error = "";

    if (!file) {
      this.selectedFile = null;
      this.clearPreview();
      return;
    }

    if (!this.allowedImageTypes.has(file.type)) {
      this.selectedFile = null;
      this.clearPreview();
      this.error = "Use a JPG, PNG, or WebP image for the profile photo.";
      input.value = "";
      return;
    }

    this.selectedFile = file;
    this.setPreview(file);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.feedback = "";
    this.error = "";

    const { fullName, email, rank } = this.profileForm.getRawValue();

    this.profile.updateProfile({
      fullName: String(fullName || "").trim(),
      email: String(email || "").trim(),
      rank: String(rank || "").trim()
    }).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.saving = false;
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to update the profile right now.";
        this.saving = false;
      }
    });
  }

  uploadProfilePhoto(): void {
    if (!this.selectedFile) {
      this.error = "Choose an image before uploading.";
      this.feedback = "";
      return;
    }

    this.uploading = true;
    this.feedback = "";
    this.error = "";

    this.profile.uploadProfilePhoto(this.selectedFile).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.uploading = false;
        this.selectedFile = null;
        this.clearPreview();
      },
      error: (error) => {
        this.error = this.resolveUploadError(error);
        this.uploading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.clearPreview();
  }

  private applyUser(user: CurrentUser): void {
    this.currentUser = user;
    this.profileForm.patchValue({
      fullName: user.fullName,
      email: user.email,
      rank: user.rank
    });
  }

  private setPreview(file: File): void {
    this.clearPreview();
    this.previewObjectUrl = URL.createObjectURL(file);
    this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(this.previewObjectUrl);
  }

  private clearPreview(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
      this.previewUrl = null;
    }
  }

  private resolveUploadError(error: { status?: number; error?: { message?: string } }): string {
    if (error?.status === 404) {
      return "Profile image upload is not available on the current backend session yet. Restart the backend and try again.";
    }

    return error?.error?.message || "Unable to upload the profile image right now.";
  }
}
