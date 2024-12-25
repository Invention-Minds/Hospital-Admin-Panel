import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthCheckupRequestComponent } from './health-checkup-request.component';

describe('HealthCheckupRequestComponent', () => {
  let component: HealthCheckupRequestComponent;
  let fixture: ComponentFixture<HealthCheckupRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HealthCheckupRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthCheckupRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
