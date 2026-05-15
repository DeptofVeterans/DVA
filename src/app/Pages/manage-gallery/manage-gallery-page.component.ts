import { Component, OnInit } from "@angular/core";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { GalleryService } from "../../core/services/gallery.service";
import { ImageLightboxService } from "../../core/services/image-lightbox.service";
import { CurrentUser, GalleryImage } from "../../models/app.models";

@Component({
  selector: "app-manage-gallery-page",
  templateUrl: "./manage-gallery-page.component.html",
  styleUrls: ["./manage-gallery-page.component.css"]
})
export class ManageGalleryPageComponent implements OnInit {
  currentUser: CurrentUser | null = null;
  galleryImages: GalleryImage[] = [];
  galleryFile: File | null = null;
  loading = false;
  feedback = "";
  error = "";

  readonly galleryForm = this.formBuilder.group({
    title: ["", Validators.required],
    altText: ["", Validators.required],
    caption: [""],
    activityDate: [""],
    isPublished: [true],
    isFeatured: [false]
  });

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly formBuilder: FormBuilder,
    private readonly galleryService: GalleryService,
    private readonly imageLightbox: ImageLightboxService
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

  onGalleryFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.galleryFile = input.files?.[0] || null;
  }

  reloadGallery(): void {
    if (!this.currentUser || !this.canOpenPage(this.currentUser)) {
      return;
    }

    this.loading = true;
    this.error = "";

    this.galleryService.getManageGallery().subscribe({
      next: ({ images }) => {
        this.galleryImages = images;
        this.loading = false;
      },
      error: (error) => {
        this.galleryImages = [];
        this.error = error?.error?.message || "Unable to load gallery images right now.";
        this.loading = false;
      }
    });
  }

  get totalImages(): number {
    return this.galleryImages.length;
  }

  get publishedImages(): number {
    return this.galleryImages.filter((image) => Boolean(image.isPublished || image.is_published)).length;
  }

  get featuredImages(): number {
    return this.galleryImages.filter((image) => Boolean(image.isFeatured || image.is_featured)).length;
  }

  submitGalleryImage(): void {
    this.feedback = "";
    this.error = "";

    if (this.galleryForm.invalid || !this.galleryFile) {
      this.galleryForm.markAllAsTouched();
      this.error = !this.galleryFile
        ? "Choose an image file before uploading."
        : "Complete the required gallery fields before uploading.";
      return;
    }

    this.galleryService.uploadGalleryImage({
      file: this.galleryFile,
      title: String(this.galleryForm.value.title || ""),
      altText: String(this.galleryForm.value.altText || ""),
      caption: String(this.galleryForm.value.caption || ""),
      activityDate: String(this.galleryForm.value.activityDate || ""),
      isPublished: Boolean(this.galleryForm.value.isPublished),
      isFeatured: Boolean(this.galleryForm.value.isFeatured)
    }).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.galleryFile = null;
        this.galleryForm.reset({
          title: "",
          altText: "",
          caption: "",
          activityDate: "",
          isPublished: true,
          isFeatured: false
        });
        this.reloadGallery();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to upload the gallery image.";
      }
    });
  }

  setPublished(image: GalleryImage, isPublished: boolean): void {
    const galleryImageId = Number(image.galleryImageId || 0);

    if (!galleryImageId) {
      return;
    }

    this.feedback = "";
    this.error = "";

    this.galleryService.updateGalleryImage(galleryImageId, { isPublished }).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.reloadGallery();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to update the gallery image visibility.";
      }
    });
  }

  setFeatured(image: GalleryImage, isFeatured: boolean): void {
    const galleryImageId = Number(image.galleryImageId || 0);

    if (!galleryImageId) {
      return;
    }

    this.feedback = "";
    this.error = "";

    this.galleryService.updateGalleryImage(galleryImageId, { isFeatured }).subscribe({
      next: ({ message }) => {
        this.feedback = message;
        this.reloadGallery();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to update the featured image state.";
      }
    });
  }

  trackByGalleryImage(_index: number, image: GalleryImage): number {
    return Number(image.galleryImageId || 0);
  }

  openImage(image: GalleryImage): void {
    const imageUrl = String(image.imageUrl || "").trim();

    if (!imageUrl) {
      return;
    }

    this.imageLightbox.open({
      src: imageUrl,
      title: image.title,
      alt: image.altText || image.title
    });
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

    if (!this.galleryImages.length && !this.loading) {
      this.reloadGallery();
    }
  }

  private canOpenPage(user: CurrentUser): boolean {
    return user.accountType === "STAFF";
  }
}
