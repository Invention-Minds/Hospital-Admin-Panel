import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environment/environment.prod';

export interface HmisAuditLog {
  id?: string;
  direction: 'push' | 'pull';
  module: string;
  action: string;
  payload: any;
  response?: any;
  status: 'success' | 'failed' | 'pending';
  retryCount: number;
  createdAt?: Date;
}

export interface SyncStatus {
  module: string;
  lastSyncTime?: Date;
  status: 'success' | 'failed' | 'pending';
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HmisSyncService {
  private apiUrl = `${environment.apiUrl}/hmis-sync`;
  private syncStatusSource = new BehaviorSubject<SyncStatus[]>([]);
  syncStatus$ = this.syncStatusSource.asObservable();

  constructor(private http: HttpClient) { }

  // Get HMIS audit logs
  getAuditLogs(limit?: number, offset?: number): Observable<HmisAuditLog[]> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    if (offset) params = params.set('offset', offset.toString());
    return this.http.get<HmisAuditLog[]>(`${this.apiUrl}/audit-logs`, { params });
  }

  // Get audit logs by module
  getAuditLogsByModule(module: string): Observable<HmisAuditLog[]> {
    const params = new HttpParams().set('module', module);
    return this.http.get<HmisAuditLog[]>(`${this.apiUrl}/audit-logs`, { params });
  }

  // Get audit logs by date range
  getAuditLogsByDateRange(fromDate: string, toDate: string): Observable<HmisAuditLog[]> {
    let params = new HttpParams();
    params = params.set('fromDate', fromDate);
    params = params.set('toDate', toDate);
    return this.http.get<HmisAuditLog[]>(`${this.apiUrl}/audit-logs`, { params });
  }

  // Get HMIS sync status
  getSyncStatus(): Observable<SyncStatus[]> {
    return this.http.get<SyncStatus[]>(`${this.apiUrl}/status`);
  }

  // Get sync status for specific module
  getSyncStatusByModule(module: string): Observable<SyncStatus> {
    const params = new HttpParams().set('module', module);
    return this.http.get<SyncStatus>(`${this.apiUrl}/status`, { params });
  }

  // Manual sync trigger for patient
  syncPatient(prn: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/patient`, { prn });
  }

  // Manual sync trigger for appointment
  syncAppointment(appointmentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/appointment`, { appointmentId });
  }

  // Manual sync trigger for investigation order
  syncInvestigationOrder(orderId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/investigation`, { orderId });
  }

  // Manual sync trigger for prescription
  syncPrescription(prescriptionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/prescription`, { prescriptionId });
  }

  // Manual sync trigger for IPD admission
  syncIPDAdmission(admissionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/ipd-admission`, { admissionId });
  }

  // Manual sync trigger for discharge
  syncDischarge(dischargeId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/discharge`, { dischargeId });
  }

  // Get pending syncs
  getPendingSyncs(): Observable<HmisAuditLog[]> {
    const params = new HttpParams().set('status', 'pending');
    return this.http.get<HmisAuditLog[]>(`${this.apiUrl}/pending-syncs`, { params });
  }

  // Retry failed sync
  retrySyncLog(logId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/${logId}/retry`, {});
  }

  // Retry all failed syncs
  retryAllFailedSyncs(): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync/retry-all`, {});
  }

  // Get sync statistics
  getSyncStats(fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/stats`, { params });
  }

  // Get HMIS health status
  getHmisHealthStatus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/health`);
  }

  // Get failed syncs count
  getFailedSyncsCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/failed-syncs-count`);
  }

  // Download audit log report
  downloadAuditReport(fromDate?: string, toDate?: string): Observable<Blob> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get(`${this.apiUrl}/audit-logs/download`, { params, responseType: 'blob' });
  }

  // Download sync status report
  downloadSyncReport(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/status/download`, { responseType: 'blob' });
  }

  // Clear audit logs (archival)
  clearAuditLogs(olderThanDays: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/audit-logs/clear`, { olderThanDays });
  }

  // Get webhook delivery logs
  getWebhookLogs(limit?: number): Observable<any[]> {
    let params = new HttpParams();
    if (limit) params = params.set('limit', limit.toString());
    return this.http.get<any[]>(`${this.apiUrl}/webhook-logs`, { params });
  }

  // Retry webhook delivery
  retryWebhookDelivery(webhookId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/webhooks/${webhookId}/retry`, {});
  }
}
