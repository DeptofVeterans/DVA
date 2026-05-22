import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { PortalContentService } from "../../core/services/portal-content.service";
import { RequestFormConfig } from "../../models/app.models";

interface InsuranceLaneSummary {
  id: string;
  label: string;
  title: string;
  detail: string;
  coverageLabel: string;
  supportOptions: string[];
}

interface InsuranceInfoCard {
  kicker: string;
  title: string;
  description?: string;
  checklist?: string[];
  dark?: boolean;
}

interface InsuranceTable {
  title: string;
  columns: string[];
  rows: string[][];
  note?: string;
}

interface InsuranceSection {
  eyebrow: string;
  title: string;
  copy?: string;
  cards?: InsuranceInfoCard[];
  tables?: InsuranceTable[];
}

@Component({
  selector: "app-insurance-page",
  templateUrl: "./insurance-page.component.html",
  styleUrls: ["./insurance-page.component.css"]
})
export class InsurancePageComponent implements OnInit {
  showRequestModal = false;
  activeLaneId = "group-health";
  selectedSupportOption = "Group Health Plan";
  readonly page = this.content.getPage("insurance");
  readonly insuranceFormConfig?: RequestFormConfig;

  readonly laneSummaries: InsuranceLaneSummary[] = [
    {
      id: "group-health",
      label: "Core cover",
      title: "Group health guidance",
      detail: "Review dependants, health cards, claims preparation, and the everyday service limits in the main plan.",
      coverageLabel: "3 guidance cards + 2 benefit tables",
      supportOptions: ["Group Health Plan", "Claims or authorization"]
    },
    {
      id: "major-medical",
      label: "Claims and limits",
      title: "Major medical and hospital support",
      detail: "Move through major medical, hospitalization, and dental or optical exclusions with the right support route.",
      coverageLabel: "3 core tables + exclusions",
      supportOptions: ["Claims or authorization", "Dental and Optical"]
    },
    {
      id: "supplemental",
      label: "Optional plans",
      title: "Supplemental rates and family plans",
      detail: "Compare critical illness, life, parental health, prescription, health plus, and family-life options on one page.",
      coverageLabel: "7 rate tables + family life options",
      supportOptions: [
        "Critical Illness",
        "Supplemental Life",
        "Parental Health",
        "Dental and Optical",
        "Prescription Drugs",
        "Supplemental Health Plus",
        "Family Life"
      ]
    }
  ];

