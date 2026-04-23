import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { CurrentUser } from "../../models/app.models";

@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly tokenKey = "jdf-va-token";
  private readonly userState = new BehaviorSubject<CurrentUser | null>(null);
  readonly user$ = this.userState.asObservable();

  get currentUser(): CurrentUser | null {
    return this.userState.value;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setSession(token: string, user: CurrentUser): void {
    localStorage.setItem(this.tokenKey, token);
    this.userState.next(user);
  }

  setCurrentUser(user: CurrentUser | null): void {
    this.userState.next(user);
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    this.userState.next(null);
  }
}
