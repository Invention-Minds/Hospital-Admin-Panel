import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class OpthPresService {

  constructor(private http: HttpClient) {}

  private apiUrl = environment.apiUrl ;

  getOptions(field: string) {
    return this.http.get(`${this.apiUrl}/ophthalmology/options/${field}`);
  }

  addOption(field: string, label: string) {
    return this.http.post(`${this.apiUrl}/ophthalmology/options/add`, {
      fieldName: field,
      optionLabel: label
    });
  }

  savePrescription(data: any) {
    return this.http.post(`${this.apiUrl}/ophthalmology/save`, data);
  }
  getPrescriptionByAppointment(appointmentId: number) {
    return this.http.get(`${this.apiUrl}/ophthalmology/appointment/${appointmentId}`);
  }

  /** Log one in-OPD drop instillation. The server stamps who + when. */
  logDrop(data: {
    prn: number | string;
    appointmentId?: number | null;
    prescriptionId?: string | null;
    drugName: string;
    eye: 'OD' | 'OS' | 'OU';
    dropCount?: number;
    purpose?: string | null;
    remarks?: string | null;
  }) {
    return this.http.post(`${this.apiUrl}/ophthalmology/drops`, data);
  }

  /** Drops instilled during this visit, oldest first. */
  getDrops(appointmentId: number) {
    return this.http.get(`${this.apiUrl}/ophthalmology/drops/${appointmentId}`);
  }

  // ─── Optometrist work-up ↔ doctor verification ─────────────────────
  /** Today's ophthalmology appointments with each work-up's status. */
  getOptometryQueue(date?: string) {
    const q = date ? `?date=${date}` : '';
    return this.http.get(`${this.apiUrl}/ophthalmology/queue${q}`);
  }

  /** Optometrist submits the refraction work-up for one appointment. */
  submitWorkup(payload: Record<string, unknown>) {
    return this.http.post(`${this.apiUrl}/ophthalmology/workup/submit`, payload);
  }

  /** Doctor accepts the work-up; server decides verified vs amended. */
  verifyWorkup(prescriptionId: string) {
    return this.http.post(`${this.apiUrl}/ophthalmology/${prescriptionId}/verify`, {});
  }
}
