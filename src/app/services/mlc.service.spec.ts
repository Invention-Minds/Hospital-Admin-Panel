/**
 * Sprint 3d — MlcService tests (7 per the plan).
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { MlcCase, MlcService } from './mlc.service';
import { environment } from '../../environment/environment.prod';
import { installHttpVerify } from '../shared/testing/test-utils';

describe('MlcService', () => {
  let service: MlcService;
  let http: HttpTestingController;
  const API = `${environment.apiUrl}/mlc`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MlcService],
    });
    service = TestBed.inject(MlcService);
    http = TestBed.inject(HttpTestingController);
  });

  installHttpVerify(() => http);

  it('registerMlcCase — POSTs /mlc/register with body', () => {
    const body: Partial<MlcCase> = { emergencyId: '7', caseType: 'accident', policeStationName: 'Koramangala PS' };
    service.registerMlcCase(body as MlcCase).subscribe();
    const req = http.expectOne(`${API}/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ message: 'ok', data: { id: 1, hmisMlcId: 'HMIS-MLC-100' } });
  });

  it('registerMlcCase — surfaces 400 duplicate as HttpErrorResponse', (done) => {
    service.registerMlcCase({ emergencyId: '7', caseType: 'accident' } as MlcCase).subscribe({
      next: () => fail('expected 400'),
      error: (err) => { expect(err.status).toBe(400); done(); },
    });
    const req = http.expectOne(`${API}/register`);
    req.flush({ message: 'MLC case already exists for this emergency' }, { status: 400, statusText: 'Bad Request' });
  });

  it('registerMlcCase — surfaces 500', (done) => {
    service.registerMlcCase({ emergencyId: '7', caseType: 'accident' } as MlcCase).subscribe({
      next: () => fail('expected 500'),
      error: (err) => { expect(err.status).toBe(500); done(); },
    });
    const req = http.expectOne(`${API}/register`);
    req.flush({ message: 'err' }, { status: 500, statusText: 'Server Error' });
  });

  it('recordExamination — PUTs /mlc/:id/examination', () => {
    const body = { examinerName: 'Dr. A', injuries: 'Abrasion left forearm' };
    service.recordExamination('42', body).subscribe();
    const req = http.expectOne(`${API}/42/examination`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ message: 'ok', data: { id: 42, hmisMlcId: 'HMIS-MLC-100' } });
  });

  it('recordSampleCollection — PUTs /mlc/:id/samples', () => {
    const body = { samplesCollected: 'Blood · Saliva', sampleStorageInfo: 'Fridge 4C' };
    service.recordSampleCollection('42', body).subscribe();
    const req = http.expectOne(`${API}/42/samples`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ message: 'ok', data: { id: 42 } });
  });

  it('submitFinalReport — PUTs /mlc/:id/report', () => {
    const body = { finalReport: 'Final summary.', reportSubmittedTo: 'Koramangala PS' };
    service.submitFinalReport('42', body).subscribe();
    const req = http.expectOne(`${API}/42/report`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({ message: 'ok', data: { id: 42 } });
  });

  it('getMlcCase — GETs /mlc/:id and surfaces 404', (done) => {
    service.getMlcCase('missing').subscribe({
      next: () => fail('expected 404'),
      error: (err) => { expect(err.status).toBe(404); done(); },
    });
    const req = http.expectOne(`${API}/missing`);
    expect(req.request.method).toBe('GET');
    req.flush({ message: 'MLC case not found' }, { status: 404, statusText: 'Not Found' });
  });
});
