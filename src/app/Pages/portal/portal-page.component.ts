import { Component, HostListener, OnInit } from "@angular/core";
import { ActivatedRoute, Data, Router } from "@angular/router";
import { AuthService } from "../../core/services/auth.service";
import { EmploymentJobListing, PortalPageConfig, RequestFormConfig } from "../../models/app.models";
import { PortalContentService } from "../../core/services/portal-content.service";
import { PortalJobsService } from "../../core/services/portal-jobs.service";

interface PortalCard {
  kicker: string;
  title: string;
  description?: string;
  checklist?: string[];
  linkLabel?: string;
  linkRoute?: string;
  emphasis?: string;
  dark?: boolean;
}

interface PortalTable {
  title: string;
  columns: string[];
  rows: string[][];
  note?: string;
  dark?: boolean;
}

interface PortalPolicyItem {
  title: string;
  body: string;
}

interface PortalMediaItem {
  title: string;
  caption: string;
  imageUrl: string;
  alt: string;
}

interface PortalSection {
  eyebrow: string;
  title: string;
  copy?: string;
  layout?: "two-column" | "three-column" | "four-column";
  cards?: PortalCard[];
  tables?: PortalTable[];
  policyItems?: PortalPolicyItem[];
}

const SUPPLEMENTS: Record<string, PortalSection[]> = {
  records: [
    {
      eyebrow: "Named Documents",
      title: "Use the correct document name when submitting your request.",
      layout: "four-column",
      cards: [
        { kicker: "Records", title: "Military Service Records", description: "Use this route when a full service record extract or file review is needed." },
        { kicker: "Certificate", title: "Certificate of Service (Officers)", description: "Use the officer certificate route when the service record calls for the officer format." },
        { kicker: "Certificate", title: "Certificate of Service (Blue Book)", description: "Use the Blue Book lane for the enlisted certificate path shown on the role board." },
        { kicker: "Commendation", title: "Certificate of Commendation", description: "Request commendation support when the document is part of discharge or follow-up preparation." },
        { kicker: "Employment Letter", title: "Confirmation of Employment Letter", description: "Use this document when employment confirmation is needed for an organization or formal recipient.", checklist: ["Service number", "Organization to be addressed to", "Name", "Email", "Phone number"] }
      ]
    },
    {
      eyebrow: "What to prepare",
      title: "Use the exact document name and the core request details.",
      layout: "three-column",
      cards: [
        { kicker: "Preparation", title: "Use the exact record or certificate name", description: "Use the exact record or certificate name from the roles board whenever possible." },
        { kicker: "Employment letter", title: "Include the required confirmation details", description: "For the confirmation of employment letter, include service number, organization, name, email, and phone number." },
        { kicker: "Roadmap", title: "Use the roadmap first if needed", description: "Start with the roadmap if the document is part of pension, gratuity, ex-gratia, or Veteran's ID preparation." }
      ]
    }
  ],
  benefits: [
    {
      eyebrow: "Roadmap-linked benefits",
      title: "Use the correct benefit name and step.",
      layout: "four-column",
      cards: [
        { kicker: "Pension and Gratuity", title: "Apply six months before ROD", description: "Use this lane for pensions and gratuities once the certificate and service record side is in order." },
        { kicker: "Ex-Gratia", title: "Apply at ROD", description: "Twelve years continuous service in the Jamaica National Reserve is required." },
        { kicker: "Disability and Death Benefits", title: "Use the benefits lane for high-support cases", description: "These benefit types sit with Pension and Other Benefits and often move with welfare follow-up." },
        { kicker: "Insurance", title: "Review insurance guidance and rates", description: "Group health guidance, continuation notes, and supplemental rates are available in the insurance section.", linkLabel: "Open insurance", linkRoute: "/insurance" }
      ]
    },
    {
      eyebrow: "Organizations Offering Discounts",
      title: "Create a clear place for veteran discount offers and partner savings.",
      copy: "This section highlights discount opportunities for veterans and gives organizations a place to submit an offer for review.",
      layout: "two-column",
      cards: [
        {
          kicker: "Discount directory",
          title: "Offer categories veterans can browse",
          checklist: [
            "Health and wellness discounts for verified veterans",
            "Transportation, mobility, and practical living offers",
            "Retail, household, and service-provider savings",
            "Training and education discounts that support resettlement and employment goals"
          ],
          dark: true
        },
        {
          kicker: "Partner support",
          title: "Keep partner offers visible and easy to route",
          description: "Outreach and communication can review partner offers, direct veterans to approved savings opportunities, and keep organizations connected to the portal."
        }
      ]
    }
  ],
  insurance: [
    {
      eyebrow: "Insurance Overview",
      title: "Core guidance for health cards, dependants, claims, and authorization.",
      layout: "three-column",
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
      layout: "two-column",
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
    },
    {
      eyebrow: "Major Medical and Hospitalization",
      title: "Major medical limits and hospital procedure benefits.",
      layout: "two-column",
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
      layout: "two-column",
      tables: [
        {
          title: "Combined optional limits",
          columns: ["Option", "Combined Limit"],
          rows: [["Option 1", "$20,000"], ["Option 2", "$30,000"], ["Option 3", "$40,000"], ["Option 4", "$50,000"]]
        }
      ],
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
      ]
    },
    {
      eyebrow: "Supplemental Rates",
      title: "Premium tables for supplemental plans",
      copy: "These tables present the rates directly on the page for easier review.",
      layout: "two-column",
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
      layout: "three-column",
      cards: [
        { kicker: "Option 1", title: "Member 100%, spouse or parents 100%, child 100%", checklist: ["$1,000,000 cover: $6,003.00", "$750,000 cover: $4,502.25", "$500,000 cover: $3,001.50"] },
        { kicker: "Option 2", title: "Member 100%, spouse or parents 50%, child 50%", checklist: ["$1,000,000 cover: $3,019.00", "$750,000 cover: $2,264.25", "$500,000 cover: $1,509.50"] },
        { kicker: "Option 3", title: "Member 100%, spouse or parents 50%, child 25%", checklist: ["$1,000,000 cover: $1,542.00", "$750,000 cover: $1,156.50", "$500,000 cover: $771.00"] }
      ]
    }
  ],
  funerals: [
    {
      eyebrow: "Burial Arrangements",
      title: "Briggs Park burial guidance",
      copy: "All graves at Briggs Park Cemetery, Up Park Camp, are built as double vaults.",
      layout: "three-column",
      cards: [
        { kicker: "Burial Fee", title: "Half vault cost", description: "The cost of a half vault is listed as Fifty-Eight Thousand, One Hundred Dollars.", emphasis: "$58,100.00" },
        { kicker: "Burial Times", title: "Morning and afternoon burial windows", checklist: ["Morning burials begin at 10:00 am", "Afternoon burials begin at 2:00 pm", "Afternoon burials attract an additional civilian overtime charge"] },
        { kicker: "Overtime Fee", title: "Afternoon burial surcharge", description: "An additional civilian overtime fee applies to afternoon burials.", emphasis: "$2,800.00" }
      ]
    },
    {
      eyebrow: "Payment and Last Post",
      title: "Payment routing and graveside support",
      layout: "two-column",
      cards: [
        {
          kicker: "Payment route",
          title: "Burial payments go through the JDF Welfare Fund",
          description: "Burial-related payments go through the JDF Welfare Fund via Sagicor Bank. Contact the department for payment instructions and proof-of-payment requirements."
        },
        {
          kicker: "Important support note",
          title: "Buglers are provided at the burial",
          description: "At the burial of the ex-member, buglers are provided to sound the Last Post and reveille at the graveside.",
          dark: true
        }
      ]
    },
    {
      eyebrow: "Church and Venue Options",
      title: "Church, wake, and repast guidance",
      layout: "three-column",
      cards: [
        { kicker: "Church", title: "Garrison Church of Ascension", description: "The family may request use of the Garrison Church of Ascension, Up Park Camp, Kingston 5.", emphasis: "$9,500.00" },
        { kicker: "Organist", title: "Additional service if requested", description: "If the family wishes to include the organist, the listed additional cost applies.", emphasis: "$15,000.00" },
        { kicker: "Church payments", title: "Paid separately from burial costs", description: "These fees are paid to the JDF Garrison Church Council Fund via Sagicor Bank." },
        { kicker: "Wake and Repast", title: "Venue requests can also be made", description: "A request can be made to use the Warrant Officers Mess for repast and the Cricket Pavilion for the wake." },
        { kicker: "Family requirements", title: "Items the family must provide", checklist: ["Caterers", "Chairs and tables"], dark: true }
      ]
    },
    {
      eyebrow: "Tombing Procedure",
      title: "Tombing is completed in two stages",
      layout: "two-column",
      cards: [
        {
          kicker: "Stage 1",
          title: "Laying of the headstone and administrative costs",
          description: "The listed cost to lay the headstone and cover administrative fees is $10,100.00.",
          checklist: [
            "This payment is made to the JDF Welfare Fund via Sagicor Bank",
            "After payment, proof of payment should be submitted to the Department of Veterans Affairs",
            "The department then issues a letter to be presented to Creative Stones"
          ]
        },
        {
          kicker: "Stage 2",
          title: "Purchase of the headstone",
          description: "The current headstone cost is $140,000.00, payable directly to Creative Stones. This price is subject to change.",
          checklist: ["Creative Stones address: 3 Woodglen Drive, Kingston 10", "Unannounced visits to the cemetery are not permitted", "All cemetery visits must be scheduled through the department"],
          dark: true
        }
      ]
    },
    {
      eyebrow: "Family coordination",
      title: "Use the correct payment route for each service.",
      layout: "two-column",
      cards: [
        {
          kicker: "Payment support",
          title: "Use the correct payment route for each service",
          checklist: [
            "Burial-related payments go through the JDF Welfare Fund",
            "Church-related payments go through the JDF Garrison Church Council Fund",
            "Headstone purchase is made directly to Creative Stones"
          ]
        },
        {
          kicker: "Family coordination",
          title: "Plan funeral support with the right service area",
          description: "Use this service area for burial coordination, tombing steps, church requests, venue support, and Last Post arrangements.",
          dark: true
        }
      ]
    }
  ],
  employment: [
    {
      eyebrow: "Support Lanes",
      title: "Use the lane that matches the support you need.",
      layout: "four-column",
      cards: [
        { kicker: "Resume creation", title: "Build or refresh your civilian resume", description: "Use this when you need help translating service experience into employer-ready resume language." },
        { kicker: "Interviewing workshops", title: "Practice for interviews and civilian hiring", description: "Use guided preparation for interviews, self-presentation, and employer questions." },
        { kicker: "Resettlement plans", title: "Plan your post-service transition", description: "Map the next stage of life, training needs, work goals, and required documents." },
        { kicker: "Job bank and placement", title: "Connect to job leads and placement help", description: "Use this lane when you are ready to move from preparation into job bank and placement support." }
      ]
    },
    {
      eyebrow: "Job Opportunities for Veterans",
      title: "Turn resettlement support into real openings and placement follow-up.",
      copy: "Use this section to move from preparation into active opportunity matching and placement follow-up.",
      layout: "four-column",
      cards: [
        { kicker: "Opportunity 01", title: "DVA Job Bank intake", description: "Submit your work interests so the resettlement team can match you to openings being tracked in the job bank." },
        { kicker: "Opportunity 02", title: "Employer introduction support", description: "Use this lane when you are ready for a referral or introduction to an employer that fits your service background." },
        { kicker: "Opportunity 03", title: "Skills-to-role matching", description: "Translate military experience into civilian role types so the team can guide you toward a realistic next post." },
        { kicker: "Opportunity 04", title: "Placement follow-up", description: "Track whether interviews, referrals, or job leads need another step from the department." }
      ]
    }
  ],
  welfare: [
    {
      eyebrow: "Persons Seeking Assistance",
      title: "Use this section when someone needs help, guidance, or direct follow-up.",
      layout: "two-column",
      cards: [
        {
          kicker: "Who can use this lane?",
          title: "This route is not only for the veteran alone",
          checklist: ["Veterans", "Dependants", "Family members", "Caregivers", "Authorized representatives"]
        },
        {
          kicker: "How requests are routed",
          title: "Choose the closest lane and the request can be directed onward",
          checklist: [
            "Medical and retiree support requests route to the welfare side",
            "Mental health, home visits, and transport coordination stay in assistance support",
            "Funeral arrangements and final rites can be routed through the funerals service",
            "Benefits, insurance, or ID-related issues can still be escalated to the correct page when needed",
            "General queries, liaison, and outreach matters stay with Outreach and Communication"
          ],
          dark: true
        }
      ]
    },
    {
      eyebrow: "Immediate support",
      title: "Assistance lanes that veterans and families use first.",
      layout: "four-column",
      cards: [
        { kicker: "Assistance 01", title: "Immediate welfare guidance", description: "Use this when someone needs help understanding what kind of support the department can provide first." },
        { kicker: "Assistance 02", title: "Family and dependant support", description: "Good for spouses, dependants, and relatives asking on behalf of a veteran or planning next steps together." },
        { kicker: "Assistance 03", title: "Home visits and practical help", description: "Use this lane for transportation, home visit coordination, or practical welfare follow-up." },
        { kicker: "Assistance 04", title: "Query and outreach follow-up", description: "Use this when the main need is a callback, liaison support, or a response to a veteran query." }
      ]
    },
    {
      eyebrow: "Welfare and outreach lanes",
      title: "Welfare and outreach services.",
      layout: "four-column",
      cards: [
        { kicker: "Welfare 01", title: "Medical for Retired Veterans", description: "Use this lane for consultations, reviews, and direct medical follow-up for retired veterans." },
        { kicker: "Welfare 02", title: "Retiree Health Insurance", description: "Use this lane when the case is about retiree health insurance support and health-related follow-up." },
        { kicker: "Welfare 03", title: "Mental Health Services", description: "Use this lane when a veteran needs mental health support, follow-up, or coordination." },
        { kicker: "Welfare 04", title: "Transportation and home visit support", description: "Use this lane for medical transportation, home visit requests, and practical welfare follow-up." },
        { kicker: "Welfare 05", title: "Welfare Fund and practical assistance", description: "Use this lane to process applications for assistance from the Jamaica Defence Force Welfare Fund." },
        { kicker: "Welfare 06", title: "Funeral arrangements and final rites", description: "Use this lane for burial coordination, tombing guidance, church requests, and Last Post support.", linkLabel: "Open funerals page", linkRoute: "/funerals" },
        { kicker: "Outreach", title: "Liaison, outreach projects, and veteran queries", description: "Use this lane for liaison with veteran agencies, outreach projects, network-building, and general veteran queries." }
      ]
    }
  ],
  "id-guidance": [
    {
      eyebrow: "Guidance",
      title: "Veterans' Identification Card rules and conditions",
      policyItems: [
        { title: "Eligibility", body: "A veteran is an ex-servicemember who has served at least three years in the regular or reserve force." },
        { title: "Card use", body: "The Veterans' Identification Card is not a JDF Identification Card and must not be used as military identification at any establishment." },
        { title: "Card identity", body: "The card carries the Department of Veterans Affairs identity, will not carry the name Jamaica Defence Force or JDF, and uses the former regimental number as the card identification number." },
        { title: "Application route", body: "Applicants must apply through the Department of Veterans Affairs using the approved application form." },
        { title: "Card fee", body: "The listed cost is J$1,000.00 and payment is made as directed by the department." },
        { title: "Blue strip card", body: "Cards with a blue strip allow the veteran ingress to military bases only." },
        { title: "Red strip card", body: "Cards with a red strip allow the veteran access to military bases and access to medical consultations and reviews at the HSC where eligible." },
        { title: "Years of service shown", body: "The card records the veteran's full completed years of service." },
        { title: "Expiry", body: "The card expires ten years from the date of issue, and the veteran must reapply and pay the required fee when it expires." },
        { title: "Lost, stolen, or damaged cards", body: "These must be reported immediately to the DVA for replacement review." },
        { title: "HSC access", body: "Red strip cards are to be presented to HSC staff on arrival before medical consultations and reviews." },
        { title: "Authorized user only", body: "The card must only be used by the veteran to whom it was issued." },
        { title: "Display on military sites", body: "The veteran is expected to display the card so that it can be easily observed on a military installation." },
        { title: "Authority", body: "The CDS has the authority to approve or deny an application and may revoke the card at any time." },
        { title: "Restricted applicants", body: "Ex-servicemembers who were dishonourably discharged or are barred from military bases are prohibited from obtaining the card." }
      ]
    }
  ]
};

