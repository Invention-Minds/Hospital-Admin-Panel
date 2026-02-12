import { TestBed } from '@angular/core/testing';

import { VoiceOpdService } from './voice-opd.service';

describe('VoiceOpdService', () => {
  let service: VoiceOpdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceOpdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
