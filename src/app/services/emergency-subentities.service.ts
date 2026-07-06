import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environment/environment.prod';

// Form 5 (Phase 8) — ER sub-entity API service. Four parallel CRUD sets
// hanging off /api/emergency/:id, mirroring the UHJ/EMR/F-01 grids.

export interface EmergencyInvestigation {
  id: number;
  emergencyId: number;
  category: 'blood' | 'imaging' | 'ecg' | 'other';
  name: string;
  orderedAt: string;
  orderedBy: string | null;
  sentAt: string | null;
  sentBy: string | null;
  reportedAt: string | null;
  reportedBy: string | null;
  resultNotes: string | null;
}

export interface EmergencyTreatment {
  id: number;
  emergencyId: number;
  drug: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  givenAt: string | null;
  givenBy: string | null;
  signedBy: string | null;
  signedAt: string | null;
}

export interface EmergencyProcedure {
  id: number;
  emergencyId: number;
  procedure: string;
  performedAt: string;
  performedBy: string | null;
  signatureId: string | null;
  notes: string | null;
}

export interface EmergencySpecimen {
  id: number;
  emergencyId: number;
  container: string | null;
  amount: string | null;
  nurseSign: string | null;
  doctorSign: string | null;
  handedOverTo: string | null;
  handedOverSign: string | null;
  handedOverAt: string | null;
  notes: string | null;
}

export interface MlcCase {
  id: number;
  emergencyId: number;
  mlcNo: string;
  caseType: 'accident' | 'assault' | 'poison' | 'burn' | 'other';
  policeStationName: string | null;
  fir_No: string | null;
  fir_Date: string | null;
  investigatingOfficer: string | null;
  patientConsent: boolean;
  consentTime: string | null;
  consentSignature: string | null;
  firstExaminationDone: boolean;
  firstExaminationTime: string | null;
  examinerName: string | null;
  examinerSignature: string | null;
  injuries: string;
  photographsTaken: boolean;
  photoUrls: string | null;
  samplesCollected: string | null;
  sampleStorageInfo: string | null;
  followUpExams: string | null;
  finalReport: string | null;
  reportSubmittedTo: string | null;
  submissionDate: string | null;
  submissionProof: string | null;
  status: 'documented' | 'examination-done' | 'samples-collected' | 'report-submitted' | 'closed';
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
}

export interface LamaRecord {
  id: number;
  emergencyId: number;
  lamaTime: string;
  doctorAdvice: string;
  riskExplained: boolean;
  patientSignature: string | null;
  witnessName: string | null;
  witnessSignature: string | null;
  reasonForLama: string;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
}

export interface DamaRecord {
  id: number;
  emergencyId: number;
  dischargeTime: string;
  doctorRecommendation: string;
  patientDeclinesAdvice: boolean;
  patientSignature: string | null;
  witnessName: string | null;
  witnessSignature: string | null;
  followUpAdvice: string | null;
  createdAt: string;
  updatedAt: string | null;
  createdBy: string | null;
}

export interface EmergencyProgressNote {
  id: number;
  emergencyId: number;
  time: string;
  doctorName: string;
  observation: string;
  vitalsBP: string | null;
  vitalsHR: number | null;
  vitalsRR: number | null;
  vitalsSpO2: number | null;
  vitalsTemp: number | null;
}

@Injectable({ providedIn: 'root' })
export class EmergencySubentitiesService {
  private base = `${environment.apiUrl}/emergency`;

  constructor(private http: HttpClient) {}

