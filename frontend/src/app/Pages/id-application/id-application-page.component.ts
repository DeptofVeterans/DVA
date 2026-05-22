import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormBuilder, Validators } from "@angular/forms";
import { AuthService } from "../../core/services/auth.service";
import { ImageLightboxService } from "../../core/services/image-lightbox.service";
import { RequestsService } from "../../core/services/requests.service";
import { buildVeteransIdApplicationPdf } from "../../core/utils/veterans-id-pdf";
import { RequestSummary } from "../../models/app.models";

interface IdApplicationTypeCard {
  type: string;
  title: string;
  description: string;
  supportLabel: string;
}

interface IdSupportProfile {
  title: string;
  copy: string;
  checklist: string[];
}

interface IdGuidanceCard {
  kicker: string;
  title: string;
  points: string[];
}

@Component({
  selector: "app-id-application-page",
  templateUrl: "./id-application-page.component.html",
  styleUrls: ["./id-application-page.component.css"]
})
export class IdApplicationPageComponent implements OnInit {
  readonly applicationTypes = ["New", "Replacement", "Stolen", "Lost"];
  readonly genders = ["Male", "Female"];
  readonly bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
  readonly identificationTypes = ["Driver's License", "National ID", "Passport"];
  readonly applicationTypeCards: IdApplicationTypeCard[] = [
    {
      type: "New",
      title: "First issue for eligible veterans",
      description: "Use this route when applying for a Veteran's ID Card for the first time.",
      supportLabel: "Start new issue"
    },
    {
      type: "Replacement",
      title: "Renew, replace, or update an existing card",
      description: "Use this route when the card is expired, damaged, or being replaced through normal review.",
      supportLabel: "Open replacement route"
    },
    {
      type: "Stolen",
      title: "Report a stolen card for replacement review",
      description: "Use this route when the previous card has been stolen and immediate reporting is needed.",
      supportLabel: "Report stolen card"
    },
    {
      type: "Lost",
      title: "Report a lost card and restart the issue process",
      description: "Use this route when the previous card is lost and the department needs the replacement details.",
      supportLabel: "Report lost card"
    }
  ];

  readonly supportProfiles: Record<string, IdSupportProfile> = {
    New: {
      title: "New application support",
      copy: "This route is for the first issue of a Veteran's Identification Card once the veteran meets the service and eligibility rules.",
      checklist: [
        "Prepare service details, home address, and preferred identification type",
        "The declaration remains fixed and non-editable in the form",
        "Use the PDF action when a legal-size print-ready copy is needed"
      ]
    },
    Replacement: {
      title: "Replacement and renewal support",
      copy: "Use this route when the card has expired, is damaged, or needs normal replacement processing through the department.",
      checklist: [
        "Cards expire ten years from the issue date and must be renewed",
        "The listed card fee is J$1,000.00",
        "Official-use-only fields remain blank for department processing"
      ]
    },
    Stolen: {
      title: "Stolen card support",
      copy: "A stolen card should be reported immediately so the department can review the replacement request and next steps.",
      checklist: [
        "Report the stolen card to the DVA without delay",
        "Use the replacement route details in the same secure form flow",
        "Track status updates and pickup readiness in the dashboard"
      ]
    },
    Lost: {
      title: "Lost card support",
      copy: "A lost card must be reported immediately and moved into replacement review through the approved application route.",
      checklist: [
        "Lost cards should be reported immediately to the DVA",
        "Replacement remains subject to department review and approval",
        "Use the same secure request flow to track the card outcome"
      ]
    }
  };

  readonly guidanceCards: IdGuidanceCard[] = [
    {
      kicker: "Eligibility",
      title: "Who can receive the card",
      points: [
        "A veteran must have served at least three years in the regular or reserve force",
        "The card is issued through the Department of Veterans Affairs application route",
        "Restricted or dishonourably discharged applicants are not eligible"
      ]
    },
    {
      kicker: "Card use",
      title: "How the card works",
      points: [
        "The card is not a JDF Identification Card and must not be used as military identification",
        "Blue strip cards allow ingress to military bases only",
        "Red strip cards also support HSC medical consultations and reviews where eligible"
      ]
    },
    {
      kicker: "Renewal and control",
      title: "Expiry, replacement, and authority",
      points: [
        "The card expires ten years after issue and requires reapplication",
        "Lost, stolen, or damaged cards must be reported immediately",
        "The CDS may approve, deny, or revoke the card at any time"
      ]
    }
  ];

  submitting = false;
  showApplicationModal = false;
  requestsLoading = false;
  feedback = "";
  error = "";
  idRequests: RequestSummary[] = [];

