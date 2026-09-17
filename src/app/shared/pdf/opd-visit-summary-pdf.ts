/**
 * OPD visit summary PDF for a SAVED visit.
 *
 * The OPD assessment form is where doctors write notes now (the DoctorNote
 * screen is retired), so a visit's summary is built from its saved
 * OPDAssessment row plus that visit's prescriptions, investigation orders and
 * ophthalmology record. Three places produce it and must never drift:
 *
 *   • patient-info            → "Print Full OPD Summary"
 *   • today-consultations     → the visit-summary Print icon
 *   • today-consultations     → "Send to patient on WhatsApp"
 *
 * The body comes from `buildOpdAssessmentContent`, so it also matches the OPD
 * assessment form's own print. Everything here is pure — callers own the
 * letterhead wrapper and `pdfMake.createPdf`.
 */

import { groupAndSort } from '../ui/template-form-renderer/template-form-renderer.component';
import {
  buildOpdAssessmentContent,
  buildInvestigationBlocks,
  buildPrescriptionBlocks,
  plainNoteSection,
} from './opd-assessment-pdf';

type Row = { label: string; value: string };
type EyeRow = { label: string; right: string; left: string };

/**
 * Pick one visit's OPD assessment + eye record out of a patient's history.
 *
 * Keyed on appointmentId, NOT the date: a patient can have two appointments on
 * the same day in different departments, and a date-only match returns
 * whichever came first. The date fallback only applies when no appointment id
 * is known, or to legacy assessments saved without one.
 */
export function resolveVisitRecords(input: {
  assessments: any[];
  eyeRecords: any[];
  date: string;
  appointmentId: number | null;
}): { assessment: any | null; eyeRecord: any | null } {
  const { assessments, eyeRecords, date, appointmentId: id } = input;

  const assessment =
    (id != null && assessments.find((a: any) => a.appointmentId === id))
    || (id == null ? assessments.find((a: any) => a.date === date) : null)
    || assessments.find((a: any) => a.date === date && a.appointmentId == null)
    || null;

  const eyeRecord =
    (id != null && eyeRecords.find((p: any) => p.appointmentId === id))
    || null;

  return { assessment, eyeRecord };
}

// ─── Assessment views (shared by the on-screen visit view and the PDF) ──────

export function formatTemplatedValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  const s = String(v);
  // Hand-written canvases are data-URLs — not printable as text here.
  return s.startsWith('data:image') ? '(hand-written)' : s;
}

/**
 * The doctor's template fields as snapshotted on this assessment, under their
 * group headings and in the template's own order — the same `groupAndSort`
 * the form and the OPD print use, so all three agree.
 */
export function assessmentTemplatedGroups(assessment: any): { group: string; rows: Row[] }[] {
  const raw = assessment?.templatedValues;
  if (!raw) return [];
  let parsed: any;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [];
  }
  const schema: any[] = parsed?._schema ?? [];
  const values: Record<string, unknown> = parsed?._values ?? {};

  return groupAndSort(schema)
    .map((block) => ({
      group: block.group,
      rows: block.fields
        .map((f: any) => ({
          label: f.label ?? f.key,
          value: formatTemplatedValue(values[f.key]),
        }))
        .filter((r) => r.value !== ''),
    }))
    .filter((b) => b.rows.length > 0);
}

/**
 * Everything else the OPD assessment captures, so the visit view reflects the
 * live form rather than the retired DoctorNote screen. Blank rows drop.
 */
export function assessmentDetailBlocks(assessment: any): { title: string; rows: Row[] }[] {
  const a = assessment;
  if (!a) return [];
  const yn = (v: any) => (v === true ? 'Yes' : v === false ? 'No' : '');
  const pick = (rows: [string, any][]) =>
    rows
      .map(([label, value]) => ({
        label,
        value: value === null || value === undefined ? '' : String(value).trim(),
      }))
      .filter((r) => r.value !== '');

  // Vitals are deliberately NOT here — the visit already has its own Vitals
  // Details view, and the printed summary opens with a vitals table.
  return [
    {
      title: 'Nutritional Assessment',
      rows: pick([
        ['Oral diet', a.oralDiet], ['Enteral feed', a.enteralFeed],
        ['NPO', yn(a.npo)], ['Specify', a.specify], ['Allergies', a.allergies],
      ]),
    },
    {
      title: 'Pain & Screening',
      rows: pick([
        ['Pain score', a.painScore],
        ['Other screening required', yn(a.screeningReq)],
        ['Counselling on implants', yn(a.implantCounsel)],
      ]),
    },
    {
      title: 'Recorded By',
      rows: pick([
        ['Doctor', a.doctorName], ['KMC No', a.kmcNo],
        ['Staff', a.staffName], ['Staff Emp ID', a.staffEmpId],
        ['Assessment time', a.assessmentTime],
      ]),
    },
  ].filter((b) => b.rows.length > 0);
}

