import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { FormBuilder, Validators } from "@angular/forms";
import { Observable, of, switchMap } from "rxjs";
import { Department } from "../../models/app.models";
import { AuthService } from "../../core/services/auth.service";
import { LookupService } from "../../core/services/lookup.service";

@Component({
  selector: "app-auth-page",
  templateUrl: "./auth-page.component.html",
  styleUrls: ["./auth-page.component.css"]
})
export class AuthPageComponent implements OnInit {
  mode: "login" | "signup" = "login";
  accountType: "veteran" | "staff" = "veteran";
  departments: Department[] = [];
  showBootstrapPanel = false;
  showLoginPassword = false;
  showVeteranPassword = false;
  showStaffPassword = false;
  showBootstrapPassword = false;
  submitting = false;
  feedback = "";
  error = "";
  redirectUrl = "";

  readonly loginForm = this.formBuilder.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", Validators.required]
  });

  readonly veteranForm = this.formBuilder.group({
    fullName: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    rank: ["", Validators.required],
    regimentalNumber: ["", [Validators.required, Validators.pattern(/^\d{4,5}$/)]]
  });

  readonly staffForm = this.formBuilder.group({
    fullName: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    rank: ["", Validators.required],
    regimentalNumber: ["", [Validators.required, Validators.pattern(/^\d{4,5}$/)]],
    requestedPrimaryDepartmentId: ["", Validators.required]
  });

  readonly bootstrapForm = this.formBuilder.group({
    bootstrapKey: ["", Validators.required],
    fullName: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required, Validators.minLength(8)]],
    rank: ["", Validators.required],
    regimentalNumber: ["", [Validators.required, Validators.pattern(/^\d{4,5}$/)]]
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly lookup: LookupService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params: ParamMap) => {
      const mode = params.get("mode");
      if (mode === "login" || mode === "signup") {
        this.mode = mode;
      }

      this.redirectUrl = String(params.get("redirectTo") || "");
    });

    this.lookup.getBootstrap().subscribe({
      next: (lookup) => {
        this.showBootstrapPanel = !lookup.hasMainAdmin;
        this.departments = lookup.departments;
      }
    });
  }

  setMode(mode: "login" | "signup"): void {
    this.mode = mode;
    this.feedback = "";
    this.error = "";
  }

  setAccountType(accountType: "veteran" | "staff"): void {
    this.accountType = accountType;
    this.feedback = "";
    this.error = "";
  }

  togglePasswordVisibility(target: "login" | "veteran" | "staff" | "bootstrap"): void {
    switch (target) {
      case "login":
        this.showLoginPassword = !this.showLoginPassword;
        break;
      case "veteran":
        this.showVeteranPassword = !this.showVeteranPassword;
        break;
      case "staff":
        this.showStaffPassword = !this.showStaffPassword;
        break;
      case "bootstrap":
        this.showBootstrapPassword = !this.showBootstrapPassword;
        break;
      default:
        break;
    }
  }

  submitLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.loginForm.getRawValue();
    this.runRequest(() => this.auth.login(String(email), String(password)), "Signed in successfully.");
  }

  submitVeteranSignup(): void {
    if (this.veteranForm.invalid) {
      this.veteranForm.markAllAsTouched();
      return;
    }

    const payload = this.veteranForm.getRawValue();
    const email = String(payload.email || "");
    const password = String(payload.password || "");

    this.runRequest(
      () =>
        this.auth.signupVeteran(payload).pipe(
          switchMap((response) => {
            if (this.auth.isAuthenticated) {
              return of(response);
            }

            return this.auth.login(email, password);
          })
        ),
      "Account created successfully."
    );
  }

  submitStaffSignup(): void {
    if (this.staffForm.invalid) {
      this.staffForm.markAllAsTouched();
      return;
    }

    const payload = this.staffForm.getRawValue();
    const selectedDepartment = this.departments.find(
      (department) => String(department.department_id) === String(payload.requestedPrimaryDepartmentId)
    );

    this.runRequest(
      () =>
        this.auth.signupStaff({
          ...payload,
          requestedPrimaryDepartmentId: Number(payload.requestedPrimaryDepartmentId),
          requestedDepartmentCode: selectedDepartment?.department_code || ""
        }),
      "Staff signup received. An administrator must approve the account before sign-in."
    );
  }

  submitBootstrap(): void {
    if (this.bootstrapForm.invalid) {
      this.bootstrapForm.markAllAsTouched();
      return;
    }

    this.runRequest(() => this.auth.bootstrapMainAdmin(this.bootstrapForm.getRawValue()), "Main admin bootstrap completed.");
  }

  hasError(formName: "login" | "veteran" | "staff" | "bootstrap", controlName: string): boolean {
    const form = {
      login: this.loginForm,
      veteran: this.veteranForm,
      staff: this.staffForm,
      bootstrap: this.bootstrapForm
    }[formName] as {
      get(path: string): { invalid: boolean; dirty: boolean; touched: boolean } | null;
    };
    const control = form.get(controlName);
    return Boolean(control && control.invalid && (control.dirty || control.touched));
  }

  private runRequest(requestFactory: () => Observable<unknown>, successMessage: string): void {
    this.submitting = true;
    this.feedback = "";
    this.error = "";

    requestFactory().subscribe({
      next: () => {
        this.feedback = successMessage;
        this.submitting = false;

        if (this.auth.isAuthenticated) {
          this.navigateAfterAuth();
        }
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to complete this action right now.";
        this.submitting = false;
      }
    });
  }

  private navigateAfterAuth(): void {
    if (this.redirectUrl.startsWith("/")) {
      this.router.navigateByUrl(this.redirectUrl);
      return;
    }

    this.router.navigate(["/dashboard"]);
  }
}