const PORTAL_MEDIA: Record<string, PortalMediaItem[]> = {
  funerals: [
    {
      title: "Burial support setting",
      caption: "A view connected to burial preparation and the final rites process.",
      imageUrl: "/assets/images/funerals/Funeral1.png",
      alt: "Burial site with floral wreaths"
    },
    {
      title: "Memorial headstone example",
      caption: "A sample memorial stone related to the tombing and headstone process.",
      imageUrl: "/assets/images/funerals/Funeral2tombstone.png",
      alt: "Memorial tombstone example"
    },
    {
      title: "Funeral floral arrangement",
      caption: "Funeral floral support and remembrance arrangement.",
      imageUrl: "/assets/images/funerals/funeral_flowers.jpeg",
      alt: "Funeral flower arrangement"
    }
  ]
};

@Component({
  selector: "app-portal-page",
  templateUrl: "./portal-page.component.html",
  styleUrls: ["./portal-page.component.css"]
})
export class PortalPageComponent implements OnInit {
  page?: PortalPageConfig;
  allSections: PortalSection[] = [];
  sections: PortalSection[] = [];
  recordsQuery = "";
  visibleRecordCardsCount = 0;
  showRequestModal = false;
  jobListings: EmploymentJobListing[] = [];
  jobsLoading = false;
  jobsError = "";
  jobsFeedback = "";
  postingJob = false;
  closingJobId: number | null = null;
  readonly jobDraft = {
    jobTitle: "",
    organizationName: "",
    jobDescription: "",
    qualificationsText: "",
    howToApply: ""
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly content: PortalContentService,
    public readonly auth: AuthService,
    private readonly portalJobs: PortalJobsService
  ) {}

