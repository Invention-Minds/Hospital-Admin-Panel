import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DelayReportComponent } from './delay-report.component';

describe('DelayReportComponent', () => {
  let component: DelayReportComponent;
  let fixture: ComponentFixture<DelayReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DelayReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DelayReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
