import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export interface ImageLightboxState {
  src: string;
  title?: string;
  alt?: string;
}

@Injectable({
  providedIn: "root"
})
export class ImageLightboxService {
  private readonly stateSubject = new BehaviorSubject<ImageLightboxState | null>(null);

  readonly state$ = this.stateSubject.asObservable();

  open(state: ImageLightboxState): void {
    if (!state.src) {
      return;
    }

    this.stateSubject.next(state);
  }

  close(): void {
    this.stateSubject.next(null);
  }
}
