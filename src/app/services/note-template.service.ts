import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

/**
 * Note Templates — department-scoped form layouts.
 *
 * Used by:
 *   • The admin manager page at /note-templates (CRUD)
 *   • Doctor-facing forms (discharge, OPD assessment, doctor manual notes)
 *     to load active templates for the patient's department.
 *
 * Field-name parity with the backend NoteTemplate schema is intentional —
 * payloads and responses are shape-identical.
 */

export type NoteType = 'discharge' | 'opd-handwritten' | 'opd-doctor' | 'diet-plan';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'datetime'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'handwritten';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];     // required when type ∈ {select, multiselect, radio}
  helpText?: string;
  placeholder?: string;
  group?: string;         // optional section heading
  order?: number;
}

export interface NoteTemplate {
  id: string;
  name: string;
  noteType: NoteType;
  department: string;
  doctorId?: number | null;   // Phase 9.21 — null = department-level; set = personal
  fields: FieldDef[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CreateTemplatePayload {
  name: string;
  noteType: NoteType;
  department: string;
  fields: FieldDef[];
  isActive?: boolean;
  isDefault?: boolean;
  scope?: 'mine' | 'department';  // Phase 9.21 — 'mine' = personal template
}

@Injectable({ providedIn: 'root' })
export class NoteTemplateService {
  private apiUrl = `${environment.apiUrl}/note-template`;

  constructor(private http: HttpClient) {}

  /** Admin list — supports filtering. */
  list(filters?: {
    noteType?: NoteType;
    department?: string;
    isActive?: boolean;
  }): Observable<NoteTemplate[]> {
    let params = new HttpParams();
    if (filters?.noteType) params = params.set('noteType', filters.noteType);
    if (filters?.department) params = params.set('department', filters.department);
    if (filters?.isActive !== undefined)
      params = params.set('isActive', String(filters.isActive));
    return this.http.get<NoteTemplate[]>(this.apiUrl, { params });
  }

  /** Doctor-facing list — only active templates for a (department, noteType). */
  getActiveForDepartment(
    department: string,
    noteType: NoteType,
  ): Observable<NoteTemplate[]> {
    const params = new HttpParams()
      .set('department', department)
      .set('noteType', noteType);
    return this.http.get<NoteTemplate[]>(`${this.apiUrl}/active`, { params });
  }

  /**
   * Phase 9.21 — doctor-facing list that returns the logged-in doctor's own
   * templates first, then the department-level ones (default first within
   * each). The doctor is resolved server-side from the auth token.
   */
  getForDoctor(
    department: string,
    noteType: NoteType,
  ): Observable<NoteTemplate[]> {
    const params = new HttpParams()
      .set('department', department)
      .set('noteType', noteType);
    return this.http.get<NoteTemplate[]>(`${this.apiUrl}/for-doctor`, { params });
  }

  /**
   * Phase 9.21 — doctor self-service manager. Returns ONLY the logged-in
   * doctor's own personal templates (active + inactive), resolved server-side
   * from the auth token. Optionally filtered by noteType.
   */
  listMine(noteType?: NoteType): Observable<NoteTemplate[]> {
    let params = new HttpParams();
    if (noteType) params = params.set('noteType', noteType);
    return this.http.get<NoteTemplate[]>(`${this.apiUrl}/mine`, { params });
  }

  getById(id: string): Observable<NoteTemplate> {
    return this.http.get<NoteTemplate>(`${this.apiUrl}/${id}`);
  }

  create(payload: CreateTemplatePayload): Observable<NoteTemplate> {
    return this.http.post<NoteTemplate>(this.apiUrl, payload);
  }

  update(id: string, payload: Partial<CreateTemplatePayload>): Observable<NoteTemplate> {
    return this.http.put<NoteTemplate>(`${this.apiUrl}/${id}`, payload);
  }

  setDefault(id: string): Observable<NoteTemplate> {
    return this.http.post<NoteTemplate>(`${this.apiUrl}/${id}/set-default`, {});
  }

  clone(id: string): Observable<NoteTemplate> {
    return this.http.post<NoteTemplate>(`${this.apiUrl}/${id}/clone`, {});
  }

  /** Soft-delete via isActive=false on the server. */
  delete(id: string): Observable<NoteTemplate> {
    return this.http.delete<NoteTemplate>(`${this.apiUrl}/${id}`);
  }
}
