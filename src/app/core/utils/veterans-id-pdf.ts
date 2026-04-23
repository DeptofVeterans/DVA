type JsPdfInstance = import("jspdf").default;

function getAssetUrl(assetFileName: string): string {
  return new URL(`/assets/${assetFileName}`, window.location.origin).toString();
}

function formatPrintableDate(value: unknown): string {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  const date = new Date(`${raw}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return date.toLocaleDateString("en-JM", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function printableValue(value: unknown): string {
  return String(value || "").trim();
}

async function loadAssetAsDataUrl(assetFileName: string): Promise<string> {
  const response = await fetch(getAssetUrl(assetFileName));

  if (!response.ok) {
    throw new Error(`Unable to load asset ${assetFileName}`);
  }

  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Unable to read asset ${assetFileName}`));
    reader.readAsDataURL(blob);
  });
}

export async function buildVeteransIdApplicationPdf(values: Record<string, unknown>): Promise<JsPdfInstance> {
  const { default: JsPdf } = await import("jspdf");
  const pdf = new JsPdf({
    orientation: "portrait",
    unit: "pt",
    format: "legal",
    compress: true
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const outerX = 40;
  const outerY = 34;
  const outerWidth = pageWidth - 80;
  const contentX = outerX + 10;
  const contentWidth = outerWidth - 20;
  const splitWidth = contentWidth / 2;
  const lineBlue = [142, 167, 207] as const;
  const textBlue = [63, 84, 119] as const;
  const textDark = [48, 56, 72] as const;
  const sectionHeight = 18;
  let y = outerY;

  const drawSectionLabel = (label: string): void => {
    pdf.setDrawColor(...lineBlue);
    pdf.setLineWidth(1);
    pdf.rect(contentX, y, contentWidth, sectionHeight);
    pdf.setFont("times", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...textBlue);
    pdf.text(label, contentX + 7, y + 12);
    y += sectionHeight;
  };

  const drawCell = (
    x: number,
    top: number,
    width: number,
    height: number,
    label: string,
    value: string,
    options?: { inlineChoices?: string; fontSize?: number; labelBold?: boolean }
  ): void => {
    pdf.setDrawColor(...lineBlue);
    pdf.setLineWidth(0.8);
    pdf.rect(x, top, width, height);

    if (label) {
      pdf.setFont("times", options?.labelBold === false ? "normal" : "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...textBlue);
      pdf.text(label, x + 6, top + 10);
    }

    if (options?.inlineChoices) {
      pdf.setFont("times", "normal");
      pdf.setFontSize(options.fontSize || 8.4);
      pdf.setTextColor(...textDark);
      pdf.text(options.inlineChoices, x + 6, top + 20, { maxWidth: width - 12 });
      return;
    }

    const safeValue = value || " ";
    const lines = pdf.splitTextToSize(safeValue, width - 12);
    pdf.setFont("times", "normal");
    pdf.setFontSize(options?.fontSize || 9);
    pdf.setTextColor(...textDark);
    pdf.text(lines, x + 6, label ? top + 17 : top + 12, { baseline: "top" });
  };

  const drawLineField = (x: number, top: number, width: number, label: string, caption?: string): void => {
    pdf.setFont("times", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...textBlue);
    pdf.text(label, x + 6, top + 11);
    pdf.setDrawColor(...lineBlue);
    pdf.setLineWidth(0.8);
    pdf.line(x + 6, top + 29, x + width - 6, top + 29);

    if (caption) {
      pdf.setFont("times", "normal");
      pdf.setFontSize(8);
      pdf.text(caption, x + width / 2, top + 40, { align: "center" });
    }
  };

  const checked = (label: string, selected: boolean): string => `${label} (${selected ? "x" : " "})`;

  const applicationType = printableValue(values["application_type"]);
  const gender = printableValue(values["gender"]);
  const identificationType = printableValue(values["identification_type"]);
  const bloodGroup = printableValue(values["blood_group"]);
  const logoData = await loadAssetAsDataUrl("logo-board-clean.png");

  pdf.addImage(logoData, "PNG", pageWidth / 2 - 58, y + 18, 116, 48);

  y += 76;
  pdf.rect(contentX + 34, y, contentWidth - 68, 26);
  pdf.setFont("times", "bold");
  pdf.setFontSize(9.1);
  pdf.setTextColor(...textBlue);
  pdf.text("VETERANS IDENTIFICATION ACCESS/MEDICAL CARD", pageWidth / 2, y + 11, { align: "center" });
  pdf.text("APPLICATION FORM", pageWidth / 2, y + 21, { align: "center" });

  y += 38;
  pdf.setFont("times", "normal");
  pdf.setFontSize(8.3);
  pdf.setTextColor(...textDark);
  pdf.text(
    "This application form is for application to access Up Park Camp, medical assistance at the JDF Health Services Corps and discounts at specific establishments.",
    contentX + 5,
    y,
    { maxWidth: contentWidth - 10 }
  );

  y += 28;
  drawSectionLabel("Section A - (Type of application)");
  drawCell(contentX, y, contentWidth, 24, "Application Type:", "", {
    inlineChoices: [
      checked("New", applicationType === "New"),
      checked("Replacement", applicationType === "Replacement"),
      checked("Stolen", applicationType === "Stolen"),
      checked("Lost", applicationType === "Lost")
    ].join("   "),
    fontSize: 8.5
  });
  y += 24;

  drawSectionLabel("Section B - (Personal Information)");
  drawCell(contentX, y, splitWidth, 33, "Surname:", printableValue(values["surname"]));
  drawCell(contentX + splitWidth, y, splitWidth, 33, "Rank:", printableValue(values["rank"]));
  y += 33;
  drawCell(contentX, y, contentWidth, 33, "Christian or Forenames:", printableValue(values["full_name"]));
  y += 33;
  drawCell(contentX, y, splitWidth, 33, "Gender:", "", {
    inlineChoices: [checked("Male", gender === "Male"), checked("Female", gender === "Female")].join("   "),
    fontSize: 8.5
  });
  drawCell(contentX + splitWidth, y, splitWidth, 33, "Date of Birth:", formatPrintableDate(values["date_of_birth"]));
  y += 33;
  drawCell(contentX, y, splitWidth, 33, "Date(s) of Enlistment:", formatPrintableDate(values["enlistment_date"]));
  drawCell(contentX + splitWidth, y, splitWidth, 33, "Date(s) of Discharge:", formatPrintableDate(values["discharge_date"]));
  y += 33;
  drawCell(contentX, y, splitWidth, 33, "Total Service:", printableValue(values["total_service"]));
  drawCell(contentX + splitWidth, y, splitWidth, 33, "Reason for Termination:", printableValue(values["termination_reason"]));
  y += 33;
  drawCell(contentX, y, splitWidth, 33, "Regimental Number:", printableValue(values["service_number"]));
  drawCell(contentX + splitWidth, y, splitWidth, 33, "TRN Number:", printableValue(values["reference_number"]));
  y += 33;
  drawCell(contentX, y, contentWidth, 25, "Blood Group:", "", {
    inlineChoices: [
      checked("A+", bloodGroup === "A+"),
      checked("A-", bloodGroup === "A-"),
      checked("B+", bloodGroup === "B+"),
      checked("B-", bloodGroup === "B-"),
      checked("O+", bloodGroup === "O+"),
      checked("O-", bloodGroup === "O-"),
      checked("AB+", bloodGroup === "AB+"),
      checked("AB-", bloodGroup === "AB-")
    ].join("   "),
    fontSize: 8.1
  });
  y += 25;
  drawCell(contentX, y, contentWidth, 25, "Type of Identification:", "", {
    inlineChoices: [
      checked("Driver's License", identificationType === "Driver's License"),
      checked("National ID", identificationType === "National ID"),
      checked("Passport", identificationType === "Passport")
    ].join("   "),
    fontSize: 8.2
  });
  y += 25;
  drawCell(contentX, y, contentWidth, 29, "Telephone Number:", printableValue(values["phone"]));
  y += 29;
  drawCell(contentX, y, contentWidth, 34, "Email:", printableValue(values["email"]));
  y += 34;
  drawCell(contentX, y, contentWidth, 52, "Home Address:", printableValue(values["home_address"]));
  y += 52;

  drawSectionLabel("Section C - (Declaration and Signature of Applicant)");
  drawCell(
    contentX,
    y,
    contentWidth,
    48,
    "",
    "I, the undersigned, apply for the issue of a Veterans Identification Access/Medical Card.\nI declare that the information given in this application is correct and to the best of my knowledge and belief.",
    { fontSize: 8.8, labelBold: false }
  );
  y += 48;
  drawCell(contentX, y, splitWidth, 34, "Signature:", printableValue(values["signature_name"]));
  drawCell(contentX + splitWidth, y, splitWidth, 34, "Date:", formatPrintableDate(values["application_date"]));
  y += 34;

  drawSectionLabel("Section D - (Official use only)");
  drawCell(contentX, y, contentWidth, 25, "Payment Method:", "", {
    inlineChoices: `${checked("Cash", false)}   ${checked("Bank Transfer", false)}`,
    fontSize: 8.5
  });
  y += 25;
  pdf.setDrawColor(...lineBlue);
  pdf.setLineWidth(0.8);
  pdf.rect(contentX, y, splitWidth, 52);
  pdf.rect(contentX + splitWidth, y, splitWidth, 52);
  drawLineField(contentX, y, splitWidth, "Signature of Certifying Official");
  drawLineField(contentX + splitWidth, y, splitWidth, "Approved by:", "Director of Veterans Affairs");
  y += 52;
  pdf.rect(contentX, y, splitWidth, 38);
  pdf.rect(contentX + splitWidth, y, splitWidth, 38);
  drawLineField(contentX, y, splitWidth, "Date:");
  drawLineField(contentX + splitWidth, y, splitWidth, "Date:");

  const borderBottom = Math.min(pageHeight - 36, y + 48);
  pdf.setDrawColor(...lineBlue);
  pdf.setLineWidth(1);
  pdf.rect(outerX, outerY, outerWidth, borderBottom - outerY);

  return pdf;
}