  ngOnInit(): void {
    this.route.data.subscribe((data: Data) => {
      const pageKey = String(data["pageKey"] || "");
      this.page = this.content.getPage(pageKey);
      this.allSections = SUPPLEMENTS[pageKey] || [];
      this.recordsQuery = "";
      this.sections = this.allSections;
      this.visibleRecordCardsCount = this.countCards(this.sections);
      this.syncRequestModalFromRoute();

      if (pageKey === "employment") {
        this.loadEmploymentJobs();
        return;
      }

      this.jobListings = [];
      this.jobsError = "";
      this.jobsFeedback = "";
    });

    this.route.queryParamMap.subscribe(() => {
      this.syncRequestModalFromRoute();
    });
  }

  get isRecordsPage(): boolean {
    return this.page?.key === "records";
  }

  get hasNoRecordMatches(): boolean {
    return this.isRecordsPage && !!this.recordsQuery.trim() && !this.visibleRecordCardsCount;
  }

  get isIdGuidancePage(): boolean {
    return this.page?.key === "id-guidance";
  }

  get isEmploymentPage(): boolean {
    return this.page?.key === "employment";
  }

  get isInsurancePage(): boolean {
    return this.page?.key === "insurance";
  }

  get canManageEmploymentJobs(): boolean {
    const user = this.auth.currentUser;

    if (!user) {
      return false;
    }

    if (["MAIN_ADMIN", "DIRECTOR", "QM"].includes(user.roleCode)) {
      return true;
    }

    return user.departments.some((department) => department.departmentCode === "RESETTLEMENT_EMPLOYMENT");
  }

