/**
 * Sprint 3e — LamaDamaService tests.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { LamaDamaService, LamaRecord, DamaRecord } from './lama-dama.service';
import { environment } from '../../environment/environment.prod';
import { installHttpVerify } from '../shared/testing/test-utils';

describe('LamaDamaService', () => {
  let service: LamaDamaService;
  let http: HttpTestingController;
  const API = `${environment.apiUrl}/lama-dama`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LamaDamaService],
    });
    service = TestBed.inject(LamaDamaService);
    http = TestBed.inject(HttpTestingController);
  });

  installHttpVerify(() => http);

  it('createLamaRecord — POSTs /lama-dama/lama with body', () => {
    const body: Partial<LamaRecord> = {
      emergencyId: '9',
      lamaTime: new Date('2026-04-01T10:00:00Z'),
      doctorAdvice: 'Admit for observation',
      riskExplained: true,
      reasonForLama: 'Patient refused admission',
    };
    service.createLamaRecord(body as LamaRecord).subscribe();
    const req = http.expectOne(`${API}/lama`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ message: 'ok', data: { id: 'L1', hmisLamaId: 'HMIS-LAMA-501' } });
  });

  it('createLamaRecord — surfaces 400', (done) => {
    service
      .createLamaRecord({ emergencyId: '9' } as LamaRecord)
      .subscribe({
        next: () => fail('expected 400'),
        error: (err) => {
          expect(err.status).toBe(400);
          done();
        },
      });
    const req = http.expectOne(`${API}/lama`);
    req.flush({ message: 'missing fields' }, { status: 400, statusText: 'Bad Request' });
  });

  it('createDamaRecord — POSTs /lama-dama/dama with body', () => {
    const body: Partial<DamaRecord> = {
      emergencyId: '9',
      dischargeTime: new Date('2026-04-01T12:00:00Z'),
      doctorRecommendation: 'Continue IV antibiotics',
      patientDeclinesAdvice: true,
    };
    service.createDamaRecord(body as DamaRecord).subscribe();
    const req = http.expectOne(`${API}/dama`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ message: 'ok', data: { id: 'D1', hmisDamaId: 'HMIS-DAMA-700' } });
  });

  it('updateLamaRecord — PUTs /lama-dama/lama/:id', () => {
    const patch: Partial<LamaRecord> = { reasonForLama: 'Updated reason' };
    service.updateLamaRecord('L1', patch).subscribe();
    const req = http.expectOne(`${API}/lama/L1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(patch);
    req.flush({ message: 'ok', data: { id: 'L1', hmisLamaId: 'HMIS-LAMA-501' } });
  });

  it('updateDamaRecord — PUTs /lama-dama/dama/:id', () => {
    const patch: Partial<DamaRecord> = { followUpAdvice: 'Visit OPD in 3 days' };
    service.updateDamaRecord('D1', patch).subscribe();
    const req = http.expectOne(`${API}/dama/D1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(patch);
    req.flush({ message: 'ok', data: { id: 'D1' } });
  });

  it('getAllLamaRecords — GETs /lama-dama/lama-list', () => {
    service.getAllLamaRecords().subscribe();
    const req = http.expectOne(`${API}/lama-list`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('getAllDamaRecords — GETs /lama-dama/dama-list', () => {
    service.getAllDamaRecords().subscribe();
    const req = http.expectOne(`${API}/dama-list`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('verifyDocumentation — POSTs /lama-dama/:type/:id/verify', () => {
    service.verifyDocumentation('lama', 'L1').subscribe();
    const req = http.expectOne(`${API}/lama/L1/verify`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ data: { compliant: true, issues: [] } });
  });

  it('getLamaRecord — surfaces 404', (done) => {
    service.getLamaRecord('missing').subscribe({
      next: () => fail('expected 404'),
      error: (err) => {
        expect(err.status).toBe(404);
        done();
      },
    });
    const req = http.expectOne(`${API}/lama/missing`);
    req.flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });
  });
});
