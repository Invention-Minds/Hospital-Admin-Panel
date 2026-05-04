import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environment/environment.prod';

// Backend ward/bed endpoints return { message, data: ... } envelopes; this
// helper unwraps them so consumers receive the array/object directly.
type Envelope<T> = { message?: string; data: T } | T;
const unwrap = <T>() => map((res: Envelope<T>): T => {
  if (res && typeof res === 'object' && 'data' in (res as { data?: T })) {
    return (res as { data: T }).data;
  }
  return res as T;
});

export interface Ward {
  id?: string;
  wardName: string;
  wardCode: string;
  floor: string;
  department: string;
  totalBeds: number;
  hmisWardId?: string;
}

export interface Bed {
  id?: string;
  bedNumber: string;
  wardId: string;
  bedType: 'general' | 'ICU' | 'HDU' | 'isolation';
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  hmisBedrId?: string;
  currentAdmissionId?: string;
  currentPatient?: {
    prn: string;
    name: string;
    admissionNo: string;
  };
}

export interface BedCensus {
  wardId: string;
  wardName: string;
  wardCode?: string;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: number;
  beds: Bed[];
}

@Injectable({
  providedIn: 'root'
})
export class WardManagementService {
  private apiUrl = `${environment.apiUrl}/ward`;
  private wardsSource = new BehaviorSubject<Ward[]>([]);
  wards$ = this.wardsSource.asObservable();

  private bedsSource = new BehaviorSubject<Bed[]>([]);
  beds$ = this.bedsSource.asObservable();

  private censusSource = new BehaviorSubject<BedCensus[]>([]);
  census$ = this.censusSource.asObservable();

  constructor(private http: HttpClient) { }

  // Get all wards
  getAllWards(): Observable<Ward[]> {
    return this.http.get<{ message: string; data: Ward[] }>(`${this.apiUrl}/wards`).pipe(unwrap<Ward[]>());
  }

  // Get ward by ID
  getWardById(wardId: string): Observable<Ward> {
    return this.http.get<{ message: string; data: Ward }>(`${this.apiUrl}/ward/${wardId}`).pipe(unwrap<Ward>());
  }

  // Get wards by department
  getWardsByDepartment(department: string): Observable<Ward[]> {
    const params = new HttpParams().set('department', department);
    return this.http.get<{ message: string; data: Ward[] }>(`${this.apiUrl}/wards`, { params }).pipe(unwrap<Ward[]>());
  }

  // Create ward
  createWard(wardData: Ward): Observable<any> {
    return this.http.post(`${this.apiUrl}/wards`, wardData);
  }

  // Update ward
  updateWard(wardId: string, wardData: Partial<Ward>): Observable<any> {
    return this.http.put(`${this.apiUrl}/ward/${wardId}`, wardData);
  }

  // Get all beds
  getAllBeds(): Observable<Bed[]> {
    return this.http.get<{ message: string; data: Bed[] }>(`${this.apiUrl}/beds`).pipe(unwrap<Bed[]>());
  }

  // Get beds by ward
  getBedsByWard(wardId: string): Observable<Bed[]> {
    const params = new HttpParams().set('wardId', wardId);
    return this.http.get<{ message: string; data: Bed[] }>(`${this.apiUrl}/beds`, { params }).pipe(unwrap<Bed[]>());
  }

  // Get available beds
  getAvailableBeds(wardId?: string): Observable<Bed[]> {
    let params = new HttpParams();
    if (wardId) params = params.set('wardId', wardId);
    params = params.set('status', 'available');
    return this.http.get<{ message: string; data: Bed[] }>(`${this.apiUrl}/beds`, { params }).pipe(unwrap<Bed[]>());
  }

  // Get available beds by type
  getAvailableBedsByType(bedType: string, wardId?: string): Observable<Bed[]> {
    let params = new HttpParams();
    params = params.set('bedType', bedType);
    params = params.set('status', 'available');
    if (wardId) params = params.set('wardId', wardId);
    return this.http.get<{ message: string; data: Bed[] }>(`${this.apiUrl}/beds`, { params }).pipe(unwrap<Bed[]>());
  }

  // Get bed by ID
  getBedById(bedId: string): Observable<Bed> {
    return this.http.get<{ message: string; data: Bed }>(`${this.apiUrl}/bed/${bedId}`).pipe(unwrap<Bed>());
  }

  // Create beds for ward
  createBedsForWard(wardId: string, bedCount: number, bedTypes: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/ward/${wardId}/beds`, { bedCount, bedTypes });
  }

  // Update bed status
  updateBedStatus(bedId: string, status: string, admissionId?: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/bed/${bedId}/status`, { status, admissionId });
  }

  // Get bed census (occupancy report)
  getBedCensus(): Observable<BedCensus[]> {
    return this.http.get<BedCensus[]>(`${this.apiUrl}/bed-census`);
  }

  // Get bed census for specific ward
  getWardCensus(wardId: string): Observable<BedCensus> {
    const params = new HttpParams().set('wardId', wardId);
    return this.http.get<BedCensus>(`${this.apiUrl}/bed-census`, { params });
  }

  // Get bed census report for date range
  getBedCensusReport(fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/bed-census-report`, { params });
  }

  // Get occupancy trends
  getOccupancyTrends(days?: number): Observable<any[]> {
    let params = new HttpParams();
    if (days) params = params.set('days', days.toString());
    return this.http.get<any[]>(`${this.apiUrl}/occupancy-trends`, { params });
  }

  // Reserve bed
  reserveBed(bedId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bed/${bedId}/reserve`, { reason });
  }

  // Cancel bed reservation
  cancelBedReservation(bedId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bed/${bedId}/cancel-reserve`, {});
  }

  // Mark bed for maintenance
  markBedMaintenance(bedId: string, maintenanceNote?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bed/${bedId}/maintenance`, { maintenanceNote });
  }

  // Complete bed maintenance
  completeBedMaintenance(bedId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bed/${bedId}/maintenance-complete`, {});
  }

  // Get ward statistics
  getWardStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  // Download bed census report
  downloadBedCensusReport(fromDate?: string, toDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get(`${this.apiUrl}/bed-census-report/download`, { params, responseType: 'blob' });
  }

  // Sprint 4a Phase 1e — Historical bed census snapshot for a given date (YYYY-MM-DD)
  getWardCensusSnapshot(date: string): Observable<any> {
    const params = new HttpParams().set('date', date);
    return this.http.get<any>(`${this.apiUrl}/bed-census/snapshot`, { params });
  }
}
