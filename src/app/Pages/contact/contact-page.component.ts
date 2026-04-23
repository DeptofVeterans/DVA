import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { AuthService } from "../../core/services/auth.service";
import { ContactService, PublicContactType } from "../../core/services/contact.service";

type ContactLane = "general" | "callback" | "partner";

interface ContactLaneCard {
  lane: ContactLane;
  kicker: string;
  title: string;
  description: string;
}

interface ContactLaneDetail {
  kicker: string;
  title: string;
  copy: string;
  checklist: string[];
}

@Component({
  selector: "app-contact-page",
  templateUrl: "./contact-page.component.html",
  styleUrls: ["./contact-page.component.css"]
})
export class ContactPageComponent implements OnInit {
  activeLane: ContactLane = "general";
  submitting = false;
  feedback = "";
  error = "";

  readonly departmentOptions = [
    { label: "Outreach and Communication", value: "OUTREACH_COMMUNICATION" },
    { label: "Historical Records", value: "HISTORICAL_RECORDS" },
    { label: "Pension and Other Benefits", value: "PENSION_BENEFITS" },
    { label: "Resettlement and Employment", value: "RESETTLEMENT_EMPLOYMENT" },
    { label: "Welfare and Assistance", value: "WELFARE_ASSISTANCE" }
  ];

  readonly audienceOptions = [
    "Veteran",
    "Family member",
    "Caregiver",
    "Organization",
    "General public"
  ];

  readonly callbackWindows = [
    "Morning",
    "Midday",
    "Afternoon",
    "End of day"
  ];

  readonly partnershipTypes = [
    "Discount programme",
    "Employment opportunity",
    "Outreach partnership",
    "Insurance or welfare support",
    "General organization enquiry"
  ];

  readonly laneCards: ContactLaneCard[] = [
    {
      lane: "general",
      kicker: "General enquiry",
      title: "Ask a question or request guidance",
      description: "Use this lane for general public enquiries, veteran questions, and family follow-up."
    },
    {
      lane: "callback",
      kicker: "Callback request",
      title: "Ask the team to call you back",
      description: "Use this when a phone follow-up is the best way to guide the next step."
    },
    {
      lane: "partner",
      kicker: "Organizations",
      title: "Send partnership and outreach enquiries",
      description: "Use this for discounts, employment leads, and collaboration offers for veterans."
    }
  ];

  readonly laneDetails: Record<ContactLane, ContactLaneDetail> = {
    general: {
      kicker: "Public access",
      title: "General enquiries can be submitted without signing in.",
      copy: "Use this form for contact-center style questions when you need direction before starting a tracked request.",
      checklist: [
        "Choose the department that best matches the question",
        "Add a clear subject so the team can route it quickly",
        "Include enough detail for a useful written reply"
      ]
    },
    callback: {
      kicker: "Phone follow-up",
      title: "Callback requests help the team reach you directly.",
      copy: "This lane is good for family coordination, first-time guidance, or cases where the next step is easier by phone.",
      checklist: [
        "Phone number is required for this lane",
        "Add the best time window for a callback",
        "Include a short summary of what you need help with"
      ]
    },
    partner: {
      kicker: "Organization support",
      title: "Use the partner lane for veteran-facing opportunities.",
      copy: "This form works for organizations offering discounts, outreach support, employment openings, or service partnerships.",
      checklist: [
        "Add the organization and contact person clearly",
        "Choose the area the partnership should reach",
        "Include the offer details or next-step request"
      ]
    }
  };

  readonly generalForm = this.formBuilder.group({
    fullName: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    phone: [""],
    audience: ["Veteran"],
    departmentCode: ["OUTREACH_COMMUNICATION", Validators.required],
    subject: ["", Validators.required],
    message: ["", [Validators.required, Validators.minLength(12)]]
  });

  readonly callbackForm = this.formBuilder.group({
    fullName: ["", Validators.required],
    phone: ["", Validators.required],
    email: ["", Validators.email],
    departmentCode: ["OUTREACH_COMMUNICATION", Validators.required],
    callbackWindow: ["Morning"],
    serviceNumber: [""],
    reason: ["", Validators.required],
    message: ["", [Validators.required, Validators.minLength(12)]]
  });

