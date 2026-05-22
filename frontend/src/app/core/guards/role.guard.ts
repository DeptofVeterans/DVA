import { Injectable } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from "@angular/router";
import { Observable, map, take } from "rxjs";
import { CurrentUser } from "../../models/app.models";
import { AuthService } from "../services/auth.service";

@Injectable({ providedIn: "root" })
export class RoleGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | boolean | UrlTree {
    const allowedRoles = (route.data["roles"] as string[] | undefined) || [];

    if (!allowedRoles.length) {
      return this.auth.isAuthenticated
        ? true
        : this.router.createUrlTree(["/signin"], { queryParams: { mode: "login" } });
    }

    if (this.auth.currentUser) {
      return this.resolveAccess(this.auth.currentUser, allowedRoles);
    }

    if (this.auth.getToken()) {
      return this.auth.loadCurrentUser().pipe(
        take(1),
        map((user) => this.resolveAccess(user, allowedRoles))
      );
    }

    return this.router.createUrlTree(["/signin"], { queryParams: { mode: "login" } });
  }

  private resolveAccess(user: CurrentUser | null, allowedRoles: string[]): boolean | UrlTree {
    if (!user) {
      return this.router.createUrlTree(["/signin"], { queryParams: { mode: "login" } });
    }

    return allowedRoles.includes(user.roleCode)
      ? true
      : this.router.createUrlTree(["/dashboard"]);
  }
}
