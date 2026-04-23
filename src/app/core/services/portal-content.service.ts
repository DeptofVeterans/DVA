import { Injectable } from "@angular/core";
import { PortalPageConfig, RequestFormConfig } from "../../models/app.models";

@Injectable({ providedIn: "root" })
export class PortalContentService {
  private readonly requestForms: Record<string, RequestFormConfig> = {
    records: {
      title: "Request records and letters",
      description: "Submit a records request or ask for the correct letter or certificate.",
      buttonLabel: "Submit records request",
      fields: [
        {
          key: "requestTypeCode",
          label: "Document type",
          type: "select",
          required: true,
          options: [
            { label: "Military Service Records", value: "MILITARY_SERVICE_RECORDS" },
            { label: "Certificate of Service (Officers)", value: "CERTIFICATE_OF_SERVICE_OFFICER" },
            { label: "Certificate of Service (Blue Book)", value: "CERTIFICATE_OF_SERVICE_BLUE_BOOK" },
            { label: "Certificate of Commendation", value: "CERTIFICATE_OF_COMMENDATION" },
            { label: "Confirmation of Employment Letter", value: "CONFIRMATION_OF_EMPLOYMENT_LETTER" }
          ]
        },
        { key: "full_name", label: "Full name", type: "text", required: true, placeholder: "Enter full name" },
        { key: "service_number", label: "Service number", type: "text", required: true, placeholder: "Enter service number" },
        {
          key: "organization_to_be_addressed_to",
          label: "Organization to be addressed to",
          type: "text",
          required: true,
          placeholder: "Enter organization name"
        },
        { key: "email", label: "Email", type: "email", required: true, placeholder: "Enter email address" },
        { key: "phone", label: "Phone number", type: "tel", required: true, placeholder: "Enter contact number" },
        {
          key: "notes",
          label: "Additional details",
          type: "textarea",
          rows: 4,
          placeholder: "Add any service dates, rank, or special instructions for the record or certificate request."
        }
      ],
      resolveRequestTypeCode: (value) => String(value["requestTypeCode"] || "MILITARY_SERVICE_RECORDS")
    },
    benefits: {
      title: "Submit a benefits request",
      description: "Use the correct benefit lane for pensions, gratuity, ex-gratia, disability, or death benefits.",
      buttonLabel: "Submit benefits intake",
      fields: [
        { key: "full_name", label: "Full name", type: "text", required: true, placeholder: "Enter full name" },
        {
          key: "applicant_type",
          label: "Applicant type",
          type: "select",
          required: true,
          options: [
            { label: "Veteran", value: "Veteran" },
            { label: "Spouse or dependant", value: "Spouse or dependant" },
            { label: "Representative", value: "Representative" }
          ]
        },
        {
          key: "requestTypeCode",
          label: "Benefit area",
          type: "select",
          required: true,
          options: [
            { label: "Pension", value: "PENSION_APPLICATION" },
            { label: "Gratuity", value: "GRATUITY_APPLICATION" },
            { label: "Ex-Gratia", value: "EX_GRATIA_APPLICATION" },
            { label: "Disability Benefit", value: "DISABILITY_BENEFIT_REQUEST" },
            { label: "Death Benefit", value: "DEATH_BENEFIT_REQUEST" }
          ]
        },
        {
          key: "preferred_follow_up",
          label: "Preferred follow-up",
          type: "select",
          required: true,
          options: [
            { label: "Phone call", value: "Phone call" },
            { label: "Email response", value: "Email response" },
            { label: "Appointment request", value: "Appointment request" }
          ]
        },
        { key: "service_number", label: "Service number", type: "text", placeholder: "Enter service number" },
        { key: "phone", label: "Phone number", type: "tel", required: true, placeholder: "Enter contact number" },
        { key: "email", label: "Email", type: "email", placeholder: "Enter email address" },
        {
          key: "notes",
          label: "Questions or circumstances",
          type: "textarea",
          rows: 4,
          placeholder: "Tell the team whether this relates to pension, gratuity, ex-gratia, death benefits, or another benefits case."
        }
      ],
      resolveRequestTypeCode: (value) => String(value["requestTypeCode"] || "PENSION_APPLICATION")
    },
    insurance: {
      title: "Ask for insurance support",
      description: "Submit insurance questions, claim support, or enrolment follow-up.",
      buttonLabel: "Submit insurance enquiry",
      defaultRequestTypeCode: "INSURANCE_SUPPORT_REQUEST",
      fields: [
        { key: "full_name", label: "Full name", type: "text", required: true, placeholder: "Enter full name" },
        {
          key: "applicant_type",
          label: "Applicant type",
          type: "select",
          required: true,
          options: [
            { label: "Veteran", value: "Veteran" },
            { label: "Spouse or dependant", value: "Spouse or dependant" },
            { label: "Family representative", value: "Family representative" }
          ]
        },
        {
          key: "insurance_area",
          label: "Insurance area",
          type: "select",
          required: true,
          options: [
            { label: "Group Health Plan", value: "Group Health Plan" },
            { label: "Critical Illness", value: "Critical Illness" },
            { label: "Supplemental Life", value: "Supplemental Life" },
            { label: "Parental Health", value: "Parental Health" },
            { label: "Dental and Optical", value: "Dental and Optical" },
            { label: "Prescription Drugs", value: "Prescription Drugs" },
            { label: "Supplemental Health Plus", value: "Supplemental Health Plus" },
            { label: "Family Life", value: "Family Life" },
            { label: "Claims or authorization", value: "Claims or authorization" }
          ]
        },
        {
          key: "preferred_follow_up",
          label: "Preferred follow-up",
          type: "select",
          required: true,
          options: [
            { label: "Phone call", value: "Phone call" },
            { label: "Email response", value: "Email response" },
            { label: "Appointment request", value: "Appointment request" }
          ]
        },
        { key: "service_number", label: "Service number", type: "text", placeholder: "Enter service number" },
        { key: "phone", label: "Phone number", type: "tel", required: true, placeholder: "Enter contact number" },
        { key: "email", label: "Email", type: "email", placeholder: "Enter email address" },
        {
          key: "notes",
          label: "Question or policy note",
          type: "textarea",
          rows: 4,
          placeholder: "Describe the rate, option, dependant issue, or claim question you need help with."
        }
      ]
    },
    funerals: {
      title: "Request funeral support",
      description: "Submit funeral support details and provide the home address needed for proof-of-payment letter generation.",
      buttonLabel: "Submit funeral request",
      defaultRequestTypeCode: "FUNERAL_SUPPORT_REQUEST",
      fields: [
        { key: "veteran_name", label: "Veteran name", type: "text", required: true, placeholder: "Enter veteran name" },
        { key: "requestor_name", label: "Requestor name", type: "text", required: true, placeholder: "Enter requestor name" },
        {
          key: "requestor_role",
          label: "Requestor role",
          type: "select",
          required: true,
          options: [
            { label: "Family member", value: "Family member" },
            { label: "Spouse or dependant", value: "Spouse or dependant" },
            { label: "Caregiver", value: "Caregiver" },
            { label: "Department representative", value: "Department representative" }
          ]
        },
        {
          key: "support_type",
          label: "Support needed",
          type: "select",
          required: true,
          options: [
            { label: "Burial arrangement", value: "Burial arrangement" },
            { label: "Tombing procedure", value: "Tombing procedure" },
            { label: "Church request", value: "Church request" },
            { label: "Wake or repast venue", value: "Wake or repast venue" },
            { label: "Last Post and bugler support", value: "Last Post and bugler support" },
            { label: "General funeral coordination", value: "General funeral coordination" }
          ]
        },
        {
          key: "preferred_follow_up",
          label: "Preferred follow-up",
          type: "select",
          required: true,
          options: [
            { label: "Phone call", value: "Phone call" },
            { label: "Email response", value: "Email response" },
            { label: "In-person appointment", value: "In-person appointment" }
          ]
        },
        { key: "phone", label: "Phone number", type: "tel", required: true, placeholder: "Enter contact number" },
        { key: "email", label: "Email", type: "email", placeholder: "Enter email address" },
        {
          key: "home_address",
          label: "Home address",
          type: "textarea",
          rows: 3,
          required: true,
          placeholder: "Enter the home address to be used for the proof-of-payment letter if needed."
        },
        { key: "burial_date_target", label: "Burial target date", type: "date" },
        {
          key: "notes",
          label: "Message",
          type: "textarea",
          rows: 4,
          placeholder: "Add the burial date target, venue request, payment questions, or any support the family needs."
        }
      ]
    },
    employment: {
      title: "Request employment and resettlement support",
      description: "Get resume support, job opportunity help, placement planning, and interview preparation.",
      buttonLabel: "Submit appointment request",
      fields: [
        { key: "full_name", label: "Full name", type: "text", required: true, placeholder: "Enter full name" },
        {
          key: "applicant_type",
          label: "Applicant type",
          type: "select",
          required: true,
          options: [
            { label: "Veteran", value: "Veteran" },
            { label: "Dependant or family member", value: "Dependant or family member" },
            { label: "Representative", value: "Representative" }
          ]
        },
        {
          key: "requestTypeCode",
          label: "Support needed",
          type: "select",
          required: true,
          options: [
            { label: "Resume creation support", value: "EMPLOYMENT_SUPPORT_REQUEST" },
            { label: "Interviewing workshop", value: "EMPLOYMENT_SUPPORT_REQUEST" },
            { label: "Resettlement plan", value: "EMPLOYMENT_SUPPORT_REQUEST" },
            { label: "Job Bank support", value: "JOB_OPPORTUNITY_REQUEST" },
            { label: "Job placement assistance", value: "JOB_OPPORTUNITY_REQUEST" },
            { label: "Job opportunities intake", value: "JOB_OPPORTUNITY_REQUEST" },
            { label: "Employer introduction request", value: "JOB_OPPORTUNITY_REQUEST" }
          ]
        },
        {
          key: "appointment_style",
          label: "Appointment style",
          type: "select",
          required: true,
          options: [
            { label: "In-person visit", value: "In-person visit" },
            { label: "Phone call", value: "Phone call" },
            { label: "Email response", value: "Email response" }
          ]
        },
        { key: "preferred_date", label: "Preferred date", type: "date", required: true },
        {
          key: "preferred_time_block",
          label: "Preferred time block",
          type: "select",
          required: true,
          options: [
            { label: "Morning", value: "Morning" },
            { label: "Midday", value: "Midday" },
            { label: "Afternoon", value: "Afternoon" }
          ]
        },
        { key: "service_number", label: "Service number", type: "text", placeholder: "Enter service number" },
        { key: "phone", label: "Phone number", type: "tel", required: true, placeholder: "Enter contact number" },
        { key: "email", label: "Email", type: "email", placeholder: "Enter email address" },
        {
          key: "notes",
          label: "What should the team prepare for?",
          type: "textarea",
          rows: 4,
          placeholder: "Summarize your employment goals, current resume status, and what support you want from the team."
        }
      ],
      resolveRequestTypeCode: (value) => String(value["requestTypeCode"] || "EMPLOYMENT_SUPPORT_REQUEST")
    },
    welfare: {
      title: "Request welfare or outreach support",
      description: "Use this form for welfare assistance, outreach, family support, home visits, and general veteran follow-up.",
      buttonLabel: "Submit callback request",
      fields: [
        { key: "full_name", label: "Full name", type: "text", required: true, placeholder: "Enter full name" },
        {
          key: "applicant_type",
          label: "Person seeking assistance",
          type: "select",
          required: true,
          options: [
            { label: "Veteran", value: "Veteran" },
            { label: "Dependant", value: "Dependant" },
            { label: "Family member", value: "Family member" },
            { label: "Caregiver", value: "Caregiver" },
            { label: "Representative", value: "Representative" }
          ]
        },
        {
          key: "requestTypeCode",
          label: "Support lane",
          type: "select",
          required: true,
          options: [
            { label: "Welfare assistance", value: "WELFARE_ASSISTANCE_REQUEST" },
            { label: "Outreach and communication", value: "OUTREACH_QUERY" }
          ]
        },
        {
          key: "support_lane",
          label: "Case type",
          type: "select",
          required: true,
          options: [
            { label: "General veteran query", value: "General veteran query" },
            { label: "Medical review support", value: "Medical review support" },
            { label: "Insurance or welfare support", value: "Insurance or welfare support" },
            { label: "Funeral arrangements", value: "Funeral arrangements" },
            { label: "Outreach or liaison request", value: "Outreach or liaison request" }
          ]
        },
        {
          key: "preferred_callback_window",
          label: "Preferred callback window",
          type: "select",
          required: true,
          options: [
            { label: "Morning", value: "Morning" },
            { label: "Midday", value: "Midday" },
            { label: "Afternoon", value: "Afternoon" }
          ]
        },
        { key: "service_number", label: "Service number", type: "text", placeholder: "Enter service number" },
        { key: "phone", label: "Phone number", type: "tel", required: true, placeholder: "Enter contact number" },
        { key: "email", label: "Email", type: "email", placeholder: "Enter email address" },
        {
          key: "notes",
          label: "Message",
          type: "textarea",
          rows: 4,
          placeholder: "Describe what you need and any timing concerns."
        }
      ],
      resolveRequestTypeCode: (value) => String(value["requestTypeCode"] || "WELFARE_ASSISTANCE_REQUEST")
    }
  };

