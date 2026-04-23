import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, of, tap } from "rxjs";
import { EmploymentJobListing } from "../../models/app.models";
import { ApiService } from "./api.service";

interface JobsFeed {
  jobs: EmploymentJobListing[];
}

@Injectable({ providedIn: "root" })
export class PortalJobsService {
  private readonly jobsState = new BehaviorSubject<EmploymentJobListing[]>([]);

  readonly jobs$ = this.jobsState.asObservable();

  constructor(private readonly api: ApiService) {}

  get currentJobs(): EmploymentJobListing[] {
    return this.jobsState.value;
  }

  loadJobs(force = false): Observable<JobsFeed> {
    if (!force && this.jobsState.value.length) {
      return of({ jobs: this.jobsState.value });
    }

    return this.api.get<JobsFeed>("/portal/jobs").pipe(
      tap((response) => this.jobsState.next(response.jobs || []))
    );
  }

  refreshJobs(): void {
    this.loadJobs(true).subscribe({
      error: () => {
        this.jobsState.next([]);
      }
    });
  }

  createJob(payload: {
    jobTitle: string;
    organizationName: string;
    jobDescription: string;
    qualificationsText?: string;
    howToApply: string;
  }) {
    return this.api.post<{ message: string; job: EmploymentJobListing | null }>("/portal/jobs", payload).pipe(
      tap(() => this.refreshJobs())
    );
  }

  closeJob(jobId: number) {
    return this.api.patch<{ message: string }>(`/portal/jobs/${jobId}/close`, {}).pipe(
      tap(() => this.refreshJobs())
    );
  }
}
