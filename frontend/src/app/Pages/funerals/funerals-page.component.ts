import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { ImageLightboxService } from "../../core/services/image-lightbox.service";
import { PortalContentService } from "../../core/services/portal-content.service";
import { RequestFormConfig } from "../../models/app.models";

interface FuneralServiceCard {
  id: string;
  label: string;
  title: string;
  description: string;
  actionLabel: string;
  relatedSupportTypes: string[];
  costHeadline?: string;
  detailTitle: string;
  detailCopy: string;
  detailPoints: string[];
}

interface FuneralProcessStep {
  step: number;
  title: string;
  description: string;
}

interface FuneralFaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: "app-funerals-page",
  templateUrl: "./funerals-page.component.html",
  styleUrls: ["./funerals-page.component.css"]
})
export class FuneralsPageComponent implements OnInit {
  showRequestModal = false;
  activeServiceId = "burial";
  selectedSupportType = "Burial arrangement";
  readonly page = this.content.getPage("funerals");
  readonly funeralsFormConfig?: RequestFormConfig;

  readonly serviceCards: FuneralServiceCard[] = [
    {
      id: "burial",
      label: "Burial support",
      title: "Arrange burial guidance and burial-day timing",
      description: "Use this lane for half-vault cost guidance, burial windows, overtime notes, and graveside coordination.",
      actionLabel: "Open burial support",
      relatedSupportTypes: ["Burial arrangement", "General funeral coordination"],
      costHeadline: "$58,100 half vault",
      detailTitle: "Briggs Park burial guidance",
      detailCopy: "All graves at Briggs Park Cemetery, Up Park Camp, are built as double vaults and follow published burial windows.",
      detailPoints: [
        "Morning burials begin at 10:00 am",
        "Afternoon burials begin at 2:00 pm",
        "Afternoon burial overtime charge: $2,800.00",
        "Buglers are provided at the burial to sound the Last Post and reveille"
      ]
    },
    {
      id: "tombing",
      label: "Tombing procedure",
      title: "Follow the two-stage tombing process correctly",
      description: "Use this lane when the family needs to understand stage-one administration and stage-two headstone arrangements.",
      actionLabel: "Open tombing support",
      relatedSupportTypes: ["Tombing procedure", "General funeral coordination"],
      costHeadline: "$10,100 + $140,000",
      detailTitle: "Headstone and tombing stages",
      detailCopy: "Tombing is separated into the initial administrative stage and the direct headstone purchase stage.",
      detailPoints: [
        "Stage 1 administrative and laying cost: $10,100.00",
        "After payment, proof of payment is submitted to the department",
        "The department issues the letter to Creative Stones",
        "Stage 2 headstone price listed: $140,000.00, payable to Creative Stones"
      ]
    },
    {
      id: "church",
      label: "Church and venue",
      title: "Plan church, wake, and repast requests",
      description: "Use this lane for church use, venue coordination, organist support, and wake or repast planning.",
      actionLabel: "Open church support",
      relatedSupportTypes: ["Church request", "Wake or repast venue"],
      costHeadline: "$9,500 church fee",
      detailTitle: "Church and venue arrangements",
      detailCopy: "Families can request church use, wake venues, and repast planning through the funeral support lane.",
      detailPoints: [
        "Garrison Church of Ascension, Up Park Camp, Kingston 5 may be requested",
        "Church fee listed: $9,500.00",
        "Organist additional cost listed: $15,000.00",
        "Wake and repast requests can include the Warrant Officers Mess and Cricket Pavilion"
      ]
    },
    {
      id: "family",
      label: "Family follow-up",
      title: "Keep Last Post, receipts, and family support together",
      description: "Use this lane when the family needs follow-up after payment, proof-of-payment support, or broader coordination.",
      actionLabel: "Open family support",
      relatedSupportTypes: ["Last Post and bugler support", "General funeral coordination"],
      costHeadline: "Receipt and home address",
      detailTitle: "Proof-of-payment and family coordination",
      detailCopy: "Funeral support includes payment routing, receipt review, and proof-of-payment letter generation once a receipt is submitted.",
      detailPoints: [
        "The submitted home address is used for proof-of-payment letter generation",
        "Burial-related payments go through the JDF Welfare Fund",
        "Church-related payments go through the JDF Garrison Church Council Fund",
        "Unannounced cemetery visits are not permitted; all visits are scheduled through the department"
      ]
    }
  ];