  private readonly discountPartnerForm: RequestFormConfig = {
    title: "Submit a veteran discount offer",
    description: "Organizations can submit a discount offer for veterans and eligible families for review.",
    buttonLabel: "Submit discount offer",
    defaultRequestTypeCode: "DISCOUNT_PARTNER_SUBMISSION",
    fields: [
      { key: "organization_name", label: "Organization name", type: "text", required: true, placeholder: "Enter organization name" },
      { key: "contact_person", label: "Contact person", type: "text", required: true, placeholder: "Enter contact name" },
      {
        key: "offer_category",
        label: "Offer category",
        type: "select",
        required: true,
        options: [
          { label: "Health and wellness", value: "Health and wellness" },
          { label: "Transportation and mobility", value: "Transportation and mobility" },
          { label: "Retail and household", value: "Retail and household" },
          { label: "Education and training", value: "Education and training" },
          { label: "Professional services", value: "Professional services" }
        ]
      },
      { key: "phone", label: "Phone number", type: "tel", required: true, placeholder: "Enter contact number" },
      { key: "email", label: "Email", type: "email", required: true, placeholder: "Enter email address" },
      {
        key: "verification_method",
        label: "Veteran verification method",
        type: "select",
        required: true,
        options: [
          { label: "Veteran's ID Card", value: "Veteran's ID Card" },
          { label: "Confirmation letter", value: "Confirmation letter" },
          { label: "Department referral", value: "Department referral" },
          { label: "Other approved verification", value: "Other approved verification" }
        ]
      },
      {
        key: "offer_summary",
        label: "Offer summary",
        type: "textarea",
        rows: 4,
        placeholder: "Describe the discount, who qualifies, and any conditions for redemption."
      }
    ]
  };

