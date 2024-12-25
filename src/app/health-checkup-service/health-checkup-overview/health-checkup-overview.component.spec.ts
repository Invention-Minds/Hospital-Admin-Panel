import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthCheckupOverviewComponent } from './health-checkup-overview.component';

describe('HealthCheckupOverviewComponent', () => {
  let component: HealthCheckupOverviewComponent;
  let fixture: ComponentFixture<HealthCheckupOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HealthCheckupOverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthCheckupOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
