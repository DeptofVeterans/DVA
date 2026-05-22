import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, map, of, tap } from "rxjs";
import { environment } from "../../../environments/environment";
import { CurrentUser } from "../../models/app.models";
import { SessionService } from "./session.service";

interface AuthResponse {
  token?: string;
  user?: CurrentUser;
  message?: string;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  readonly user$ = this.session.user$;

  constructor(
    private readonly http: HttpClient,
    private readonly session: SessionService
  ) {
    if (this.getToken()) {
      this.loadCurrentUser().subscribe();
    }
  }

  get currentUser(): CurrentUser | null {
    return this.session.currentUser;
  }

  get isAuthenticated(): boolean {
    return !!this.session.currentUser && !!this.getToken();
  }

  getToken(): string | null {
    return this.session.getToken();
  }

  setSession(token: string, user: CurrentUser): void {
    this.session.setSession(token, user);
  }

  setCurrentUser(user: CurrentUser | null): void {
    this.session.setCurrentUser(user);
  }

  clearSession(): void {
    this.session.clearSession();
  }

  signupVeteran(payload: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/signup/veteran`, payload).pipe(
      tap((response) => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  signupStaff(payload: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/signup/staff`, payload);
  }

  bootstrapMainAdmin(payload: Record<string, unknown>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/bootstrap-main-admin`, payload).pipe(
      tap((response) => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, { email, password }).pipe(
      tap((response) => {
        if (response.token && response.user) {
          this.setSession(response.token, response.user);
        }
      })
    );
  }

  loadCurrentUser(): Observable<CurrentUser | null> {
    return this.http.get<{ user: CurrentUser }>(`${environment.apiBaseUrl}/auth/me`).pipe(
      map((response) => response.user),
      tap((user) => this.session.setCurrentUser(user)),
      catchError(() => {
        this.clearSession();
        return of(null);
      })
    );
  }

  logout(): void {
    this.clearSession();
  }
}
