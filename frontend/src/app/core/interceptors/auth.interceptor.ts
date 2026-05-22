import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, catchError, throwError } from "rxjs";
import { SessionService } from "../services/session.service";

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private readonly session: SessionService,
    private readonly router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.session.getToken();

    const outboundRequest = token
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      : request;

    return next.handle(outboundRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && this.session.getToken()) {
          this.session.clearSession();
          this.router.navigate(["/signin"], { queryParams: { mode: "login" } });
        }

        return throwError(() => error);
      })
    );
  }
}
