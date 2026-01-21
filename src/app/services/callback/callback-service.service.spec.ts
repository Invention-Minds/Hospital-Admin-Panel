import { TestBed } from '@angular/core/testing';

import { CallbackServiceService } from './callback-service.service';

describe('CallbackServiceService', () => {
  let service: CallbackServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CallbackServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
