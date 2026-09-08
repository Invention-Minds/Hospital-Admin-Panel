/**
 * Shared OPD assessment PDF body.
 *
 * The OPD assessment form is the single place OPD notes are written, so its
 * layout is also what the patient module's "Print Full OPD Summary" must
 * produce. Both callers build these blocks from the same function so the two
 * printouts can never drift:
 *
 *   • opd-assessment.component  → live form state (children supply the
 *     prescription / investigation / ophthalmology blocks).
 *   • patient-info.component    → a saved OPDAssessment row for one visit.
 *
 * Everything here is pure — no component state, no Angular. Callers own the
 * letterhead wrapper (pageMargins / background / footer) and `pdfMake.createPdf`.
 */

/** Assessment fields, in the `formData` shape the OPD form already uses. */
export interface OpdAssessmentPdfData {
  patientName?: string;
  age?: string;
  gender?: string;
  uhid?: string;
  height?: string;
  weight?: string;
  date?: string;
  consultant?: string;
  department?: string;
  assessmentTime?: string;

  hr?: string; rr?: string; pulse?: string; bp?: string; temp?: string; spo2?: string;

  dietType?: string;
  enteralFeed?: string;
  npo?: boolean;
  allergies?: string;
  painScore?: string;
  otherScreening?: boolean;
  counsellingImplants?: boolean;

  history?: string;
  examination?: string;
  diagnosis?: string;
  investigation?: string;
  treatmentPlan?: string;

  staffName?: string;
  staffEmpId?: string;
  doctorName?: string;
  kmcNo?: string;
  doctorSign?: string;
}

export interface OpdAssessmentPdfInput {
  d: OpdAssessmentPdfData;
  /** Department template fields (already ordered + grouped). */
  templatedBlocks?: any[];
  /** Ophthalmology eye record — eye departments only. */
  eyeBlocks?: any[];
  /** Structured lab / radiology orders. */
  investigationBlocks?: any[];
  /** Prescription drug rows. */
  prescriptionBlocks?: any[];
  /**
   * Renders a free-text/hand-written section, or [] when blank — a template
   * user fills the template's fields, not these, and empty headings followed
   * by a dash are noise on a printout.
   */
  noteSection: (label: string, value: any) => any[];
}

/** Styles the blocks below reference. Callers spread this into docDefinition. */
export const OPD_ASSESSMENT_PDF_STYLES = {
  header: { fontSize: 16, bold: true },
  subheader: { fontSize: 14, bold: true },
  sectionHeader: { fontSize: 12, bold: true, margin: [0, 10, 0, 5] },
};