  // Investigations
  listInvestigations(emergencyId: number): Observable<EmergencyInvestigation[]> {
    return this.http.get<EmergencyInvestigation[]>(`${this.base}/${emergencyId}/investigations`);
  }
  createInvestigation(emergencyId: number, body: Partial<EmergencyInvestigation>): Observable<EmergencyInvestigation> {
    return this.http.post<EmergencyInvestigation>(`${this.base}/${emergencyId}/investigations`, body);
  }
  updateInvestigation(emergencyId: number, rowId: number, body: Partial<EmergencyInvestigation>): Observable<EmergencyInvestigation> {
    return this.http.put<EmergencyInvestigation>(`${this.base}/${emergencyId}/investigations/${rowId}`, body);
  }
  deleteInvestigation(emergencyId: number, rowId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${emergencyId}/investigations/${rowId}`);
  }

  // Treatments
  listTreatments(emergencyId: number): Observable<EmergencyTreatment[]> {
    return this.http.get<EmergencyTreatment[]>(`${this.base}/${emergencyId}/treatments`);
  }
  createTreatment(emergencyId: number, body: Partial<EmergencyTreatment>): Observable<EmergencyTreatment> {
    return this.http.post<EmergencyTreatment>(`${this.base}/${emergencyId}/treatments`, body);
  }
  updateTreatment(emergencyId: number, rowId: number, body: Partial<EmergencyTreatment>): Observable<EmergencyTreatment> {
    return this.http.put<EmergencyTreatment>(`${this.base}/${emergencyId}/treatments/${rowId}`, body);
  }
  deleteTreatment(emergencyId: number, rowId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${emergencyId}/treatments/${rowId}`);
  }

  // Procedures
  listProcedures(emergencyId: number): Observable<EmergencyProcedure[]> {
    return this.http.get<EmergencyProcedure[]>(`${this.base}/${emergencyId}/procedures`);
  }
  createProcedure(emergencyId: number, body: Partial<EmergencyProcedure>): Observable<EmergencyProcedure> {
    return this.http.post<EmergencyProcedure>(`${this.base}/${emergencyId}/procedures`, body);
  }
  deleteProcedure(emergencyId: number, rowId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${emergencyId}/procedures/${rowId}`);
  }

  // Specimens
  listSpecimens(emergencyId: number): Observable<EmergencySpecimen[]> {
    return this.http.get<EmergencySpecimen[]>(`${this.base}/${emergencyId}/specimens`);
  }
  createSpecimen(emergencyId: number, body: Partial<EmergencySpecimen>): Observable<EmergencySpecimen> {
    return this.http.post<EmergencySpecimen>(`${this.base}/${emergencyId}/specimens`, body);
  }
  updateSpecimen(emergencyId: number, rowId: number, body: Partial<EmergencySpecimen>): Observable<EmergencySpecimen> {
    return this.http.put<EmergencySpecimen>(`${this.base}/${emergencyId}/specimens/${rowId}`, body);
  }
  deleteSpecimen(emergencyId: number, rowId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${emergencyId}/specimens/${rowId}`);
  }

  // MLC (Medico-Legal Case) — one per emergency; GET may return null.
  getMlc(emergencyId: number): Observable<MlcCase | null> {
    return this.http.get<MlcCase | null>(`${this.base}/${emergencyId}/mlc`);
  }
  saveMlc(emergencyId: number, body: Partial<MlcCase>): Observable<MlcCase> {
    return this.http.post<MlcCase>(`${this.base}/${emergencyId}/mlc`, body);
  }

  // LAMA / DAMA (Against Medical Advice) — one per emergency; GET may return null.
  getLama(emergencyId: number): Observable<LamaRecord | null> {
    return this.http.get<LamaRecord | null>(`${this.base}/${emergencyId}/lama`);
  }
  saveLama(emergencyId: number, body: Partial<LamaRecord>): Observable<LamaRecord> {
    return this.http.post<LamaRecord>(`${this.base}/${emergencyId}/lama`, body);
  }
  getDama(emergencyId: number): Observable<DamaRecord | null> {
    return this.http.get<DamaRecord | null>(`${this.base}/${emergencyId}/dama`);
  }
  saveDama(emergencyId: number, body: Partial<DamaRecord>): Observable<DamaRecord> {
    return this.http.post<DamaRecord>(`${this.base}/${emergencyId}/dama`, body);
  }

  // Progress notes / serial vitals — controller wraps responses in { data }.
  listProgressNotes(emergencyId: number): Observable<EmergencyProgressNote[]> {
    return this.http
      .get<{ data: EmergencyProgressNote[] }>(`${this.base}/${emergencyId}/progress-notes`)
      .pipe(map((res) => res?.data ?? []));
  }
  addProgressNote(emergencyId: number, body: Partial<EmergencyProgressNote>): Observable<EmergencyProgressNote> {
    return this.http
      .post<{ data: EmergencyProgressNote }>(`${this.base}/${emergencyId}/progress-note`, body)
      .pipe(map((res) => res.data));
  }
}
