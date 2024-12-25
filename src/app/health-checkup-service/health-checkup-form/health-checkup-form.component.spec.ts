import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HealthCheckupFormComponent } from './health-checkup-form.component';

describe('HealthCheckupFormComponent', () => {
  let component: HealthCheckupFormComponent;
  let fixture: ComponentFixture<HealthCheckupFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HealthCheckupFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HealthCheckupFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
