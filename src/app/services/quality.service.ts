import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Phase 9.26 / Phase 5 — Quality / NABH dashboard API.

export interface QualityWindow { from: string; to: string }

export interface SafetyKpis {
  total: number; open: number; sentinel: number; nearMissRate: number;
  bySeverity: Record<string, number>;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  byNabh: Record<string, number>;
  window: QualityWindow;
}
export interface ClinicalKpis {
  admissions: number; discharges: number; expired: number; lama: number; dama: number;
  mortalityRate: number; lamaRate: number; damaRate: number; avgLosDays: number;
  window: QualityWindow;
}
export interface SlaPct { within: number; total: number; pct: number; }
export interface TimelinessKpis {
  initialAssessmentWithin24h: SlaPct;
  dischargeSummarySignedWithin24h: SlaPct;
  criticalLabAckWithin30m: SlaPct;
  window: QualityWindow;
}
export interface ExperienceKpis {
  nps: { score: number; promoters: number; passives: number; detractors: number; total: number };
  complaints: { total: number; resolved: number; slaBreached: number; active: number; slaCompliancePct: number };
  window: QualityWindow;
}
export interface OtKpis {
  total: number; cancelled: number; started: number;
  cancelRate: number; onTimePct: number; avgDelayMin: number;
  window: QualityWindow;
}
export interface NabhScorecardEntry {
  clause: string; chapter: string; total: number; open: number; closed: number;
}
export interface NabhScorecard { data: NabhScorecardEntry[]; window: QualityWindow; }

// ── Phase 9.26 / Phase 1 — NABH/QCI 108-indicator master ────────────────

export type IndicatorStatus = 'green' | 'amber' | 'red' | 'critical';
export type IndicatorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IndicatorDirection = 'higher-is-bad' | 'lower-is-bad' | 'target-range';

export interface QualityIndicator {
  id: number;
  qiCode: string;
  chapter: string;
  nabhRef: string;
  department: string;
  name: string;
  indicatorType: string;
  numeratorDef: string;
  denominatorDef: string;
  multiplier: 'NA' | '100' | '1000';
  unit: string;
  frequency: string;
  direction: IndicatorDirection;
  defaultBenchmark: number | null;
  amberThresholdPct: number;
  isCritical: boolean;
  criticalRule?: string | null;
  dataCaptureFields?: string | null;
  escalationOwner: string;
  rcaRequiredRule: string;
  nabhClause?: string | null;
  sourceUrl?: string | null;
  isActive: boolean;
  notes?: string | null;
  records?: QualityIndicatorRecord[];
}

export interface QualityIndicatorRecord {
  id: number;
  indicatorId: number;
  qiCode: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  numerator: number;
  denominator: number;
  calculatedValue: number;
  benchmarkUsed: number | null;
  status: IndicatorStatus;
  severity: IndicatorSeverity;
  autoCalculated: boolean;
  capturedBy: string | null;
  remarks: string | null;
  evidenceLinks: string | null;
  createdAt: string;
  updatedAt: string;
  rca?: unknown;
}

export interface IndicatorStats {
  total: number;
  active: number;
  critical: number;
  byChapter: Record<string, number>;
  latestPeriod: string | null;
  latestPeriodStatus: Record<string, number>;
}

export interface CaptureBody {
  period: string;
  numerator: number;
  denominator: number;
  remarks?: string;
  criticalTriggered?: boolean;
  benchmarkOverride?: number | null;
  evidenceLinks?: Array<{ label: string; url: string }>;
}

export interface IndicatorUpdateBody {
  isActive?: boolean;
  defaultBenchmark?: number | null;
  amberThresholdPct?: number;
  escalationOwner?: string;
  notes?: string | null;
}

// ── Phase 9.26 / Phase 3 — RCA workflow ─────────────────────────────────

export type RcaStatus = 'open' | 'in_progress' | 'closed';

