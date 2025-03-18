import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EstimationTypeReportComponent } from './estimation-type-report.component';

describe('EstimationTypeReportComponent', () => {
  let component: EstimationTypeReportComponent;
  let fixture: ComponentFixture<EstimationTypeReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EstimationTypeReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EstimationTypeReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