  get discountPartnerForm(): RequestFormConfig | undefined {
    return this.page?.key === "benefits" ? this.content.getDiscountPartnerForm() : undefined;
  }

  get pageThemeClass(): string {
    return `page-theme-${this.page?.key || "default"}`;
  }

  get serviceCardGridClass(): string {
    return `service-grid-${this.page?.key || "default"}`;
  }

  get requestLauncherLabel(): string {
    switch (this.page?.key) {
      case "records":
        return "Open records form";
      case "benefits":
        return "Open benefits form";
      case "insurance":
        return "Open insurance form";
      case "funerals":
        return "Open funeral form";
      case "employment":
        return "Open employment form";
      case "welfare":
        return "Open support form";
      default:
        return "Open request form";
    }
  }

  get pageMark(): string {
    switch (this.page?.key) {
      case "records":
        return "DOC";
      case "benefits":
        return "BEN";
      case "insurance":
        return "INS";
      case "funerals":
        return "RITES";
      case "employment":
        return "JOBS";
      case "welfare":
        return "CARE";
      case "id-guidance":
        return "ID";
      default:
        return "DVA";
    }
  }

  get showImageHolder(): boolean {
    return this.page?.key !== "id-guidance";
  }

  get pageMediaItems(): PortalMediaItem[] {
    return PORTAL_MEDIA[this.page?.key || ""] || [];
  }

