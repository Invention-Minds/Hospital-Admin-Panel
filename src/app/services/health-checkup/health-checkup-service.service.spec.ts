import { TestBed } from '@angular/core/testing';

import { HealthCheckupServiceService } from './health-checkup-service.service';

describe('HealthCheckupServiceService', () => {
  let service: HealthCheckupServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HealthCheckupServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
