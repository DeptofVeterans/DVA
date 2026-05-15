import { Component, HostListener } from "@angular/core";
import { ImageLightboxService } from "../../../core/services/image-lightbox.service";

@Component({
  selector: "app-image-lightbox",
  templateUrl: "./image-lightbox.component.html",
  styleUrls: ["./image-lightbox.component.css"]
})
export class ImageLightboxComponent {
  constructor(public readonly lightbox: ImageLightboxService) {}

  close(): void {
    this.lightbox.close();
  }

  @HostListener("document:keydown.escape")
  onEscapePressed(): void {
    this.close();
  }
}
