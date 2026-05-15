import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { PortalContentService } from "../../core/services/portal-content.service";
import { PortalJobsService } from "../../core/services/portal-jobs.service";
import { EmploymentJobListing, RequestFormConfig } from "../../models/app.models";

interface EmploymentSupportTrack {
  id: string;
  label: string;
  title: string;
  detail: string;
  routeNote: string;
  actionLabel: string;
  requestValue: string;
}

@Component({
  selector: "app-employment-page",
  templateUrl: "./employment-page.component.html",
  styleUrls: ["./employment-page.component.css"]
})
export class EmploymentPageComponent implements OnInit {
  showRequestModal = false;
  jobsLoading = false;
  jobsError = "";
  jobsFeedback = "";
  postingJob = false;
  showPostComposer = false;
  closingJobId: number | null = null;
  activeTrackId = "resume";
  searchQuery = "";
  expandedJobId: number | null = null;
  selectedJobId: number | null = null;
  jobListings: EmploymentJobListing[] = [];

  readonly page = this.content.getPage("employment");
  readonly employmentFormConfig?: RequestFormConfig;
  readonly jobDraft = {
    jobTitle: "",
    organizationName: "",
    jobDescription: "",
    qualificationsText: "",
    howToApply: ""
  };

  readonly supportTracks: EmploymentSupportTrack[] = [
    {
      id: "resume",
      label: "Career tools",
      title: "Resume creation support",
      detail: "Build or refresh a civilian-ready resume, profile, and supporting career materials before applications begin.",
      routeNote: "Employment support lane",
      actionLabel: "Start resume support",
      requestValue: "RESUME_CREATION_SUPPORT"
    },
    {
      id: "interview",
      label: "Workshop",
      title: "Interviewing workshop",
      detail: "Prepare for civilian interviews, confidence-building sessions, and practical question-and-answer support.",
      routeNote: "Employment support lane",
      actionLabel: "Book interview support",
      requestValue: "INTERVIEWING_WORKSHOP"
    },
    {
      id: "resettlement",
      label: "Transition",
      title: "Resettlement plan",
      detail: "Map the move from service into employment goals, training needs, and structured next-step planning.",
      routeNote: "Employment support lane",
      actionLabel: "Open resettlement planning",
      requestValue: "RESETTLEMENT_PLAN"
    },
    {
      id: "job-bank",
      label: "Job bank",
      title: "Job Bank support",
      detail: "Use the employment desk to route veterans into suitable openings, employer-facing opportunities, and tracked follow-up.",
      routeNote: "Job opportunity lane",
      actionLabel: "Open job bank support",
      requestValue: "JOB_BANK_SUPPORT"
    },
    {
      id: "placement",
      label: "Placement",
      title: "Job placement assistance",
      detail: "Use placement support when a veteran is already moving through a specific opening or introduction pathway.",
      routeNote: "Job opportunity lane",
      actionLabel: "Request placement help",
      requestValue: "JOB_PLACEMENT_ASSISTANCE"
    },
    {
      id: "job-intake",
      label: "Opportunity",
      title: "Job opportunities intake",
      detail: "Start a tracked opportunity request when the veteran needs help identifying openings or being routed to the correct employer lane.",
      routeNote: "Job opportunity lane",
      actionLabel: "Open opportunity intake",
      requestValue: "JOB_OPPORTUNITIES_INTAKE"
    },
    {
      id: "employer-intro",
      label: "Employer link",
      title: "Employer introduction request",
      detail: "Use this route when a veteran needs a warm introduction, department follow-up, or employer-facing contact support.",
      routeNote: "Job opportunity lane",
      actionLabel: "Request introduction",
      requestValue: "EMPLOYER_INTRODUCTION_REQUEST"
    }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly content: PortalContentService,
    private readonly portalJobs: PortalJobsService
  ) {
    this.employmentFormConfig = this.content.getRequestForm("employment");
  }

  ngOnInit(): void {
    this.loadEmploymentJobs();

    this.route.queryParamMap.subscribe(() => {
      this.syncStateFromRoute();
    });
  }

  get topTracks(): EmploymentSupportTrack[] {
    return this.supportTracks.slice(0, 3);
  }

  get opportunityTracks(): EmploymentSupportTrack[] {
    return this.supportTracks.slice(3);
  }

  get activeTrack(): EmploymentSupportTrack {
    return this.supportTracks.find((track) => track.id === this.activeTrackId) || this.supportTracks[0];
  }

