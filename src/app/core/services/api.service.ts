import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  get<T>(path: string) {
    return this.http.get<T>(`${environment.apiBaseUrl}${path}`);
  }

  getBlob(path: string) {
    return this.http.get(`${environment.apiBaseUrl}${path}`, { responseType: "blob" });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(`${environment.apiBaseUrl}${path}`, body);
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(`${environment.apiBaseUrl}${path}`, body);
  }

  postForm<T>(path: string, formData: FormData) {
    return this.http.post<T>(`${environment.apiBaseUrl}${path}`, formData);
  }
}
