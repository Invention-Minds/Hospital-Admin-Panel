import { TestBed } from '@angular/core/testing';

import { OpdAssessmentsService } from './opd-assessments.service';

describe('OpdAssessmentsService', () => {
  let service: OpdAssessmentsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpdAssessmentsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
