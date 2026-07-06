import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 1 — Patient service.
 *
 * Wraps the enhanced `/api/patients` endpoints. Existing components that use
 * `AppointmentConfirmService.createPatient()` keep working; new code (the
 * patient-new registration form, future consent flows) should use this.
 */

export type Gender = 'male' | 'female' | 'other' | 'prefer-not-to-say';
export type CommChannel = 'sms' | 'whatsapp' | 'call' | 'email';

export interface CreatePatientPayload {
  // Identity
  name: string;
  prefix?: string;
  gender?: Gender | string;
  dob?: string; // ISO yyyy-mm-dd
  age?: string;

  // Contact
  phoneNumber: string;        // mapped from form `mobileNo` — see service method
  contactNo?: string;         // alternative number
  email?: string;
  address?: string;
  pin?: string;
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;

  // Identifiers
  abhaId?: string;            // backend hashes
  aadharNo?: string;          // captured on form, optional persistence below
  pan?: string;
  passportNo?: string;
  foreignNational?: boolean;

  // Family / social
  fatherOrSpouse?: string;
  motherName?: string;
  religion?: string;
  occupation?: string;
  vipPatient?: boolean;
  patientType?: string;       // source: walk-in / website / referral / etc.

  // Clinical baselines (NABH AAC.4 / MOM.4.c)
  bloodGroup?: string;        // A+, B-, etc.
  knownAllergies?: string;
  chronicConditions?: string;
  currentMedications?: string;

  // Next of kin (required for WF-2 attender consent)
  nextOfKinName?: string;
  nextOfKinRelation?: string;
  nextOfKinPhone?: string;

  // Communication preferences (NABH PRE.5)
  preferredLanguage?: string;
  preferredCommChannel?: CommChannel | string;

  // Consent (NABH PRE.1)
  consentVersionAccepted?: string;
  consentSignatureId?: string;

  // System
  prn?: number;
  source?: string;

  // Phone-duplicate override — when true the backend skips the 409 dedup block.
  allowDuplicatePhone?: boolean;
}

export interface PatientRecord {
  id: number;
  prn: number;
  name: string;
  mobileNo: string;
  email?: string;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  source?: string;
  verified?: boolean;
  hmisUhid?: string | null;
  created_at?: string;
}

export interface ExistingPatientResponse {
  message: string;
  patient: PatientRecord;
}

@Injectable({ providedIn: 'root' })
export class PatientService {
  private apiUrl = `${environment.apiUrl}/patients`;

  constructor(private http: HttpClient) {}

  /** Create a new patient. Returns 201 + patient or 409 + existing patient. */
  create(payload: CreatePatientPayload): Observable<PatientRecord> {
    return this.http.post<PatientRecord>(this.apiUrl, payload);
  }

  /** Look up by phone number — used for inline duplicate-check on blur. */
  findByPhone(phone: string): Observable<PatientRecord | null> {
    // Backend returns 409 with `patient` when phone exists. We probe via the
    // create-collision path if no dedicated lookup exists, but cheaper to add
    // a helper read here. Until the backend ships GET /patients?phone=, we
    // re-use getDetailsByPRN style by listing — keep it simple: hit a small
    // admin endpoint, fall back gracefully.
    return this.http.get<PatientRecord | null>(`${this.apiUrl}/by-phone/${encodeURIComponent(phone)}`);
  }

  /** PRN-keyed full record (existing endpoint). */
  getByPrn(prn: number): Observable<PatientRecord> {
    return this.http.post<PatientRecord>(`${this.apiUrl}/get-details-by-prn`, { prnNumber: prn });
  }
}
