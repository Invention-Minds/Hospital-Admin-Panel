import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MhcReportComponent } from './mhc-report.component';

describe('MhcReportComponent', () => {
  let component: MhcReportComponent;
  let fixture: ComponentFixture<MhcReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MhcReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MhcReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
