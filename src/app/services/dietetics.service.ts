import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Dietetics service — single client surface for the dietitian, dietary /
 * kitchen staff, ward nurses and the billing team. Field names mirror the
 * backend Prisma schema 1:1.
 *
 * Workflow (the hospital's Dietary Services process):
 *   Nursing census → Dietary acknowledges → Dietitian rounds + screening
 *   → Diet Information Sheet (issued, F&B acknowledges) → kitchen trays
 *   → labels → prepared → served → billed flag
 */

/**
 * Browser-local calendar date as YYYY-MM-DD. `toISOString()` gives the UTC
 * date, which is the previous day between 00:00 and 05:30 IST.
 */
export function localDateString(d: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO instant → `YYYY-MM-DDTHH:mm` in local time, the format datetime-local binds to. */
export function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local value → ISO instant (browser time zone), or null. */
export function fromDateTimeLocal(v: string | null | undefined): string | null {
  return v ? new Date(v).toISOString() : null;
}

/** Split free text into a list on commas, semicolons or new lines. */
export function splitList(text: string): string[] {
  return text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * Read a DietMaster list field (restrictions / targetConditions). Stored as a
 * JSON array, but older saves were JSON-encoded two or more times
 * (`"\"Low salt\""`) — peel layers until we reach an array or plain text.
 */
export function decodeJsonList(raw: string | null | undefined): string[] {
  let v: unknown = raw;
  for (let i = 0; i < 5 && typeof v === 'string'; i++) {
    try { v = JSON.parse(v); } catch { break; }
  }
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return typeof v === 'string' ? splitList(v) : [];
}

/** Words too generic to count as a diagnosis ↔ target-condition match. */
const MATCH_STOPWORDS = new Set([
  'with', 'type', 'than', 'and', 'the', 'for', 'from', 'post', 'chronic',
  'disease', 'patient', 'patients', 'acute', 'difficulty',
]);

/**
 * Diets whose target conditions share a meaningful word (4+ letters, not a
 * stopword) with the diagnosis. Plain word matching — "T2DM" will not match
 * "diabetes", so target conditions should use the terms doctors write.
 */
export function suggestDiets(diets: DietMaster[], diagnosis: string | null | undefined): DietMaster[] {
  const dx = (diagnosis ?? '').toLowerCase();
  if (!dx) return [];
  return diets.filter((d) =>
    decodeJsonList(d.targetConditions).some((cond) =>
      cond.toLowerCase().split(/[^a-z0-9]+/).some((w) =>
        w.length >= 4 && !MATCH_STOPWORDS.has(w) && dx.includes(w))));
}

/** Short labels for the dietary-practice flags the kitchen must honour. */
export function dietFlags(diet?: Partial<DietMaster> | null): string[] {
  if (!diet) return [];
  const flags: string[] = [];
  if (diet.isVeg) flags.push('Veg');
  if (diet.isJain) flags.push('Jain');
  if (diet.isHalal) flags.push('Halal');
  if (diet.isKosher) flags.push('Kosher');
  if (diet.isNoOnionGarlic) flags.push('No onion/garlic');
  return flags;
}

/** Hospital wording for the tray statuses. */
export const TRAY_STATUS_LABEL: Record<string, string> = {
  ORDERED: 'Ordered',
  PLATED: 'Prepared',
  DELIVERED: 'Served',
  CONSUMED: 'Intake recorded',
  SKIPPED: 'Not served',
};

// ─── Masters ──────────────────────────────────────────────────────────

export interface MealTimeSlot {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  /** HH:mm — last time a change can still reach the kitchen for this meal. */
  orderCutoff?: string | null;
  sequence: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AllergenMaster {
  id: string;
  name: string;
  isActive: boolean;
}

export type DietKind = 'ORAL' | 'FEED' | 'NO_TRAY';
export const DIET_KIND_LABEL: Record<DietKind, string> = {
  ORAL: 'Oral (trays from menu + sheet)',
  FEED: 'RT / tube feed (sheet instructions only)',
  NO_TRAY: 'No tray (home food / mother food)',
};

export interface DietMaster {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  caloriesKcal?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  sodiumMg?: number | null;
  potassiumMg?: number | null;
  fluidMl?: number | null;
  restrictions?: string | null;
  isVeg: boolean;
  isJain: boolean;
  isHalal: boolean;
  isKosher: boolean;
  isNoOnionGarlic: boolean;
  targetConditions?: string | null;
  /** Normal / non-therapeutic diet — NABH COP.7.b flags chronic patients on it. */
  isGeneral?: boolean;
  kind?: DietKind;
  isActive: boolean;
}

/** Write shape for upsertDiet — the list fields go up as arrays, not JSON strings. */
export type DietMasterPayload = Partial<Omit<DietMaster, 'restrictions' | 'targetConditions'>> & {
  restrictions?: string[];
  targetConditions?: string[];
};

export interface DietTexture {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  sequence: number;
  isActive: boolean;
}

export interface SupplementMaster {
  id: string;
  name: string;
  unit?: string | null;
  defaultDose?: string | null;
  notes?: string | null;
  isActive: boolean;
}

export interface DieteticsSettings {
  sheetStartSlotId: string | null;
  sheetStandingNotes: string;
  labelWidthMm: number;
  labelHeightMm: number;
  labelColumns: number;
  labelShowQr: boolean;
  defaultScreeningForm: string;
  maternalDepartments: string[];
}

export interface MealMaster {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  caloriesKcal?: number | null;
  isVeg: boolean;
  isActive: boolean;
  compatibleDietIds?: string[];
  allergenIds?: string[];
}

export interface MenuPlanCell {
  id?: string;
  dietMasterId: string;
  mealTimeSlotId: string;
  mealMasterId: string;
  dayOfWeek: number; // 0..6
  notes?: string | null;
  meal?: MealMaster;
  mealTimeSlot?: MealTimeSlot;
}

export interface DrugFoodInteraction {
  id: string;
  match: string;
  severity: 'info' | 'warning' | 'critical' | string;
  foodGuidance: string;
  isActive: boolean;
}

export interface AdmissionInteractionHit {
  prescriptionId: string;
  drugName: string;
  severity: DrugFoodInteraction['severity'];
  foodGuidance: string;
}

// ─── Diet plans ───────────────────────────────────────────────────────

export interface DietPlan {
  id: string;
  admissionId: string;
  dietMasterId: string;
  diet?: DietMaster;
  texture?: DietTexture | null;
  textureId?: string | null;
  startDate: string;
  endDate?: string | null;
  npoFrom?: string | null;
  npoUntil?: string | null;
  restrictionsSnapshot?: string | null;
  allergensSnapshot?: string | null;
  notesForKitchen?: string | null;
  noteTemplateId?: string | null;
  templatedValues?: string | null;
  foodAvoid?: string | null;
  fluidRestrictionMl?: number | null;
  disposablePlate?: boolean;
  feedVolumeMl?: number | null;
  feedIntervalHours?: number | null;
  feedNotes?: string | null;
  needsCheck?: boolean;
  checkNote?: string | null;
  remarks?: string | null;
  /** DIETITIAN | CENSUS (interim plan from the nursing census). */
  source?: string;
  signedAt?: string | null;
  signedBy?: string | null;
  signedById?: number | null;
  signatureId?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED' | 'ENDED' | 'INTERIM';
  reassessmentReason?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  /** Queue only: the patient row for an active plan. */
  patient?: DieticianQueueRow | null;
}

export interface UpsertDietPlanPayload {
  admissionId: string;
  dietMasterId: string;
  startDate?: string;
  endDate?: string | null;
  npoFrom?: string | null;
  npoUntil?: string | null;
  restrictionsSnapshot?: string[];
  allergensSnapshot?: string[];
  notesForKitchen?: string | null;
  noteTemplateId?: string | null;
  templatedValueMap?: Record<string, unknown>;
  reassessmentReason?: string | null;
  textureId?: string | null;
  foodAvoid?: string | null;
  fluidRestrictionMl?: number | null;
  disposablePlate?: boolean;
  feedVolumeMl?: number | null;
  feedIntervalHours?: number | null;
  feedNotes?: string | null;
  needsCheck?: boolean;
  checkNote?: string | null;
  remarks?: string | null;
}

export interface DieticianQueueRow {
  id: string;
  admissionNo: string;
  prn: string;
  admissionDate: string;
  department: string;
  diagnosis: string;
  admittingDoctor: string;
  wardName?: string | null;
  bedNumber?: string | null;
  patientName?: string | null;
  age?: string | null;
  sex?: string | null;
  /** Pending rows on an INTERIM census diet. */
  interimDiet?: { code: string; name: string } | null;
  checkNote?: string | null;
}

export interface DieticianQueue {
  pending: DieticianQueueRow[];
  reassess: DieticianQueueRow[];
  check: DieticianQueueRow[];
  active: DietPlan[];
}

export interface DietHistoryEvent {
  at: string;
  by: string | null;
  what: string;
}

// ─── Meal orders ──────────────────────────────────────────────────────

export interface MealOrder {
  id: string;
  admissionId: string;
  dietPlanId: string;
  mealTimeSlotId: string;
  mealMasterId?: string | null;
  meal?: MealMaster;
  mealTimeSlot?: MealTimeSlot;
  scheduledFor: string;
  wardId?: string | null;
  bedId?: string | null;
  status: 'ORDERED' | 'PLATED' | 'DELIVERED' | 'CONSUMED' | 'SKIPPED';
  platedAt?: string | null;
  platedBy?: string | null;
  deliveredAt?: string | null;
  deliveredBy?: string | null;
  servedByName?: string | null;
  delayReason?: string | null;
  kitchenNotes?: string | null;
  skipReason?: string | null;
  billed?: boolean;
  billedAt?: string | null;
  billedBy?: string | null;
  delivery?: MealDelivery | null;
  intake?: MealIntake | null;
  // Hydrated by the backend /kitchen endpoint:
  admissionNo?: string | null;
  patientName?: string | null;
  prn?: string | null;
  wardName?: string | null;
  bedNumber?: string | null;
  department?: string | null;
  displayCode?: string | null;
  interim?: boolean;
  avoid?: string | null;
  disposablePlate?: boolean;
  fluidRestrictionMl?: number | null;
  dietFlags?: string[];
  alerts?: string[];
  dietPlan?: { diet?: DietMaster };
}

export interface MealDelivery {
  id: string;
  mealOrderId: string;
  deliveredAt: string;
  deliveredBy?: string | null;
  deliveredById?: number | null;
  signatureId?: string | null;
  twoIdVerified: boolean;
  trayHotTempC?: number | null;
  trayColdTempC?: number | null;
  notes?: string | null;
}

export interface MealIntake {
  id: string;
  mealOrderId: string;
  percentConsumed: number; // 0|25|50|75|100
  complaint?: string | null;
  notes?: string | null;
  negativeFlag: boolean;
  recordedAt: string;
  recordedBy?: string | null;
}

export interface RegenerateResult {
  generated: number;
  reassigned: number;
  cancelled: number;
  date: string;
}

export interface ExtraFoodOrder {
  id: string;
  admissionId: string;
  forWhom: 'PATIENT' | 'ATTENDANT';
  item: string;
  quantity?: string | null;
  mealTimeSlotId?: string | null;
  mealTimeSlot?: { id: string; name: string } | null;
  requestedFor: string;
  notes?: string | null;
  status: 'ORDERED' | 'PREPARED' | 'SERVED' | 'CANCELLED';
  requestedBy?: string | null;
  preparedAt?: string | null;
  servedAt?: string | null;
  servedByName?: string | null;
  cancelReason?: string | null;
  billed: boolean;
  admissionNo?: string | null;
  patientName?: string | null;
  bedNumber?: string | null;
  wardName?: string | null;
}

export interface DietaryAlert {
  id: string;
  type: 'ADMISSION' | 'DISCHARGE' | 'TRANSFER' | 'BED_REOCCUPIED';
  admissionId: string;
  wardName?: string | null;
  bedNumber?: string | null;
  previousBed?: string | null;
  message: string;
  createdAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
}

export interface BillingRow {
  id: string;
  kind: 'TRAY' | 'EXTRA';
  admissionNo: string | null;
  prn: string | null;
  patientName: string | null;
  bedNumber: string | null;
  wardName: string | null;
  date: string;
  slot: string | null;
  item: string;
  dietCode: string | null;
  servedAt: string | null;
  servedBy: string | null;
  billed: boolean;
  billedAt: string | null;
  billedBy: string | null;
}

export interface DietLabel {
  id: string;
  kind: 'TRAY' | 'EXTRA';
  bedNumber: string | null;
  wardName: string | null;
  patientName: string | null;
  prn: string | null;
  admissionNo: string | null;
  dietCode: string;
  item: string | null;
  avoid: string | null;
  disposable: boolean;
  fluidRestrictionMl: number | null;
  flags: string[];
  qr: string;
}

export interface LabelSheet {
  date: string;
  slot: { id: string; name: string; startTime: string } | null;
  layout: { widthMm: number; heightMm: number; columns: number; showQr: boolean };
  labels: DietLabel[];
}

// ─── Diet Information Sheet ───────────────────────────────────────────

export interface SheetWindowSlot {
  slotId: string;
  name: string;
  code: string;
  date: string;
  startTime: string;
  endTime: string;
  orderCutoff: string | null;
}

export interface SheetCell {
  text: string | null;
  skip: boolean;
  instruction: string | null;
  supplementId: string | null;
  supplementDose: string | null;
  defaultMeal: string | null;
}

export interface SheetRow {
  admissionId: string;
  admissionNo: string;
  prn: string;
  patientName: string | null;
  age: string | null;
  sex: string | null;
  wardName: string | null;
  bedNumber: string | null;
  diagnosis: string;
  consultant: string;
  admissionDate: string;
  planId: string | null;
  planStatus: 'ACTIVE' | 'INTERIM' | 'NONE';
  dietCode: string | null;
  dietName: string | null;
  dietKind: DietKind | null;
  avoid: string | null;
  remark: string | null;
  npo: string | null;
  needsCheck: boolean;
  checkNote: string | null;
  riskLevel: string | null;
  cells: Record<string, SheetCell>;
  isNew: boolean;
  changes: string[];
}

export interface SheetTotals {
  total: number;
  noTray: number;
  served: number;
  npo: number;
  noPlan: number;
}

export interface SheetPreview {
  serviceDate: string;
  window: SheetWindowSlot[];
  rows: SheetRow[];
  departed: Array<{ admissionNo: string; patientName: string | null; bedNumber: string | null; wardName: string | null }>;
  lastSheet: { id: string; issuedAt: string; issuedBy: string | null; status: string } | null;
  totals: SheetTotals;
  standingNotes: string;
}

export interface IssuedSheet {
  id: string;
  serviceDate: string;
  windowLabel: string | null;
  /** REPLACED = re-issued later for the same window. */
  status: 'ISSUED' | 'ACKNOWLEDGED' | 'REPLACED';
  totalPatients: number;
  noTrayPatients: number;
  issuedAt: string;
  issuedBy: string | null;
  supervisorAckAt: string | null;
  supervisorAckBy: string | null;
  notes?: string | null;
  snapshot?: { window: SheetWindowSlot[]; rows: SheetRow[]; departed: SheetPreview['departed']; totals: SheetTotals } | null;
}

export interface MealHold {
  id: string;
  admissionId: string;
  fromAt: string;
  untilAt: string | null;
  reason: string;
  source: string;
  createdBy: string | null;
  createdAt: string;
  liftedAt: string | null;
  liftedBy: string | null;
}

// ─── Nursing census ───────────────────────────────────────────────────

export interface CensusLineDraft {
  admissionId: string;
  admissionNo?: string;
  bedNumber?: string | null;
  patientName?: string | null;
  prn?: string;
  ageSex?: string | null;
  consultant?: string;
  diagnosis?: string;
  currentDiet?: { code: string; name: string; status: string } | null;
  dietText: string;
  dietMasterId: string | null;
  npo: boolean;
  npoFrom: string | null;
  feedText: string;
  disposablePlate: boolean;
  remarks: string;
  isNew?: boolean;
}

export interface CensusPrefill {
  wardId: string;
  wardName: string | null;
  censusDate: string;
  lastCensus: { id: string; submittedAt: string; submittedBy: string | null; status: string } | null;
  lines: CensusLineDraft[];
}

export interface CensusSummary {
  id: string;
  wardId: string;
  wardName: string | null;
  censusDate: string;
  /** REPLACED = the ward re-sent the census before Dietary acknowledged it. */
  status: 'SUBMITTED' | 'RECEIVED' | 'ACKNOWLEDGED' | 'REPLACED';
  notes: string | null;
  submittedBy: string | null;
  submittedAt: string;
  receivedBy: string | null;
  receivedAt: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  lineCount: number;
  /** Newly admitted since the ward's last census. */
  newCount: number;
  /** Nurse reported something different from the current diet. */
  changedCount: number;
  npoCount: number;
  /** Rows Dietary has to look at (new + changed + NPO). */
  actionCount: number;
}

export interface CensusDetail extends Omit<CensusSummary, 'lineCount' | 'newCount' | 'changedCount' | 'npoCount' | 'actionCount'> {
  lines: Array<{
    id: string;
    admissionId: string;
    bedNumber: string | null;
    patientName: string | null;
    prn: string | null;
    ageSex: string | null;
    consultant: string | null;
    diagnosis: string | null;
    dietText: string | null;
    dietMaster?: { code: string; name: string } | null;
    npo: boolean;
    npoFrom: string | null;
    feedText: string | null;
    disposablePlate: boolean;
    remarks: string | null;
    changeFlag: 'NEW' | 'CHANGED' | 'UNCHANGED';
    currentDiet: { code: string; name: string; status: string; remark: string | null } | null;
    /** What Dietary must act on for this patient. */
    actions: string[];
    /** Context only (e.g. "No diet yet — dietitian to assess"). */
    info: string[];
    needsAction: boolean;
  }>;
}

// ─── Clinical nutrition ───────────────────────────────────────────────

export type ScreeningForm = 'NRS2002' | 'STAMP' | 'MATERNAL' | 'REASSESSMENT';
export const SCREENING_FORM_LABEL: Record<ScreeningForm, string> = {
  NRS2002: 'NRS-2002 (adult)',
  STAMP: 'STAMP (paediatric)',
  MATERNAL: 'Maternal nutrition',
  REASSESSMENT: 'Nutritional re-assessment',
};

export interface NutritionAssessment {
  id: string;
  admissionId: string;
  formType: ScreeningForm;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  ibwKg: number | null;
  answers: Record<string, unknown>;
  riskScore: number | null;
  riskLevel: string | null;
  atRisk: boolean;
  energyKcal: number | null;
  proteinG: number | null;
  fluidMl: number | null;
  otherNutrients: string | null;
  intervention: string | null;
  nextScreeningDue: string | null;
  assessedBy: string | null;
  assessedAt: string;
}

export interface DietitianNote {
  id: string;
  admissionId: string;
  note: string;
  writtenBy: string | null;
  writtenAt: string;
}

export interface PatientContext {
  admissionId: string;
  admissionNo: string;
  admissionDate: string;
  prn: string;
  patientName: string | null;
  age: string | null;
  sex: string | null;
  wardName: string | null;
  bedNumber: string | null;
  department: string;
  consultant: string;
  diagnosis: string;
  ia: {
    weightKg: number | null;
    heightCm: number | null;
    dietPattern: string | null;
    foodAllergy: boolean;
    allergyOthers: string | null;
    isPregnant: boolean;
    pregnancyWeeks: number | null;
    nutritionNote: string | null;
    chiefComplaints: string | null;
  } | null;
}

export interface NutritionRecord {
  patient: PatientContext;
  suggestedForm: ScreeningForm;
  dietOnAdmission: string | null;
  assessments: NutritionAssessment[];
  notes: DietitianNote[];
}

export interface RoundsRow {
  admissionId: string;
  admissionNo: string;
  prn: string;
  patientName: string | null;
  age: string | null;
  sex: string | null;
  wardName: string | null;
  bedNumber: string | null;
  admissionDate: string;
  daysAdmitted: number;
  consultant: string;
  diagnosis: string;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  anthroSource: 'DIETITIAN' | 'INITIAL_ASSESSMENT' | null;
  diet: { code: string; name: string; status: string } | null;
  remark: string | null;
  doctorNutritionNote: string | null;
  dietPattern: string | null;
  suggestedForm: ScreeningForm;
  screening: {
    formType: ScreeningForm; riskScore: number | null; riskLevel: string | null; atRisk: boolean;
    assessedAt: string; nextScreeningDue: string | null; overdue: boolean;
  } | null;
  actionNeeded: string | null;
  lastNoteAt: string | null;
}

export interface CanteenChannel {
  id: string;
  name: string;
  isActive: boolean;
  /** JSON of CanteenViewSpec; null = all wards as tickets. */
  viewSpec?: string | null;
}

export type CanteenTvMode = 'tickets' | 'summary';

/** What a canteen TV channel shows. Empty wardIds = every ward. */
export interface CanteenViewSpec {
  wardIds: string[];
  mode: CanteenTvMode;
}

export function parseCanteenViewSpec(raw: string | null | undefined): CanteenViewSpec {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return {
      wardIds: Array.isArray(v?.wardIds) ? v.wardIds.filter((x: unknown) => typeof x === 'string') : [],
      mode: v?.mode === 'summary' ? 'summary' : 'tickets',
    };
  } catch {
    return { wardIds: [], mode: 'tickets' };
  }
}

export interface CanteenTvSnapshot {
  channel: CanteenChannel;
  /** Absent on older backends → all wards, tickets. */
  view?: { mode: CanteenTvMode; wardNames: string[] };
  slot: MealTimeSlot | null;
  serviceDate?: string;
  /** NOW = inside the meal window, NEXT = upcoming meal today, TOMORROW = next day's first meal. */
  phase?: 'NOW' | 'NEXT' | 'TOMORROW';
  groups: Array<{
    wardId?: string | null;
    wardName: string;
    rows: Array<{
      admissionNo: string;
      bedNumber?: string | null;
      mealName: string;
      dietName: string;
      dietFlags?: string[];
      status: MealOrder['status'];
    }>;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DieteticsService {
  private base = `${environment.apiUrl}/dietetics`;

  constructor(private http: HttpClient) {}

  // ─── Masters ────────────────────────────────────────────────────────
  listMealTimeSlots(): Observable<MealTimeSlot[]> {
    return this.http.get<MealTimeSlot[]>(`${this.base}/meal-time-slots`);
  }
  upsertMealTimeSlot(payload: Partial<MealTimeSlot>): Observable<MealTimeSlot> {
    return payload.id
      ? this.http.put<MealTimeSlot>(`${this.base}/meal-time-slots/${payload.id}`, payload)
      : this.http.post<MealTimeSlot>(`${this.base}/meal-time-slots`, payload);
  }

  listAllergens(): Observable<AllergenMaster[]> {
    return this.http.get<AllergenMaster[]>(`${this.base}/allergens`);
  }
  upsertAllergen(payload: Partial<AllergenMaster>): Observable<AllergenMaster> {
    return payload.id
      ? this.http.put<AllergenMaster>(`${this.base}/allergens/${payload.id}`, payload)
      : this.http.post<AllergenMaster>(`${this.base}/allergens`, payload);
  }

  // Backend only filters on `active=true`; omitting it returns every diet.
  listDiets(filters?: { activeOnly?: boolean }): Observable<DietMaster[]> {
    let params = new HttpParams();
    if (filters?.activeOnly) params = params.set('active', 'true');
    return this.http.get<DietMaster[]>(`${this.base}/diets`, { params });
  }
  upsertDiet(payload: DietMasterPayload): Observable<DietMaster> {
    return payload.id
      ? this.http.put<DietMaster>(`${this.base}/diets/${payload.id}`, payload)
      : this.http.post<DietMaster>(`${this.base}/diets`, payload);
  }

  listTextures(): Observable<DietTexture[]> {
    return this.http.get<DietTexture[]>(`${this.base}/textures`);
  }
  upsertTexture(payload: Partial<DietTexture>): Observable<DietTexture> {
    return payload.id
      ? this.http.put<DietTexture>(`${this.base}/textures/${payload.id}`, payload)
      : this.http.post<DietTexture>(`${this.base}/textures`, payload);
  }

  listSupplements(): Observable<SupplementMaster[]> {
    return this.http.get<SupplementMaster[]>(`${this.base}/supplements`);
  }
  upsertSupplement(payload: Partial<SupplementMaster>): Observable<SupplementMaster> {
    return payload.id
      ? this.http.put<SupplementMaster>(`${this.base}/supplements/${payload.id}`, payload)
      : this.http.post<SupplementMaster>(`${this.base}/supplements`, payload);
  }

  getSettings(): Observable<DieteticsSettings> {
    return this.http.get<DieteticsSettings>(`${this.base}/settings`);
  }
  updateSettings(payload: Partial<DieteticsSettings>): Observable<DieteticsSettings> {
    return this.http.put<DieteticsSettings>(`${this.base}/settings`, payload);
  }

  listMeals(filters?: { activeOnly?: boolean; dietId?: string }): Observable<MealMaster[]> {
    let params = new HttpParams();
    if (filters?.activeOnly) params = params.set('active', 'true');
    if (filters?.dietId) params = params.set('dietId', filters.dietId);
    return this.http.get<MealMaster[]>(`${this.base}/meals`, { params });
  }
  upsertMeal(payload: Partial<MealMaster>): Observable<MealMaster> {
    return payload.id
      ? this.http.put<MealMaster>(`${this.base}/meals/${payload.id}`, payload)
      : this.http.post<MealMaster>(`${this.base}/meals`, payload);
  }

  getMenuForDiet(dietId: string): Observable<MenuPlanCell[]> {
    return this.http.get<MenuPlanCell[]>(`${this.base}/menu/${dietId}`);
  }
  upsertMenuCell(payload: MenuPlanCell): Observable<MenuPlanCell> {
    return this.http.post<MenuPlanCell>(`${this.base}/menu`, payload);
  }
  clearMenuCell(dietId: string, slotId: string, dayOfWeek: number): Observable<{ deleted: number }> {
    return this.http.delete<{ deleted: number }>(`${this.base}/menu/${dietId}/${slotId}/${dayOfWeek}`);
  }

  listDrugFoodInteractions(): Observable<DrugFoodInteraction[]> {
    return this.http.get<DrugFoodInteraction[]>(`${this.base}/drug-food-interactions`);
  }
  getInteractionsForAdmission(admissionId: string): Observable<AdmissionInteractionHit[]> {
    return this.http.get<AdmissionInteractionHit[]>(`${this.base}/drug-food-interactions/admission/${admissionId}`);
  }

  // ─── Diet plans ─────────────────────────────────────────────────────
  getQueue(): Observable<DieticianQueue> {
    return this.http.get<DieticianQueue>(`${this.base}/queue`);
  }
  getCurrentPlan(admissionId: string): Observable<DietPlan | null> {
    return this.http.get<DietPlan | null>(`${this.base}/plans/admission/${admissionId}/current`);
  }
  getPlanHistory(admissionId: string): Observable<DietPlan[]> {
    return this.http.get<DietPlan[]>(`${this.base}/plans/admission/${admissionId}/history`);
  }
  createDraft(payload: UpsertDietPlanPayload): Observable<DietPlan> {
    return this.http.post<DietPlan>(`${this.base}/plans`, payload);
  }
  updateDraft(id: string, payload: UpsertDietPlanPayload): Observable<DietPlan> {
    return this.http.put<DietPlan>(`${this.base}/plans/${id}`, payload);
  }
  signPlan(id: string, body: { signatureId: string; signedBy?: string }): Observable<DietPlan> {
    return this.http.post<DietPlan>(`${this.base}/plans/${id}/sign`, body);
  }
  endPlan(id: string): Observable<DietPlan> {
    return this.http.post<DietPlan>(`${this.base}/plans/${id}/end`, {});
  }
  getDietHistory(admissionId: string): Observable<DietHistoryEvent[]> {
    return this.http.get<DietHistoryEvent[]>(`${this.base}/history/admission/${admissionId}`);
  }

  // ─── Diet Information Sheet ─────────────────────────────────────────
  getSheetPreview(date?: string): Observable<SheetPreview> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<SheetPreview>(`${this.base}/sheet/preview`, { params });
  }
  updateSheetCell(body: {
    admissionId: string; mealTimeSlotId: string; instruction?: string | null; skip?: boolean;
    supplementId?: string | null; supplementDose?: string | null;
  }): Observable<{ text: string | null }> {
    return this.http.put<{ text: string | null }>(`${this.base}/sheet/cell`, body);
  }
  issueSheet(body: { date: string; notes?: string; signatureId: string }): Observable<{ id: string; issuedAt: string; windowLabel: string; totals: SheetTotals }> {
    return this.http.post<{ id: string; issuedAt: string; windowLabel: string; totals: SheetTotals }>(`${this.base}/sheet/issue`, body);
  }
  listSheets(limit = 30): Observable<IssuedSheet[]> {
    return this.http.get<IssuedSheet[]>(`${this.base}/sheets`, { params: { limit: String(limit) } });
  }
  getSheet(id: string): Observable<IssuedSheet> {
    return this.http.get<IssuedSheet>(`${this.base}/sheets/${id}`);
  }
  acknowledgeSheet(id: string, signatureId?: string): Observable<IssuedSheet> {
    return this.http.post<IssuedSheet>(`${this.base}/sheets/${id}/acknowledge`, { signatureId });
  }

  // ─── Meal holds (NPO / meal break) ──────────────────────────────────
  listHolds(admissionId: string): Observable<MealHold[]> {
    return this.http.get<MealHold[]>(`${this.base}/holds/admission/${admissionId}`);
  }
  createHold(body: { admissionId: string; fromAt?: string | null; untilAt?: string | null; reason?: string; source?: string }): Observable<MealHold> {
    return this.http.post<MealHold>(`${this.base}/holds`, body);
  }
  liftHold(id: string): Observable<MealHold> {
    return this.http.post<MealHold>(`${this.base}/holds/${id}/lift`, {});
  }

  // ─── Nursing census ─────────────────────────────────────────────────
  listCensusWards(): Observable<Array<{ id: string; wardName: string }>> {
    return this.http.get<Array<{ id: string; wardName: string }>>(`${this.base}/census/wards`);
  }
  getCensusPrefill(wardId: string): Observable<CensusPrefill> {
    return this.http.get<CensusPrefill>(`${this.base}/census/prefill`, { params: { wardId } });
  }
  submitCensus(body: {
    wardId: string; censusDate?: string; notes?: string; signatureId: string; lines: CensusLineDraft[];
  }): Observable<{ id: string; status: string; submittedAt: string; lines: number }> {
    return this.http.post<{ id: string; status: string; submittedAt: string; lines: number }>(`${this.base}/census`, body);
  }
  listCensus(filters: { date?: string; status?: string; wardId?: string } = {}): Observable<CensusSummary[]> {
    let params = new HttpParams();
    if (filters.date) params = params.set('date', filters.date);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.wardId) params = params.set('wardId', filters.wardId);
    return this.http.get<CensusSummary[]>(`${this.base}/census`, { params });
  }
  getCensus(id: string): Observable<CensusDetail> {
    return this.http.get<CensusDetail>(`${this.base}/census/${id}`);
  }
  receiveCensus(id: string): Observable<CensusSummary> {
    return this.http.post<CensusSummary>(`${this.base}/census/${id}/receive`, {});
  }
  acknowledgeCensus(id: string, body: { applyNpo: boolean; createInterim: boolean }): Observable<CensusSummary & { holdsCreated: number; interimCreated: number }> {
    return this.http.post<CensusSummary & { holdsCreated: number; interimCreated: number }>(`${this.base}/census/${id}/acknowledge`, body);
  }

  // ─── Clinical nutrition ─────────────────────────────────────────────
  getRounds(wardId?: string): Observable<RoundsRow[]> {
    let params = new HttpParams();
    if (wardId) params = params.set('wardId', wardId);
    return this.http.get<RoundsRow[]>(`${this.base}/rounds`, { params });
  }
  getNutrition(admissionId: string): Observable<NutritionRecord> {
    return this.http.get<NutritionRecord>(`${this.base}/nutrition/admission/${admissionId}`);
  }
  createAssessment(body: {
    admissionId: string; formType: ScreeningForm; weightKg?: number | null; heightCm?: number | null;
    ibwKg?: number | null; answers: Record<string, unknown>; energyKcal?: number | null; proteinG?: number | null;
    fluidMl?: number | null; otherNutrients?: string; intervention?: string; signatureId: string;
  }): Observable<NutritionAssessment> {
    return this.http.post<NutritionAssessment>(`${this.base}/nutrition/assessments`, body);
  }
  createNote(body: { admissionId: string; note: string; signatureId: string }): Observable<DietitianNote> {
    return this.http.post<DietitianNote>(`${this.base}/nutrition/notes`, body);
  }

  // ─── Meal orders ────────────────────────────────────────────────────
  getKitchenList(filters: { date?: string; mealTimeSlotId?: string }): Observable<MealOrder[]> {
    let params = new HttpParams();
    if (filters.date) params = params.set('date', filters.date);
    if (filters.mealTimeSlotId) params = params.set('mealTimeSlotId', filters.mealTimeSlotId);
    return this.http.get<MealOrder[]>(`${this.base}/meal-orders/kitchen`, { params });
  }
  getOrdersForAdmission(admissionId: string, date?: string): Observable<MealOrder[]> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<MealOrder[]>(`${this.base}/meal-orders/admission/${admissionId}`, { params });
  }
  markPlated(ids: string[]): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/meal-orders/plate`, { ids });
  }
  markDelivered(id: string, body: {
    signatureId?: string;
    twoIdVerified?: boolean;
    trayHotTempC?: number;
    trayColdTempC?: number;
    notes?: string;
    servedByName?: string;
    delayReason?: string;
  }): Observable<MealOrder> {
    return this.http.post<MealOrder>(`${this.base}/meal-orders/${id}/deliver`, body);
  }
  recordIntake(id: string, body: { percentConsumed: number; complaint?: string; notes?: string }): Observable<MealOrder> {
    return this.http.post<MealOrder>(`${this.base}/meal-orders/${id}/intake`, body);
  }
  skipMeal(id: string, reason: string): Observable<MealOrder> {
    return this.http.post<MealOrder>(`${this.base}/meal-orders/${id}/skip`, { reason });
  }
  regenerateForDate(date: string): Observable<RegenerateResult> {
    let params = new HttpParams().set('date', date);
    return this.http.post<RegenerateResult>(`${this.base}/meal-orders/regenerate`, {}, { params });
  }
  markOrdersBilled(ids: string[], billed: boolean): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/meal-orders/bill`, { ids, billed });
  }
  getBilling(filters: { from: string; to: string; billed?: boolean }): Observable<{ trays: BillingRow[]; extras: BillingRow[] }> {
    let params = new HttpParams().set('from', filters.from).set('to', filters.to);
    if (filters.billed !== undefined) params = params.set('billed', String(filters.billed));
    return this.http.get<{ trays: BillingRow[]; extras: BillingRow[] }>(`${this.base}/billing`, { params });
  }
  getLabels(filters: { date: string; mealTimeSlotId: string; wardId?: string }): Observable<LabelSheet> {
    let params = new HttpParams().set('date', filters.date).set('mealTimeSlotId', filters.mealTimeSlotId);
    if (filters.wardId) params = params.set('wardId', filters.wardId);
    return this.http.get<LabelSheet>(`${this.base}/labels`, { params });
  }

  // ─── Extra food ─────────────────────────────────────────────────────
  listExtraFood(date: string, admissionId?: string): Observable<ExtraFoodOrder[]> {
    let params = new HttpParams().set('date', date);
    if (admissionId) params = params.set('admissionId', admissionId);
    return this.http.get<ExtraFoodOrder[]>(`${this.base}/extra-food`, { params });
  }
  createExtraFood(body: {
    admissionId: string; forWhom: 'PATIENT' | 'ATTENDANT'; item: string; quantity?: string;
    mealTimeSlotId?: string | null; requestedFor?: string; notes?: string;
  }): Observable<ExtraFoodOrder> {
    return this.http.post<ExtraFoodOrder>(`${this.base}/extra-food`, body);
  }
  updateExtraFood(id: string, action: 'prepare' | 'serve' | 'cancel', body: { servedByName?: string; reason?: string } = {}): Observable<ExtraFoodOrder> {
    return this.http.post<ExtraFoodOrder>(`${this.base}/extra-food/${id}/${action}`, body);
  }
  markExtraFoodBilled(ids: string[], billed: boolean): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/extra-food/bill`, { ids, billed });
  }

  // ─── Dietary alerts ─────────────────────────────────────────────────
  listAlerts(all = false): Observable<DietaryAlert[]> {
    return this.http.get<DietaryAlert[]>(`${this.base}/alerts`, { params: all ? { all: 'true' } : {} });
  }
  acknowledgeAlerts(ids: string[]): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/alerts/acknowledge`, { ids });
  }

  // ─── Canteen TV channels ────────────────────────────────────────────
  listCanteenChannels(): Observable<CanteenChannel[]> {
    return this.http.get<CanteenChannel[]>(`${this.base}/canteen-channels`);
  }
  upsertCanteenChannel(payload: Partial<CanteenChannel>): Observable<CanteenChannel> {
    return payload.id
      ? this.http.put<CanteenChannel>(`${this.base}/canteen-channels/${payload.id}`, payload)
      : this.http.post<CanteenChannel>(`${this.base}/canteen-channels`, payload);
  }
  /** `wardId` narrows the channel to one ward (pantry tablet). */
  getTvSnapshot(channelId: string, wardId?: string | null): Observable<CanteenTvSnapshot> {
    const params: Record<string, string> = wardId ? { ward: wardId } : {};
    return this.http.get<CanteenTvSnapshot>(`${this.base}/canteen-channels/${channelId}/snapshot`, { params });
  }
}
