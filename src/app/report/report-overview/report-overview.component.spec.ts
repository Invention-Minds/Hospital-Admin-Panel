import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportOverviewComponent } from './report-overview.component';

describe('ReportOverviewComponent', () => {
  let component: ReportOverviewComponent;
  let fixture: ComponentFixture<ReportOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ReportOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
