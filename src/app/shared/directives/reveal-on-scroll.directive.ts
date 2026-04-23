import { AfterViewInit, Directive, ElementRef, HostBinding, OnDestroy } from "@angular/core";

@Directive({
  selector: "[appRevealOnScroll]"
})
export class RevealOnScrollDirective implements AfterViewInit, OnDestroy {
  @HostBinding("class.reveal-on-scroll") readonly revealClass = true;
  @HostBinding("class.is-visible") isVisible = false;

  private observer?: IntersectionObserver;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      this.isVisible = true;
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          this.isVisible = true;
          this.observer?.unobserve(this.elementRef.nativeElement);
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -48px 0px"
      }
    );

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