  readonly partnerForm = this.formBuilder.group({
    organizationName: ["", Validators.required],
    contactPerson: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    phone: [""],
    website: [""],
    departmentCode: ["OUTREACH_COMMUNICATION", Validators.required],
    partnershipType: ["Discount programme", Validators.required],
    message: ["", [Validators.required, Validators.minLength(12)]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    public readonly auth: AuthService,
    private readonly contact: ContactService
  ) {}

  ngOnInit(): void {
    this.prefillFormsFromSession();
  }

  get activeLaneDetail(): ContactLaneDetail {
    return this.laneDetails[this.activeLane];
  }

  setLane(lane: ContactLane): void {
    this.activeLane = lane;
    this.feedback = "";
    this.error = "";
  }

  submitGeneral(): void {
    this.submitLane("GENERAL_INQUIRY", this.generalForm, "general");
  }

  submitCallback(): void {
    this.submitLane("CALLBACK_REQUEST", this.callbackForm, "callback");
  }

  submitPartner(): void {
    this.submitLane("PARTNER_ORGANIZATION", this.partnerForm, "partner");
  }

  hasError(lane: ContactLane, controlName: string): boolean {
    const control = this.getLaneForm(lane).get(controlName);
    return Boolean(control && control.invalid && (control.dirty || control.touched));
  }

  private submitLane(contactType: PublicContactType, form: FormGroup, lane: ContactLane): void {
    this.feedback = "";
    this.error = "";

    if (form.invalid) {
      form.markAllAsTouched();
      this.error = "Complete the required fields before sending the contact form.";
      return;
    }

    this.submitting = true;

    this.contact.submitContactSubmission(contactType, this.compactFormValue(form.getRawValue())).subscribe({
      next: (response) => {
        this.feedback = `Message sent successfully. Reference ${response.publicUuid}.`;
        this.submitting = false;
        this.resetLaneForm(lane);
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to send this contact form right now.";
        this.submitting = false;
      }
    });
  }

  private getLaneForm(lane: ContactLane): FormGroup {
    switch (lane) {
      case "general":
        return this.generalForm;
      case "callback":
        return this.callbackForm;
      case "partner":
        return this.partnerForm;
      default:
        return this.generalForm;
    }
  }

  private resetLaneForm(lane: ContactLane): void {
    switch (lane) {
      case "general":
        this.generalForm.reset({
          fullName: "",
          email: "",
          phone: "",
          audience: "Veteran",
          departmentCode: "OUTREACH_COMMUNICATION",
          subject: "",
          message: ""
        });
        break;
      case "callback":
        this.callbackForm.reset({
          fullName: "",
          phone: "",
          email: "",
          departmentCode: "OUTREACH_COMMUNICATION",
          callbackWindow: "Morning",
          serviceNumber: "",
          reason: "",
          message: ""
        });
        break;
      case "partner":
        this.partnerForm.reset({
          organizationName: "",
          contactPerson: "",
          email: "",
          phone: "",
          website: "",
          departmentCode: "OUTREACH_COMMUNICATION",
          partnershipType: "Discount programme",
          message: ""
        });
        break;
      default:
        break;
    }

    this.prefillFormsFromSession();
  }

  private compactFormValue(rawValue: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(rawValue).filter(([, value]) => {
        if (value === null || value === undefined) {
          return false;
        }

        if (typeof value === "string") {
          return value.trim().length > 0;
        }

        return true;
      })
    );
  }

  private prefillFormsFromSession(): void {
    const user = this.auth.currentUser;

    if (!user) {
      return;
    }

    this.generalForm.patchValue({
      fullName: this.generalForm.get("fullName")?.value || user.fullName,
      email: this.generalForm.get("email")?.value || user.email
    });

    this.callbackForm.patchValue({
      fullName: this.callbackForm.get("fullName")?.value || user.fullName,
      email: this.callbackForm.get("email")?.value || user.email,
      serviceNumber: this.callbackForm.get("serviceNumber")?.value || user.regimentalNumber
    });

    this.partnerForm.patchValue({
      contactPerson: this.partnerForm.get("contactPerson")?.value || user.fullName,
      email: this.partnerForm.get("email")?.value || user.email
    });
  }
}