// ─── Ophthalmology record ─────────────────────────────────────────────────

/** One eye-record cell, blank-safe. */
function eyeVal(eyeRecord: any, key: string): string {
  const v = eyeRecord?.[key];
  return v === null || v === undefined || v === '' ? '-' : String(v);
}

/**
 * Rows for a refraction table (`ar`, `arDil`, `sr`) — measurement per row,
 * eye per column, same shape as the ophthalmology form.
 */
export function eyeTable(eyeRecord: any, prefix: string): EyeRow[] {
  return [
    { label: 'SPH',  right: eyeVal(eyeRecord, prefix + 'SphR'),  left: eyeVal(eyeRecord, prefix + 'SphL') },
    { label: 'CYL',  right: eyeVal(eyeRecord, prefix + 'CylR'),  left: eyeVal(eyeRecord, prefix + 'CylL') },
    { label: 'AXIS', right: eyeVal(eyeRecord, prefix + 'AxisR'), left: eyeVal(eyeRecord, prefix + 'AxisL') },
    { label: 'V/A',  right: eyeVal(eyeRecord, prefix + 'VAR'),   left: eyeVal(eyeRecord, prefix + 'VAL') },
  ];
}

/** Visual-acuity rows (unaided / with glasses / near). */
export function eyeVaTable(eyeRecord: any): EyeRow[] {
  return [
    { label: 'Unaided',      right: eyeVal(eyeRecord, 'uaVr'),   left: eyeVal(eyeRecord, 'uaVl') },
    { label: 'With Glasses', right: eyeVal(eyeRecord, 'glVr'),   left: eyeVal(eyeRecord, 'glVl') },
    { label: 'Near',         right: eyeVal(eyeRecord, 'nearVr'), left: eyeVal(eyeRecord, 'nearVl') },
  ];
}

/** True when a dilated AR reading was recorded for this visit. */
export function hasDilatedAr(eyeRecord: any): boolean {
  return !!(eyeRecord?.arDilSphR || eyeRecord?.arDilSphL);
}

