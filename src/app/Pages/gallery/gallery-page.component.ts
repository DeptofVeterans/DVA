import { Component, OnInit } from "@angular/core";
import { GalleryImage } from "../../models/app.models";
import { GalleryService } from "../../core/services/gallery.service";

const STATIC_OUTREACH_IMAGES: GalleryImage[] = Array.from({ length: 13 }, (_value, index) => {
  const imageNumber = index + 1;
  const label = imageNumber.toString().padStart(2, "0");

  return {
    galleryImageId: -imageNumber,
    title: imageNumber === 1 ? "Outreach and welfare support" : `Outreach activity ${label}`,
    caption: "Photo from Veterans Affairs outreach, welfare support, and community engagement activity.",
    altText: imageNumber === 1 ? "Veterans Affairs outreach and welfare support activity" : `Veterans Affairs outreach activity ${label}`,
    imageUrl: `/assets/images/gallery/outreach/Outreach_${imageNumber}.jpeg`
  };
});

@Component({
  selector: "app-gallery-page",
  templateUrl: "./gallery-page.component.html",
  styleUrls: ["./gallery-page.component.css"]
})
export class GalleryPageComponent implements OnInit {
  images: GalleryImage[] = [];
  loading = false;
  error = "";
  readonly staticImages = STATIC_OUTREACH_IMAGES;

  constructor(private readonly gallery: GalleryService) {}

  ngOnInit(): void {
    this.loadGallery();
  }

  get allImages(): GalleryImage[] {
    return [...this.staticImages, ...this.images];
  }

  get featuredImage(): GalleryImage | null {
    return this.allImages.find((image) => Boolean(image.isFeatured)) || this.allImages[0] || null;
  }

  get galleryGridImages(): GalleryImage[] {
    if (!this.featuredImage) {
      return this.allImages;
    }

    return this.allImages.filter(
      (image) => String(image.galleryImageId || image.gallery_image_id || image.imageUrl) !== String(this.featuredImage?.galleryImageId || this.featuredImage?.gallery_image_id || this.featuredImage?.imageUrl)
    );
  }

  trackByGalleryImage(index: number, image: GalleryImage): string | number {
    return image.galleryImageId || image.gallery_image_id || image.publicUuid || image.public_uuid || image.imageUrl || index;
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
}