  private readonly pages: Record<string, PortalPageConfig> = {
    records: {
      key: "records",
      eyebrow: "Records and Certificates",
      title: "Request the correct records and certificate documents by name.",
      lead: "Find military service records, certificate of service documents, certificate of commendation support, and the confirmation of employment letter with the exact information needed for that request.",
      tags: ["Records", "Certificates", "Employment Letter"],
      highlights: ["Confirmation of Employment Letter", "Military Service Records", "Certificate of Service", "Certificate of Commendation"],
      serviceCards: [
        {
          kicker: "Employment letter",
          title: "Use the exact information needed",
          description: "Confirmation of Employment Letter requests should include service number, organization, name, email, and phone number."
        },
        {
          kicker: "Certificate support",
          title: "Request the correct named certificate",
          description: "Use the correct certificate title so the records team can process the request quickly."
        }
      ],
      requestForm: this.requestForms["records"],
      ctaTitle: "Need to track progress?",
      ctaBody: "Use your dashboard after submission to follow status updates and pickup readiness."
    },
    benefits: {
      key: "benefits",
      eyebrow: "Pension and Other Benefits",
      title: "Pensions, gratuity, ex-gratia, and related benefits in one lane.",
      lead: "Use this service area for pensions, gratuities, ex-gratia, disability benefits, and death benefits.",
      tags: ["Pensions", "Gratuities", "Ex-Gratia", "Disability", "Death Benefits"],
      highlights: ["Pension and gratuity timing linked to ROD", "Ex-gratia, disability, and death benefits support", "Discount partner information for veterans"],
      serviceCards: [
        {
          kicker: "Benefit areas",
          title: "Services included in Pension and Other Benefits",
          description: "Use this lane for pensions, gratuities, ex-gratia, disability benefits, and death benefits."
        },
        {
          kicker: "Service timing",
          title: "Apply at the right time and with the right service history",
          description: "Pension and gratuity applications should be made six months before ROD, while Ex-Gratia is applied for at ROD."
        }
      ],
      requestForm: this.requestForms["benefits"]
    },
    insurance: {
      key: "insurance",
      eyebrow: "Insurance",
      title: "Review insurance guidance, health benefits, and premium rates.",
      lead: "Review the group health plan, key coverage notes, supplemental options, and premium tables in one place.",
      tags: ["Group Health", "Critical Illness", "Supplemental Life", "Dental and Optical", "Family Life"],
      highlights: ["JDF Group Insurance continues after termination of service", "Retirees' Health Insurance applies after at least eighteen years of service", "Coverage includes health benefits, supplemental options, and family support plans"],
      serviceCards: [
        {
          kicker: "Coverage",
          title: "Use one place for health and supplemental plans",
          description: "Veterans and families can use the same service lane for plan questions, claims guidance, and enrolment follow-up."
        },
        {
          kicker: "Support",
          title: "Submit claims and enrolment questions securely",
          description: "Insurance support requests can be tracked with status updates in the dashboard."
        }
      ],
      requestForm: this.requestForms["insurance"],
      ctaTitle: "Next step",
      ctaBody: "Move from insurance review into benefits, welfare support, or the Veteran's ID application."
    },
    funerals: {
      key: "funerals",
      eyebrow: "Funeral Arrangements",
      title: "Arrange funeral services, final rites, and family support.",
      lead: "Coordinate burial arrangements, tombing stages, church and venue options, Last Post support, and proof-of-payment follow-up for veterans' families and caregivers.",
      tags: ["Burial", "Tombing", "Church Use", "Last Post", "Wake and Repast"],
      highlights: ["Half vault at Briggs Park Cemetery: $58,100.00", "Tombing stage 1 cost: $10,100.00", "Headstone cost listed: $140,000.00"],
      serviceCards: [
        {
          kicker: "Payment route",
          title: "Submit receipts for proof-of-payment support",
          description: "Once a funeral receipt is reviewed, staff can prepare the proof-of-payment letter using the submitted home address."
        },
        {
          kicker: "Family support",
          title: "Keep funeral coordination and welfare follow-up together",
          description: "Use this request lane for burial coordination, church use, venue support, Last Post arrangements, and family follow-up."
        }
      ],
      requestForm: this.requestForms["funerals"]
    },
    employment: {
      key: "employment",
      eyebrow: "Resettlement and Employment",
      title: "Book support for the move from service into civilian employment.",
      lead: "Access resume creation support, interviewing workshops, resettlement planning, job bank services, and job placement through one booking and request flow.",
      tags: ["Resume", "Job Bank", "Placement", "Workshops"],
      highlights: ["Resume creation support", "Interviewing workshops", "Job opportunities intake", "Placement follow-up"],
      serviceCards: [
        {
          kicker: "Preparation",
          title: "Move from service into civilian opportunity",
          description: "Veterans can request support for resumes, interviews, and resettlement planning."
        },
        {
          kicker: "Opportunities",
          title: "Track employment support in the dashboard",
          description: "Requests stay visible while staff coordinate the next steps."
        }
      ],
      requestForm: this.requestForms["employment"]
    },
    welfare: {
      key: "welfare",
      eyebrow: "Welfare and Contact",
      title: "Route welfare, assistance, outreach, and veteran queries through the right lane.",
      lead: "Ask for medical reviews, retiree health insurance support, mental health help, home visits, welfare fund processing, outreach coordination, and general veteran query follow-up.",
      tags: ["Welfare", "Outreach", "Family Support", "Queries"],
      highlights: ["Medical for Retired Veterans consultations and reviews", "Retiree Health Insurance and Mental Health Services", "Home visit, funeral coordination, and practical welfare support"],
      serviceCards: [
        {
          kicker: "Persons seeking assistance",
          title: "Support is not limited to the veteran alone",
          description: "Dependants, family members, caregivers, and representatives can also use this route for help."
        },
        {
          kicker: "Routing",
          title: "Requests can be directed to the right lane",
          description: "Welfare and outreach requests can be tracked and escalated securely."
        }
      ],
      requestForm: this.requestForms["welfare"]
    },
    "id-guidance": {
      key: "id-guidance",
      eyebrow: "Veteran ID Guidance",
      title: "Veterans' Identification Card guidance and conditions.",
      lead: "Review eligibility, application, color codes, renewal, replacement, and use rules for the Veterans' Identification Card.",
      tags: ["Eligibility", "Access Rules", "Renewal", "Replacement"],
      highlights: ["Minimum service noted on the guidance: three years in the regular or reserve force", "Blue and red strip cards carry different access rules", "The card expires after ten years and must be renewed"],
      serviceCards: [
        {
          kicker: "Application",
          title: "Use the ID application form",
          description: "Use the ID application form when you are ready to submit details or generate the print-ready PDF."
        },
        {
          kicker: "Need support?",
          title: "Get help with guidance or follow-up",
          description: "Use welfare support when you need help with eligibility, renewal, replacement, or card access questions."
        }
      ],
      ctaTitle: "Ready to apply?",
      ctaBody: "Open the Veteran's ID page to complete the confirmed application and generate a print-ready copy."
    }
  };

  getPage(key: string): PortalPageConfig {
    return this.pages[key];
  }

  getRequestForm(key: string): RequestFormConfig | undefined {
    return this.requestForms[key];
  }

  getDiscountPartnerForm(): RequestFormConfig {
    return this.discountPartnerForm;
  }
}
