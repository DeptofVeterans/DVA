import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { Router } from "@angular/router";
import { RequestFormConfig } from "../../../models/app.models";
import { AuthService } from "../../../core/services/auth.service";
import { RequestsService } from "../../../core/services/requests.service";

@Component({
  selector: "app-request-form",
  templateUrl: "./request-form.component.html",
  styleUrls: ["./request-form.component.css"]
})
export class RequestFormComponent implements OnChanges {
  @Input() config?: RequestFormConfig;
  @Input() initialValues?: Record<string, unknown>;

  form: FormGroup = this.formBuilder.group({});
  submitting = false;
  feedback = "";
  error = "";

  constructor(
    private readonly formBuilder: FormBuilder,
    public readonly auth: AuthService,
    private readonly requests: RequestsService,
    private readonly router: Router
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["config"] && this.config) {
      const controls: Record<string, unknown> = {};

      this.config.fields.forEach((field) => {
        controls[field.key] = [
          "",
          field.required ? [Validators.required] : []
        ];
      });

      this.form = this.formBuilder.group(controls);
      this.applyUserDefaults();
      this.applyInitialValues();
      return;
    }

    if (changes["initialValues"] && this.config) {
      this.applyInitialValues();
    }
  }

  submit(): void {
    this.feedback = "";
    this.error = "";

    if (!this.config) {
      return;
    }

    if (!this.auth.isAuthenticated) {
      this.error = "Sign in to submit this request.";
      this.router.navigate(["/signin"], { queryParams: { mode: "login" } });
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = "Complete the required fields before submitting.";
      return;
    }

    const value = this.form.getRawValue() as Record<string, unknown>;
    const requestTypeCode = this.config.resolveRequestTypeCode
      ? this.config.resolveRequestTypeCode(value)
      : this.config.defaultRequestTypeCode;

    if (!requestTypeCode) {
      this.error = "This form is missing a request type configuration.";
      return;
    }

    this.submitting = true;
    this.requests.createRequest(requestTypeCode, value).subscribe({
      next: (response) => {
        this.feedback = `Request submitted successfully. Reference ${response.publicUuid}.`;
        this.form.reset();
        this.applyUserDefaults();
        this.applyInitialValues();
        this.submitting = false;
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to submit the request right now.";
        this.submitting = false;
      }
    });
  }

  trackByKey(index: number, field: { key: string }): string {
    return `${index}-${field.key}`;
  }

  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return Boolean(control && control.invalid && (control.dirty || control.touched));
  }

  private applyUserDefaults(): void {
    const user = this.auth.currentUser;

    if (!user) {
      return;
    }

    const defaults: Record<string, string> = {
      full_name: user.fullName,
      email: user.email,
      phone: "",
      service_number: user.regimentalNumber,
      requestor_name: user.fullName,
      veteran_name: user.fullName
    };

    Object.entries(defaults).forEach(([key, value]) => {
      if (this.form.contains(key) && !this.form.get(key)?.value) {
        this.form.get(key)?.setValue(value);
      }
    });
  }

  private applyInitialValues(): void {
    if (!this.initialValues) {
      return;
    }

    Object.entries(this.initialValues).forEach(([key, value]) => {
      const control = this.form.get(key);

      if (!control || !this.form.contains(key) || control.value || value === undefined || value === null) {
        return;
      }

      control.setValue(value);
    });
  }
}
