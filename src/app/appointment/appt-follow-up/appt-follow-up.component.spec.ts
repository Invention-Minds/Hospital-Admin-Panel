import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApptFollowUpComponent } from './appt-follow-up.component';

describe('ApptFollowUpComponent', () => {
  let component: ApptFollowUpComponent;
  let fixture: ComponentFixture<ApptFollowUpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ApptFollowUpComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApptFollowUpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
