import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, map, of, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { GalleryImage } from "../../models/app.models";
import { ApiService } from "./api.service";

@Injectable({ providedIn: "root" })
export class GalleryService {
  private readonly galleryState = new BehaviorSubject<GalleryImage[]>([]);

  readonly gallery$ = this.galleryState.asObservable();

  constructor(private readonly api: ApiService) {}

  get currentGallery(): GalleryImage[] {
    return this.galleryState.value;
  }

  loadPublicGallery(force = false): Observable<GalleryImage[]> {
    if (!force && this.galleryState.value.length) {
      return of(this.galleryState.value);
    }

    return this.api.get<{ images: GalleryImage[] }>("/portal/gallery").pipe(
      map(({ images }) => images.map((image) => this.normalizeImage(image))),
      tap((images) => this.galleryState.next(images))
    );
  }

  refreshPublicGallery(): void {
    this.loadPublicGallery(true).subscribe({
      error: () => {
        this.galleryState.next([]);
      }
    });
  }

  getManageGallery() {
    return this.api.get<{ images: GalleryImage[] }>("/portal/gallery-images/manage").pipe(
      map(({ images }) => ({
        images: images.map((image) => this.normalizeImage(image))
      }))
    );
  }

  uploadGalleryImage(payload: {
    file: File;
    title: string;
    caption?: string;
    altText: string;
    activityDate?: string;
    isPublished?: boolean;
    isFeatured?: boolean;
  }) {
    const formData = new FormData();
    formData.append("file", payload.file);
    formData.append("title", payload.title);
    formData.append("altText", payload.altText);
    formData.append("caption", payload.caption || "");
    formData.append("activityDate", payload.activityDate || "");
    formData.append("isPublished", String(payload.isPublished !== false));
    formData.append("isFeatured", String(Boolean(payload.isFeatured)));

    return this.api.postForm<{ message: string; image: GalleryImage | null }>("/portal/gallery-images", formData).pipe(
      map((response) => ({
        ...response,
        image: response.image ? this.normalizeImage(response.image) : null
      })),
      tap(() => this.refreshPublicGallery())
    );
  }

  updateGalleryImage(
    galleryImageId: number,
    payload: Partial<{
      title: string;
      caption: string;
      altText: string;
      activityDate: string;
      isPublished: boolean;
      isFeatured: boolean;
    }>
  ) {
    return this.api.patch<{ message: string }>(`/portal/gallery-images/${galleryImageId}`, payload).pipe(
      tap(() => this.refreshPublicGallery())
    );
  }

  private normalizeImage(image: GalleryImage): GalleryImage {
    const imageRoute = String(image.imageRoute || image.image_route || "");

    return {
      ...image,
      galleryImageId: Number(image.galleryImageId || image.gallery_image_id || 0),
      publicUuid: String(image.publicUuid || image.public_uuid || ""),
      altText: String(image.altText || image.alt_text || image.title || "Gallery image"),
      caption: image.caption || "",
      activityDate: String(image.activityDate || image.activity_date || ""),
      isPublished: Boolean(image.isPublished ?? image.is_published),
      isFeatured: Boolean(image.isFeatured ?? image.is_featured),
      imageRoute,
      imageUrl: imageRoute ? `${environment.apiBaseUrl}${imageRoute}` : ""
    };
  }
}