export interface QualityIndicatorRca {
  id: number;
  recordId: number;
  immediateActions: string | null;
  why1: string | null; why2: string | null; why3: string | null;
  why4: string | null; why5: string | null;
  rootCause: string | null;
  correctiveActions: string | null;
  preventiveActions: string | null;
  owner: string | null;
  ownerId: number | null;
  dueDate: string | null;
  completedAt: string | null;
  effectivenessReview: string | null;
  effectivenessReviewAt: string | null;
  status: RcaStatus;
  createdAt: string;
  updatedAt: string;
  record?: QualityIndicatorRecord & {
    indicator?: Pick<QualityIndicator,
      'qiCode' | 'name' | 'chapter' | 'department' | 'unit' | 'direction' |
      'escalationOwner' | 'numeratorDef' | 'denominatorDef' | 'criticalRule'>;
  };
}

export interface RcaStats {
  total: number;
  overdue: number;
  byStatus: Record<string, number>;
}

// ── Phase 9.26 / Phase 5b — Infection surveillance + device-days ───────

export type SurveillanceType = 'HAI' | 'SSI' | 'VAP' | 'CAUTI' | 'CLABSI' | 'NSI';
export type DeviceType = 'ventilator' | 'urinary_catheter' | 'central_line';

export interface QualitySurveillanceEvent {
  id: number;
  type: SurveillanceType;
  patientPrn: string | null;
  admissionId: string | null;
  ward: string | null;
  organism: string | null;
  deviceRelated: boolean;
  observedAt: string;
  period: string;
  notes: string | null;
  reporter: string | null;
  createdAt: string;
}

export interface SurveillanceCreateBody {
  type: SurveillanceType;
  observedAt?: string;
  patientPrn?: string | null;
  admissionId?: string | null;
  ward?: string | null;
  organism?: string | null;
  deviceRelated?: boolean;
  notes?: string | null;
}

export interface QualityDeviceDayCount {
  id: number;
  date: string;
  ward: string;
  deviceType: DeviceType;
  count: number;
  capturedBy: string | null;
  createdAt: string;
}

export interface DeviceDayUpsertBody {
  date: string;
  ward: string;
  deviceType: DeviceType;
  count: number;
}

export interface QualitySterilizationCycle {
  id: number;
  batchCode: string | null;
  runAt: string;
  passed: boolean;
  failureReason: string | null;
  capturedBy: string | null;
  createdAt: string;
}

export interface SterilizationCreateBody {
  batchCode?: string | null;
  runAt?: string;
  passed: boolean;
  failureReason?: string | null;
}

// ── Phase 9.26 / Phase 5f — Facility / equipment registers ─────────────

export type EquipmentStatus = 'operational' | 'breakdown' | 'retired';
export type EquipmentEventType = 'pm' | 'calibration' | 'breakdown';
export type UtilityType = 'power' | 'water' | 'gas' | 'oxygen' | 'medical_gas' | 'hvac' | 'other';
export type MaintenanceType = 'electrical' | 'plumbing' | 'biomedical' | 'civil' | 'other';
export type MaintenanceStatus = 'open' | 'in_progress' | 'closed';

export interface FacilityEquipment {
  id: string;
  code: string;
  name: string;
  type: string | null;
  isCritical: boolean;
  location: string | null;
  department: string | null;
  status: EquipmentStatus;
  createdAt: string;
}

export interface EquipmentCreateBody {
  code: string;
  name: string;
  type?: string | null;
  isCritical?: boolean;
  location?: string | null;
  department?: string | null;
  status?: EquipmentStatus;
}

export interface FacilityEquipmentEvent {
  id: number;
  equipmentId: string;
  eventType: EquipmentEventType;
  dueAt: string | null;
  occurredAt: string;
  resolvedAt: string | null;
  performedBy: string | null;
  notes: string | null;
  createdAt: string;
  equipment?: { code: string; name: string; isCritical: boolean };
}

