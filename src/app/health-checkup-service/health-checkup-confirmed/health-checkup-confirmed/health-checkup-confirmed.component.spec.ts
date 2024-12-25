import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthCheckupConfirmedComponent } from './health-checkup-confirmed.component';

describe('HealthCheckupConfirmedComponent', () => {
  let component: HealthCheckupConfirmedComponent;
  let fixture: ComponentFixture<HealthCheckupConfirmedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HealthCheckupConfirmedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthCheckupConfirmedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
