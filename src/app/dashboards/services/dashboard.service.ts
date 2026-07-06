import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

export interface DoctorDashboardKpis {
  todayScheduled: number;
  todayDone: number;
  todayRemaining: number;
  ipdActive: number;
  ipdIcu: number;
  pendingDischargeSummaries: number;
  otCasesToday: number;
  avgConsultMins7d: number | null;
}

export interface DoctorQueueRow {
  id: number;
  patientName: string;
  phoneNumber: string;
  age: string | null;
  gender: string | null;
  time: string;
  status: string;
  checkedIn: boolean;
  checkedInTime: string | null;
  endConsultation: boolean;
  waitMins: number | null;
  BPs: string | null;
  BPd: string | null;
  pulse: string | null;
  spo2: string | null;
  temp: string | null;
  type: string | null;
  patientType: string | null;
}

export interface IpdRoundRow {
  admissionId: string;
  admissionNo: string;
  prn: string;
  patientName: string;
  bedNumber: string | null;
  wardName: string | null;
  roomType: string;
  dayOfStay: number;
  diagnosisShort: string;
  icu: boolean;
  lastVitals: {
    recordedAt: string;
    bp: string | null;
    pulse: number | null;
    spo2: number | null;
    temperatureC: number | null;
  } | null;
  pendingOrders: number;
}

export interface OtTodayRow {
  scheduleId: string;
  plannedStart: string;
  plannedEnd: string;
  actualStart: string | null;
  procedureName: string;
  patientName: string;
  prn: string;
  urgency: string;
  status: string;
  roomName: string;
}

export interface DiagnosisMixSlice {
  code: string;
  label: string;
  count: number;
}

export interface FollowUpAdherence {
  scheduled: number;
  returned: number;
  percent: number | null;
}

export type AlertSeverity = 'high' | 'medium' | 'low';
export type AlertType =
  | 'critical-result'
  | 'pending-consent'
  | 'pending-discharge';

export interface DashboardAlert {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  at: string;
  link: string | null;
}

export interface DoctorPerformance {
  avgWaitMinsToday: number | null;
  avgWaitMinsLast7d: number[];
  noShowToday: { count: number; total: number; percent: number | null };
  noShowLast7dPercent: number | null;
  patientMix: { newCount: number; followupCount: number; referralCount: number };
  criticalRate7d: { critical: number; total: number; percent: number | null };
}

export interface Demographics {
  gender: Array<{ name: string; value: number }>;
  ageBands: Array<{ band: string; count: number }>;
}

export interface HourBucket {
  hour: number;
  count: number;
}

export interface TopMedication {
  genericName: string;
  count: number;
}

export interface TopInvestigation {
  name: string;
  type: 'lab' | 'radiology';
  count: number;
}

export type SpecialtyGroup =
  | 'SURGICAL'
  | 'EMERGENCY'
  | 'OBGYN'
  | 'PEDIATRICS'
  | 'CARDIAC'
  | 'GENERAL';

export interface OtPerformance {
  avgPlannedMins: number | null;
  avgActualMins: number | null;
  onTimeStartPercent: number | null;
  last30dCases: number;
  cancelPercent: number | null;
}

export interface PreOpRow {
  scheduleId: string;
  plannedStart: string;
  procedureName: string;
  patientName: string;
  prn: string;
  urgency: string;
  status: string;
  roomName: string;
  daysFromNow: number;
}

export interface CardiacTest {
  name: string;
  count: number;
}

export interface AntenatalRow {
  admissionId: string;
  patientName: string;
  prn: string;
  bedNumber: string | null;
  wardName: string | null;
  pregnancyWeeks: number | null;
  isLactating: boolean;
  dayOfStay: number;
}

export interface ErBoardRow {
  id: number;
  prn: string;
  patientName: string;
  age: number | null;
  gender: string | null;
  triageCategory: string;
  presentingComplaint: string;
  status: string;
  vitalsBP: string | null;
  vitalsHR: number | null;
  vitalsSpO2: number | null;
  createdAt: string;
  ageMinutes: number;
}

export interface ErTriageBucket {
  category: string;
  count: number;
}