  readonly processSteps: FuneralProcessStep[] = [
    {
      step: 1,
      title: "Choose the funeral support lane",
      description: "Start with burial, tombing, church and venue support, or family coordination depending on what the family needs first."
    },
    {
      step: 2,
      title: "Use the correct payment route",
      description: "Burial payments, church payments, and headstone payments follow different routes and should not be mixed."
    },
    {
      step: 3,
      title: "Submit receipts and home address",
      description: "Receipt review and the home address field support proof-of-payment letter generation when it is needed."
    },
    {
      step: 4,
      title: "Track status and next steps",
      description: "Follow the secure request in the dashboard while staff coordinate family support, documents, and responses."
    }
  ];

  readonly faqs: FuneralFaqItem[] = [
    {
      question: "What is the listed burial cost at Briggs Park Cemetery?",
      answer: "The published half-vault burial cost is $58,100.00, with an additional overtime fee for afternoon burials."
    },
    {
      question: "How does the tombing process work?",
      answer: "Tombing happens in two stages: stage one covers administrative costs and the letter process, while stage two is the direct headstone purchase with Creative Stones."
    },
    {
      question: "Why is the home address required on the funeral form?",
      answer: "The home address is used when staff prepare the proof-of-payment letter after a receipt is submitted and reviewed."
    },
    {
      question: "What family items still need to be provided?",
      answer: "For wake or repast support, the family is expected to provide caterers, chairs, and tables."
    }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly imageLightbox: ImageLightboxService,
    private readonly content: PortalContentService
  ) {
    this.funeralsFormConfig = this.content.getRequestForm("funerals");
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(() => {
      this.syncRequestModalFromRoute();
    });
  }

  get activeService(): FuneralServiceCard {
    return this.serviceCards.find((item) => item.id === this.activeServiceId) || this.serviceCards[0];
  }

  get requestFormInitialValues(): Record<string, unknown> {
    return {
      support_type: this.selectedSupportType
    };
  }

  selectService(serviceId: string): void {
    const service = this.serviceCards.find((item) => item.id === serviceId);

    if (!service) {
      return;
    }

    this.activeServiceId = service.id;
    this.selectedSupportType = service.relatedSupportTypes[0];
  }

  selectSupportType(option: string): void {
    this.selectedSupportType = option;
  }

  openHeroImage(): void {
    this.imageLightbox.open({
      src: "/assets/images/funerals/funeral_flowers.jpeg",
      title: "Funeral floral arrangement",
      alt: "Funeral floral arrangement"
    });
  }

  openRequestModal(): void {
    if (!this.funeralsFormConfig) {
      return;
    }

    if (!this.auth.isAuthenticated) {
      this.redirectToAuthForRequest();
      return;
    }

    this.showRequestModal = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { openForm: 1 },
      queryParamsHandling: "merge",
      replaceUrl: true
    });
  }

  closeRequestModal(): void {
    this.showRequestModal = false;

    if (this.route.snapshot.queryParamMap.has("openForm")) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { openForm: null },
        queryParamsHandling: "merge",
        replaceUrl: true
      });
    }
  }

  @HostListener("document:keydown.escape")
  onEscapePressed(): void {
    if (this.showRequestModal) {
      this.closeRequestModal();
    }
  }

  private syncRequestModalFromRoute(): void {
    const wantsOpenForm = Boolean(this.funeralsFormConfig && this.route.snapshot.queryParamMap.get("openForm") === "1");

    if (wantsOpenForm && !this.auth.isAuthenticated) {
      this.showRequestModal = false;
      this.redirectToAuthForRequest();
      return;
    }

    this.showRequestModal = wantsOpenForm;
  }

  private redirectToAuthForRequest(): void {
    const redirectTo = this.router.serializeUrl(
      this.router.createUrlTree([], {
        relativeTo: this.route,
        queryParams: { openForm: 1 },
        queryParamsHandling: "merge"
      })
    );

    this.router.navigate(["/signin"], {
      queryParams: {
        mode: "login",
        redirectTo
      }
    });
  }
}
