/**
 * Sprint 3a-2 — IpdService progress-note methods.
 *
 * Narrow-scope tests for `addProgressNote()` + `getProgressNotes()`. Uses
 * HttpTestingController with `installHttpVerify()` afterEach hook so any
 * pending request fails the test loudly.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { IpdProgressNote, IpdService } from './ipd.service';
import { environment } from '../../environment/environment.prod';
import { installHttpVerify } from '../shared/testing/test-utils';

describe('IpdService — progress notes', () => {
  let service: IpdService;
  let http: HttpTestingController;
  const ADMISSION_ID = 'adm-001';
  const API = `${environment.apiUrl}/ipd/admission/${ADMISSION_ID}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IpdService],
    });
    service = TestBed.inject(IpdService);
    http = TestBed.inject(HttpTestingController);
  });

  // Must be at describe scope, not inside beforeEach — Jasmine disallows
  // registering afterEach from within another hook.
  installHttpVerify(() => http);

  it('addProgressNote — POSTs to the admission-scoped URL with the note payload', () => {
    const note: IpdProgressNote = {
      admissionId: ADMISSION_ID,
      doctorName: 'Dr. Jacob Ryan',
      subjective: 'Patient reports improving pain.',
      objective: 'BP 120/80, HR 72.',
      assessment: 'Post-op day 2, stable.',
      plan: 'Continue IV antibiotics; ambulate.',
    };

    let captured: unknown;
    service.addProgressNote(ADMISSION_ID, note).subscribe((res) => {
      captured = res;
    });

    const req = http.expectOne(`${API}/progress-note`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(note);

    req.flush({ message: 'Progress note added successfully', data: { id: 'pn-1', ...note } });
    expect(captured).toBeDefined();
  });

  it('getProgressNotes — GETs the admission-scoped list and returns data as-is', () => {
    const payload = {
      message: 'Progress notes retrieved successfully',
      data: [
        { id: 'pn-1', admissionId: ADMISSION_ID, doctorName: 'Dr. A', subjective: 's', objective: 'o', assessment: 'a', plan: 'p' },
      ],
      pagination: { total: 1, page: 1, limit: 10, pages: 1 },
    };

    let received: unknown;
    service.getProgressNotes(ADMISSION_ID).subscribe((res) => {
      received = res;
    });

    const req = http.expectOne(`${API}/progress-notes`);
    expect(req.request.method).toBe('GET');
    req.flush(payload);

    // Service returns raw body so callers can read `.data`
    expect(received).toEqual(payload as unknown as IpdProgressNote[]);
  });

  it('getProgressNotes — surfaces a 404 as an HttpErrorResponse', (done) => {
    service.getProgressNotes(ADMISSION_ID).subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(404);
        done();
      },
    });

    const req = http.expectOne(`${API}/progress-notes`);
    req.flush({ message: 'IPD admission not found' }, { status: 404, statusText: 'Not Found' });
  });

  it('addProgressNote — surfaces a 500 as an HttpErrorResponse', (done) => {
    const note: IpdProgressNote = {
      admissionId: ADMISSION_ID,
      doctorName: 'Dr. A',
      subjective: 's',
      objective: 'o',
      assessment: 'a',
      plan: 'p',
    };

    service.addProgressNote(ADMISSION_ID, note).subscribe({
      next: () => fail('expected error'),
      error: (err) => {
        expect(err.status).toBe(500);
        done();
      },
    });

    const req = http.expectOne(`${API}/progress-note`);
    req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Server Error' });
  });
});
