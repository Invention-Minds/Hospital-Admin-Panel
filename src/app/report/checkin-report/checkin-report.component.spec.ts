import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CheckinReportComponent } from './checkin-report.component';

describe('CheckinReportComponent', () => {
  let component: CheckinReportComponent;
  let fixture: ComponentFixture<CheckinReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CheckinReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CheckinReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