export interface EquipmentEventCreateBody {
  equipmentId: string;
  eventType: EquipmentEventType;
  dueAt?: string | null;
  occurredAt?: string;
  resolvedAt?: string | null;
  notes?: string | null;
}

export interface FacilityUtilityFailure {
  id: number;
  utilityType: UtilityType;
  occurredAt: string;
  durationMinutes: number | null;
  affectedAreas: string | null;
  notes: string | null;
  reporter: string | null;
}

export interface UtilityFailureCreateBody {
  utilityType: UtilityType;
  occurredAt?: string;
  durationMinutes?: number | null;
  affectedAreas?: string | null;
  notes?: string | null;
}

export interface FacilityAmbulanceCall {
  id: number;
  calledAt: string;
  dispatchedAt: string | null;
  arrivedAt: string | null;
  responseTimeMinutes: number | null;
  withinTarget: boolean;
  notes: string | null;
  reporter: string | null;
}

export interface AmbulanceCallCreateBody {
  calledAt: string;
  dispatchedAt?: string | null;
  arrivedAt?: string | null;
  responseTimeMinutes?: number | null;
  notes?: string | null;
}

export interface FacilityMaintenanceComplaint {
  id: number;
  type: MaintenanceType;
  location: string | null;
  notes: string | null;
  raisedAt: string;
  slaDueAt: string;
  status: MaintenanceStatus;
  closedAt: string | null;
  closedBy: string | null;
  reporter: string | null;
}

export interface MaintenanceCreateBody {
  type: MaintenanceType;
  location?: string | null;
  notes?: string | null;
  slaDueAt: string;
}

// ── Phase 9.26 / Phase 5i — Lab/Rad amendment / rejection / repeat log ─

export type LabRadEventType = 'lab_amended' | 'rad_amended' | 'lab_sample_rejected' | 'rad_repeat';

export interface QualityLabRadEvent {
  id: number;
  eventType: LabRadEventType;
  observedAt: string;
  period: string;
  prn: string | null;
  testName: string | null;
  reason: string | null;
  reporter: string | null;
  createdAt: string;
}

export interface LabRadEventCreateBody {
  eventType: LabRadEventType;
  observedAt?: string;
  prn?: string | null;
  testName?: string | null;
  reason?: string | null;
}

// ── Phase 9.26 / Phase 5g — Pharmacy stock + expired drugs ─────────────

export type PharmacyEventType = 'stock_out' | 'expired';

export interface PharmacyCriticalDrug {
  id: string;
  code: string;
  name: string;
  category: string | null;
  isCritical: boolean;
  createdAt: string;
}

export interface PharmacyDrugCreateBody {
  code: string;
  name: string;
  category?: string | null;
  isCritical?: boolean;
}

export interface PharmacyStockEvent {
  id: number;
  drugId: string | null;
  drugCodeSnapshot: string | null;
  drugNameSnapshot: string | null;
  eventType: PharmacyEventType;
  occurredAt: string;
  batchCode: string | null;
  expiryDate: string | null;
  quantity: number | null;
  notes: string | null;
  reporter: string | null;
}

export interface StockEventCreateBody {
  drugId?: string | null;
  eventType: PharmacyEventType;
  occurredAt?: string;
  batchCode?: string | null;
  expiryDate?: string | null;
  quantity?: number | null;
  notes?: string | null;
}

// ── Phase 9.26 / Phase 5e — Generic TAT event capture ──────────────────

export interface QualityTatEvent {
  id: number;
  qiCode: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  withinTarget: boolean | null;
  location: string | null;
  notes: string | null;
  capturedBy: string | null;
  createdAt: string;
}

export interface TatEventCreateBody {
  qiCode: string;
  startedAt: string;
  endedAt: string;
  location?: string | null;
  notes?: string | null;
}

// ── Phase 9.26 / Phase 5c — Manual monthly denominators ────────────────