/** Ophthalmology work-up as pdfMake blocks; [] when the visit has none. */
export function eyeRecordPdfBlocks(eyeRecord: any): any[] {
  const e = eyeRecord;
  if (!e) return [];

  const table = (title: string, rows: EyeRow[]) => ([
    { text: title, style: 'section' },
    {
      table: {
        widths: ['*', '*', '*'],
        body: [
          ['', 'Right', 'Left'],
          ...rows.map((r) => [r.label, r.right, r.left]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 0, 0, 10],
    },
  ]);

  const provenance = e.recordedBy
    ? `Recorded by ${e.recordedBy}${e.verifiedBy ? ` · verified by ${e.verifiedBy}` : ' · NOT VERIFIED by the doctor'}`
    : '';

  return [
    { text: 'Ophthalmology:', style: 'section', decoration: 'underline' },
    ...(provenance ? [{ text: provenance, margin: [0, 0, 0, 8], italics: true }] : []),
    ...table('Visual Acuity', eyeVaTable(e)),
    ...table('Auto Refraction — Before Dilation', eyeTable(e, 'ar')),
    ...(hasDilatedAr(e) ? table('Auto Refraction — After Dilation', eyeTable(e, 'arDil')) : []),
    ...table('Subjective Refraction', eyeTable(e, 'sr')),
    { text: 'IOP / NCT', style: 'section' },
    { text: `Right: ${eyeVal(e, 'iopR')} · Left: ${eyeVal(e, 'iopL')}`, margin: [0, 0, 0, 10] },
    ...(e.diagnosis ? [{ text: 'Eye Diagnosis', style: 'section' }, { text: e.diagnosis, margin: [0, 0, 0, 10] }] : []),
    ...(e.advice ? [{ text: 'Eye Advice', style: 'section' }, { text: e.advice, margin: [0, 0, 0, 10] }] : []),
  ];
}

// ─── Other visit sections ─────────────────────────────────────────────────

/** Template fields (grouped, ordered) as pdfMake blocks. */
export function templatedPdfBlocks(assessment: any): any[] {
  const blocks: any[] = [];
  for (const group of assessmentTemplatedGroups(assessment)) {
    if (group.group) {
      blocks.push({ text: group.group, style: 'sectionHeader' });
    }
    for (const row of group.rows) {
      blocks.push({ text: `${row.label}: ${row.value}`, margin: [0, 0, 0, 4] });
    }
  }
  return blocks.length ? [...blocks, { text: '', margin: [0, 0, 0, 10] }] : [];
}

/**
 * Lab / radiology ordered on this visit, reshaped into the same
 * `labByDept` / `radiologyNames` form the OPD order grid emits so the saved
 * summary and the live assessment print render an identical section.
 *
 * Saved rows are the DB shape: Lab / Radiology carry the test name in
 * `description`, and the radiology safety block is stored as `rad*` columns.
 */
export function investigationPdfBlocks(investigationOrders: any[]): any[] {
  const orders = investigationOrders ?? [];
  if (!orders.length) return [];

  const byDept = new Map<string, string[]>();
  const radiologyNames: string[] = [];
  const remarks: string[] = [];

  for (const o of orders) {
    for (const t of o.labTests ?? []) {
      const dept = t.department || t.category || 'Laboratory';
      if (!byDept.has(dept)) byDept.set(dept, []);
      const name = t.description || t.testName || t.name;
      if (name && !byDept.get(dept)!.includes(name)) byDept.get(dept)!.push(name);
    }
    for (const r of o.radiologyTests ?? []) {
      const name = r.description || r.testName || r.name;
      if (name && !radiologyNames.includes(name)) radiologyNames.push(name);
    }
    if (o.remarks?.trim()) remarks.push(o.remarks.trim());
  }

  // Safety details live on the order that carries the radiology study.
  const rad = orders.find((o) => (o.radiologyTests ?? []).length) ?? {};

  return buildInvestigationBlocks({
    labByDept: Array.from(byDept.entries()).map(([department, tests]) => ({ department, tests })),
    radiologyNames,
    radiology: {
      priority: rad.radPriority,
      clinicalDetails: rad.radClinicalDetails,
      serumCreatinine: rad.radSerumCreatinine,
      creatinineDoneOn: rad.radCreatinineDoneOn,
      weightKg: rad.radWeightKg,
      pregnancy: rad.radPregnancy,
      lmp: rad.radLmp,
      allergyHistory: rad.radAllergyHistory,
      comorbidities: String(rad.radComorbidities ?? '')
        .split(',')
        .map((c: string) => c.trim())
        .filter(Boolean),
      consentGiven: rad.radConsentGiven,
    },
    remarks: remarks.join(' · '),
  });
}

/** Drugs prescribed on this visit — same table as the assessment print. */
export function prescriptionPdfBlocks(prescriptions: any[]): any[] {
  const tablets = (prescriptions ?? []).flatMap((p: any) => p.tablets ?? []);
  return buildPrescriptionBlocks(tablets);
}

// ─── The summary ──────────────────────────────────────────────────────────

export interface SavedVisitSummaryInput {
  /** The visit's saved OPDAssessment row. */
  assessment: any;
  /** The visit's OphthalmologyPrescription row, if any. */
  eyeRecord?: any | null;
  /** Prescription rows for this visit (each carrying `tablets`). */
  prescriptions?: any[];
  /** InvestigationOrder rows for this visit. */
  investigationOrders?: any[];
  /** Used when the assessment row has no name of its own. */
  fallbackPatientName?: string;
}

/**
 * pdfMake `content` for one saved visit. Fed from the SAVED row rather than
 * live form state, so anything not persisted is simply absent and its block
 * drops.
 */
export function buildSavedVisitSummaryContent(input: SavedVisitSummaryInput): any[] {
  const a = input.assessment ?? {};

  return buildOpdAssessmentContent({
    d: {
      patientName: a.name || input.fallbackPatientName,
      age: a.age, gender: a.gender, uhid: a.uhId,
      height: a.height, weight: a.weight, date: a.date,
      consultant: a.consultant, department: a.department,
      assessmentTime: a.assessmentTime,

      hr: a.hr, rr: a.rr, pulse: a.pulse, bp: a.bp, temp: a.temp, spo2: a.spo2,

      dietType: a.oralDiet, enteralFeed: a.enteralFeed,
      npo: a.npo, allergies: a.allergies,
      painScore: a.painScore,
      otherScreening: a.screeningReq, counsellingImplants: a.implantCounsel,

      history: a.history, examination: a.examination,
      investigation: a.investigation, treatmentPlan: a.treatmentPlan,

      staffName: a.staffName, staffEmpId: a.staffEmpId,
      doctorName: a.doctorName, kmcNo: a.kmcNo,
      doctorSign: a.doctorSealSign,
    },
    templatedBlocks: templatedPdfBlocks(a),
    eyeBlocks: eyeRecordPdfBlocks(input.eyeRecord ?? null),
    investigationBlocks: investigationPdfBlocks(input.investigationOrders ?? []),
    prescriptionBlocks: prescriptionPdfBlocks(input.prescriptions ?? []),
    noteSection: plainNoteSection,
  });
}