export interface DoctorDashboardSummary {
  doctor: { id: number; name: string; departmentName: string };
  date: string;
  kpis: DoctorDashboardKpis;
  queue: DoctorQueueRow[];
  last30Days: Array<{ date: string; count: number }>;
  ipdRound: IpdRoundRow[];
  otToday: OtTodayRow[];
  diagnosisMix: DiagnosisMixSlice[];
  followUpAdherence: FollowUpAdherence;
  alerts: DashboardAlert[];
  performance: DoctorPerformance;
  demographics: Demographics;
  hourHeatmap: HourBucket[];
  topMedications: TopMedication[];
  topInvestigations: TopInvestigation[];
  specialtyGroup: SpecialtyGroup;
  otPerformance: OtPerformance | null;
  preOpPipeline: PreOpRow[];
  cardiacTests30d: CardiacTest[];
  pediatricAgeBands: Array<{ band: string; count: number }> | null;
  antenatalPatients: AntenatalRow[];
  erActiveBoard: ErBoardRow[];
  erTriageMix: ErTriageBucket[];
  myIpdLos: Array<{ admissionId: string; prn: string; dayOfStay: number }>;
  marCompliance: { administered: number; total: number; percent: number | null };
  investigationTat: { hours: number | null; resultedCount: number };
}

// ─── Management dashboard DTOs ───────────────────────────────────────────
export interface ManagementSummary {
  date: string;
  footfallToday: { total: number; opd: number; ipd: number; er: number; dayCare: number };
  bedOccupancy: { total: number; occupied: number; percent: number | null };
  revenue: { today: number; mtd: number };
  departmentRevenueMix: Array<{ name: string; value: number }>;
  discharges: { completed: number; pending: number };
  otUtilization: {
    scheduledCases: number;
    plannedMinutes: number;
    actualMinutes: number;
    utilizationPercent: number | null;
  };
  activeEmergencies: { total: number; red: number };
  footfallTrend30d: Array<{ date: string; opd: number; ipd: number; er: number }>;
  doctorLeaderboard: Array<{ doctorId: number; doctorName: string; count: number }>;
  flowFunnel: Array<{ stage: string; value: number }>;
  alerts: Array<{
    type: string;
    severity: 'high' | 'medium' | 'low';
    title: string;
    message: string;
    count: number;
    link: string | null;
  }>;
  admissionsVsDischarges30d: Array<{ date: string; admissions: number; discharges: number }>;
  losDistribution: Array<{ band: string; count: number }>;
  hospitalDemographics: {
    gender: Array<{ name: string; value: number }>;
    ageBands: Array<{ band: string; count: number }>;
  };
  revenueTrend30d: Array<{ date: string; amount: number }>;
  erTriageToday: Array<{ category: string; count: number }>;
}

// ─── Front Desk dashboard DTOs ───────────────────────────────────────────
export interface FrontDeskQueueRow {
  id: number;
  patientName: string;
  phoneNumber: string;
  doctorName: string;
  department: string;
  time: string;
  status: string;
  checkedIn: boolean;
  arrived: boolean;
  endConsultation: boolean;
  requestVia: string;
  waitMins: number | null;
  patientType: string | null;
  type: string | null;
  contactedAny: boolean;
}

export interface FrontDeskSummary {
  date: string;
  kpis: {
    booked: number;
    arrived: number;
    checkedIn: number;
    cancelled: number;
    noShows: number;
    pendingCallbacks: number;
    avgWaitNow: number | null;
  };
  queue: FrontDeskQueueRow[];
  hourlyArrivals: Array<{ hour: number; count: number }>;
  channelMix: Array<{ name: string; value: number }>;
  reminderStatus: { smsSent: number; emailSent: number; whatsappSent: number; total: number };
  callbacks: Array<{
    id: number;
    name: string;
    mobile: string;
    source: string;
    createdAt: string;
  }>;
  waitingOver30: Array<{
    id: number;
    patientName: string;
    doctorName: string;
    waitMins: number;
  }>;
  doctorAvailability: {
    totalActive: number;
    onLeaveToday: number;
    onLeaveList: Array<{ id: number; name: string; departmentName: string }>;
  };
  deptBookingMix: Array<{ name: string; value: number }>;
  busiestDoctors: Array<{ doctorId: number; doctorName: string; count: number }>;
  patientMixToday: Array<{ name: string; value: number }>;
  upcomingPreview: {
    tomorrow: { date: string; count: number };
    dayAfter: { date: string; count: number };
  };
}

// ─── Bedside Nurse dashboard DTOs ────────────────────────────────────────
export interface NursePatientCard {
  admissionId: string;
  admissionNo: string;
  prn: string;
  patientName: string;
  bedNumber: string | null;
  wardName: string | null;
  roomType: string;
  dayOfStay: number;
  diagnosisShort: string;
  admittingDoctor: string;
  icu: boolean;
  critical: boolean;
  allergies: string[];
  lastVitals: {
    recordedAt: string;
    bp: string | null;
    pulse: number | null;
    spo2: number | null;
    temperatureC: number | null;
  } | null;
  upcomingMeds: number;
  overdueMeds: number;
  pendingOrders: number;
  vitalsOverdue: boolean;
}

