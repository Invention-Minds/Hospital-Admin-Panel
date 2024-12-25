import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthCheckupCancelComponent } from './health-checkup-cancel.component';

describe('HealthCheckupCancelComponent', () => {
  let component: HealthCheckupCancelComponent;
  let fixture: ComponentFixture<HealthCheckupCancelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HealthCheckupCancelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthCheckupCancelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
