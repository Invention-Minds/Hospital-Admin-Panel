import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// Doorstep service requests (lab pickup / pharmacy delivery) from the WhatsApp bot.

export type DoorstepStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled';

export interface DoorstepRequest {
  id: number;
  refNo: string;
  patientPhone: string;
  prn: number | null;
  patientName: string;
  serviceType: 'LAB_PICKUP' | 'PHARMACY_DELIVERY';
  address: string;
  details: string | null;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  withinFreeRadius: boolean | null;
  status: DoorstepStatus;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class DoorstepService {
  private base = `${environment.apiUrl}/doorstep`;
  constructor(private http: HttpClient) {}

  inbox(status?: string): Observable<{ data: DoorstepRequest[] }> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<{ data: DoorstepRequest[] }>(`${this.base}/inbox`, { params });
  }

  updateStatus(id: number, status: DoorstepStatus): Observable<{ data: DoorstepRequest }> {
    return this.http.post<{ data: DoorstepRequest }>(`${this.base}/${id}/status`, { status });
  }
}