export interface NurseShiftRow {
  id: string;
  status: string;
  shiftName: string;
  shiftCode: string;
  startTime: string;
  endTime: string;
  ward: string | null;
}

export interface MedTimelineRow {
  prescriptionId: string;
  admissionId: string;
  patientName: string;
  bedNumber: string | null;
  genericName: string;
  brandName: string | null;
  dose: string;
  route: string;
  nextAdminTime: string;
  minutesFromNow: number;
  isOverdue: boolean;
}

export interface NurseSummary {
  blockId: string | null;
  blockResolved: boolean;
  kpis: {
    patientsAllotted: number;
    upcomingMeds1h: number;
    overdueMeds: number;
    overdueVitals: number;
    pendingOrders: number;
    criticalPatients: number;
  };
  myShifts: NurseShiftRow[];
  patients: NursePatientCard[];
  acuityMix: Array<{ name: string; value: number }>;
  medTimeline: MedTimelineRow[];
  blockCensus7d: Array<{ date: string; count: number }>;
  myMarCompliance: { administered: number; total: number; percent: number | null };
}

// ─── Nursing Superintendent dashboard DTOs ───────────────────────────────
export interface WardSummaryRow {
  wardId: string;
  wardName: string;
  wardCode: string;
  department: string;
  totalBeds: number;
  occupied: number;
  icu: number;
  nursesOnDuty: number;
  ratio: string | null;
  occupancyPercent: number | null;
}

export interface BedRequestRow {
  id: string;
  admissionId: string;
  wardName: string | null;
  preferredBedType: string | null;
  urgency: string;
  requestedAt: string;
  requestedBy: string | null;
  ageMinutes: number;
}

export interface IcuStepDownRow {
  id: string;
  admissionId: string;
  status: string;
  proposedBy: string;
  proposedAt: string;
  toWardName: string | null;
}

export interface NursingSuperSummary {
  kpis: {
    inpatientsTotal: number;
    criticalPatients: number;
    nursesOnDutyToday: number;
    noShowNurses: number;
    pendingHandovers: number;
    pendingBedRequests: number;
    bedOccupancyPercent: number | null;
    complianceScore: { compliant: number; total: number; percent: number | null };
  };
  wardSummary: WardSummaryRow[];
  bedRequests: BedRequestRow[];
  icuStepDowns: IcuStepDownRow[];
  dischargePipeline: {
    drafted: number;
    edited: number;
    signed: number;
    delivered: number;
    total: number;
  };
  marCompliance: { administered: number; total: number; percent: number | null };
  losByWard: Array<{ wardId: string; wardName: string; avgLosDays: number }>;
  criticalPatientList: Array<{
    admissionId: string;
    patientName: string;
    bedNumber: string | null;
    wardName: string | null;
    reason: string;
  }>;
  nabhReadinessScore: {
    vitalsCompliancePercent: number | null;
    handoverSignOffPercent: number | null;
    assessmentCoveragePercent: number | null;
    overallPercent: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getDoctorSummary(userId: number, date?: string): Observable<DoctorDashboardSummary> {
    let params = new HttpParams().set('userId', userId.toString());
    if (date) params = params.set('date', date);
    return this.http.get<DoctorDashboardSummary>(`${this.apiUrl}/doctor/summary`, {
      params,
    });
  }

  getManagementSummary(date?: string): Observable<ManagementSummary> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<ManagementSummary>(`${this.apiUrl}/management/summary`, {
      params,
    });
  }

  getFrontDeskSummary(date?: string): Observable<FrontDeskSummary> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return this.http.get<FrontDeskSummary>(`${this.apiUrl}/frontdesk/summary`, {
      params,
    });
  }

  getNurseSummary(userId: number, blockId?: string): Observable<NurseSummary> {
    let params = new HttpParams().set('userId', userId.toString());
    if (blockId) params = params.set('blockId', blockId);
    return this.http.get<NurseSummary>(`${this.apiUrl}/nurse/summary`, { params });
  }

  getNursingSuperSummary(): Observable<NursingSuperSummary> {
    return this.http.get<NursingSuperSummary>(
      `${this.apiUrl}/nursing-superintendent/summary`,
    );
  }
}
