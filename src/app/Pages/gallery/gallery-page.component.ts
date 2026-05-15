import { Component, OnInit } from "@angular/core";
import { AuthService } from "../../core/services/auth.service";
import { GalleryImage } from "../../models/app.models";
import { GalleryService } from "../../core/services/gallery.service";
import { ImageLightboxService } from "../../core/services/image-lightbox.service";

type GalleryFilterId = "all" | "featured" | "archive" | "uploads";

interface GalleryFilter {
  id: GalleryFilterId;
  label: string;
}

const STATIC_OUTREACH_IMAGES: GalleryImage[] = Array.from({ length: 13 }, (_value, index) => {
  const imageNumber = index + 1;
  const label = imageNumber.toString().padStart(2, "0");

  return {
    galleryImageId: -imageNumber,
    title: imageNumber === 1 ? "Outreach and welfare support" : `Outreach activity ${label}`,
    caption: "Photo from Veterans Affairs outreach, welfare support, and community engagement activity.",
    altText: imageNumber === 1 ? "Veterans Affairs outreach and welfare support activity" : `Veterans Affairs outreach activity ${label}`,
    imageUrl: `assets/images/gallery/outreach/Outreach_${imageNumber}.jpeg`,
    isFeatured: imageNumber === 1
  };
});

@Component({
  selector: "app-gallery-page",
  templateUrl: "./gallery-page.component.html",
  styleUrls: ["./gallery-page.component.css"]
})
export class GalleryPageComponent implements OnInit {
  loading = false;
  error = "";
  activeFilter: GalleryFilterId = "all";
  images: GalleryImage[] = [];

  readonly filters: GalleryFilter[] = [
    { id: "all", label: "All images" },
    { id: "featured", label: "Featured" },
    { id: "archive", label: "Outreach archive" },
    { id: "uploads", label: "Published uploads" }
  ];

  readonly staticImages = STATIC_OUTREACH_IMAGES;

  constructor(
    public readonly auth: AuthService,
    private readonly gallery: GalleryService,
    private readonly imageLightbox: ImageLightboxService
  ) {}

  ngOnInit(): void {
    this.loadGallery();
  }

  get allImages(): GalleryImage[] {
    return [...this.staticImages, ...this.images];
  }

  get featuredImage(): GalleryImage | null {
    return this.allImages.find((image) => Boolean(image.isFeatured)) || this.allImages[0] || null;
  }

  get leadImage(): GalleryImage | null {
    if (this.activeFilter === "featured") {
      return this.filteredImages[0] || null;
    }

    return this.featuredImage;
  }

  get gridImages(): GalleryImage[] {
    const lead = this.leadImage;

    if (!lead) {
      return this.filteredImages;
    }

    const leadKey = this.getGalleryImageKey(lead);
    return this.filteredImages.filter((image) => this.getGalleryImageKey(image) !== leadKey);
  }

  get filteredImages(): GalleryImage[] {
    const images = [...this.allImages].sort((left, right) => this.getImageSortValue(right) - this.getImageSortValue(left));

    switch (this.activeFilter) {
      case "featured":
        return images.filter((image) => Boolean(image.isFeatured));
      case "archive":
        return images.filter((image) => this.isArchiveImage(image));
      case "uploads":
        return images.filter((image) => !this.isArchiveImage(image));
      case "all":
      default:
        return images;
    }
  }

  get galleryStats(): Array<{ label: string; value: string }> {
    return [
      { label: "Total images", value: `${this.allImages.length}` },
      { label: "Archive images", value: `${this.allImages.filter((image) => this.isArchiveImage(image)).length}` },
      { label: "Published uploads", value: `${this.allImages.filter((image) => !this.isArchiveImage(image)).length}` }
    ];
  }

  get canManageGallery(): boolean {
    const user = this.auth.currentUser;

    if (!user) {
      return false;
    }

    return ["STAFF", "RECEPTION", "QM", "DIRECTOR", "MAIN_ADMIN"].includes(user.roleCode);
  }

  setFilter(filterId: GalleryFilterId): void {
    this.activeFilter = filterId;
  }

  filterCount(filterId: GalleryFilterId): number {
    switch (filterId) {
      case "featured":
        return this.allImages.filter((image) => Boolean(image.isFeatured)).length;
      case "archive":
        return this.allImages.filter((image) => this.isArchiveImage(image)).length;
      case "uploads":
        return this.allImages.filter((image) => !this.isArchiveImage(image)).length;
      case "all":
      default:
        return this.allImages.length;
    }
  }

  imageDateLabel(image: GalleryImage): string {
    const dateValue = String(image.activityDate || image.activity_date || "");

    if (!dateValue) {
      return this.isArchiveImage(image) ? "Archive image" : "Published image";
    }

    const timestamp = Date.parse(dateValue);

    if (Number.isNaN(timestamp)) {
      return dateValue;
    }

    return new Date(timestamp).toLocaleDateString("en-JM", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  trackByGalleryImage(index: number, image: GalleryImage): string | number {
    return this.getGalleryImageKey(image) || index;
  }

  openImage(image: GalleryImage | null): void {
    if (!image) {
      return;
    }

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

  private loadGallery(): void {
    this.loading = true;
    this.error = "";

    this.gallery.loadPublicGallery(true).subscribe({
      next: (images) => {
        this.images = images;
        this.loading = false;
      },
      error: () => {
        this.images = [];
        this.error = "Live gallery uploads are unavailable right now. The outreach archive is still available below.";
        this.loading = false;
      }
    });
  }

  isArchiveImage(image: GalleryImage): boolean {
    const galleryImageId = Number(image.galleryImageId || image.gallery_image_id || 0);
    const imageUrl = String(image.imageUrl || "");
    return (
      galleryImageId < 0 ||
      imageUrl.includes("/assets/images/gallery/outreach/") ||
      imageUrl.includes("assets/images/gallery/outreach/")
    );
  }

  private getGalleryImageKey(image: GalleryImage): string {
    return String(
      image.galleryImageId ||
      image.gallery_image_id ||
      image.publicUuid ||
      image.public_uuid ||
      image.imageUrl ||
      ""
    );
  }

  private getImageSortValue(image: GalleryImage): number {
    const dateValue = String(image.activityDate || image.activity_date || "");
    const timestamp = Date.parse(dateValue);

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }

    if (Boolean(image.isFeatured)) {
      return Number.MAX_SAFE_INTEGER - 1;
    }

    return this.isArchiveImage(image) ? 0 : 1;
  }
}
