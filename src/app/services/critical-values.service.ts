import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environment/environment.prod';

export interface CriticalValueAlert {
  id: string;
  timestamp: Date;
  prn: string;
  patientName?: string;
  testName: string;
  result: string;
  referenceRange?: string;
  unit?: string;
  criticalLevel: 'critical' | 'high' | 'low';
  type: 'lab' | 'radiology' | 'vitals';
  reportUrl?: string;
  department?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CriticalValuesService {
  private apiUrl = `${environment.apiUrl}/critical-values`;
  private criticalAlertsSource = new BehaviorSubject<CriticalValueAlert[]>([]);
  criticalAlerts$ = this.criticalAlertsSource.asObservable();

  private eventSource: EventSource | null = null;
  private alertSubject = new Subject<CriticalValueAlert>();

  // True while the SSE stream is open (set on onopen / cleared on error/close).
  // Drives the "Connected/Disconnected" badge — independent of whether any
  // alert has actually arrived.
  private connectionStatus = new BehaviorSubject<boolean>(false);
  connectionStatus$ = this.connectionStatus.asObservable();

  constructor(private http: HttpClient) { }

  // Subscribe to critical value alerts via SSE
  subscribeToCriticalValues(userId: string): Observable<CriticalValueAlert> {
    // Close previous connection if exists
    if (this.eventSource) {
      this.eventSource.close();
    }

    // Create SSE connection. The backend gates /stream on a JWT passed via the
    // `token` query param (EventSource can't send an Authorization header) and
    // derives the user from it. userId is kept only as a harmless extra.
    const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
    const sseUrl = `${this.apiUrl}/stream?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`;
    this.eventSource = new EventSource(sseUrl);

    // Connection is live once the stream opens — regardless of any alert traffic.
    this.eventSource.onopen = () => {
      this.connectionStatus.next(true);
    };

    // Listen for critical-value events
    this.eventSource.addEventListener('critical-value', (event: any) => {
      try {
        const alert = JSON.parse(event.data);
        this.alertSubject.next(alert);

        // Update alerts list
        const currentAlerts = this.criticalAlertsSource.getValue();
        this.criticalAlertsSource.next([alert, ...currentAlerts]);
      } catch (error) {
        console.error('Error parsing critical value alert:', error);
      }
    });

    // Handle connection errors
    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.connectionStatus.next(false);
      this.eventSource?.close();
      // Optionally reconnect after delay
      setTimeout(() => this.subscribeToCriticalValues(userId), 5000);
    };

    return this.alertSubject.asObservable();
  }

  // Unsubscribe from critical value alerts
  unsubscribeFromCriticalValues(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connectionStatus.next(false);
  }

  // Get all critical alerts (history)
  getAllCriticalAlerts(): Observable<CriticalValueAlert[]> {
    return this.http.get<CriticalValueAlert[]>(`${this.apiUrl}/alerts`);
  }

  // Get critical alerts by PRN
  getCriticalAlertsByPrn(prn: string): Observable<CriticalValueAlert[]> {
    return this.http.get<CriticalValueAlert[]>(`${this.apiUrl}/alerts/${prn}`);
  }

  // Get critical alerts by date range
  getCriticalAlertsByDateRange(fromDate: string, toDate: string): Observable<CriticalValueAlert[]> {
    return this.http.get<CriticalValueAlert[]>(`${this.apiUrl}/alerts`, {
      params: { fromDate, toDate }
    });
  }

  // Get active users monitoring critical values
  getActiveUsers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/active-users`);
  }

  // Broadcast critical value alert (for testing/manual)
  broadcastAlert(alert: CriticalValueAlert): Observable<any> {
    return this.http.post(`${this.apiUrl}/broadcast`, alert);
  }

  // Acknowledge critical value alert
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/alerts/${alertId}/acknowledge`, { acknowledgedBy });
  }

  // Get alert statistics
  getAlertStats(fromDate?: string, toDate?: string): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);
    return this.http.get<any>(`${this.apiUrl}/stats`, { params });
  }

  // Get pending critical values
  getPendingCriticalValues(): Observable<CriticalValueAlert[]> {
    return this.http.get<CriticalValueAlert[]>(`${this.apiUrl}/pending`);
  }

  // Clear alert from UI
  clearAlert(alertId: string): void {
    const currentAlerts = this.criticalAlertsSource.getValue();
    const filtered = currentAlerts.filter(a => a.id !== alertId);
    this.criticalAlertsSource.next(filtered);
  }

  // Clear all alerts
  clearAllAlerts(): void {
    this.criticalAlertsSource.next([]);
  }

  // Get recent alerts (last N)
  getRecentAlerts(limit: number = 10): Observable<CriticalValueAlert[]> {
    return this.http.get<CriticalValueAlert[]>(`${this.apiUrl}/alerts`, {
      params: { limit: limit.toString() }
    });
  }
}