export function buildOpdAssessmentContent(input: OpdAssessmentPdfInput): any[] {
  const { d, noteSection } = input;

  return [
    // Hospital header is supplied by the letterhead background.
    { text: "OPD INITIAL ASSESSMENT", style: "subheader", alignment: "center", margin: [0, 0, 0, 20] },

    // Patient Info
    {
      table: {
        widths: ["*", "*", "*"],
        body: [
          [
            { text: `Name: ${d.patientName || "-"}` },
            { text: `Age/Sex: ${d.age || "-"} / ${d.gender || "-"}` },
            { text: `UHID: ${d.uhid || "-"}` }
          ],
          [
            { text: `Ht: ${d.height || "-"}` },
            { text: `Wt: ${d.weight || "-"}` },
            { text: `Date: ${d.date || "-"}` }
          ],
          [
            { text: `Consultant: ${d.consultant || "-"}` },
            { text: `Department: ${d.department || "-"}` },
            { text: `Assessment Time: ${d.assessmentTime || "-"}` }
          ]
        ]
      },
      margin: [0, 0, 0, 20]
    },

    // Vitals
    { text: "Vitals:", style: "sectionHeader" },
    {
      columns: [
        { text: `HR: ${d.hr || "-"}` },
        { text: `RR: ${d.rr || "-"}` },
        { text: `Pulse: ${d.pulse || "-"}` },
        { text: `BP: ${d.bp || "-"}` },
        { text: `Temp: ${d.temp || "-"}` },
        { text: `SPO2: ${d.spo2 || "-"}` }
      ],
      margin: [0, 0, 0, 20]
    },

    // Nutrition
    { text: "Nutritional Assessment:", style: "sectionHeader" },
    {
      table: {
        widths: ["*", "*", "*", "*"],
        body: [
          [
            { text: `Oral: ${d.dietType || "-"}` },
            { text: `Enteral: ${d.enteralFeed || "-"}` },
            { text: `NPO: ${d.npo ? "Yes" : "No"}` },
            { text: `Allergies: ${d.allergies || "None"}` }
          ]
        ]
      },
      margin: [0, 0, 0, 20]
    },

    // Pain Score (legend with the selected band marked)
    { text: "Pain Score:", style: "sectionHeader" },
    {
      table: {
        widths: ["auto", "*"],
        body: [
          ["0", d.painScore === "0" ? "No hurt - Selected" : "No hurt"],
          ["1-3", d.painScore === "1-3" ? "Mild - Selected" : "Mild"],
          ["4-7", d.painScore === "4-7" ? "Moderate - Selected" : "Moderate"],
          ["8-10", d.painScore === "8-10" ? "Severe - Selected" : "Severe"]
        ]
      },
      margin: [0, 0, 0, 20]
    },

    // Screening
    { text: "Screening:", style: "sectionHeader" },
    {
      table: {
        widths: ["*", "*"],
        body: [
          [
            { text: `Requirement for any other screening: ${d.otherScreening ? "Yes" : "No"}` },
            { text: `Counselling on implants: ${d.counsellingImplants ? "Yes" : "No"}` }
          ]
        ]
      },
      margin: [0, 0, 0, 20]
    },

    // Department-specific templated fields — the doctor's own template.
    ...(input.templatedBlocks ?? []),

    // Ophthalmology eye record — eye departments only.
    ...(input.eyeBlocks ?? []),

    // Free-text / hand-written sections; blank ones are omitted.
    ...noteSection("History:", d.history),
    ...noteSection("Examination:", d.examination),
    ...noteSection("Diagnosis:", d.diagnosis),
    ...noteSection("Investigation:", d.investigation),

    // Structured lab/radiology orders.
    ...(input.investigationBlocks ?? []),

    ...noteSection("Treatment Plan:", d.treatmentPlan),

    // Prescription drug rows.
    ...(input.prescriptionBlocks ?? []),

    // Staff
    { text: "Staff:", style: "sectionHeader" },
    { text: `Name: ${d.staffName || "-"}, Emp ID: ${d.staffEmpId || "-"}`, margin: [0, 0, 0, 20] },

    // Doctor
    { text: "Doctor:", style: "sectionHeader" },
    { text: `Name: ${d.doctorName || "-"}, KMC No: ${d.kmcNo || "-"}` },
    d.doctorSign ? { image: d.doctorSign, width: 200, margin: [0, 10, 0, 0] } : {}
  ];
}

/** Shared pdfMake table layout: shaded header row, light grid, padding. */
export const OPD_PDF_GRID_LAYOUT: any = {
  fillColor: (rowIndex: number) => (rowIndex === 0 ? '#eef3fa' : null),
  hLineColor: () => '#d6dce5',
  vLineColor: () => '#d6dce5',
  hLineWidth: () => 0.7,
  vLineWidth: () => 0.7,
  paddingTop: () => 4,
  paddingBottom: () => 4,
  paddingLeft: () => 6,
  paddingRight: () => 6,
};