  get requestFormInitialValues(): Record<string, unknown> {
    return {
      requestTypeCode: this.activeTrack.requestValue
    };
  }

  get selectedJob(): EmploymentJobListing | undefined {
    return this.jobListings.find((job) => this.getJobId(job) === this.selectedJobId);
  }

  get filteredJobs(): EmploymentJobListing[] {
    const query = this.searchQuery.trim().toLowerCase();
    const jobs = [...this.jobListings]
      .filter((job) => this.isJobActive(job))
      .sort((left, right) => this.getPostedTimestamp(right) - this.getPostedTimestamp(left));

    if (!query) {
      return jobs;
    }

    return jobs.filter((job) =>
      [
        this.jobTitle(job),
        this.jobOrganization(job),
        this.jobDescription(job),
        this.jobQualifications(job),
        this.jobHowToApply(job)
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  get openJobsCount(): number {
    return this.jobListings.filter((job) => this.isJobActive(job)).length;
  }

  get searchSummaryLabel(): string {
    if (this.jobsLoading) {
      return "Loading open jobs";
    }

    if (this.searchQuery.trim()) {
      return `${this.filteredJobs.length} matching opening${this.filteredJobs.length === 1 ? "" : "s"}`;
    }

    return `${this.openJobsCount} live opening${this.openJobsCount === 1 ? "" : "s"}`;
  }

  get canManageEmploymentJobs(): boolean {
    const user = this.auth.currentUser;

    if (!user) {
      return false;
    }

    if (["MAIN_ADMIN", "DIRECTOR", "QM"].includes(user.roleCode)) {
      return true;
    }

    return (user.departments || []).some((department) => department.departmentCode === "RESETTLEMENT_EMPLOYMENT");
  }

  selectTrack(trackId: string): void {
    const track = this.supportTracks.find((item) => item.id === trackId);

    if (!track) {
      return;
    }

    this.activeTrackId = track.id;
  }

  toggleJobDetails(job: EmploymentJobListing): void {
    const jobId = this.getJobId(job);
    this.expandedJobId = this.expandedJobId === jobId ? null : jobId;
  }

  isJobExpanded(job: EmploymentJobListing): boolean {
    return this.expandedJobId === this.getJobId(job);
  }

  openRequestModal(trackId = this.activeTrackId, job?: EmploymentJobListing): void {
    if (!this.employmentFormConfig) {
      return;
    }

    this.selectTrack(trackId);
    this.selectedJobId = job ? this.getJobId(job) : null;

    if (!this.auth.isAuthenticated) {
      this.redirectToAuthForRequest();
      return;
    }

    this.showRequestModal = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        openForm: 1,
        focus: this.activeTrack.id,
        job: this.selectedJobId || null
      },
      queryParamsHandling: "merge",
      replaceUrl: true
    });
  }

