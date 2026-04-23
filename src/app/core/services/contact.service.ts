import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";

export type PublicContactType =
  | "GENERAL_INQUIRY"
  | "CALLBACK_REQUEST"
  | "PARTNER_ORGANIZATION";

@Injectable({ providedIn: "root" })
export class ContactService {
  constructor(private readonly api: ApiService) {}

  submitContactSubmission(contactType: PublicContactType, formData: Record<string, unknown>) {
    return this.api.post<{ message: string; publicUuid: string }>("/public/contact-submissions", {
      contactType,
      formData
    });
  }
}
