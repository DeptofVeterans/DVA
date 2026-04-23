import { Injectable } from "@angular/core";
import { Observable, shareReplay } from "rxjs";
import { Department, LookupStatus, RequestType, RoleOption } from "../../models/app.models";
import { ApiService } from "./api.service";

export interface LookupBootstrap {
  hasMainAdmin: boolean;
  departments: Department[];
  requestTypes: RequestType[];
  statuses: LookupStatus[];
  roles: RoleOption[];
}

@Injectable({ providedIn: "root" })
export class LookupService {
  private readonly bootstrap$ = this.api.get<LookupBootstrap>("/lookups/bootstrap").pipe(shareReplay(1));

  constructor(private readonly api: ApiService) {}

  getBootstrap(): Observable<LookupBootstrap> {
    return this.bootstrap$;
  }
}
