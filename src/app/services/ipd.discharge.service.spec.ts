/**
 * Sprint 3b — IpdService discharge methods.
 *
 * Covers `createDischarge` + `getDischarge`. Uses HttpTestingController with
 * describe-scope `installHttpVerify()`.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { IpdDischarge, IpdService } from './ipd.service';
import { environment } from '../../environment/environment.prod';
import { installHttpVerify } from '../shared/testing/test-utils';

describe('IpdService — discharge', () => {
  let service: IpdService;
  let http: HttpTestingController;
  const ADMISSION_ID = 'adm-42';
  const API = `${environment.apiUrl}/ipd/admission/${ADMISSION_ID}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [IpdService],
    });
    service = TestBed.inject(IpdService);
    http = TestBed.inject(HttpTestingController);
  });

  installHttpVerify(() => http);

  const samplePayload: IpdDischarge = {
    admissionId: ADMISSION_ID,
    dischargeDate: new Date('2026-04-19T00:00:00Z'),
    dischargeTime: '',
    dischargeType: 'regular',
    finalDiagnosis: 'CAP resolved.',
    conditionAtDischarge: 'Stable',
    dischargeSummary: 'Patient responded to IV ceftriaxone. Discharged home.',
    medications: [],
  };

  it('createDischarge — POSTs to the admission-scoped URL with the full payload', () => {
    let captured: unknown;
    service.createDischarge(ADMISSION_ID, samplePayload).subscribe((res) => {
      captured = res;
    });

    const req = http.expectOne(`${API}/discharge`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(samplePayload);

    req.flush({
      message: 'Discharge recorded',
      data: { id: 'd-1', admissionId: ADMISSION_ID, hmisDischargeId: 'HMIS-D-100' },
    });
    expect(captured).toBeDefined();
  });

  it('createDischarge — surfaces a 409 (already discharged) as an HttpErrorResponse', (done) => {
    service.createDischarge(ADMISSION_ID, samplePayload).subscribe({
      next: () => fail('expected 409'),
      error: (err) => {
        expect(err.status).toBe(409);
        expect(err.error.message).toContain('already discharged');
        done();
      },
    });

    const req = http.expectOne(`${API}/discharge`);
    req.flush(
      { message: 'Admission is already discharged' },
      { status: 409, statusText: 'Conflict' }
    );
  });

  it('createDischarge — surfaces a 500 as an HttpErrorResponse', (done) => {
    service.createDischarge(ADMISSION_ID, samplePayload).subscribe({
      next: () => fail('expected 500'),
      error: (err) => {
        expect(err.status).toBe(500);
        done();
      },
    });

    const req = http.expectOne(`${API}/discharge`);
    req.flush({ message: 'Internal server error' }, { status: 500, statusText: 'Server Error' });
  });

  it('getDischarge — GETs the admission-scoped URL and surfaces a 404 as an error', (done) => {
    service.getDischarge(ADMISSION_ID).subscribe({
      next: () => fail('expected 404'),
      error: (err) => {
        expect(err.status).toBe(404);
        done();
      },
    });

    const req = http.expectOne(`${API}/discharge`);
    expect(req.request.method).toBe('GET');
    req.flush(
      { message: 'Discharge record not found' },
      { status: 404, statusText: 'Not Found' }
    );
  });
});