export interface QualityMonthlyDenominator {
  id: number;
  qiCode: string;
  period: string;
  value: number;
  notes: string | null;
  capturedBy: string | null;
  capturedById: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DenominatorUpsertBody {
  qiCode: string;
  period: string;
  value: number;
  notes?: string | null;
}

// ── Phase 9.26 / Phase 5a — Audit observation log ──────────────────────

export interface QualityAuditObservation {
  id: number;
  qiCode: string;
  observedAt: string;
  period: string;
  location: string | null;
  checkpointKey: string | null;
  checkpointLabel: string | null;
  compliant: boolean;
  notes: string | null;
  auditor: string | null;
  auditorId: number | null;
  createdAt: string;
}

export interface AuditObservationCreateBody {
  qiCode: string;
  observedAt?: string;
  location?: string | null;
  checkpointKey?: string | null;
  checkpointLabel?: string | null;
  compliant: boolean;
  notes?: string | null;
}

export interface AuditPeriodSummary {
  period: string;
  data: Record<string, { total: number; compliant: number }>;
}

export interface RcaUpdateBody {
  immediateActions?: string | null;
  why1?: string | null; why2?: string | null; why3?: string | null;
  why4?: string | null; why5?: string | null;
  rootCause?: string | null;
  correctiveActions?: string | null;
  preventiveActions?: string | null;
  owner?: string | null;
  ownerId?: number | null;
  dueDate?: string | null;
  completedAt?: string | null;
  effectivenessReview?: string | null;
  effectivenessReviewAt?: string | null;
  status?: RcaStatus;
}

@Injectable({ providedIn: 'root' })
export class QualityService {
  private base = `${environment.apiUrl}/quality`;
  constructor(private http: HttpClient) {}

  private rangeParams(from?: string, to?: string): HttpParams {
    let p = new HttpParams();
    if (from) p = p.set('from', from);
    if (to) p = p.set('to', to);
    return p;
  }

  safety(from?: string, to?: string): Observable<SafetyKpis> {
    return this.http.get<SafetyKpis>(`${this.base}/safety`, { params: this.rangeParams(from, to) });
  }
  clinical(from?: string, to?: string): Observable<ClinicalKpis> {
    return this.http.get<ClinicalKpis>(`${this.base}/clinical`, { params: this.rangeParams(from, to) });
  }
  timeliness(from?: string, to?: string): Observable<TimelinessKpis> {
    return this.http.get<TimelinessKpis>(`${this.base}/timeliness`, { params: this.rangeParams(from, to) });
  }
  experience(from?: string, to?: string): Observable<ExperienceKpis> {
    return this.http.get<ExperienceKpis>(`${this.base}/experience`, { params: this.rangeParams(from, to) });
  }
  ot(from?: string, to?: string): Observable<OtKpis> {
    return this.http.get<OtKpis>(`${this.base}/ot`, { params: this.rangeParams(from, to) });
  }
  nabhScorecard(from?: string, to?: string): Observable<NabhScorecard> {
    return this.http.get<NabhScorecard>(`${this.base}/nabh-scorecard`, { params: this.rangeParams(from, to) });
  }

  // ── Indicators ────────────────────────────────────────────────────────
  private indBase = `${environment.apiUrl}/quality/indicators`;

  listIndicators(opts: { chapter?: string; department?: string; active?: boolean; search?: string } = {}):
    Observable<{ data: QualityIndicator[]; total: number }> {
    let p = new HttpParams();
    if (opts.chapter) p = p.set('chapter', opts.chapter);
    if (opts.department) p = p.set('department', opts.department);
    if (opts.active !== undefined) p = p.set('active', String(opts.active));
    if (opts.search) p = p.set('search', opts.search);
    return this.http.get<{ data: QualityIndicator[]; total: number }>(this.indBase, { params: p });
  }

  getIndicator(qiCode: string): Observable<{ data: QualityIndicator }> {
    return this.http.get<{ data: QualityIndicator }>(`${this.indBase}/${qiCode}`);
  }

