import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { FormBuilder, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { RequestsService } from "../../core/services/requests.service";
import { buildVeteransIdApplicationPdf } from "../../core/utils/veterans-id-pdf";

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

  submitting = false;
  showApplicationModal = false;
  feedback = "";
  error = "";

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
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      if (params.get("openForm") === "1") {
        if (!this.auth.isAuthenticated) {
          this.redirectToAuthForApplication();
          return;
        }

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
  }

  openApplicationModal(): void {
    if (!this.auth.isAuthenticated) {
      this.redirectToAuthForApplication();
      return;
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

    if (!this.auth.isAuthenticated) {
      this.redirectToAuthForApplication();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = "Complete the required fields before submitting the application.";
      return;
    }

    this.submitting = true;

    this.requests.createRequest("VETERANS_ID_APPLICATION", this.form.getRawValue()).subscribe({
      next: (response) => {
        this.feedback = `Veteran ID request submitted successfully. Reference ${response.publicUuid}.`;
        this.submitting = false;
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

  get previewFullName(): string {
    const forenames = String(this.form.get("full_name")?.value || "").trim();
    const surname = String(this.form.get("surname")?.value || "").trim();
    const combined = `${forenames} ${surname}`.trim();
    return combined || "Veteran Name";
  }

  get previewRank(): string {
    return String(this.form.get("rank")?.value || "").trim() || "Rank";
  }

  get previewServiceNumber(): string {
    return String(this.form.get("service_number")?.value || "").trim() || "Service No.";
  }

  get previewApplicationType(): string {
    return String(this.form.get("application_type")?.value || "New");
  }

  get previewIdentificationType(): string {
    return String(this.form.get("identification_type")?.value || "Driver's License");
  }

  private redirectToAuthForApplication(): void {
    const redirectTo = this.router.serializeUrl(
      this.router.createUrlTree(["/id"], {
        queryParams: { openForm: 1 }
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