  private readonly laneSections: Record<string, InsuranceSection[]> = {
    "group-health": [
      {
        eyebrow: "Insurance Overview",
        title: "Core guidance for health cards, dependants, claims, and authorization.",
        cards: [
          {
            kicker: "Eligible Dependants",
            title: "Who can be added to the group plan",
            checklist: [
              "Spouse, including common law spouse",
              "Children, step-children, legally adopted children, or children under court-appointed guardianship",
              "Coverage extends to newborn children resident in Jamaica from birth up to age twenty-six",
              "Name, marital, and dependant changes should be reported through the company representative"
            ]
          },
          {
            kicker: "Health Cards",
            title: "Each member receives two cards",
            checklist: [
              "A plastic magnetic swipe card for pharmacies and some lab and x-ray locations",
              "A plastic benefit card for general plan reference",
              "Lost or stolen cards should be reported immediately",
              "Unauthorized use is treated as fraud and replacement cards attract the normal charge"
            ],
            dark: true
          },
          {
            kicker: "Claims and Authorization",
            title: "Important notes before treatment or reimbursement",
            checklist: [
              "R&C means reasonable and customary charges at normal community fee levels",
              "Some benefits require pre-authorization before treatment except in emergencies",
              "Claims should be submitted within ninety days of receiving services",
              "Reimbursement claims should include diagnosis, referring doctor, provider details, services, and amount paid"
            ]
          }
        ]
      },
      {
        eyebrow: "Group Health Benefits",
        title: "Core health cover and service limits",
        copy: "These items outline the main service caps and limits for the group health plan.",
        tables: [
          {
            title: "Doctor's visit and outpatient limits",
            columns: ["Service", "Maximum Benefit"],
            rows: [
              ["Office Visits (Unlimited)", "$2,000"],
              ["Home Visits - Emergency Only (Unlimited)", "$3,000"],
              ["Specialist Consultation - referred (Unlimited)", "$3,500"],
              ["Specialist Consultation - unreferred (Unlimited)", "$2,800"],
              ["Direct Access Pediatrician up to 13th birthday", "$3,000"],
              ["Direct Access Gynaecologist or Urologist", "$3,000"],
              ["Routine Annual Medical", "$2,800"],
              ["Psychiatrist", "$3,000"],
              ["Ophthalmologist", "$3,000"],
              ["Dietician, Podiatrist, Chiropractor", "$3,000"],
              ["Physiotherapy or Speech Therapy", "80% of UCR"]
            ]
          },
          {
            title: "Other medical services",
            columns: ["Service", "Maximum Benefit"],
            rows: [
              ["Hearing Aid (every 3 years)", "80% of cost, up to $24,000 per ear"],
              ["Local Ambulance", "80% of UCR"],
              ["Autism and Developmental Disorders", "$300,000 per year"],
              ["Inoculations up to 13th birthday", "80% of UCR"],
              ["HPV Vaccine reimbursement", "80% of cost, max $16,500 per vaccine"],
              ["Tubal Ligation or Vasectomy", "80% of cost up to $40,000"],
              ["Renal Dialysis, Chemotherapy, or Radiotherapy", "80% of cost"],
              ["Overseas Emergency Medical", "US$100,000"]
            ]
          }
        ]
      }
    ],
    "major-medical": [
      {
        eyebrow: "Major Medical and Hospitalization",
        title: "Major medical limits and hospital procedure benefits.",
        tables: [
          {
            title: "Major medical",
            columns: ["Benefit", "Limit"],
            rows: [
              ["Deductible", "US$1,000"],
              ["Daily Room and Board", "US$250"],
              ["Other Medical Expenses", "80% of UCR"],
              ["Air Transportation", "J$10,000"],
              ["Local Major Medical Deductible", "$4,000"],
              ["Annual Major Medical Limit", "$8,000,000"]
            ],
            note: "The annual major medical limit refreshes annually."
          },
          {
            title: "Surgery and hospitalization",
            columns: ["Benefit", "Maximum Benefit"],
            rows: [
              ["Surgeon's Fee", "80% of cost"],
              ["Assistant Surgeon's Fee", "33% of surgeon's fee"],
              ["Maximum Anesthetist Fee", "40% of surgeon's fee"],
              ["Daily Room and Board (semi-private rate)", "80% of cost"],
              ["Public Ward", "100% of cost"],
              ["In-Hospital Miscellaneous", "80% of cost"],
              ["Doctor's In-Hospital Visit", "$3,500"],
              ["Intensive Care", "80% of UCR"],
              ["Private Nursing per 8-hour shift", "$3,000"]
            ]
          }
        ]
      },
      {
        eyebrow: "Dental and Optical",
        title: "Combined limits and important exclusions.",
        cards: [
          {
            kicker: "Optical and Dental Notes",
            title: "Important exclusions and frequency limits",
            checklist: [
              "Orthodontics is not covered",
              "Fixed bridgework including inlays and crowns used as abutments is not covered",
              "Replacement of existing bridgework is not covered",
              "Frames are covered once every twenty-four months and lenses once every twelve months",
              "Eye examinations are covered once per twelve-month period"
            ],
            dark: true
          }
        ],
        tables: [
          {
            title: "Combined optional limits",
            columns: ["Option", "Combined Limit"],
            rows: [
              ["Option 1", "$20,000"],
              ["Option 2", "$30,000"],
              ["Option 3", "$40,000"],
              ["Option 4", "$50,000"]
            ]
          }
        ]
      }
    ],
    supplemental: [
      {
        eyebrow: "Supplemental Rates",
        title: "Premium tables for supplemental plans",
        copy: "These tables present the rates directly on the page for easier review.",
        tables: [
          {
            title: "Critical Illness",
            columns: ["Plan Type", "$500,000", "$1,000,000", "$1,500,000", "$2,000,000", "$2,500,000", "$3,000,000"],
            rows: [
              ["Member Only", "$130.00", "$260.00", "$390.00", "$520.00", "$650.00", "$780.00"],
              ["Member + Child", "$162.50", "$325.00", "$487.50", "$650.00", "$812.50", "$975.00"],
              ["50% of Coverage", "", "", "", "", "", ""],
              ["Member + Spouse", "$195.00", "$390.00", "$585.00", "$780.00", "$975.00", "$1,170.00"],
              ["Member + Family", "$227.50", "$455.00", "$682.50", "$910.00", "$1,137.50", "$1,365.00"],
              ["100% of Coverage", "", "", "", "", "", ""],
              ["Member + Spouse", "$260.00", "$520.00", "$780.00", "$1,040.00", "$1,300.00", "$1,560.00"],
              ["Member + Family", "$292.50", "$585.00", "$877.50", "$1,170.00", "$1,462.50", "$1,755.00"]
            ],
            note: "Member is covered at 100% and child at 25%."
          },
          {
            title: "Supplemental Life",
            columns: ["Plan Type", "$500,000", "$1,000,000", "$1,500,000", "$2,000,000", "$2,500,000", "$3,000,000"],
            rows: [
              ["Member Only", "$175.00", "$350.00", "$525.00", "$700.00", "$875.00", "$1,050.00"],
              ["Member + Child", "$193.75", "$387.50", "$581.25", "$775.00", "$968.75", "$1,162.50"],
              ["50% of Coverage", "", "", "", "", "", ""],
              ["Member + Spouse", "$232.50", "$465.00", "$697.50", "$930.00", "$1,162.50", "$1,395.00"],
              ["Member + Family", "$271.25", "$542.50", "$813.75", "$1,085.00", "$1,356.25", "$1,627.50"],
              ["100% of Coverage", "", "", "", "", "", ""],
              ["Member + Spouse", "$310.00", "$620.00", "$930.00", "$1,240.00", "$1,550.00", "$1,860.00"],
              ["Member + Family", "$348.75", "$697.50", "$1,046.25", "$1,395.00", "$1,743.75", "$2,092.50"]
            ],
            note: "Member is covered at 100% and child at 25%."
          },
          {
            title: "Parental Health",
            columns: ["Coverage", "Option 1", "Option 2", "Option 3", "Option 4"],
            rows: [
              ["One Parent Only", "$6,464.15", "$7,387.60", "$3,737.50", "$3,047.50"],
              ["Both Parents", "$12,928.30", "$14,775.20", "$7,475.00", "$6,095.00"]
            ]
          },
          {
            title: "Supplemental Dental and Optical",
            columns: ["Dependants", "$20,000", "$30,000", "$40,000", "$50,000"],
            rows: [
              ["Single Dependent", "$1,238.55", "$1,857.25", "$2,475.95", "$3,095.80"],
              ["Two Dependents", "$2,477.10", "$3,714.50", "$4,951.90", "$6,191.60"],
              ["More Than 2 Dependents", "$3,468.40", "$5,200.30", "$6,932.20", "$8,668.70"]
            ]
          },
          {
            title: "Supplemental Prescription Drugs",
            columns: ["Dependants", "$20,000", "$40,000", "$60,000", "$80,000"],
            rows: [
              ["Single Dependent", "$1,661.75", "$2,858.90", "$3,276.35", "$3,566.15"],
              ["Two Dependents", "$3,323.50", "$5,718.95", "$6,553.85", "$7,132.30"],
              ["More Than 2 Dependents", "$4,651.75", "$8,006.30", "$9,175.85", "$9,984.30"]
            ]
          },
          {
            title: "Supplemental Health Plus",
            columns: ["Coverage", "Option 1", "Option 2", "Option 3"],
            rows: [
              ["Member Only", "$2,370.15", "$2,547.25", "$2,691.32"],
              ["Member + One", "$4,740.30", "$5,094.50", "$5,383.15"],
              ["Member + Family", "$6,636.65", "$7,132.30", "$7,535.95"]
            ],
            note: "This option is described as an additional swipeable benefit including office visits, maternity, and consultations."
          }
        ]
      },
      {
        eyebrow: "Family Life",
        title: "Family life options by cover mix",
        cards: [
          {
            kicker: "Option 1",
            title: "Member 100%, spouse or parents 100%, child 100%",
            checklist: ["$1,000,000 cover: $6,003.00", "$750,000 cover: $4,502.25", "$500,000 cover: $3,001.50"]
          },
          {
            kicker: "Option 2",
            title: "Member 100%, spouse or parents 50%, child 50%",
            checklist: ["$1,000,000 cover: $3,019.00", "$750,000 cover: $2,264.25", "$500,000 cover: $1,509.50"]
          },
          {
            kicker: "Option 3",
            title: "Member 100%, spouse or parents 50%, child 25%",
            checklist: ["$1,000,000 cover: $1,542.00", "$750,000 cover: $1,156.50", "$500,000 cover: $771.00"]
          }
        ]
      }
    ]
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    public readonly auth: AuthService,
    private readonly content: PortalContentService
  ) {
    this.insuranceFormConfig = this.content.getRequestForm("insurance");
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(() => {
      this.syncRequestModalFromRoute();
    });
  }