/** Prescription drug rows — identical table for both printouts. */
export function buildPrescriptionBlocks(tablets: any[]): any[] {
  if (!tablets || !tablets.length) return [];
  return [
    { text: 'Prescription:', style: 'sectionHeader' },
    {
      table: {
        widths: ['*', 'auto', 'auto', 'auto', '*'],
        body: [
          [
            { text: 'Drug', bold: true },
            { text: 'Frequency', bold: true },
            { text: 'Duration', bold: true },
            { text: 'Qty', bold: true },
            { text: 'Instructions', bold: true },
          ],
          ...tablets.map((t: any) => [
            { text: [t.brandName, t.genericName].filter(Boolean).join(' / ') || '-' },
            { text: t.frequency || '-' },
            { text: t.duration || '-' },
            { text: t.quantity || '-' },
            { text: t.instructions || '-' },
          ]),
        ],
      },
      layout: OPD_PDF_GRID_LAYOUT,
      margin: [0, 5, 0, 15],
    },
  ];
}

/**
 * Lab / radiology orders. `labByDept` groups tests under their category, the
 * same shape the order grid emits, so a saved order and a live one print alike.
 */
export function buildInvestigationBlocks(inv: {
  labByDept: { department: string; tests: string[] }[];
  radiologyNames: string[];
  radiology?: any;
  remarks?: string;
}): any[] {
  const labGroups = inv?.labByDept ?? [];
  const radNames = inv?.radiologyNames ?? [];
  if (!labGroups.length && !radNames.length) return [];

  const content: any[] = [{ text: 'Investigation Orders:', style: 'sectionHeader' }];

  if (labGroups.length) {
    content.push({
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Category', bold: true }, { text: 'Tests', bold: true }],
          ...labGroups.map((g) => [
            { text: g.department, bold: true, color: '#44546a' },
            { text: g.tests.join(', ') },
          ]),
        ],
      },
      layout: OPD_PDF_GRID_LAYOUT,
      margin: [0, 5, 0, 12],
    });
  }

  if (radNames.length) {
    content.push({ text: `Radiology: ${radNames.join(', ')}`, margin: [0, 0, 0, 6] });
    const r: any = inv.radiology || {};
    const safety: string[] = [];
    if (r.priority) safety.push(`Priority: ${r.priority}`);
    if (r.clinicalDetails) safety.push(`Clinical details: ${r.clinicalDetails}`);
    if (r.serumCreatinine) {
      safety.push(`S. Creatinine: ${r.serumCreatinine}${r.creatinineDoneOn ? ` (done ${r.creatinineDoneOn})` : ''}`);
    }
    if (r.weightKg) safety.push(`Weight: ${r.weightKg} kg`);
    if (r.pregnancy) safety.push(`Pregnancy: Yes${r.lmp ? `, LMP ${r.lmp}` : ''}`);
    if (r.allergyHistory) safety.push(`Allergy: ${r.allergyHistory}`);
    const comorbid = [...(r.comorbidities || [])];
    if (r.otherComorbidity) comorbid.push(r.otherComorbidity);
    if (comorbid.length) safety.push(`History: ${comorbid.join(', ')}`);
    if (r.consentGiven) safety.push('Consent obtained');
    if (safety.length) content.push({ text: safety.join('   •   '), fontSize: 9, margin: [0, 0, 0, 12] });
  }

  if (inv.remarks?.trim()) {
    content.push({ text: `Remarks: ${inv.remarks.trim()}`, fontSize: 9, margin: [0, 0, 0, 12] });
  }

  return content;
}

/**
 * Blank-safe label + value for a free-text section — the default
 * `noteSection` implementation, shared so both printouts drop empty sections
 * the same way.
 */
export function plainNoteSection(label: string, value: any): any[] {
  const blank = value === null || value === undefined || String(value).trim() === '';
  if (blank) return [];
  const isImage = typeof value === 'string' && value.startsWith('data:image');
  return [
    { text: label, style: 'sectionHeader' },
    isImage
      ? { image: value, width: 400, margin: [0, 5, 0, 15] }
      : { text: String(value), margin: [0, 5, 0, 15] },
  ];
}