  getIndicatorStats(): Observable<IndicatorStats> {
    return this.http.get<IndicatorStats>(`${this.indBase}/stats`);
  }

  captureIndicatorRecord(qiCode: string, body: CaptureBody): Observable<{ data: QualityIndicatorRecord }> {
    return this.http.post<{ data: QualityIndicatorRecord }>(`${this.indBase}/${qiCode}/records`, body);
  }

  updateIndicator(qiCode: string, body: IndicatorUpdateBody): Observable<{ data: QualityIndicator }> {
    return this.http.put<{ data: QualityIndicator }>(`${this.indBase}/${qiCode}`, body);
  }

  // ── RCA (Phase 3) ─────────────────────────────────────────────────────
  private rcaBase = `${environment.apiUrl}/quality/rcas`;

  listRcas(opts: { status?: RcaStatus; owner?: string; qiCode?: string; overdue?: boolean } = {}):
    Observable<{ data: QualityIndicatorRca[]; total: number }> {
    let p = new HttpParams();
    if (opts.status) p = p.set('status', opts.status);
    if (opts.owner) p = p.set('owner', opts.owner);
    if (opts.qiCode) p = p.set('qiCode', opts.qiCode);
    if (opts.overdue) p = p.set('overdue', 'true');
    return this.http.get<{ data: QualityIndicatorRca[]; total: number }>(this.rcaBase, { params: p });
  }

  getRcaStats(): Observable<RcaStats> {
    return this.http.get<RcaStats>(`${this.rcaBase}/stats`);
  }

  getRca(id: number): Observable<{ data: QualityIndicatorRca }> {
    return this.http.get<{ data: QualityIndicatorRca }>(`${this.rcaBase}/${id}`);
  }

  updateRca(id: number, body: RcaUpdateBody): Observable<{ data: QualityIndicatorRca }> {
    return this.http.put<{ data: QualityIndicatorRca }>(`${this.rcaBase}/${id}`, body);
  }

  // ── Audit observations (Phase 5a) ─────────────────────────────────────
  private auditBase = `${environment.apiUrl}/quality/audit-observations`;

  listObservations(opts: { qiCode?: string; period?: string; auditor?: string; location?: string } = {}):
    Observable<{ data: QualityAuditObservation[]; total: number }> {
    let p = new HttpParams();
    if (opts.qiCode) p = p.set('qiCode', opts.qiCode);
    if (opts.period) p = p.set('period', opts.period);
    if (opts.auditor) p = p.set('auditor', opts.auditor);
    if (opts.location) p = p.set('location', opts.location);
    return this.http.get<{ data: QualityAuditObservation[]; total: number }>(this.auditBase, { params: p });
  }

  createObservation(body: AuditObservationCreateBody): Observable<{ data: QualityAuditObservation }> {
    return this.http.post<{ data: QualityAuditObservation }>(this.auditBase, body);
  }

