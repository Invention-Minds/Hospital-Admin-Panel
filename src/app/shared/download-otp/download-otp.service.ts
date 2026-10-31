import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environment/environment.prod';
import { DownloadOtpDialogComponent } from './download-otp-dialog.component';
import { DownloadGrant, currentDownloadGrant, setDownloadTicket, storeDownloadGrant } from './download-grant.store';
import { setDownloadRef } from './download-stamp';

/**
 * Gate for every download / export / print:
 *   1. email OTP — one verification unlocks downloads for 60 minutes
 *   2. every download — image captcha + reason, logged server-side
 *      (who / what / when / why). Usage at a call site:
 *
 *   if (!(await this.downloadOtp.verify('Bed census CSV'))) return;
 *
 * Server file routes also receive the grant and a one-time ticket via
 * AuthInterceptor (X-Download-Grant / X-Download-Ticket).
 */
@Injectable({ providedIn: 'root' })
export class DownloadOtpService {
  private apiUrl = `${environment.apiUrl}/download-otp`;
  private pending: Promise<string | null> | null = null;

  constructor(private http: HttpClient, private dialog: MatDialog) {}

  /**
   * Resolves with the Download ID once the user has passed OTP (if needed),
   * captcha and reason, or null if they cancelled. The ID is also stamped on
   * the file automatically (download-stamp.ts).
   */
  verify(label = 'this download'): Promise<string | null> {
    // Several exports fired by one click share one prompt.
    if (!this.pending) {
      const ref = this.dialog.open(DownloadOtpDialogComponent, { data: { label }, width: '420px', disableClose: true });
      this.pending = firstValueFrom(ref.afterClosed()).then((r) => r || null).finally(() => (this.pending = null));
    }
    return this.pending;
  }

  currentGrant(): string | null {
    return currentDownloadGrant();
  }

  requestOtp(): Observable<{ sentTo: string; expiresAt: string }> {
    return this.http.post<{ sentTo: string; expiresAt: string }>(`${this.apiUrl}/request`, {});
  }

  confirmOtp(otp: string): Observable<DownloadGrant> {
    return this.http.post<DownloadGrant>(`${this.apiUrl}/verify`, { otp });
  }

  storeGrant(g: DownloadGrant): void {
    storeDownloadGrant(g);
  }

  getCaptcha(): Observable<PictureCaptcha> {
    return this.http.get<PictureCaptcha>(`${this.apiUrl}/captcha`);
  }

  /**
   * Logs the download (what/why), arms the one-time ticket for a server file
   * route and the Download ID stamped on the file. Returns the Download ID.
   */
  async authorize(body: { captchaId: string; captchaAnswer: number[]; reason: string; label: string }): Promise<string> {
    const page = typeof window !== 'undefined' ? window.location.pathname : null;
    const res = await firstValueFrom(this.http.post<{ logId: string; downloadRef: string | null; ticket: string }>(
      `${this.apiUrl}/authorize`,
      { ...body, page },
      { headers: { 'X-Download-Grant': this.currentGrant() || '' } },
    ));
    setDownloadTicket(res.ticket);
    setDownloadRef(res.downloadRef);
    return res.downloadRef || res.logId;
  }

  getLogs(params: { page: number; pageSize: number; search?: string; from?: string; to?: string }): Observable<DownloadLogPage> {
    const query: Record<string, string> = { page: String(params.page), pageSize: String(params.pageSize) };
    if (params.search) query['search'] = params.search;
    if (params.from) query['from'] = params.from;
    if (params.to) query['to'] = params.to;
    return this.http.get<DownloadLogPage>(`${this.apiUrl}/logs`, { params: query });
  }
}

/** "Select every tile that contains a …" — answer is the tile indices, row by row. */
export interface PictureCaptcha { captchaId: string; image: string; prompt: string; grid: number }

export interface DownloadLogRow {
  id: string;
  username: string;
  employeeId: string | null;
  downloadRef: string | null;
  role: string;
  label: string;
  page: string | null;
  reason: string;
  ip: string | null;
  serverRoute: string | null;
  servedAt: string | null;
  createdAt: string;
}

export interface DownloadLogPage { data: DownloadLogRow[]; total: number; page: number; pageSize: number }