  get imageHolderTitle(): string {
    switch (this.page?.key) {
      case "records":
        return "Records and document visual";
      case "benefits":
        return "Benefits service visual";
      case "insurance":
        return "Insurance service visual";
      case "funerals":
        return "Funeral support visual";
      case "employment":
        return "Employment service visual";
      case "welfare":
        return "Welfare support visual";
      default:
        return "Service visual";
    }
  }

  get imageHolderCopy(): string {
    switch (this.page?.key) {
      case "records":
        return "This area can hold archive imagery, certificate artwork, or document previews.";
      case "benefits":
        return "This area can hold benefit notices, pension process visuals, or approved public graphics.";
      case "insurance":
        return "This area can hold insurance cards, coverage visuals, premium guides, or health-plan graphics.";
      case "funerals":
        return "Click to open final rites, memorial, and funeral support imagery.";
      case "employment":
        return "This area can hold job posters, employer graphics, or resettlement programme visuals.";
      case "welfare":
        return "This area can hold outreach posters, assistance notices, or family-support visuals.";
      default:
        return "This area can hold approved service images, campaign visuals, or supporting posters.";
    }
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
    return String(job.postedAt || job.posted_at || "");
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
    const jobId = Number(job.jobId || job.employment_job_listing_id || 0);

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
        this.loadEmploymentJobs(true);
      },
      error: (error) => {
        this.jobsError = error?.error?.message || "Unable to close this job right now.";
        this.closingJobId = null;
      }
    });
  }

  generateIdGuidancePdf(): void {
    if (!this.isIdGuidancePage) {
      return;
    }

    const popup = window.open("", "_blank", "width=960,height=820");

    if (!popup) {
      return;
    }

    popup.document.write(this.buildIdGuidancePrintableMarkup(this.getIdGuidancePolicyItems()));
    popup.document.close();
    popup.focus();
  }

  openRequestModal(): void {
    if (!this.page?.requestForm) {
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

  applyRecordsSearch(query: string): void {
    this.recordsQuery = query;

    if (!this.isRecordsPage) {
      return;
    }

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      this.sections = this.allSections;
      this.visibleRecordCardsCount = this.countCards(this.sections);
      return;
    }

    this.sections = this.allSections
      .map((section) => {
        const cards = (section.cards || []).filter((card) => this.cardMatches(card, normalizedQuery));

        return {
          ...section,
          cards
        };
      })
      .filter((section) => (section.cards && section.cards.length) || section.tables?.length || section.policyItems?.length);

    this.visibleRecordCardsCount = this.countCards(this.sections);
  }

  private cardMatches(card: PortalCard, query: string): boolean {
    const haystack = [
      card.kicker,
      card.title,
      card.description || "",
      ...(card.checklist || [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  }

  private countCards(sections: PortalSection[]): number {
    return sections.reduce((total, section) => total + (section.cards?.length || 0), 0);
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

  private clearJobDraft(): void {
    this.jobDraft.jobTitle = "";
    this.jobDraft.organizationName = "";
    this.jobDraft.jobDescription = "";
    this.jobDraft.qualificationsText = "";
    this.jobDraft.howToApply = "";
  }

  private getIdGuidancePolicyItems(): PortalPolicyItem[] {
    return this.sections.flatMap((section) => section.policyItems || []);
  }

  private syncRequestModalFromRoute(): void {
    const wantsOpenForm = Boolean(this.page?.requestForm && this.route.snapshot.queryParamMap.get("openForm") === "1");

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

    this.router.navigate(["/auth"], {
      queryParams: {
        mode: "login",
        redirectTo
      }
    });
  }

  private getAssetUrl(assetFileName: string): string {
    return new URL(`/assets/${assetFileName}`, window.location.origin).toString();
  }

  private escape(value: unknown): string {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  private buildIdGuidancePrintableMarkup(items: PortalPolicyItem[]): string {
    const listItems = items
      .map(
        (item) => `
          <li>
            <strong>${this.escape(item.title)}.</strong>
            <span>${this.escape(item.body)}</span>
          </li>
        `
      )
      .join("");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Veterans Identification Card Guidance</title>
  <style>
    @page {
      size: legal portrait;
      margin: 0.55in 0.6in 0.65in;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      color: #173a29;
      background: #ffffff;
    }

    .sheet {
      width: 100%;
      margin: 0 auto;
    }

    .header {
      border: 2px solid #cbb272;
      border-radius: 18px;
      padding: 0.26in 0.32in 0.22in;
      background: linear-gradient(180deg, rgba(250, 245, 232, 0.95), rgba(255, 255, 255, 1));
      margin-bottom: 0.22in;
    }

    .header-band {
      display: table;
      width: 100%;
    }

    .logo-cell,
    .title-cell {
      display: table-cell;
      vertical-align: middle;
    }

    .logo-cell {
      width: 2.2in;
      padding-right: 0.18in;
    }

    .logo {
      width: 100%;
      max-width: 2.05in;
      height: auto;
    }

    .title-cell p {
      margin: 0;
    }

    .eyebrow {
      color: #b28a2d;
      font-size: 10pt;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 6pt;
    }

    h1 {
      margin: 0 0 7pt;
      font-size: 22pt;
      line-height: 1.12;
      color: #173a29;
    }

    .intro {
      font-size: 11pt;
      line-height: 1.45;
      color: #345344;
    }

    .policy-card {
      border: 1px solid #d7c79b;
      border-radius: 18px;
      padding: 0.18in 0.24in 0.12in;
      background: #fffdf8;
    }

    ol {
      margin: 0;
      padding-left: 0.28in;
    }

    li {
      margin: 0 0 0.12in;
      padding-left: 0.04in;
      font-size: 11pt;
      line-height: 1.45;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    li strong {
      color: #173a29;
    }

    .footer-note {
      margin-top: 0.16in;
      font-size: 9.5pt;
      color: #5d6a61;
      text-align: center;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="header">
      <div class="header-band">
        <div class="logo-cell">
          <img class="logo" src="${this.escape(this.getAssetUrl("logo-board-clean.png"))}" alt="Department of Veterans Affairs Jamaica">
        </div>
        <div class="title-cell">
          <p class="eyebrow">Veteran ID Guidance</p>
          <h1>Guidelines for the Veterans' Identification Card</h1>
          <p class="intro">This legal-size print sheet outlines the official guidance, conditions, and use rules for the Veterans' Identification Card.</p>
        </div>
      </div>
    </section>

    <section class="policy-card">
      <ol>
        ${listItems}
      </ol>
    </section>

    <p class="footer-note">Use your browser's Save as PDF option to keep a legal-size copy for reference.</p>
  </main>
</body>
</html>`;
  }

  isSectionRow(row: string[]): boolean {
    return row.length > 1 && row.slice(1).every((cell) => !cell);
  }
}
