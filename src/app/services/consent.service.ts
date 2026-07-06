import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 2 — Consent service.
 *
 * Wraps the backend `/api/consent` endpoints. Used by <app-consent-bundle>
 * and by future audit / patient-timeline views.
 */

export type ConsentType =
  | 'admission'
  | 'treatment'
  | 'anaesthesia'
  | 'blood'
  | 'financial'
  | 'photography'
  | 'high-risk'
  | 'research'
  | 'end-of-life';

export type ConsentLanguage = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'ml';

export type ConsentStatus = 'SIGNED' | 'DEFERRED' | 'REFUSED' | 'WITHDRAWN';

export interface ConsentForm {
  id: string;
  consentType: ConsentType | string;
  version: string;
  language: ConsentLanguage | string;
  title: string;
  bodyText: string;
  pdfTemplateUrl?: string | null;
  requiresWitness: boolean;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string | null;
}

export interface SignConsentPayload {
  formId: string;
  contextType?: string;
  contextId?: string | number;
  patientPrn?: number;
  patientName?: string;

  patientSignatureId?: string;
  attenderSignatureId?: string;
  attenderName?: string;
  attenderRelation?: string;
  witnessSignatureId?: string;
  witnessName?: string;

  status?: ConsentStatus;
  deferredReason?: string;
  refusedReason?: string;
}

export interface ConsentSignature {
  id: string;
  formId: string;
  consentType: string;
  version: string;
  language: string;
  contextType?: string | null;
  contextId?: string | null;
  patientPrn?: number | null;
  patientName?: string | null;
  patientSignatureId?: string | null;
  patientSignedAt?: string | null;
  attenderSignatureId?: string | null;
  attenderName?: string | null;
  attenderRelation?: string | null;
  attenderSignedAt?: string | null;
  witnessSignatureId?: string | null;
  witnessName?: string | null;
  witnessSignedAt?: string | null;
  status: ConsentStatus;
  deferredReason?: string | null;
  refusedReason?: string | null;
  signedAt: string;
  form?: ConsentForm;
}

@Injectable({ providedIn: 'root' })
export class ConsentService {
  private apiUrl = `${environment.apiUrl}/consent`;

  constructor(private http: HttpClient) {}

  /** List all active forms, optionally filtered by language / consentType. */
  listForms(filters?: { language?: ConsentLanguage; consentType?: ConsentType }): Observable<ConsentForm[]> {
    let params = new HttpParams();
    if (filters?.language) params = params.set('language', filters.language);
    if (filters?.consentType) params = params.set('consentType', filters.consentType);
    return this.http.get<ConsentForm[]>(`${this.apiUrl}/forms`, { params });
  }

  /** Get one form by type + language (falls back to English on the server). */
  getForm(type: ConsentType, language: ConsentLanguage = 'en'): Observable<ConsentForm> {
    return this.http.get<ConsentForm>(`${this.apiUrl}/forms/${type}/${language}`);
  }

  /** Capture a signed consent. Patient/attender signatures must be created via SignatureService first. */
  sign(payload: SignConsentPayload): Observable<ConsentSignature> {
    return this.http.post<ConsentSignature>(`${this.apiUrl}/sign`, payload);
  }

  /** All consents linked to a particular admission / OT / transfusion / etc. */
  listByContext(contextType: string, contextId: string | number): Observable<ConsentSignature[]> {
    return this.http.get<ConsentSignature[]>(
      `${this.apiUrl}/by-context/${encodeURIComponent(contextType)}/${encodeURIComponent(String(contextId))}`
    );
  }

  /** Every consent ever signed by a patient. */
  listByPatient(prn: number): Observable<ConsentSignature[]> {
    return this.http.get<ConsentSignature[]>(`${this.apiUrl}/by-patient/${prn}`);
  }
}
