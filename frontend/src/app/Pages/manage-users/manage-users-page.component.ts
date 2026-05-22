import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { forkJoin } from "rxjs";
import { AuthService } from "../../core/services/auth.service";
import { LookupBootstrap, LookupService } from "../../core/services/lookup.service";
import { RequestsService } from "../../core/services/requests.service";
import { CurrentUser, Department, ManagedUserSummary, RoleOption } from "../../models/app.models";

interface ManagedUserState {
  roleCode: string;
  isActive: boolean;
  departmentIds: number[];
  primaryDepartmentId: number | null;
}

@Component({
  selector: "app-manage-users-page",
  templateUrl: "./manage-users-page.component.html",
  styleUrls: ["./manage-users-page.component.css"]
})
export class ManageUsersPageComponent implements OnInit {
  currentUser: CurrentUser | null = null;
  lookup?: LookupBootstrap;
  users: ManagedUserSummary[] = [];
  userStates: Record<number, ManagedUserState> = {};
  searchTerm = "";
  loading = false;
  feedback = "";
  error = "";

  private initialized = false;

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly lookupService: LookupService,
    private readonly requestsService: RequestsService
  ) {}

  ngOnInit(): void {
    if (this.auth.currentUser) {
      this.handleUser(this.auth.currentUser);
    } else if (this.auth.getToken()) {
      this.auth.loadCurrentUser().subscribe({
        next: (user) => {
          if (!user) {
            this.router.navigate(["/signin"], { queryParams: { mode: "login" } });
          }
        }
      });
    } else {
      this.router.navigate(["/signin"], { queryParams: { mode: "login" } });
    }

    this.auth.user$.subscribe((user) => {
      this.handleUser(user);
    });
  }

  get filteredUsers(): ManagedUserSummary[] {
    const query = this.searchTerm.trim().toLowerCase();

    if (!query) {
      return this.users;
    }

    return this.users.filter((user) =>
      [
        user.display_name,
        user.full_name,
        user.email,
        user.rank,
        user.regimental_number,
        user.role_name,
        user.role_code,
        user.account_type
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  get departments(): Department[] {
    return this.lookup?.departments || [];
  }

  get totalUsers(): number {
    return this.users.length;
  }

  get activeUsers(): number {
    return this.users.filter((user) => Boolean(user.is_active)).length;
  }

  get staffUsers(): number {
    return this.users.filter((user) => user.account_type === "STAFF").length;
  }

  get veteranUsers(): number {
    return this.users.filter((user) => user.account_type === "VETERAN").length;
  }

  departmentSummary(user: ManagedUserSummary): string {
    if (!user.departments.length) {
      return user.account_type === "STAFF" ? "No departments assigned" : "Veteran account";
    }

    return user.departments.map((department) => department.departmentName).join(", ");
  }

  departmentNameById(departmentId: number | null): string {
    if (!departmentId) {
      return "Select primary department";
    }

    return this.departments.find((department) => department.department_id === departmentId)?.department_name || `Department ${departmentId}`;
  }

  roleOptionsFor(user: ManagedUserSummary): RoleOption[] {
    return (this.lookup?.roles || []).filter(
      (role) => role.role_code === this.userStates[user.user_id]?.roleCode || this.canAssignRole(role.role_code)
    );
  }

  canEditUser(user: ManagedUserSummary): boolean {
    return Boolean(user.can_manage);
  }

  selectedRoleIsStaff(userId: number): boolean {
    const roleCode = this.userStates[userId]?.roleCode;
    return (this.lookup?.roles || []).some((role) => role.role_code === roleCode && role.is_staff_role === 1);
  }

  toggleDepartment(userId: number, departmentId: number, checked: boolean): void {
    const state = this.userStates[userId];

    if (!state) {
      return;
    }

    if (checked) {
      state.departmentIds = Array.from(new Set([...state.departmentIds, departmentId]));
      if (!state.primaryDepartmentId) {
        state.primaryDepartmentId = departmentId;
      }
      return;
    }

    state.departmentIds = state.departmentIds.filter((id) => id !== departmentId);

    if (state.primaryDepartmentId === departmentId) {
      state.primaryDepartmentId = state.departmentIds[0] || null;
    }
  }

  resetUser(user: ManagedUserSummary): void {
    this.seedUserState(user);
    this.feedback = "";
    this.error = "";
  }

  saveUser(user: ManagedUserSummary): void {
    const state = this.userStates[user.user_id];

    if (!state) {
      return;
    }

    if (this.selectedRoleIsStaff(user.user_id) && !state.departmentIds.length) {
      this.error = "Assign at least one department to staff roles before saving.";
      this.feedback = "";
      return;
    }

    this.requestsService.updateManagedUser(user.user_id, {
      roleCode: state.roleCode,
      isActive: state.isActive,
      departmentIds: this.selectedRoleIsStaff(user.user_id) ? state.departmentIds : [],
      primaryDepartmentId: this.selectedRoleIsStaff(user.user_id) ? state.primaryDepartmentId : null
    }).subscribe({
      next: ({ message, user: updatedUser }) => {
        this.feedback = message;
        this.error = "";

        if (updatedUser) {
          this.users = this.users.map((item) => (item.user_id === updatedUser.user_id ? updatedUser : item));
          this.seedUserState(updatedUser);
        } else {
          this.reloadUsers();
        }
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to update this user right now.";
        this.feedback = "";
      }
    });
  }

  reloadUsers(): void {
    if (!this.currentUser || !this.canOpenPage(this.currentUser)) {
      return;
    }

    this.loading = true;
    this.error = "";

    forkJoin({
      lookup: this.lookupService.getBootstrap(),
      usersResponse: this.requestsService.getManagedUsers()
    }).subscribe({
      next: ({ lookup, usersResponse }) => {
        this.lookup = lookup;
        this.users = usersResponse.users;
        this.users.forEach((user) => this.seedUserState(user));
        this.loading = false;
      },
      error: (error) => {
        this.error = error?.error?.message || "Unable to load portal users right now.";
        this.loading = false;
      }
    });
  }

  humanizeCode(value: string | null | undefined): string {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private handleUser(user: CurrentUser | null): void {
    this.currentUser = user;

    if (!user) {
      return;
    }

    if (!this.canOpenPage(user)) {
      this.router.navigate(["/dashboard"]);
      return;
    }

    if (!this.initialized) {
      this.initialized = true;
      this.reloadUsers();
    }
  }

  private canOpenPage(user: CurrentUser): boolean {
    return ["DIRECTOR", "MAIN_ADMIN"].includes(user.roleCode);
  }

  private canAssignRole(roleCode: string): boolean {
    if (this.currentUser?.roleCode === "MAIN_ADMIN") {
      return true;
    }

    if (this.currentUser?.roleCode === "DIRECTOR") {
      return roleCode !== "MAIN_ADMIN";
    }

    return false;
  }

  private seedUserState(user: ManagedUserSummary): void {
    this.userStates[user.user_id] = {
      roleCode: user.role_code,
      isActive: Boolean(user.is_active),
      departmentIds: user.departments.map((department) => department.departmentId),
      primaryDepartmentId: user.departments.find((department) => department.isPrimary)?.departmentId || user.departments[0]?.departmentId || null
    };
  }
}