  closeRequestModal(): void {
    this.showRequestModal = false;
    this.selectedJobId = null;

    if (this.route.snapshot.queryParamMap.has("openForm") || this.route.snapshot.queryParamMap.has("focus") || this.route.snapshot.queryParamMap.has("job")) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          openForm: null,
          focus: null,
          job: null
        },
        queryParamsHandling: "merge",
        replaceUrl: true
      });
    }
  }

  togglePostComposer(): void {
    this.showPostComposer = !this.showPostComposer;
  }

  createEmploymentJob(): void {
    this.jobsFeedback = "";
    this.jobsError = "";

    if (!this.canManageEmploymentJobs) {
      this.jobsError = "You do not have permission to post employment opportunities.";
      return;
    }

    if (!this.jobDraft.jobTitle.trim() || !this.jobDraft.organizationName.trim() || !this.jobDraft.jobDescription.trim() || !this.jobDraft.howToApply.trim()) {
      this.jobsError = "Job title, organization, description, and how to apply are required.";
      return;
    }

    this.postingJob = true;

    this.portalJobs.createJob({
      jobTitle: this.jobDraft.jobTitle,
      organizationName: this.jobDraft.organizationName,
      jobDescription: this.jobDraft.jobDescription,
      qualificationsText: this.jobDraft.qualificationsText,
      howToApply: this.jobDraft.howToApply
    }).subscribe({
      next: () => {
        this.jobsFeedback = "Job opportunity posted.";
        this.postingJob = false;
        this.showPostComposer = false;
        this.clearJobDraft();
        this.loadEmploymentJobs(true);
      },
      error: (error) => {
        this.jobsError = error?.error?.message || "Unable to post this job right now.";
        this.postingJob = false;
      }
    });
  }

  closeEmploymentJob(job: EmploymentJobListing): void {
    const jobId = this.getJobId(job);

    if (!jobId || !this.canManageEmploymentJobs) {
      return;
    }

    this.jobsFeedback = "";
    this.jobsError = "";
    this.closingJobId = jobId;

    this.portalJobs.closeJob(jobId).subscribe({
      next: () => {
        this.jobsFeedback = "Job opportunity closed.";
        this.closingJobId = null;
        this.expandedJobId = this.expandedJobId === jobId ? null : this.expandedJobId;
        this.selectedJobId = this.selectedJobId === jobId ? null : this.selectedJobId;
        this.loadEmploymentJobs(true);
      },
      error: (error) => {
        this.jobsError = error?.error?.message || "Unable to close this job right now.";
        this.closingJobId = null;
      }
    });
  }

  jobTitle(job: EmploymentJobListing): string {
    return String(job.jobTitle || job.job_title || "");
  }

  jobOrganization(job: EmploymentJobListing): string {
    return String(job.organizationName || job.organization_name || "");
  }

  jobDescription(job: EmploymentJobListing): string {
    return String(job.jobDescription || job.job_description || "");
  }

  jobQualifications(job: EmploymentJobListing): string {
    return String(job.qualificationsText || job.qualifications_text || "");
  }

  jobHowToApply(job: EmploymentJobListing): string {
    return String(job.howToApply || job.how_to_apply || "");
  }

  jobPostedAt(job: EmploymentJobListing): string {
    const value = String(job.postedAt || job.posted_at || "");

    if (!value) {
      return "Recently posted";
    }

    const timestamp = Date.parse(value);

    if (Number.isNaN(timestamp)) {
      return value;
    }

    return new Date(timestamp).toLocaleDateString("en-JM", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  @HostListener("document:keydown.escape")
  onEscapePressed(): void {
    if (this.showRequestModal) {
      this.closeRequestModal();
    }
  }

  private loadEmploymentJobs(force = false): void {
    this.jobsLoading = true;
    this.jobsError = "";

    this.portalJobs.loadJobs(force).subscribe({
      next: (response) => {
        this.jobListings = response.jobs || [];
        this.jobsLoading = false;
      },
      error: () => {
        this.jobListings = [];
        this.jobsLoading = false;
        this.jobsError = "Unable to load open jobs right now.";
      }
    });
  }

  private syncStateFromRoute(): void {
    const focus = this.route.snapshot.queryParamMap.get("focus");
    const jobId = Number(this.route.snapshot.queryParamMap.get("job") || 0);

    if (focus) {
      this.selectTrack(focus);
    }

    this.selectedJobId = jobId > 0 ? jobId : null;

    const wantsOpenForm = Boolean(this.employmentFormConfig && this.route.snapshot.queryParamMap.get("openForm") === "1");

    if (wantsOpenForm && !this.auth.isAuthenticated) {
      this.showRequestModal = false;
      this.redirectToAuthForRequest();
      return;
    }

    this.showRequestModal = wantsOpenForm;
  }

  private redirectToAuthForRequest(): void {
    const redirectTo = this.router.serializeUrl(
      this.router.createUrlTree([], {
        relativeTo: this.route,
        queryParams: {
          openForm: 1,
          focus: this.activeTrack.id,
          job: this.selectedJobId || null
        },
        queryParamsHandling: "merge"
      })
    );

    this.router.navigate(["/signin"], {
      queryParams: {
        mode: "login",
        redirectTo
      }
    });
  }

  private clearJobDraft(): void {
    this.jobDraft.jobTitle = "";
    this.jobDraft.organizationName = "";
    this.jobDraft.jobDescription = "";
    this.jobDraft.qualificationsText = "";
    this.jobDraft.howToApply = "";
  }

  private getJobId(job: EmploymentJobListing): number {
    return Number(job.jobId || job.employment_job_listing_id || 0);
  }

  private getPostedTimestamp(job: EmploymentJobListing): number {
    const timestamp = Date.parse(String(job.postedAt || job.posted_at || ""));
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private isJobActive(job: EmploymentJobListing): boolean {
    const value = job.isActive ?? job.is_active;

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    return true;
  }
}
