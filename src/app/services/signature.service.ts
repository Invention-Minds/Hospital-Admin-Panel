import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Phase 0 — Signature service.
 *
 * Wraps the backend `/api/signature` endpoint. The <app-e-sign> component
 * uses `createFromDataUrl` after the user finishes drawing on the canvas.
 *
 * Other callers (consent module, MAR ack, handover, CAPA close, etc.) read
 * signatures back via `getById` / `listByContext` for audit views.
 */

export type SignerType =
  | 'doctor'
  | 'nurse'
  | 'staff'
  | 'patient'
  | 'attender'
  | 'supervisor'
  | 'witness'
  | 'other';

export interface SignaturePayload {
  signerType: SignerType;
  signerName: string;
  signerRole?: string;
  signerRelation?: string;
  contextType?: string;
  contextId?: string;
  dataUrl: string;
  deviceFingerprint?: string;
}

export interface SignatureBlob {
  id: string;
  blobUrl: string;
  mimeType: string;
  signerType: SignerType;
  signerId?: number | null;
  signerName: string;
  signerRole?: string | null;
  signerRelation?: string | null;
  capturedAt: string;
  contextType?: string | null;
  contextId?: string | null;
}

export interface SignatureCreateResponse {
  id: string;
  blobUrl: string;
  capturedAt: string;
}

@Injectable({ providedIn: 'root' })
export class SignatureService {
  private apiUrl = `${environment.apiUrl}/signature`;

  constructor(private http: HttpClient) {}

  /** POST signature from a canvas data URL. Returns the new SignatureBlob id. */
  createFromDataUrl(payload: SignaturePayload): Observable<SignatureCreateResponse> {
    return this.http.post<SignatureCreateResponse>(this.apiUrl, payload);
  }

  /** Fetch a single signature by id. */
  getById(id: string): Observable<SignatureBlob> {
    return this.http.get<SignatureBlob>(`${this.apiUrl}/${id}`);
  }

  /** List signatures linked to a particular context (e.g., a consent record). */
  listByContext(contextType: string, contextId: string): Observable<SignatureBlob[]> {
    return this.http.get<SignatureBlob[]>(this.apiUrl, {
      params: { contextType, contextId },
    });
  }
}