  readonly form = this.formBuilder.group({
    application_type: ["New", Validators.required],
    surname: ["", Validators.required],
    rank: [""],
    full_name: ["", Validators.required],
    gender: ["Male", Validators.required],
    date_of_birth: ["", Validators.required],
    enlistment_date: [""],
    discharge_date: [""],
    total_service: [""],
    termination_reason: [""],
    service_number: [""],
    reference_number: [""],
    blood_group: [""],
    identification_type: ["Driver's License", Validators.required],
    phone: ["", Validators.required],
    email: ["", Validators.email],
    home_address: ["", Validators.required],
    declaration: [
      {
        value:
          "I, the undersigned, apply for the issue of a Veterans Identification Access and Medical Card. I declare that the information given in this application is correct and to the best of my knowledge and belief.",
        disabled: true
      }
    ],
    signature_name: ["", Validators.required],
    application_date: ["", Validators.required],
    notes: [""]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    public readonly auth: AuthService,
    private readonly requests: RequestsService,
    private readonly imageLightbox: ImageLightboxService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get("openForm") === "1") {
        this.openApplicationModal();
      }
    });

    const user = this.auth.currentUser;

    if (!user) {
      return;
    }

    const nameParts = user.fullName.split(" ");
    const surname = nameParts.pop() || "";
    const forenames = nameParts.join(" ");

    this.form.patchValue({
      surname,
      rank: user.rank,
      full_name: forenames,
      service_number: user.regimentalNumber,
      email: user.email,
      signature_name: user.fullName
    });

    this.loadIdRequests();
  }

  get activeApplicationType(): string {
    return String(this.form.get("application_type")?.value || "New");
  }

  get activeSupportProfile(): IdSupportProfile {
    return this.supportProfiles[this.activeApplicationType] || this.supportProfiles["New"];
  }

  get hasIdRequests(): boolean {
    return this.idRequests.length > 0;
  }

  selectApplicationType(type: string): void {
    this.form.get("application_type")?.setValue(type);
  }

  openApplicationModal(type?: string): void {
    if (type) {
      this.selectApplicationType(type);
    }

    this.showApplicationModal = true;

    if (!this.route.snapshot.queryParamMap.has("openForm")) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { openForm: 1 },
        queryParamsHandling: "merge",
        replaceUrl: true
      });
    }
  }

  closeApplicationModal(): void {
    this.showApplicationModal = false;

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
    if (this.showApplicationModal) {
      this.closeApplicationModal();
    }
  }

  submit(): void {
    this.feedback = "";
    this.error = "";

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = "Complete the required fields before submitting the application.";
      return;
    }

    this.submitting = true;
    const formData = this.form.getRawValue();

    if (!this.auth.isAuthenticated) {
      this.requests.createPublicVeteransIdApplication(formData).subscribe({
        next: (response) => {
          this.feedback = `Veteran ID application submitted successfully. Reference ${response.publicUuid}. Staff can review this public intake; sign in next time if you need dashboard tracking.`;
          this.submitting = false;
        },
        error: (error) => {
          this.error = error?.error?.message || "Unable to submit the ID application right now.";
          this.submitting = false;
        }
      });
      return;
    }

    this.requests.createRequest("VETERANS_ID_APPLICATION", formData).subscribe({
      next: (response) => {
        this.feedback = `Veteran ID request submitted successfully. Reference ${response.publicUuid}.`;
        this.submitting = false;
        this.loadIdRequests();
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to submit the ID application right now.";
        this.submitting = false;
      }
    });
  }

  async generatePdf(): Promise<void> {
    this.error = "";
    const values = this.form.getRawValue() as Record<string, unknown>;
    const previewWindow = window.open("", "_blank");

    try {
      const pdf = await buildVeteransIdApplicationPdf(values);
      const pdfUrl = pdf.output("bloburl").toString();

      if (previewWindow) {
        previewWindow.location.href = pdfUrl;
        previewWindow.focus();
        return;
      }

      pdf.save("veterans-id-application.pdf");
    } catch (error) {
      if (previewWindow && !previewWindow.closed) {
        previewWindow.close();
      }

      this.error = "Unable to generate the PDF application right now.";
      console.error(error);
    }
  }

  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return Boolean(control && control.invalid && (control.dirty || control.touched));
  }

  get previewApplicationType(): string {
    return String(this.form.get("application_type")?.value || "New");
  }

  get previewIdentificationType(): string {
    return String(this.form.get("identification_type")?.value || "Driver's License");
  }

  get previewServiceNumber(): string {
    return String(this.form.get("service_number")?.value || "").trim() || "Service No.";
  }

  openReferenceImage(): void {
    this.imageLightbox.open({
      src: "assets/Veteran_ID.png",
      title: "Veteran ID reference preview",
      alt: "Veteran ID reference image"
    });
  }

  requestReference(value: string | null | undefined): string {
    const code = String(value || "").trim();

    if (!code) {
      return "Reference pending";
    }

    return `Ref ${code.split("-")[0].toUpperCase()}`;
  }

  displayRequestCode(value: string | null | undefined): string {
    const code = String(value || "").trim();

    if (!code) {
      return "";
    }

    return code
      .split("-")
      .map((segment) => segment.toUpperCase())
      .join(" / ");
  }

  private loadIdRequests(): void {
    if (!this.auth.isAuthenticated) {
      this.idRequests = [];
      return;
    }

    this.requestsLoading = true;

    this.requests.getMyRequests().subscribe({
      next: ({ requests }) => {
        this.idRequests = (requests || [])
          .filter((request) => (request.request_type_code || request.requestTypeCode) === "VETERANS_ID_APPLICATION")
          .sort((a, b) => {
            const aDate = new Date(String(a.submitted_at || a.submittedAt || 0)).getTime();
            const bDate = new Date(String(b.submitted_at || b.submittedAt || 0)).getTime();
            return bDate - aDate;
          })
          .slice(0, 3);
        this.requestsLoading = false;
      },
      error: () => {
        this.idRequests = [];
        this.requestsLoading = false;
      }
    });
  }
}