  deleteObservation(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.auditBase}/${id}`);
  }

  observationSummary(period?: string): Observable<AuditPeriodSummary> {
    let p = new HttpParams();
    if (period) p = p.set('period', period);
    return this.http.get<AuditPeriodSummary>(`${this.auditBase}/summary`, { params: p });
  }

  // ── Denominators (Phase 5c) ───────────────────────────────────────────
  private denomBase = `${environment.apiUrl}/quality/denominators`;

  listDenominators(opts: { qiCode?: string; period?: string } = {}):
    Observable<{ data: QualityMonthlyDenominator[]; total: number; hints?: Record<string, number> }> {
    let p = new HttpParams();
    if (opts.qiCode) p = p.set('qiCode', opts.qiCode);
    if (opts.period) p = p.set('period', opts.period);
    return this.http.get<{ data: QualityMonthlyDenominator[]; total: number; hints?: Record<string, number> }>(
      this.denomBase, { params: p });
  }

  upsertDenominator(body: DenominatorUpsertBody): Observable<{ data: QualityMonthlyDenominator }> {
    return this.http.post<{ data: QualityMonthlyDenominator }>(this.denomBase, body);
  }

  deleteDenominator(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.denomBase}/${id}`);
  }

  // ── Surveillance / device-days / sterilization (Phase 5b) ─────────────
  private survBase = `${environment.apiUrl}/quality/surveillance-events`;
  private deviceDayBase = `${environment.apiUrl}/quality/device-days`;
  private sterilBase = `${environment.apiUrl}/quality/sterilization-cycles`;

  listSurveillance(opts: { type?: SurveillanceType; period?: string; ward?: string } = {}):
    Observable<{ data: QualitySurveillanceEvent[]; total: number }> {
    let p = new HttpParams();
    if (opts.type) p = p.set('type', opts.type);
    if (opts.period) p = p.set('period', opts.period);
    if (opts.ward) p = p.set('ward', opts.ward);
    return this.http.get<{ data: QualitySurveillanceEvent[]; total: number }>(this.survBase, { params: p });
  }
  createSurveillance(body: SurveillanceCreateBody): Observable<{ data: QualitySurveillanceEvent }> {
    return this.http.post<{ data: QualitySurveillanceEvent }>(this.survBase, body);
  }
  deleteSurveillance(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.survBase}/${id}`);
  }

  listDeviceDays(opts: { from?: string; to?: string; ward?: string; deviceType?: DeviceType } = {}):
    Observable<{ data: QualityDeviceDayCount[]; total: number }> {
    let p = new HttpParams();
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    if (opts.ward) p = p.set('ward', opts.ward);
    if (opts.deviceType) p = p.set('deviceType', opts.deviceType);
    return this.http.get<{ data: QualityDeviceDayCount[]; total: number }>(this.deviceDayBase, { params: p });
  }
  upsertDeviceDay(body: DeviceDayUpsertBody): Observable<{ data: QualityDeviceDayCount }> {
    return this.http.post<{ data: QualityDeviceDayCount }>(this.deviceDayBase, body);
  }
  deleteDeviceDay(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.deviceDayBase}/${id}`);
  }

  listSterilizationCycles(opts: { from?: string; to?: string; passed?: boolean } = {}):
    Observable<{ data: QualitySterilizationCycle[]; total: number }> {
    let p = new HttpParams();
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    if (opts.passed !== undefined) p = p.set('passed', String(opts.passed));
    return this.http.get<{ data: QualitySterilizationCycle[]; total: number }>(this.sterilBase, { params: p });
  }
  createSterilizationCycle(body: SterilizationCreateBody): Observable<{ data: QualitySterilizationCycle }> {
    return this.http.post<{ data: QualitySterilizationCycle }>(this.sterilBase, body);
  }
  deleteSterilizationCycle(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.sterilBase}/${id}`);
  }

  // ── Facility / equipment / ambulance / maintenance (Phase 5f) ─────────
  private equipBase = `${environment.apiUrl}/quality/equipment`;
  private equipEventBase = `${environment.apiUrl}/quality/equipment-events`;
  private utilityBase = `${environment.apiUrl}/quality/utility-failures`;
  private ambBase = `${environment.apiUrl}/quality/ambulance-calls`;
  private maintBase = `${environment.apiUrl}/quality/maintenance-complaints`;

  listEquipment(opts: { isCritical?: boolean; status?: EquipmentStatus; search?: string } = {}):
    Observable<{ data: FacilityEquipment[]; total: number }> {
    let p = new HttpParams();
    if (opts.isCritical !== undefined) p = p.set('isCritical', String(opts.isCritical));
    if (opts.status) p = p.set('status', opts.status);
    if (opts.search) p = p.set('search', opts.search);
    return this.http.get<{ data: FacilityEquipment[]; total: number }>(this.equipBase, { params: p });
  }
  createEquipment(body: EquipmentCreateBody): Observable<{ data: FacilityEquipment }> {
    return this.http.post<{ data: FacilityEquipment }>(this.equipBase, body);
  }
  updateEquipment(id: string, body: Partial<EquipmentCreateBody>): Observable<{ data: FacilityEquipment }> {
    return this.http.put<{ data: FacilityEquipment }>(`${this.equipBase}/${id}`, body);
  }
  deleteEquipment(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.equipBase}/${id}`);
  }

  listEquipmentEvents(opts: { equipmentId?: string; eventType?: EquipmentEventType; from?: string; to?: string } = {}):
    Observable<{ data: FacilityEquipmentEvent[]; total: number }> {
    let p = new HttpParams();
    if (opts.equipmentId) p = p.set('equipmentId', opts.equipmentId);
    if (opts.eventType) p = p.set('eventType', opts.eventType);
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    return this.http.get<{ data: FacilityEquipmentEvent[]; total: number }>(this.equipEventBase, { params: p });
  }
  createEquipmentEvent(body: EquipmentEventCreateBody): Observable<{ data: FacilityEquipmentEvent }> {
    return this.http.post<{ data: FacilityEquipmentEvent }>(this.equipEventBase, body);
  }
  deleteEquipmentEvent(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.equipEventBase}/${id}`);
  }

  listUtilityFailures(opts: { from?: string; to?: string; utilityType?: UtilityType } = {}):
    Observable<{ data: FacilityUtilityFailure[]; total: number }> {
    let p = new HttpParams();
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    if (opts.utilityType) p = p.set('utilityType', opts.utilityType);
    return this.http.get<{ data: FacilityUtilityFailure[]; total: number }>(this.utilityBase, { params: p });
  }
  createUtilityFailure(body: UtilityFailureCreateBody): Observable<{ data: FacilityUtilityFailure }> {
    return this.http.post<{ data: FacilityUtilityFailure }>(this.utilityBase, body);
  }
  deleteUtilityFailure(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.utilityBase}/${id}`);
  }

  listAmbulanceCalls(opts: { from?: string; to?: string } = {}):
    Observable<{ data: FacilityAmbulanceCall[]; total: number; target: number }> {
    let p = new HttpParams();
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    return this.http.get<{ data: FacilityAmbulanceCall[]; total: number; target: number }>(this.ambBase, { params: p });
  }
  createAmbulanceCall(body: AmbulanceCallCreateBody): Observable<{ data: FacilityAmbulanceCall; target: number }> {
    return this.http.post<{ data: FacilityAmbulanceCall; target: number }>(this.ambBase, body);
  }
  deleteAmbulanceCall(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.ambBase}/${id}`);
  }

  listMaintenanceComplaints(opts: { status?: MaintenanceStatus; from?: string; to?: string } = {}):
    Observable<{ data: FacilityMaintenanceComplaint[]; total: number }> {
    let p = new HttpParams();
    if (opts.status) p = p.set('status', opts.status);
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    return this.http.get<{ data: FacilityMaintenanceComplaint[]; total: number }>(this.maintBase, { params: p });
  }
  createMaintenanceComplaint(body: MaintenanceCreateBody): Observable<{ data: FacilityMaintenanceComplaint }> {
    return this.http.post<{ data: FacilityMaintenanceComplaint }>(this.maintBase, body);
  }
  updateMaintenanceStatus(id: number, status: MaintenanceStatus): Observable<{ data: FacilityMaintenanceComplaint }> {
    return this.http.put<{ data: FacilityMaintenanceComplaint }>(`${this.maintBase}/${id}/status`, { status });
  }
  deleteMaintenanceComplaint(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.maintBase}/${id}`);
  }

  // ── TAT events (Phase 5e) ─────────────────────────────────────────────
  private tatBase = `${environment.apiUrl}/quality/tat-events`;

  listTatEvents(opts: { qiCode?: string; from?: string; to?: string; location?: string } = {}):
    Observable<{ data: QualityTatEvent[]; total: number }> {
    let p = new HttpParams();
    if (opts.qiCode) p = p.set('qiCode', opts.qiCode);
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    if (opts.location) p = p.set('location', opts.location);
    return this.http.get<{ data: QualityTatEvent[]; total: number }>(this.tatBase, { params: p });
  }
  createTatEvent(body: TatEventCreateBody): Observable<{ data: QualityTatEvent; targetMinutes: number | null }> {
    return this.http.post<{ data: QualityTatEvent; targetMinutes: number | null }>(this.tatBase, body);
  }
  deleteTatEvent(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.tatBase}/${id}`);
  }
  getTatTargets(): Observable<{ data: Record<string, number> }> {
    return this.http.get<{ data: Record<string, number> }>(`${this.tatBase}/targets`);
  }

  // ── Pharmacy (Phase 5g) ───────────────────────────────────────────────
  private drugBase = `${environment.apiUrl}/quality/pharmacy/critical-drugs`;
  private stockBase = `${environment.apiUrl}/quality/pharmacy/stock-events`;

  listDrugs(opts: { isCritical?: boolean; search?: string } = {}):
    Observable<{ data: PharmacyCriticalDrug[]; total: number }> {
    let p = new HttpParams();
    if (opts.isCritical !== undefined) p = p.set('isCritical', String(opts.isCritical));
    if (opts.search) p = p.set('search', opts.search);
    return this.http.get<{ data: PharmacyCriticalDrug[]; total: number }>(this.drugBase, { params: p });
  }
  createDrug(body: PharmacyDrugCreateBody): Observable<{ data: PharmacyCriticalDrug }> {
    return this.http.post<{ data: PharmacyCriticalDrug }>(this.drugBase, body);
  }
  updateDrug(id: string, body: Partial<PharmacyDrugCreateBody>): Observable<{ data: PharmacyCriticalDrug }> {
    return this.http.put<{ data: PharmacyCriticalDrug }>(`${this.drugBase}/${id}`, body);
  }
  deleteDrug(id: string): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.drugBase}/${id}`);
  }

  listStockEvents(opts: { eventType?: PharmacyEventType; from?: string; to?: string; drugId?: string } = {}):
    Observable<{ data: PharmacyStockEvent[]; total: number }> {
    let p = new HttpParams();
    if (opts.eventType) p = p.set('eventType', opts.eventType);
    if (opts.from) p = p.set('from', opts.from);
    if (opts.to) p = p.set('to', opts.to);
    if (opts.drugId) p = p.set('drugId', opts.drugId);
    return this.http.get<{ data: PharmacyStockEvent[]; total: number }>(this.stockBase, { params: p });
  }
  createStockEvent(body: StockEventCreateBody): Observable<{ data: PharmacyStockEvent }> {
    return this.http.post<{ data: PharmacyStockEvent }>(this.stockBase, body);
  }
  deleteStockEvent(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.stockBase}/${id}`);
  }

  // ── Lab/Rad events (Phase 5i) ─────────────────────────────────────────
  private labRadBase = `${environment.apiUrl}/quality/lab-rad-events`;

  listLabRadEvents(opts: { eventType?: LabRadEventType; period?: string; prn?: string } = {}):
    Observable<{ data: QualityLabRadEvent[]; total: number }> {
    let p = new HttpParams();
    if (opts.eventType) p = p.set('eventType', opts.eventType);
    if (opts.period) p = p.set('period', opts.period);
    if (opts.prn) p = p.set('prn', opts.prn);
    return this.http.get<{ data: QualityLabRadEvent[]; total: number }>(this.labRadBase, { params: p });
  }
  createLabRadEvent(body: LabRadEventCreateBody): Observable<{ data: QualityLabRadEvent }> {
    return this.http.post<{ data: QualityLabRadEvent }>(this.labRadBase, body);
  }
  deleteLabRadEvent(id: number): Observable<{ ok: true }> {
    return this.http.delete<{ ok: true }>(`${this.labRadBase}/${id}`);
  }
}