  get activeLane(): InsuranceLaneSummary {
    return this.laneSummaries.find((lane) => lane.id === this.activeLaneId) || this.laneSummaries[0];
  }

  get visibleSections(): InsuranceSection[] {
    return this.laneSections[this.activeLane.id] || [];
  }

  get requestFormInitialValues(): Record<string, unknown> {
    return {
      insurance_area: this.selectedSupportOption
    };
  }

  get activeGuidanceCount(): number {
    return this.visibleSections.reduce((total, section) => total + (section.cards?.length || 0), 0);
  }

  get activeTableCount(): number {
    return this.visibleSections.reduce((total, section) => total + (section.tables?.length || 0), 0);
  }

  get activeSectionTitles(): string[] {
    return this.visibleSections.map((section) => section.title);
  }

  selectLane(laneId: string): void {
    const lane = this.laneSummaries.find((item) => item.id === laneId);

    if (!lane) {
      return;
    }

    this.activeLaneId = lane.id;
    this.selectedSupportOption = lane.supportOptions[0];
  }

  selectSupportOption(option: string): void {
    this.selectedSupportOption = option;
  }

  openRequestModal(): void {
    if (!this.insuranceFormConfig) {
      return;
    }

    if (!this.auth.isAuthenticated) {
      this.redirectToAuthForRequest();
      return;
    }

    this.showRequestModal = true;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { openForm: 1 },
      queryParamsHandling: "merge",
      replaceUrl: true
    });
  }

  closeRequestModal(): void {
    this.showRequestModal = false;

    if (this.route.snapshot.queryParamMap.has("openForm")) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { openForm: null },
        queryParamsHandling: "merge",
        replaceUrl: true
      });
    }
  }

  @HostListener("document:keydown.escape")
  onEscapePressed(): void {
    if (this.showRequestModal) {
      this.closeRequestModal();
    }
  }

  private syncRequestModalFromRoute(): void {
    const wantsOpenForm = Boolean(this.insuranceFormConfig && this.route.snapshot.queryParamMap.get("openForm") === "1");

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
        queryParams: { openForm: 1 },
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
}
